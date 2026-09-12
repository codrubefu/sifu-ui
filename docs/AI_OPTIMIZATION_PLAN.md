# Agent navigation optimization

Scope: preserve behavior and the existing domain folders; no dependency additions.

## Findings

- `main.tsx → AppRoutes → App/ERPPage → erp/Content` is the active entry chain.
  `pages/erp/ERPContentRoutes.tsx` is a separate, unreferenced route implementation.
- ERP UI is already grouped by domain. Services are centralized in `src/services`;
  authentication and tenant API adapters live in `src/api`.
- Largest exploration hotspots at audit: `MembersView.tsx` (~2,300 lines),
  `ReportsView.tsx` (~730), `ErpApiService.ts` (~695), `ProfilePages.tsx` (~560).
  Members mixes forms, relation tabs, service lifecycle derivation and payments;
  the core service mixes API contracts and requests for several resources.
- No direct fetches in presentation components. Core ERP and event requests
  duplicate transport mechanics but differ in envelopes/errors; preserve them.
- Member date/payment helpers overlap shared formatters, but date serialization
  differs (seconds handling). Do not consolidate by name alone.
- Shared ERP props include legacy shapes with names also used by current views;
  API DTOs and legacy display models are distinct contracts, not interchangeable.
- Static TypeScript import/export graph found no cycles. No static importers for
  `AppContent.ts`, `AppPrimitives.ts`, `HomePage.tsx`, or `ERPContentRoutes.tsx`.
  These are cleanup candidates, not proof of safe deletion. Broad ERP barrels
  remain compatibility surfaces; active Content already uses direct imports.
- No test files or test runner found. `npm test` is TypeScript plus ESLint.
- Existing docs repeat onboarding and obscure the active route path. Event files,
  translations and the functionality explainer had pre-existing working changes.

## Planned changes

1. Add root/task-oriented guidance and one local member-domain guide.
2. Extract member service-assignment derivation into a colocated module without
   changing function bodies, ordering, fallback rules or API contracts.
3. Align Claude onboarding with targeted reads; preserve detailed conventions.
4. Add typecheck and Vite-only scripts; replace README template boilerplate and
   correct development startup instructions; ignore generated coverage output.
5. Run existing static checks and production build; verify extraction against
   original function bodies and review diff for unrelated changes.

## Deferred

Do not migrate folders, replace state management, merge request transports,
remove compatibility exports, consolidate differing types, or split all tabs in
this pass. Those changes need task-specific behavior coverage. Leave existing
uncommitted event work and the functionality explainer untouched.
