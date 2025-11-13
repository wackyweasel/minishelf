import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import dns from 'dns';
import net from 'net';
import { initDatabase } from './database';
import miniaturesRouter from './routes/miniatures';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

// Routes
app.use('/api/miniatures', miniaturesRouter);

// Server-side fetch proxy for JSON (protects from CORS issues and centralizes validation)
app.post('/api/fetch-json', async (req: Request, res: Response) => {
  try {
    const { url } = req.body || {};
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid url' });
    }

    // Basic URL validation
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch (err) {
      return res.status(400).json({ error: 'Invalid URL' });
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return res.status(400).json({ error: 'Only http(s) URLs are allowed' });
    }

    // Normalize well-known sharing URLs (Google Drive, Dropbox) to direct-download URLs
    const normalizeSharedUrl = (input: string) => {
      try {
        const u = new URL(input);
        const host = u.hostname.toLowerCase();

        // Google Drive: convert preview URL to uc?export=download&id=ID
        if (host.endsWith('drive.google.com')) {
          // /file/d/ID or ?id=ID
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
      } catch (e) {
        return input;
      }
    };

    const fetchUrl = normalizeSharedUrl(url);

    // Resolve hostname and prevent private IPs (basic SSRF mitigation)
    const lookup = dns.promises.lookup;
    let addr: { address: string } | null = null;
    try {
      const fetchParsed = new URL(fetchUrl);
      addr = await lookup(fetchParsed.hostname, { family: 0 });
    } catch (err) {
      console.warn('DNS lookup failed for', parsed.hostname, err);
      return res.status(400).json({ error: 'Failed to resolve hostname' });
    }

    const ip = addr.address;
    if (net.isIP(ip)) {
      // Reject obvious private ranges
      const privatePatterns = [/^10\./, /^127\./, /^192\.168\./, /^172\.(1[6-9]|2[0-9]|3[0-1])\./, /^0\./];
      const isPrivate = privatePatterns.some((rx) => rx.test(ip));
      if (isPrivate) {
        return res.status(400).json({ error: 'Refusing to fetch private IPs' });
      }
    }

    // Fetch with timeout and size limit
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(fetchUrl, {
      signal: controller.signal,
      headers: {
        // some providers (Drive) may behave better with a UA
        'User-Agent': 'MiniShelf/1.0 (+https://example.local)'
      }
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return res.status(502).json({ error: `Upstream fetch failed: ${response.statusText}` });
    }

    // NOTE: removed hard response size limit (caller requested). Be aware
    // that parsing very large upstream responses may consume significant
    // server memory. Consider a streaming approach for production.
    const text = await response.text();
    if (text.length === 0) {
      return res.status(422).json({ error: 'Empty response' });
    }

    // Check content-type for debugging help
    const contentType = response.headers.get('content-type') || 'unknown';

    // Try to parse JSON
    let parsedJson: any;
    try {
      parsedJson = JSON.parse(text);
    } catch (err) {
      // Provide helpful diagnostic info: content-type and a short snippet of the response
  const snippet = text.slice(0, 1000);
      console.warn('Upstream response not JSON; content-type=', contentType, 'snippet=', snippet.replace(/\s+/g, ' ').slice(0,200));
      return res.status(422).json({ error: 'Response is not valid JSON', contentType, snippet });
    }

    // Return parsed JSON
    return res.json(parsedJson);
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: 'Fetch timed out' });
    }
    console.error('Fetch-json error:', err);
    return res.status(500).json({ error: 'Failed to fetch json' });
  }
});

app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'MiniShelf API is running' });
});

// Initialize database then start server
console.log('🔧 Initializing database...');
initDatabase().then(() => {
  console.log('✅ Database ready');
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📁 Uploads directory: ${path.join(__dirname, '../../uploads')}`);
    console.log(`📡 API available at http://localhost:${PORT}/api`);
  });
}).catch(err => {
  console.error('❌ Failed to initialize database:', err);
  console.error('Stack:', err.stack);
  process.exit(1);
});

export default app;
