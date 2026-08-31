import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app/App';
import { AppProviders } from './app/providers';
import './styles.css';

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
