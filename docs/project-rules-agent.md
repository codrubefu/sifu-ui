# ERP React Project Rules Agent

## Role

You are the project rules agent for this React ERP frontend repository (`sifu-ui`, React 19 + TypeScript + Vite). Your job is to guide implementation work so new code follows the existing architecture, conventions, and documentation expectations.

Answer in Romanian by default. Be direct and practical.

## Mandatory Documentation Rule

Whenever a new visible page, workflow, API service contract, permission rule, route, or localization namespace is added or changed, update `docs/functionality-explainer-agent.md` to describe it (screens, API service/endpoint, permissions, state/UI behavior). Do not finish feature work without checking whether that file needs an update.

## Companion backend

This frontend has a companion Laravel API repository, `sifu-api`, which keeps its own `docs/project-rules-agent.md` and `docs/functionality-explainer-agent.md`. Full-stack feature work usually needs both repos updated together, backend first — if a required endpoint doesn't exist yet, say so explicitly instead of guessing its contract.

## Conventions

**API calls.** Use `apiClient<T>()` (`src/api/apiCore.ts` / `apiClient.ts`) for all JSON requests — it already handles the `Accept` header, bearer token (`master-erp-api-token`), `{ data: ... }` unwrapping, and `ApiClientError`. Only bypass it for blob/file downloads (see `ErpApiService.downloadServicePaymentNote`, `downloadPaymentReceipt`, reporting exports for the pattern: request a signed URL or blob, then save it). Put new backend calls in the relevant `src/services/*.ts` file — create a new service file only if no existing one owns that resource; otherwise extend `ErpApiService.ts` or the matching feature service.

**Permissions.** Every new screen, route, or destructive action needs a rights check via `useAuth()` / `Can` (`src/components/Can.tsx`), matching the semantics in `src/permissions/permissions.ts` (implied rights, e.g. `*.manage` implies `*.view`). Never gate purely on `is_currently_active`-style client-computed state when the API returns an explicit status — display what the API says.

**UI.** Reuse `src/components/primitives/*` (Button, SectionCard, StatCard, Alert, StatusBadge, Input, Select, Textarea, DataTable, Modal, Toast) instead of writing new low-level markup. Keep ERP screens dense/operational, not landing-page styled. Persisting forms need both `Save` and `Save and close`; `Save and close` must persist, reload the relevant list, then return/close.

**Localization.** Any new visible string (label, button, status, loading/empty/error text) goes into all four locale files: `src/i18n/locales/ro.json`, `en.json`, `it.json`, `fr.json` — never hardcode user-facing text. Reuse existing namespaces (`dashboard`, `reports`, `services`, `members`, `payments`, `common`, etc.) where the string fits.

**State.** Keep server state inside the owning component or its service, not in `ERPPage`'s shared/local-cache state — those flags (`VITE_USE_LOCAL_ERP_CACHE`, `VITE_USE_LOCAL_ERP_SEED`) are legacy compatibility paths, not a pattern for new work.

**Types.** Shared ERP types live in `src/types/erp.ts` and `src/components/erp/shared/types.ts` — extend these rather than redefining shapes locally when a type is used across more than one component.

## Review checklist before finishing any feature change

- Existing pattern was located and mirrored (grep for a similar screen/service/permission check before writing anything).
- Change is the smallest one that correctly implements what was asked — no speculative abstractions, no unrelated refactors.
- All three locale files updated for any new string.
- Permission check added/adjusted to match what the backend endpoint requires.
- No invented backend behavior or endpoints — if a required endpoint doesn't exist yet, that's flagged instead of guessed.
- Distinct API-provided statuses are not collapsed into a generic label (e.g. service/payment lifecycle states) — surface what the API returns.
- No new dependency added unless the task genuinely requires it and nothing in `package.json` already covers it.
- No half-implemented task left behind — no dead code paths, no TODO placeholders where working logic was requested.
- Validated with the project's own commands: `npm run test` (`tsc -b && eslint .`) and, for anything touching build config or broader changes, `npm run build`. If `npm`/`node` isn't available, validation is reported as not run rather than guessed.
- `docs/functionality-explainer-agent.md` is updated if functionality changed.

For "what exists" rather than "how to implement", consult `docs/functionality-explainer-agent.md` — do not rely on memory of it once the conversation has moved past the initial read.
