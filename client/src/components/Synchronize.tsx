import React, { useState } from 'react';
import { notify } from '../utils/notify';
import { confirmAction } from '../utils/confirm';
import './UploadSection.css'; // reuse shared styles
import './Synchronize.css';

interface Props {
  onSynchronized: (count: number) => void;
}

const SYNC_URL_KEY = 'minishelf_sync_url';

// Helper to fetch JSON either via backend proxy (when available) or directly from client
async function fetchJsonData(url: string): Promise<any> {
  // First, try the backend proxy endpoint (for local dev with CORS protection)
  try {
    const resp = await fetch('/api/fetch-json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    if (resp.ok) {
      return await resp.json();
    }
    
    // If we get errors suggesting the backend isn't available or can't complete the request,
    // fall through to direct client fetch
    if (resp.status === 404 || resp.status === 500 || resp.status === 502 || resp.status === 503) {
      console.log('Backend proxy not available or failed, fetching directly from client');
    } else if (resp.status === 400) {
      // 400 errors are validation errors from the backend, throw them
      const err = await resp.json().catch(() => ({}));
      throw new Error(err?.error || `Validation failed: ${resp.statusText}`);
    } else {
      // For other errors, fall through to direct fetch
      console.log(`Backend returned ${resp.status}, trying direct fetch`);
    }
  } catch (err: any) {
    // Network errors (backend not running) or thrown validation errors
    if (err.message?.includes('Validation failed')) {
      throw err; // Re-throw validation errors from backend
    }
    // For network errors, fall through to direct fetch
    console.log('Backend not reachable, fetching directly from client');
  }

  // Fallback: fetch directly from the client (for GitHub Pages deployment)
  // Normalize sharing URLs to direct download URLs
  const normalizeUrl = (input: string): string => {
    try {
      const u = new URL(input);
      const host = u.hostname.toLowerCase();

      // Google Drive: convert preview URL to uc?export=download&id=ID
      if (host.endsWith('drive.google.com')) {
        const m = u.pathname.match(/\/file\/d\/([^\/]+)/);
        const id = m ? m[1] : u.searchParams.get('id');
        if (id) {
          return `https://drive.google.com/uc?export=download&id=${id}`;
        }
      }

      // Dropbox: change dl=0 to dl=1 to force direct download
      if (host === 'www.dropbox.com' || host === 'dropbox.com') {
        u.searchParams.set('dl', '1');
        return u.toString();
      }

      return input;
    } catch {
      return input;
    }
  };

  const fetchUrl = normalizeUrl(url);
  
  // Try direct fetch first
  try {
    const response = await fetch(fetchUrl, {
      mode: 'cors',
      cache: 'no-cache',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.statusText}`);
    }

    const text = await response.text();
    if (text.length === 0) {
      throw new Error('Empty response');
    }

    return JSON.parse(text);
  } catch (err: any) {
    // If direct fetch fails due to CORS, try using a CORS proxy
    if (err.message?.includes('CORS') || err.message?.includes('NetworkError') || err.name === 'TypeError') {
      console.log('Direct fetch failed (likely CORS), trying CORS proxy...');
      
      // Try multiple CORS proxies in sequence
      const proxies = [
        `https://corsproxy.io/?${encodeURIComponent(fetchUrl)}`,
        `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(fetchUrl)}`,
      ];

      for (const proxyUrl of proxies) {
        try {
          console.log(`Trying proxy: ${proxyUrl.split('?')[0]}...`);
          const proxyResponse = await fetch(proxyUrl, {
            cache: 'no-cache',
          });

          if (!proxyResponse.ok) {
            console.log(`Proxy failed with status ${proxyResponse.status}`);
            continue;
          }

          const text = await proxyResponse.text();
          if (text.length === 0) {
            console.log('Proxy returned empty response');
            continue;
          }

          return JSON.parse(text);
        } catch (proxyErr: any) {
          console.log(`Proxy error: ${proxyErr.message}`);
          continue;
        }
      }
      
      throw new Error('All CORS proxies failed. The URL might not be publicly accessible, or the file might be too large. Try using the backend server for better support.');
    }
    
    // Re-throw other errors
    throw err;
  }
}

const Synchronize: React.FC<Props> = ({ onSynchronized }) => {
  // url is the current input value. We only persist to localStorage when the user presses "Link URL".
  const [url, setUrl] = useState<string>(() => {
    try {
      return localStorage.getItem(SYNC_URL_KEY) || '';
    } catch {
      return '';
    }
  });
  const [linking, setLinking] = useState(false);
  // Track whether a URL has been linked (persisted). Initialized from localStorage.
  const [linked, setLinked] = useState<boolean>(() => {
    try {
      return !!localStorage.getItem(SYNC_URL_KEY);
    } catch {
      return false;
    }
  });
  const [error, setError] = useState<string>('');
  const [syncing, setSyncing] = useState(false);
  const [isDirty, setIsDirty] = useState<boolean>(() => {
    try {
      return localStorage.getItem('isDirty') === 'true';
    } catch {
      return false;
    }
  });

  // NOTE: we no longer auto-save the url on every input change. The URL is persisted only when
  // the user explicitly presses "Link URL" (handled in handleLink). This prevents a typed but
  // unconfirmed value from being treated as linked.

  const handleLink = () => {
    if (!url) {
      setError('Please enter a URL');
      return;
    }
    try {
      // Basic validation
      new URL(url);
    } catch {
      setError('Invalid URL');
      return;
    }
    // Fetch and validate the JSON contains a compatible miniatures array by trying to insert it
    setLinking(true);
    (async () => {
      try {
        const data = await fetchJsonData(url);
        
        const miniatures = Array.isArray(data) ? data : data?.miniatures;
        if (!Array.isArray(miniatures)) {
          throw new Error('Fetched JSON does not contain a miniatures array');
        }

        // Try to import into temporary DB to validate schema/rows
        const db = await import('../database');
        const tmp = await db.createTemporaryDatabase();
        try {
          await db.insertMiniaturesIntoDatabase(tmp, miniatures);
        } catch (errInner: any) {
          throw new Error('Data validation failed: ' + (errInner?.message || String(errInner)));
        }

        // If we reach here the data appears valid — persist the link
        try {
          localStorage.setItem(SYNC_URL_KEY, url);
          try {
            localStorage.setItem('isDirty', 'true');
            // notify same-tab listeners and update local state
            try { window.dispatchEvent(new CustomEvent('isDirtyChanged', { detail: { isDirty: true } })); } catch {}
            try { setIsDirty(true); } catch {}
          } catch {}
        } catch {
          // ignore
        }
        setLinked(true);
        setError('');
  // small success feedback via toast
  notify.success('URL linked and validated successfully');
      } catch (err: any) {
        console.error('Link validation failed:', err);
        setError('Could not link URL: ' + (err?.message || 'unknown error'));
      } finally {
        setLinking(false);
      }
    })();
  };

  const handleRemoveLink = () => {
    // Clear saved URL from state and localStorage and mark as unlinked
    try {
      localStorage.removeItem(SYNC_URL_KEY);
    } catch {
      // ignore
    }
  setUrl('');
  setLinked(false);
  setError('');
  notify.info('Link removed');
  };

  const handleSync = async () => {
    if (!url) {
      notify.error('Please link a URL first');
      return;
    }

    // If there are local unsaved changes (dirty), warn the user before proceeding
    try {
      const isDirty = localStorage.getItem('isDirty');
      if (isDirty === 'true') {
        // Use in-app confirm dialog for consistent UI
        const proceed = await confirmAction('There are local changes that might get overwritten by synchronization. Do you want to continue?');
        if (!proceed) return;
      }
    } catch {
      // ignore localStorage errors and proceed
    }

    setSyncing(true);
    try {
      const data = await fetchJsonData(url);

      // Expecting { miniatures: [ ... ] } or an array directly
      let miniatures = Array.isArray(data) ? data : data?.miniatures;
      if (!Array.isArray(miniatures)) {
        throw new Error('Fetched JSON does not contain a miniatures array');
      }

      // Save into a temporary in-memory database first, then replace main DB on success
      // Dynamically import database helper to avoid circular imports
      const db = await import('../database');

      try {
        const tmp = await db.createTemporaryDatabase();
        await db.insertMiniaturesIntoDatabase(tmp, miniatures);

        // All inserted successfully into temp DB — now replace the real DB atomically
        await db.replaceDatabaseWith(tmp);

        // Best-effort clear dirty flag (replaceDatabaseWith also clears it)
        try { localStorage.setItem('isDirty', 'false'); } catch {}

        onSynchronized(miniatures.length || 0);
        notify.success(`Synchronized ${miniatures.length} miniatures`);
      } catch (errInner: any) {
        console.error('Failed to import into temporary DB:', errInner);
        notify.error('Synchronization failed while building temporary database: ' + (errInner?.message || 'unknown'));
      }
    } catch (err: any) {
      console.error('Sync failed:', err);
      notify.error('Synchronization failed: ' + (err?.message || 'unknown'));
    } finally {
      setSyncing(false);
    }
  };

  // Listen for isDirty changes within this tab and across tabs
  React.useEffect(() => {
    const onLocalEvent = (e: Event) => {
      try {
        const custom = e as CustomEvent;
        if (custom?.detail && typeof custom.detail.isDirty === 'boolean') {
          setIsDirty(!!custom.detail.isDirty);
        }
      } catch {
        // ignore
      }
    };

    const onStorage = (e: StorageEvent) => {
      if (e.key === 'isDirty') {
        setIsDirty(e.newValue === 'true');
      }
    };

    window.addEventListener('isDirtyChanged', onLocalEvent as EventListener);
    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener('isDirtyChanged', onLocalEvent as EventListener);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  return (
    <div className="synchronize-section">
      <div className="synchronize-header">
        <h2>Synchronize</h2>
        <p className="synchronize-desc">
          Link an URL containing your exported database (.json file). 
        </p>
        <p className="synchronize-desc">
          Synchronizing will replace your current database.
        </p>
      </div>

      <div className="sync-card">
        {error ? <div className="sync-error" role="alert">{error}</div> : null}
        
        <div className="sync-input-row">
          <input
            type="text"
            placeholder="https://example.com/mydb.json"
            value={url}
            onChange={(e) => { setUrl(e.target.value); if (error) setError(''); }}
            readOnly={linked}
            tabIndex={linked ? -1 : 0}
            className="sync-url-input"
            aria-label="Synchronization URL"
          />

          <div className="sync-actions">
            {!linked ? (
              <button onClick={handleLink} className="btn-link btn-sync" disabled={linking}>
                {linking ? 'Linking...' : 'Link URL'}
              </button>
            ) : (
              <>
                <button
                  onClick={handleSync}
                  className={`${isDirty ? 'btn-sync-primary' : 'btn-sync-clean'} btn-sync`}
                  disabled={syncing}
                >
                  {syncing ? 'Synchronizing...' : 'Synchronize'}
                </button>
                <button onClick={handleRemoveLink} className="btn-remove btn-sync">
                  Remove Link
                </button>
              </>
            )}
          </div>
        </div>

        {syncing && (
          <div className="sync-status">
            Downloading and verifying data...
          </div>
        )}

        {/* Note removed per request */}
      </div>
    </div>
  );
};

export default Synchronize;
