// Using automatic JSX runtime; no direct React import required
import { createRoot } from 'react-dom/client';
import './confirm.css';

export function confirmAction(message: string): Promise<boolean> {
  const containerId = 'minishelf-confirm-root';
  let container = document.getElementById(containerId);
  if (!container) {
    container = document.createElement('div');
    container.id = containerId;
    document.body.appendChild(container);
  }

  const mount = document.createElement('div');
  container.appendChild(mount);
  const root = createRoot(mount);

  return new Promise((resolve) => {
    function cleanup() {
      try { root.unmount(); } catch {}
      if (container && mount.parentNode === container) container.removeChild(mount);
    }

    const ConfirmBox = () => {
      return (
        <div className="ms-confirm">
          <div className="ms-confirm-msg">{message}</div>
          <div className="ms-confirm-actions">
            <button className="ms-confirm-ok" onClick={() => { cleanup(); resolve(true); }}>Confirm</button>
            <button className="ms-confirm-cancel" onClick={() => { cleanup(); resolve(false); }}>Cancel</button>
          </div>
        </div>
      );
    };

    root.render(<ConfirmBox />);
  });
}
