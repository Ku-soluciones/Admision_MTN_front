import React, { useMemo } from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { resolveSession } from '../../../packages/backend-sdk/src/index';
import { shellManifest } from './manifest';

const shellStyles = {
  page: { minHeight: '100vh', background: '#fcfbf7', color: '#1f2937', display: 'flex', flexDirection: 'column' as const },
  banner: { padding: '12px 16px', background: '#f7f4ec', borderBottom: '1px solid #d9d2c3' },
  nav: { display: 'flex', gap: 8, padding: 12, borderBottom: '1px solid #e5e7eb', flexWrap: 'wrap' as const, background: '#ffffff' },
  navLink: { padding: '8px 12px', borderRadius: 8, textDecoration: 'none', color: '#1f2937', fontWeight: 500 },
  navLinkActive: { background: '#eef2ff', color: '#3730a3' },
  content: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { maxWidth: 680, width: '100%', borderRadius: 12, border: '1px solid #e5e7eb', background: '#fff', padding: 20 },
  button: { display: 'inline-block', padding: '10px 14px', borderRadius: 10, background: '#111827', color: '#fff', textDecoration: 'none', fontWeight: 600 },
};

type NavItem = { label: string; to: string; entry: string; roles?: string[] };

function AccessBanner() {
  const session = resolveSession();

  return (
    <div style={shellStyles.banner}>
      <strong>Sesión actual:</strong>{' '}
      {session ? `${session.firstName} ${session.lastName} (${session.role})` : 'sin sesión detectada'}
    </div>
  );
}

function RemoteLauncher({ remoteName }: { remoteName: string }) {
  const remote = shellManifest.remotes.find((item) => item.name === remoteName);

  if (!remote) {
    return <section style={shellStyles.card}>Microfrontend no encontrado.</section>;
  }

  return (
    <section style={shellStyles.card}>
      <h2 style={{ marginTop: 0, textTransform: 'capitalize' }}>{remote.name}</h2>
      <p style={{ color: '#475569' }}>
        La navegación entre dominios se hace fuera del shell para evitar conflictos de estilos/componentes y mantener la
        sesión de autenticación definida por cada frontend.
      </p>
      <a href={remote.entry} style={shellStyles.button}>
        Abrir {remote.name}
      </a>
    </section>
  );
}

function ShellNav({ items }: { items: NavItem[] }) {
  const location = useLocation();

  return (
    <header style={shellStyles.nav}>
      {items.map((item) => {
        const active = location.pathname === item.to;
        return (
          <Link
            key={item.to}
            to={item.to}
            style={active ? { ...shellStyles.navLink, ...shellStyles.navLinkActive } : shellStyles.navLink}
          >
            {item.label}
          </Link>
        );
      })}
    </header>
  );
}

export function ShellApp() {
  const session = resolveSession();

  const navItems = useMemo<NavItem[]>(() => {
    const role = session?.role;

    return shellManifest.remotes
      .flatMap((remote) => {
        const sourceNav = remote.nav?.length
          ? remote.nav
          : [{ label: remote.name.charAt(0).toUpperCase() + remote.name.slice(1), to: remote.routes[0]?.path ?? '/', roles: remote.routes[0]?.roles }];

        return sourceNav.map((nav) => ({
          label: nav.label,
          to: nav.to,
          entry: remote.entry,
          roles: nav.roles,
        }));
      })
      .filter((item) => !item.roles?.length || (!!role && item.roles.includes(role)));
  }, [session?.role]);

  const defaultRoute = navItems[0]?.to ?? shellManifest.remotes[0]?.routes[0]?.path ?? '/postulacion';

  return (
    <div style={shellStyles.page}>
      <AccessBanner />
      <ShellNav items={navItems} />
      <main style={shellStyles.content}>
        <Routes>
          <Route path="/" element={<Navigate to={defaultRoute} replace />} />
          {shellManifest.remotes.flatMap((remote) =>
            remote.routes.map((route) => (
              <Route key={route.path} path={route.path} element={<RemoteLauncher remoteName={remote.name} />} />
            ))
          )}
          <Route path="*" element={<Navigate to={defaultRoute} replace />} />
        </Routes>
      </main>
    </div>
  );
}
