import React, { useEffect } from 'react';
import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { resolveSession } from '../../../packages/backend-sdk/src/index';
import { shellManifest } from './manifest';

function AccessBanner() {
  const session = resolveSession();

  return (
    <div style={{ padding: '12px 16px', background: '#f7f4ec', borderBottom: '1px solid #d9d2c3' }}>
      <strong>Sesion actual:</strong>{' '}
      {session ? `${session.firstName} ${session.lastName} (${session.role})` : 'sin sesion detectada'}
    </div>
  );
}

function ExternalRedirect({ remoteName }: { remoteName: string }) {
  const remote = shellManifest.remotes.find((item) => item.name === remoteName);

  useEffect(() => {
    if (remote?.entry) {
      window.location.replace(remote.entry);
    }
  }, [remote]);

  if (!remote) {
    return (
      <section style={{ padding: 24 }}>
        <h2>Microfrontend no encontrado</h2>
      </section>
    );
  }

  return (
    <section style={{ padding: 20 }}>
      <h2 style={{ marginBottom: 12, textTransform: 'capitalize' }}>{remote.name}</h2>
      <p style={{ marginBottom: 16, color: '#475569' }}>
        Redirigiendo al microfrontend real en <code>{remote.entry}</code>
      </p>
      <a
        href={remote.entry}
        style={{
          display: 'inline-block',
          padding: '10px 14px',
          borderRadius: 10,
          background: '#111827',
          color: '#fff',
          textDecoration: 'none',
          fontWeight: 600,
        }}
      >
        Abrir ahora
      </a>
    </section>
  );
}

function ShellNav() {
  const navItems = shellManifest.remotes.map((remote) => ({
    label: remote.nav?.[0]?.label ?? remote.name,
    to: remote.routes[0]?.path ?? '/',
  }));

  return (
    <header style={{ display: 'flex', gap: 12, padding: 16, borderBottom: '1px solid #e5e7eb', flexWrap: 'wrap' }}>
      <Link to="/">Inicio</Link>
      {navItems.map((item) => (
        <Link key={item.to} to={item.to}>
          {item.label}
        </Link>
      ))}
    </header>
  );
}

export function ShellApp() {
  const defaultRoute = shellManifest.remotes[0]?.routes[0]?.path ?? '/postulacion';

  return (
    <div style={{ minHeight: '100vh', background: '#fcfbf7', color: '#1f2937' }}>
      <AccessBanner />
      <ShellNav />
      <Routes>
        <Route path="/" element={<Navigate to={defaultRoute} replace />} />
        {shellManifest.remotes.flatMap((remote) =>
          remote.routes.map((route) => (
            <Route
              key={route.path}
              path={route.path}
              element={<ExternalRedirect remoteName={remote.name} />}
            />
          ))
        )}
        <Route path="*" element={<Navigate to={defaultRoute} replace />} />
      </Routes>
    </div>
  );
}
