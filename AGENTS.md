# Sifu UI agent guide

## Project overview

- Multi-tenant martial arts / sports-club ERP; companion Laravel backend: `sifu-api`.
- React 19 + strict TypeScript; Vite with React Compiler enabled.
- React Router 6: `main.tsx → routes/AppRoutes.tsx → App.tsx → pages/ERPPage.tsx`.
- ERPPage selects sections from the URL; `components/erp/Content.tsx` renders them.
- AuthContext owns identity/rights; features own server state via React state/hooks.
- Tailwind 4, shared primitives, Lucide icons; i18next locales: ro, en, it, fr.
- JSON API adapters/services use bearer authentication and runtime API config.
- `npm test` checks types and lint only; no behavioral test runner is installed.

## Repository map / where to change code

Paths below are under `src/` unless stated otherwise.

- `components/erp/<domain>/` — feature screens and local logic. Start here for a screen task.
- `pages/ERPPage.tsx`, `components/erp/Content.tsx` — ERP navigation and shell orchestration;
  `components/layout/` and `components/AppLayout.tsx` — header/sidebar/layout.
- `routes/AppRoutes.tsx` — top-level routes; events/articles own nested module routes.
- `context/`, `components/auth/`, `api/authApi.ts` — identity, login and profile;
  password-reset pages use `api/passwordResetApi.ts`.
- `permissions/permissions.ts`, `components/Can.tsx`, `components/ProtectedRoute.tsx` — rights.
- `services/` — domain API operations and DTOs; search the matching service first.
  `api/apiClient.ts` + `api/apiCore.ts` — shared transport, token, errors, envelopes.
- `components/primitives/` — reusable UI; `components/erp/shared/` — ERP composition/props.
- `types/erp.ts` — legacy shell/display models; API DTOs remain with their services.
- `utils/erp/`, `utils/ui/` — formatting/parsing and class names; `i18n/locales/` — copy.
- `config/runtimeConfig.ts`, root `public/app-config.json`, `vite.config.ts` — API deployment/proxy.

For forms: start with the domain form/view, then its payload helpers and service
DTOs. Validation is handwritten; there is no schema library. For detailed task
paths and known legacy traps, read `docs/AI_GUIDE.md` only as needed.

## Architecture rules

- Use the owning service for backend calls; keep fetch out of presentation components.
  Prefer `apiClient<T>()` for new JSON calls. Preserve existing ERP/event raw-envelope
  handling and blob/signed-download paths; they are not interchangeable transports.
- Keep feature logic/types colocated. Share only across real consumers; reuse
  existing contracts without merging legacy display types with backend DTOs.
- Keep business transformations outside JSX where practical. Avoid abstractions
  without two real uses and avoid new barrel chains; prefer direct domain imports.
- Reuse primitives; check rights with useAuth/Can and preserve API-provided statuses.
- New visible text belongs in all four locales. Persisting forms provide Save and
  Save and close (persist, reload, then return).
- Do not extend ERPPage's legacy local-cache/seed state for new API-driven features.
- Search relevant headings in `docs/project-rules-agent.md` for detailed conventions
  and `docs/functionality-explainer-agent.md` for behavior. Read only relevant sections.
  Update the explainer when screens, workflows, contracts, rights, routes or locale
  namespaces change. Trust current code when documentation disagrees.
- Do not invent backend contracts; coordinate needed changes with `sifu-api`.

## Commands and validation

- Install: `npm ci` (lockfile install); `npm install` when changing dependencies.
- Development: `npm run dev` starts Caddy + Vite and requires sudo/Caddy.
  `npm run dev:vite` starts only Vite, without the proxy on port 80.
- Lint: `npm run lint`; type checks: `npm run typecheck`.
- Combined static checks: `npm test`; production build: `npm run build`.

After changes: run lint and type checks (or `npm test`), relevant behavioral tests
if added, and build for structural changes. Report the absence of behavioral tests;
use focused browser checks for UI changes. Avoid unrelated formatting.

Search symbols/imports before reading whole files. Normally skip `node_modules/`,
`dist/`, coverage, lockfile contents, binary assets and full locale files. Read these
only for dependency, build, asset or localization tasks. Never scan all docs first.
