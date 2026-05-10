# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture Overview

This is a **microfrontends monorepo** using Vite. Each microfrontend is an independent React SPA in `microfrontends/apps/*`, with its own `package.json`, `vite.config.ts`, and dependencies. There is no runtime import to a monolith—each app is completely isolated.

**Key Design Principle:** Microfrontends communicate via URL navigation through `microfrontendUrls.ts` utilities. They do NOT share component code at runtime. Code reuse happens through:
- `microfrontends/packages/backend-sdk`: Shared TS types and API clients
- `microfrontends/packages/contracts`: Shared type definitions

## Microfrontends (Local Ports)

| Port | App | Purpose | Route |
|------|-----|---------|-------|
| 5200 | shell | Launchpad/gateway | `/#/` |
| 5201 | mf-admissions | Student applications | `/#/postulacion` |
| 5202 | mf-guardian | Guardian/family portal | `/#/apoderado/login` |
| 5203 | mf-student | Student exams | `/#/examenes` |
| 5204 | mf-evaluations | Teacher evaluations | `/#/profesor/login` |
| 5205 | mf-interviews | Interview scheduling | `/#/entrevistas` |
| 5206 | mf-admin | Admin dashboard | `/#/login` |
| 5207 | mf-reports | Reports portal | `/#/reportes` |
| 5208 | mf-coordinator | Coordinator tools | `/#/coordinador` |

## Development Commands

```bash
# Install dependencies (monorepo)
npm install

# Start all microfrontends (recommended for full testing)
npm run dev

# Start a single microfrontend (fastest for focused development)
npm run dev:mf:admissions      # Student applications (5201)
npm run dev:mf:guardian         # Guardian portal (5202)
npm run dev:mf:student          # Student exams (5203)
npm run dev:mf:evaluations      # Teacher evaluations (5204)
npm run dev:mf:interviews       # Interview scheduling (5205)
npm run dev:mf:admin            # Admin dashboard (5206)
npm run dev:mf:reports          # Reports portal (5207)
npm run dev:mf:coordinator      # Coordinator tools (5208)
npm run dev:shell               # Shell/gateway (5200)

# Build all apps
npm run build

# Build single app (faster)
cd microfrontends/apps/mf-admissions
npx vite build

# Lint and format (if configured)
npm run lint
npm run format
```

**Important:** 
- Always access via `http://localhost:52xx` (not `file:///`)
- Ports are strictly enforced (`strictPort: true`)
- Env vars are read from root `.env.development` (not per-app)
- Use `npm run dev:mf:xxx` when working on a single feature to speed up startup

## Environment Configuration

- `.env.development`, `.env.local`, `.env.staging`, `.env.production` in root
- All microfrontends read from root `envDir` (Vite loads from root, not per-app)
- `VITE_*` variables are embedded in browser bundle—never put secrets there
- Key variables:
  - `VITE_API_BASE_URL`: Backend gateway (used by api.ts interceptor)
  - `VITE_APP_ENV`: Environment name for URL building
  - `VITE_MF_BASE_DOMAIN`: Base domain for URL resolution
  - `VITE_MF_ENV`: Environment (production, staging, dev, uat)
  - `VITE_MF_*_URL`: Per-microfrontend URL overrides (if needed)

Example: With `VITE_MF_BASE_DOMAIN=admitia.dedyn.io` and `VITE_MF_ENV=staging`, URLs auto-resolve to `https://admision.staging.admitia.dedyn.io`.

## Authentication & Session Management

- **Firebase integration:** `src/lib/firebase.ts` handles auth state
- **BFF validation:** After Firebase login, `AuthContext` fetches user profile from `/v1/auth/check`
- **Storage keys:** Use `getStorageKey(BASE_STORAGE_KEYS.*)` from backend-sdk to store auth tokens and user data
  - Avoids key collisions across microfrontends
  - Keys are namespaced by `VITE_APP_ENV`
- **Protected routes:** `components/auth/ProtectedApoderadoRoute.tsx` checks auth before rendering
- **Role-based access:** `user.role` includes ADMIN, APODERADO, TEACHER, COORDINATOR, etc.

## API Communication

- **Service:** `services/api.ts` (axios with interceptors)
- **Public routes (no auth required):** `/auth/login`, `/auth/register`, `/email/`, `/public/`, etc.
- **Request interceptor:**
  - Injects `Authorization: Bearer <token>` header from localStorage
  - Sets CSRF token
  - Dynamically sets `baseURL` at runtime via `getApiBaseUrl()` from `config/api.config.ts`
- **Errors:** 400 from backend usually indicates auth/permission issues; inspect response data for details

## Data Enrichment and API Response Handling

API endpoints sometimes return incomplete data. When an entity lacks nested relationships (e.g., `/v1/evaluations/my-evaluations` returns evaluations but no student details), enrich the data by fetching related entities:

```typescript
// Pattern: Enrich evaluations with application data
const enrichedEvaluations = await Promise.all(
  evaluations.map(async (evaluation: any) => {
    try {
      if (evaluation.applicationId && !evaluation.application?.student) {
        const application = await applicationService.getApplicationById(evaluation.applicationId);
        return { ...evaluation, application };
      }
      return evaluation;
    } catch (appError) {
      console.warn(`Could not load application for evaluation ${evaluation.id}:`, appError);
      return evaluation; // Graceful fallback
    }
  })
);
```

**When to enrich:**
- API returns ID but not nested object (e.g., `applicationId` but not `application`)
- UI requires nested data that's not always fetched
- Performance acceptable (small number of parallel requests)

**Do not enrich:**
- If the API is designed to return only IDs (check backend docs)
- If making hundreds of parallel requests (use pagination instead)
- If data should be loaded on-demand (lazy load instead)

## Service Architecture Patterns

Services in `services/` directory handle API calls and data transformation. Key patterns:

**1. Data Fetching with Fallbacks:**
```typescript
// professorEvaluationService.getStudentName() pattern
// Priority: application.student.name → student object → fallback string
const studentName = 
  evaluation.application?.student?.name || 
  evaluation.student?.name || 
  'Estudiante no especificado';
```

**2. Current User Data from localStorage:**
Use `getStorageKey(BASE_STORAGE_KEYS.*)` to access user state across features:
```typescript
const currentProfessor = JSON.parse(
  localStorage.getItem(getStorageKey(BASE_STORAGE_KEYS.CURRENT_PROFESSOR)) || '{}'
);
// Use currentProfessor.firstName + currentProfessor.lastName for logged-in user name
```

**3. Parallel Data Fetching:**
Use `Promise.all()` when fetching multiple entities to avoid sequential API calls:
```typescript
const enrichedData = await Promise.all(
  items.map(async (item) => fetchRelatedData(item))
);
```

## Directory Structure (Per Microfrontend)

```
mf-admissions/
  components/     # React UI components (organized by feature)
  pages/          # Page-level components (routes)
  context/        # React Context (auth, app state)
  services/       # API clients, external service integration
  utils/          # Helper functions
  hooks/          # Custom React hooks
  types/          # TypeScript type definitions
  public/         # Static assets (images, favicon)
  vite.config.ts  # Vite configuration (port, aliases, env)
  index.html      # Entry point
  main.tsx        # React DOM render
  App.tsx         # Routes & providers
  package.json    # Dependencies for this microfrontend
```

## Pages and Internal Dependencies

**Rule:** Each microfrontend's `pages/` directory should contain ONLY pages imported in `App.tsx` routes.

**Important discovery:** Pages can have internal imports to other pages or components. Before deleting a page file, check if any component imports it:

```bash
# Check if a page is imported elsewhere before deletion
grep -r "from.*pages/PageName" microfrontends/apps/mf-xxx/src/
```

Example: `FamilyDashboard.tsx` in mf-guardian imports `ComplementaryApplicationForm.tsx` at line 47. Even though `ComplementaryApplicationForm.tsx` is not listed in `App.tsx` routes, it must be kept because `FamilyDashboard` depends on it internally.

When refactoring or cleaning up pages:
1. Check `App.tsx` for direct route imports
2. Grep all files for imports of the page being deleted
3. Move internal-only components to a non-pages folder if they're not routes
4. Run `npm run dev:mf:xxx` to verify no import errors after deletion

## Routing

- **Hash-based routing:** React Router v7 with `HashRouter` (not BrowserRouter)
  - All routes use `/#/` prefix (e.g., `http://localhost:5201/#/postulacion`)
  - Preserves SPA behavior across deployments and subdomain changes
- **Aliases in vite.config.ts:** `@components`, `@services`, `@context`, etc. point to local dirs
- **Cross-app navigation:** Use `microfrontendUrls` utility to build links to other apps
  - Example: `microfrontendUrls.guardianDashboard` resolves to `http://localhost:5202/#/familia` locally or `https://guard.admitia.dedyn.io/#/familia` in production

## Quick Start for New Developers

1. **Install & Run:**
   ```bash
   npm install
   npm run dev:mf:admin  # Start with admin dashboard
   # Open http://localhost:5206
   ```

2. **Understand the App:**
   - Open DevTools, inspect the URL hash-based routing
   - Check `localStorage` to see auth tokens and user data
   - Look at one service file (e.g., `services/api.ts`) to understand API patterns
   - Read this CLAUDE.md section: "Architecture Overview" and "API Communication"

3. **Make a Change:**
   - Find where to edit (e.g., component in `pages/` or `components/`)
   - Check if it's already shared in `packages/shared-ui/` (avoid duplication)
   - Save → Page hot-reloads (Vite HMR)
   - Check Network tab to see API calls and auth headers

4. **Common Tasks:**
   - Add a button → Check if it exists in `packages/shared-ui/src/components/`
   - Change auth behavior → Edit `context/AuthContext.tsx`
   - Add API endpoint → Edit `services/api.ts` and type it in `types/`
   - Debug data issues → See "Debugging Data Issues" section below

## Common Workflows

### Adding a New Page/Feature

1. Create component in `pages/` or `components/` (organized by feature folder)
2. Add route in `App.tsx`
3. Use `components/auth/ProtectedApoderadoRoute.tsx` to gate access if needed
4. Fetch data via `services/api.ts` or existing service files

### Debugging Auth Issues

1. Check `localStorage` for keys (use `getStorageKey(BASE_STORAGE_KEYS.*)` pattern)
2. Open DevTools Network tab, check `Authorization` header in requests
3. Verify user profile in `AuthContext` state (console: `JSON.parse(localStorage.getItem(getStorageKey(BASE_STORAGE_KEYS.AUTHENTICATED_USER)))`)
4. If BFF returns 400: Check backend logs, verify email/password, check role permissions

### Debugging Data Issues (Missing or Incorrect Information)

**Symptom:** UI shows "no data" or placeholder text instead of expected values.

**Steps:**

1. **Identify the source of data** — Which service/API call provides this data?
   ```typescript
   // Check the service method, add console.log
   console.log('DEBUG - evaluations:', evaluations);
   ```

2. **Verify API response shape** — Open DevTools Network tab, check the actual JSON returned by the API. Is the nested data present?
   - If nested data is missing (e.g., `evaluation.application.student` is undefined), the API isn't returning it
   - Plan data enrichment if needed (see Data Enrichment section)

3. **Check for data enrichment** — Is the service enriching data? Look for `Promise.all()` loops that fetch related entities.

4. **Trace transformation logic** — Follow the data through the service methods to see how it's selected/formatted.
   ```typescript
   // Example: getStudentName() priority chain
   const studentName = 
     evaluation.application?.student?.name ||  // First priority
     evaluation.student?.name ||               // Second priority  
     'Fallback text';                         // Last resort
   console.log('DEBUG - studentName source:', {
     hasApplicationStudent: !!evaluation.application?.student,
     hasStudent: !!evaluation.student,
     finalName: studentName
   });
   ```

5. **Verify the priority chain** — If data exists in the API response but isn't being used, the fallback priority may be wrong. Reorder the `||` chain.

6. **Check async timing** — If enrichment is async (Promise-based), ensure the data is awaited before rendering.
   ```typescript
   // Wrong: data enrichment not awaited
   const evaluations = getEvaluations(); // Returns promise, not data
   
   // Right: await enrichment
   const evaluations = await getEvaluations();
   ```

### Testing a Microfrontend in Isolation

```bash
npm run dev:mf:admissions
# Open http://localhost:5201
# If page requires auth, log in via login route
```

### Building for Deployment

Each Vercel project needs:
- Root directory: `microfrontends/apps/mf-xxx`
- Build command: `vite build --mode production`
- Output directory: `dist`
- Env vars: Same `VITE_*` vars as localhost (except API_BASE_URL points to production backend)
- `vercel.json` in each microfrontend root handles SPA routing (rewrites to `index.html`)

## Important Notes

- **No shared component imports at runtime:** If you need to reuse UI code across apps, move it to a shared package under `microfrontends/packages/` and publish it, or duplicate (if very small).
- **Commit .env files with caution:** Environment files in root are git-ignored. Local overrides belong in `.env.local` (also ignored). Team coordination needed for .env.development.
- **Avoid touching root vite.config.ts:** Each microfrontend has its own config. The root package.json only orchestrates `npm run dev`.
- **localStorage keys must use getStorageKey():** Raw string keys will collide. Always use the backend-sdk wrapper.
- **Role checking is frontend-only:** Never rely solely on frontend role checks for security. Backend must validate on every protected endpoint.

## Troubleshooting

**Port already in use:** 
```bash
pkill -f "vite|node"  # Kill all vite/node processes
npm run dev           # Restart
```

**Blank page after login redirect:**
- Check that the target microfrontend is running on the expected port
- Verify `microfrontendUrls.ts` in the source app resolves to the correct URL
- Check browser console for CORS or fetch errors

**Auth token not persisting:**
- Verify `localStorage.setItem()` is being called in `AuthContext`
- Check that key uses `getStorageKey(BASE_STORAGE_KEYS.AUTH_TOKEN)` pattern
- Verify browser allows localStorage (check privacy settings)

**API calls fail with 400 or 401:**
- Ensure auth token is present in localStorage
- Check `Authorization` header in Network tab (should be `Bearer <token>`)
- Verify token is not expired (backend may validate TTL)
- Check if request URL is in `isPublicRoute()` list in `api.ts`

**ERROR 500 on API endpoint:**
- This is a backend issue, not frontend
- Check backend logs for the actual error
- Verify request payload matches backend schema (use Network tab)
- For evaluator assignment errors, check if backend validates evaluator exists and has required roles

**Email not sending (no error shown):**
- Check if the email service method is actually being called (add console.log)
- Verify you're using the correct endpoint `/v1/institutional-emails/...` vs `/v1/email/...`
- Check if the backend has SMTP credentials configured
- Look at `.gstack/qa-reports/EMAIL_FLOWS_AUDIT_2026-05-09.md` for which flows are partially implemented
- Note: Some flows like "application received" may not be wired up from frontend

**Unexpected behavior from other apps:**
- Check if other apps are running on their expected ports (5200-5208)
- Verify microfrontendUrls.ts resolves to correct URLs
- Remember: Apps are isolated—changes in one don't affect others until deployed
- If testing cross-app flow, run `npm run dev` to start all at once

## Architectural Lessons and Known Patterns

### Monolith-to-Microfrontends Migration

This monorepo was migrated from a monolith. Each microfrontend now has its own isolated `pages/` directory, but during initial setup, all 17 page files were copied to every app. **Only ~24 pages are actually used across all 8 apps.** The remaining ~112 are orphaned duplicates that should be deleted during cleanup.

**Cleanup process (if needed again):**
1. Map which pages are imported in each `App.tsx`
2. Check for internal dependencies (grep all imports)
3. Delete orphaned files in batches per app
4. Run `npm run dev:mf:xxx` to verify no import errors
5. Commit with message: `refactor: remove orphaned pages from mf-xxx`

### Data Enrichment as a Pattern

When the backend API doesn't return complete nested objects:
- Don't modify the backend API (may serve other clients differently)
- Enrich data in the frontend service layer using `Promise.all()`
- Add console.log statements showing data source for debugging
- Always include error handling (catch and fallback)
- This pattern is used in `mf-evaluations/services/professorEvaluationService.ts`

### Cross-Microfrontend Data Dependencies

Each microfrontend is isolated, but data flows between them:
- mf-evaluations needs data from mf-admissions (applications)
- mf-admin manages evaluators for mf-evaluations
- Data is shared via backend APIs, not frontend imports

When adding new features that depend on cross-app data, extend the backend-sdk types and service layer.

## Email Management System

The project has a centralized email system with 10 email flows:

**Authentication Emails:**
- Verification code (registration) → `/v1/email/send-verification` (type: REGISTRATION)
- Password reset code → `/v1/email/send-verification` (type: PASSWORD_RESET)

**Application Lifecycle:**
- Application received → `/v1/institutional-emails/application-received/{id}`
- Document reminder → `/v1/institutional-emails/document-reminder/{id}`
- Document review result → `/v1/institutional-emails/document-review/{id}`
- Status update → `/v1/institutional-emails/status-update/{id}`
- Admission result → `/v1/institutional-emails/admission-result/{id}`

**Interview Management:**
- Interview invitation → `/v1/institutional-emails/interview-invitation/{id}`
- Interview reminder → `/v1/institutional-emails/interview-reminder/{id}`

**Flexible Template System:**
- Custom templates → `POST /v1/email-templates/send`
- Service: `microfrontends/packages/shared-ui/src/services/emailTemplateService.ts`

**Known Gaps:**
- Some email flows are partially implemented (app received, document reminder not always triggered)
- No automated reminders (24h before interview) — requires backend job scheduler
- Limited visibility into email queue status from frontend

See `.gstack/qa-reports/EMAIL_FLOWS_AUDIT_2026-05-09.md` for detailed mapping.

## Code Duplication (Critical Architectural Issue)

**Status:** ~265,000 lines of duplicated code across 8 microfrontends.

**Root Cause:** Each app copies identical code instead of importing from `packages/`:
- Services (api.ts, authService.ts, etc.) duplicated 8× 
- Components (Button, Table, Filters) duplicated 8×
- 70 static files (images, config) duplicated 8×
- 150+ hardcoded values (roles, URLs, emails) scattered across apps

**Impact:**
- 8 hours to add a new role (edit 4+ files, verify 8 apps)
- 8× risk of inconsistency (one app diverges from others)
- Bug fixes must be replicated manually (easy to miss)

**Recommended Solution:** Consolidate into `packages/`:
```
packages/
├── shared-ui/          # Already exists: components, types, services
├── hooks/              # Shared custom hooks
├── constants/          # Email triggers, roles, validation limits
└── assets/             # Centralized images & logos
```

**Action Items:**
1. Consolidate roles into `packages/shared-ui/constants/roles.ts` (2h)
2. Consolidate email placeholders into `packages/shared-ui/constants/placeholders.ts` (1h)
3. Centralize images in `packages/assets/` (30min)
4. Unify tsconfig.json and vercel.json (1h)

See `.gstack/qa-reports/` directory for:
- `PROJECT_STATE_AUDIT_2026-05-08.md` — Detailed code duplication analysis
- `STATIC_FILES_AUDIT_2026-05-09.md` — Static file duplication report
- `HARDCODED_VALUES_AUDIT_2026-05-09.md` — Scattered configuration values

## Shared Packages Architecture

**Current Structure:**
- `backend-sdk`: API types and client (re-exported from shared-ui)
- `contracts`: Type definitions
- `shared-utils`: Utility functions
- `shared-ui`: Components, services, types (primary reuse point)

**Pattern:** Each app re-exports from shared packages:
```typescript
// mf-admin/services/api.ts
export * from '../../../packages/shared-ui/src/services/api';
```

**When adding shared code:**
1. Implement in `packages/shared-ui/src/`
2. Re-export from each app (or update tsconfig alias)
3. Verify it works in 2+ apps before considering it "shared"
4. Document in README of the package

## Future Improvements & Known Issues

**Audits completed (2026-05-09):**
- `PROJECT_STATE_AUDIT_2026-05-08.md` — 265K lines of duplicated code
- `STATIC_FILES_AUDIT_2026-05-09.md` — 70 duplicate static files (images, config)
- `HARDCODED_VALUES_AUDIT_2026-05-09.md` — 150+ scattered configuration values
- `EMAIL_FLOWS_AUDIT_2026-05-09.md` — 10 email flows with 4 implementation gaps

**High Priority:**
1. **Consolidate code duplication** (5-10h refactor saves 100+ hours/year in maintenance)
   - Move shared services to `packages/`
   - Unify component library in `packages/shared-ui/`
   - Centralize constants (roles, URLs, validation limits)

2. **Complete email flow implementation** (5h work)
   - Wire up "application received" trigger from frontend
   - Add automatic "document reminder" scheduling
   - Add visibility into email queue status

3. **Centralize static files** (2-3h work)
   - Move images to `packages/assets/`
   - Update build to copy from shared location
   - Eliminates 8 image copies per logo change

**Medium Priority:**
- Implement email retry logic with exponential backoff
- Add email tracking dashboard in admin panel
- Create Storybook for shared-ui components
- Automate template variable documentation

**Known Quirks:**
- Each app has its own `.env` file pattern but reads from root (not per-app)
- TypeScript errors in one app don't affect others when run separately
- Pages folder can contain internal-only components (not all are routes)
- Some services call backend endpoints that return incomplete data (enrichment required)

