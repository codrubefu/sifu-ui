# Finding code by task

Read root `AGENTS.md` first. Paths below start at `src/`.

| Task | Smallest useful exploration path |
| --- | --- |
| Login/session | `components/auth/LoginView.tsx` → `pages/ERPPage.tsx` login handler → `services/ErpApiService.ts` login → `context/AuthContext.tsx` |
| Password reset | `pages/ForgotPasswordPage.tsx` / `SetPasswordPage.tsx` → matching auth view → `api/passwordResetApi.ts` |
| Add/change ERP navigation | `pages/ERPPage.tsx` section parsing → `components/erp/Content.tsx` → `components/layout/Sidebar.tsx` → `types/erp.ts` / permissions |
| Members/admins | `components/erp/members/AGENTS.md` → `users/UsersView.tsx` or `admins/AdminsView.tsx` → shared `members/MembersView.tsx` |
| Member service status/history | `components/erp/members/memberServiceAssignments.ts` → consuming member view → `services/serviceLifecycleService.ts` |
| Service definitions / payments | `components/erp/services/ServicesView.tsx` or `payments/` → `services/ErpApiService.ts`, `paymentService.ts`, `serviceLifecycleService.ts` as imported |
| Events / attendance | `components/erp/events/EventsModule.tsx` → matching page / `hooks.ts` → `services/eventService.ts`; rapid scanning starts in `check-in/CheckInView.tsx` |
| Articles | `components/erp/articles/ArticlesModule.tsx` → form/list/details → `services/articlesService.ts` |
| Reports / campaigns | `components/erp/reports/ReportsView.tsx` or `campaigns/CampaignsView.tsx` → `services/reportingService.ts`, `segmentsService.ts`, `campaignsService.ts` as imported |
| Self/child profile | `components/erp/profile/ProfilePages.tsx` → `api/authApi.ts`; privacy/documents use their dedicated panels and services |
| Backend endpoint | Search endpoint/method in `services/` and `api/` → DTO → importing hook/view; inspect `apiCore.ts` only for transport issues |
| Tenant / API origin | `services/OrganizationConfigService.ts` → `api/organizationApi.ts`; API host: `config/runtimeConfig.ts` + `public/app-config.json` + `vite.config.ts` |
| Shared styling / text | Domain view → imported primitive → `index.css`; search the relevant key in `i18n/locales/{ro,en,uk}.json` |

## Debugging flow

1. Find the feature entry point using the table or `rg --files src/components/erp`.
2. Read local AGENTS.md if present, then locate the symbol with `rg -n 'symbol' src`.
3. Inspect the importing component and its service/hook; follow only relevant imports.
4. Inspect shared code only when implicated. Search detailed docs by heading:
   `rg -n '^##|^###' docs/functionality-explainer-agent.md`.
5. Make the smallest change, update affected behavior documentation and validate
   with root AGENTS.md commands. Do not refactor unrelated features.

## Architecture traps

- Active rendering uses `ERPPage → components/erp/Content.tsx`, not
  `pages/erp/ERPContentRoutes.tsx`. The latter has no static importer in the audit.
  `AppContent.ts` / `AppPrimitives.ts` are compatibility re-export layers, not
  preferred entry points. `App.tsx` aliases ERPPage; main mounts AppRoutes.
- Server data generally stays in feature state. ERPPage retains old forms/cache
  flows for some screens; `VITE_USE_LOCAL_ERP_CACHE` and `VITE_USE_LOCAL_ERP_SEED`
  are compatibility options, not guidance for new features.
- Core ERP uses its own requestRaw/request path; events also preserve raw envelope
  metadata. A blanket replacement with apiClient would change response/error behavior.
- `types/erp.ts` is a display/shell model; `ErpApiService.ts` owns core API DTOs.
  Feature services own their DTOs. Similar names do not imply identical contracts.
- No global query cache/store or schema framework. Hooks are colocated (auth and
  events); other views use React effects/state directly.
- Reports, profiles and members remain large. Search exported functions and local
  handlers before reading whole files. Do not split stateful tabs without checking
  their shared state, rights, save/reload sequence and child/user scope.

Do not read the entire repository before starting. Skip generated output, assets,
lockfile contents and unrelated manuals by default. Preserve established patterns
unless the task shows a concrete source of recurring complexity. Audit rationale
and deferred cleanup are in `docs/AI_OPTIMIZATION_PLAN.md`, not required onboarding.
