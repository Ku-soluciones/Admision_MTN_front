import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app/App';
import { AppProviders } from './app/providers';

// ── HashRouter redirect bridge ──────────────────────────────────────
// El BFF redirige (302) a /interview/confirmation-result?params
// pero la app usa HashRouter, que solo lee window.location.hash.
// Los HTTP redirects NO preservan el fragmento "#" en el header Location,
// así que capturamos la ruta aquí y la convertimos a hash antes de montar React.
const HASH_REDIRECT_PATHS = ['/interview/confirmation-result'];

const { pathname, search } = window.location;
if (HASH_REDIRECT_PATHS.includes(pathname)) {
  // Redirigir a /#/path?params preservando query string
  window.location.replace(`${window.location.origin}/#${pathname}${search}`);
  // Detenemos la ejecución; el navegador recargará con la URL hash correcta.
  throw new Error('Redirecting to HashRouter path');
}
// ────────────────────────────────────────────────────────────────────

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </React.StrictMode>
);
