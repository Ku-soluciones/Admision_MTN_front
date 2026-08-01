import type { PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import SessionTimeoutManager from '../packages/shared-ui/src/components/auth/SessionTimeoutManager';
import { AuthNavigationBridge } from './components/AuthNavigationBridge';
import TemporaryPasswordGate from '../packages/shared-ui/src/components/auth/TemporaryPasswordGate';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {/* Bridge SPA-nav: convierte eventos de auth (expired/terminal/
            cross-tab-logout/idle-expire) en navegación SPA con useNavigate,
            evitando full reload y preservando state.from para post-login. */}
        <AuthNavigationBridge />
        {/* Auto-renderiza modal de aviso e impone hard-cap absoluto sólo
            cuando hay sesión activa (lee authStore). Sin sesión es no-op. */}
        <SessionTimeoutManager />
        <TemporaryPasswordGate>{children}</TemporaryPasswordGate>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
