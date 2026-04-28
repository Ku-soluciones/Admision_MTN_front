import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { ShellApp } from './ShellApp';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Shell root element not found');
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <HashRouter>
      <ShellApp />
    </HashRouter>
  </React.StrictMode>
);
