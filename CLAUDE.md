# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Sistema de Admisión MTN** is a React 19 + Vite frontend for a school admission system serving Colegio Monte Tabor y Nazaret. The application supports multiple user roles (guardians/apoderados, professors, coordinators, admins) with role-based protected routes and is deployed to Vercel with a microservices backend on Railway.

## Tech Stack

- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite 6
- **Routing**: React Router v7 (hash-based)
- **Data Fetching**: TanStack React Query v5 (Axios client)
- **Authentication**: OIDC via oidc-client-ts
- **State Management**: React Context (AppContext, AuthContext, OidcContext, ProfessorContext)
- **UI Components**: Custom components + Lucide/Heroicons icons
- **Charts**: Recharts
- **Testing**: Playwright (E2E)
- **CSS**: Tailwind (configured in Vite with brand color variables)

## Project Structure

```
├── App.tsx / index.tsx       # Entry points (root, not in src/)
├── index.html                # HTML template
├── components/               # Reusable React components
│   ├── admin/               # Admin dashboard components
│   ├── auth/                # Protected route guards
│   ├── evaluations/         # Evaluation/report forms
│   ├── interviews/          # Interview components
│   ├── layout/              # Header, Footer, CoordinatorLayout
│   ├── ui/                  # Base UI components
│   └── ...
├── pages/                   # Page-level route components (lazy-loaded)
├── context/                 # React Context providers
├── hooks/                   # Custom React hooks
├── api/                     # API client + type definitions
│   ├── client.ts           # Axios instance with auth headers
│   ├── *.client.ts         # API endpoint functions
│   └── *.types.ts          # TypeScript types (generated from OpenAPI)
├── services/               # Utility services (HTTP, password handling)
├── data/                   # Static data & templates
├── vite.config.ts         # Vite + build configuration
├── playwright.config.ts   # E2E test configuration
└── .env.{development,staging,production}  # Environment configs
```

**Key Design Decision**: Entry points (App.tsx, index.tsx, types.ts) are at the root, not under `src/`, to align with Vite conventions.

## Common Development Commands

```bash
# Development server (http://localhost:5173)
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview

# E2E tests
npm run e2e              # Run all Playwright tests
npm run e2e:ui          # Interactive UI mode
npm run e2e:headed      # Headed browser (visible)
npm run e2e:debug       # Debug mode with inspector
npm run playwright:install  # Install Playwright browsers

# Dependencies
npm install
npm ci  # For CI environments
```

## Environment Setup

Configure `.env.local` (git-ignored, for local development):
```
VITE_API_BASE_URL=http://localhost:8080
VITE_OIDC_AUTHORITY=https://auth.mtn.cl
VITE_OIDC_CLIENT_ID=<client-id>
VITE_OIDC_REDIRECT_URI=http://localhost:5173/#/
VITE_OIDC_SCOPE=openid profile email
VITE_TIMEZONE=America/Santiago
VITE_BRAND_PRIMARY=#1e40af
VITE_BRAND_SECONDARY=#dc2626
```

Pre-configured environments:
- `.env.development` – Local dev
- `.env.staging` – Staging environment
- `.env.production` – Production (Vercel)

**CRITICAL**: Vite v6 does NOT support `process.env.VITE_API_BASE_URL` at build time. The app detects the API base URL at runtime by inspecting the current origin. See `src/services/http.ts` for runtime detection logic.

## API & Type Generation

The project uses OpenAPI type generation via `openapi-typescript`. API files follow a pattern:
- `src/api/*.types.ts` – Generated TypeScript types from OpenAPI spec
- `src/api/*.client.ts` – Request functions (Axios calls wrapping types)
- `src/api/client.ts` – Axios instance with auth headers, retry logic, timezone handling

**Authentication**: Requests automatically include OIDC tokens via the `Authorization` header (managed by AuthContext).

## Authentication & Protected Routes

OIDC flow:
1. **AuthContext** manages login/logout and token refresh
2. **OidcContext** handles OIDC client initialization
3. **Protected Route Components** check user roles and redirect:
   - `ProtectedAdminRoute` – Admin dashboard
   - `ProtectedProfessorRoute` – Professor dashboard
   - `ProtectedApoderadoRoute` – Guardian/family dashboard
   - `ProtectedCoordinatorRoute` – Coordinator dashboard

Routes use **hash-based navigation** (`#/path`), configured via `HashRouter`.

## React Query Configuration

Configured in `index.tsx`:
- `staleTime: 5min` – Data cache validity (aligns with backend cache)
- `gcTime: 10min` – Garbage collection after cache expiry
- `retry: 1` – One automatic retry on failure
- `refetchOnWindowFocus: false` – No refetch when window regains focus

For mutations, use the standard pattern:
```tsx
const mutation = useMutation({
  mutationFn: (data) => api.updateSomething(data),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['endpoint'] })
});
```

## Vite Configuration Highlights

- **Alias**: `@` (root), `@components`, `@services`, `@types`, `@utils`, `@hooks`, `@context`, `@pages`
- **Security Headers** (production): HSTS, X-Content-Type-Options, X-Frame-Options, CSP
- **JSON Handling**: `stringify: false` to prevent `JSON.parse()` transformation in Vercel
- **CSS**: SCSS with brand color variables injected at build time
- **Minification**: esbuild for production, console logs kept for debugging
- **Chunking**: Manual chunks for vendor, router, UI, utils for optimal caching

## Testing

**E2E Tests (Playwright)**:
- Located in `e2e/` directory
- Setup/teardown for authentication state
- Configured for Chrome, Firefox, Safari, and mobile browsers (Pixel 5, iPhone 12)
- Test artifacts (videos, screenshots, traces) in `test-results/`

Run a single test file:
```bash
npx playwright test e2e/auth.spec.ts
```

Debug a single test:
```bash
npx playwright test e2e/auth.spec.ts --debug
```

## State Management

**Context Providers** (in App.tsx order):
1. **ErrorBoundary** – Global error handling
2. **AuthProvider** – OIDC auth state, tokens, user info
3. **AppProvider** – App-wide settings, toast notifications, UI state

Access via:
```tsx
const { user, login, logout } = useAuth();
const { settings, showToast } = useApp();
```

## Timezone Handling

The app enforces **America/Santiago** timezone (configurable via `VITE_TIMEZONE`). Dates are:
- Formatted using `date-fns` with zone-aware functions
- Sent to/received from the backend as ISO 8601 strings
- Displayed to users in local time (Chile)

## Styling & Theming

- **Tailwind CSS** with custom color palette:
  - `azul-monte-tabor` (primary)
  - `rojo-monte-tabor` (secondary)
  - `blanco-pureza` (off-white background)
- Responsive design with flex-wrap utilities
- Brand colors injected via SCSS variables in `vite.config.ts`

## Performance & Optimization

- **Code Splitting**: Lazy-loaded pages via `React.lazy()` + `<Suspense>`
- **Chunking Strategy**: Separate vendor/router/UI/utils chunks for better caching
- **Image Optimization**: Use next-gen formats where possible
- **Bundle Analysis**: Check with `npm run build` output (esbuild summary)

## Deployment

**Vercel** (auto-deploys from `pre_produccion` branch):
- Environment variables configured in Vercel project settings
- Build command: `npm run build`
- Output directory: `dist/`

**Backend**: Microservices on Railway (not managed here)

## Debugging Tips

1. **OIDC Auth Issues**: Check AuthContext token refresh logic and OIDC authority URL
2. **API Failures**: Inspect axios retry logic in `src/services/http.ts`
3. **Type Mismatches**: Regenerate types from OpenAPI spec (documented in API files)
4. **Timezone Bugs**: Verify date-fns is using Santiago timezone, not local machine time
5. **Build Issues**: Check `vite.config.ts` JSON handling if `Cannot convert undefined or null` error occurs

## Common Patterns

**Fetch Data with React Query**:
```tsx
const { data, isLoading, error } = useQuery({
  queryKey: ['applications'],
  queryFn: () => api.getApplications(),
});
```

**Mutate Data**:
```tsx
const { mutate, isPending } = useMutation({
  mutationFn: api.updateApplication,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['applications'] });
  },
});
```

**Protected Route**:
```tsx
<Route path="/admin" element={
  <ProtectedAdminRoute>
    <AdminDashboard />
  </ProtectedAdminRoute>
} />
```

**Toast Notification**:
```tsx
const { showToast } = useApp();
showToast('Success!', 'success');
```

## Notes for Future Contributors

- Keep entry files at the root (App.tsx, index.tsx, types.ts)
- Always use lazy loading for page components to improve bundle size
- Add new API endpoints following the `*.client.ts` + `*.types.ts` pattern
- Run E2E tests before merging to ensure no regressions
- Update Playwright tests when adding new user-facing features
- Follow existing commit message format (e.g., "feat(frontend): ...", "fix(admin): ...")
