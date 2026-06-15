import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// ═════════════════════════════════════════════════
// 🧹 Cleanup stale Service Worker (if any)
//    Unregisters old SW + clear caches to prevent
//    stale cached code served during development.
// ═════════════════════════════════════════════════
if ('serviceWorker' in navigator) {
  // Clear all CacheStorage
  caches.keys().then((keys) =>
    Promise.all(keys.map((k) => caches.delete(k)))
  );
  // Unregister any Service Worker
  navigator.serviceWorker.getRegistrations().then((regs) =>
    regs.forEach((r) => r.unregister())
  );
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);