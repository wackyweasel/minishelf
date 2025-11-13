import React from 'react';
import { createRoot } from 'react-dom/client';
import './notify.css';

type Level = 'info' | 'success' | 'error';

function createContainer() {
  const id = 'minishelf-notify-root';
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement('div');
    el.id = id;
    document.body.appendChild(el);
  }
  return el;
}

function Toast({ message, level, onClose }: { message: string; level: Level; onClose: () => void }) {
  React.useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className={`ms-toast ms-${level}`} role="status" aria-live="polite">
      {message}
    </div>
  );
}

export function showNotification(message: string, level: Level = 'info') {
  const container = createContainer();
  const mount = document.createElement('div');
  container.appendChild(mount);
  const root = createRoot(mount);

  const remove = () => {
    try {
      root.unmount();
    } catch {}
    if (mount.parentNode === container) container.removeChild(mount);
  };

  root.render(<Toast message={message} level={level} onClose={remove} />);
}

export const notify = {
  info: (msg: string) => showNotification(msg, 'info'),
  success: (msg: string) => showNotification(msg, 'success'),
  error: (msg: string) => showNotification(msg, 'error'),
};
