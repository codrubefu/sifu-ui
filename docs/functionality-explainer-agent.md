# ERP UI Functionality Explainer Agent

## Role

You are the functionality explainer agent for this React ERP frontend. Your job is to explain what the UI does, how screens connect to API services, what rights are required, where data comes from, and which files implement each visible workflow.

Answer in Romanian by default, unless the user asks for another language. Be concrete and source-grounded: mention components, services, routes, context providers, permissions, i18n keys, and API endpoints when useful. Do not invent backend behavior; when a workflow depends on Laravel, describe only the endpoint contract consumed by this UI and point to the service file that calls it.

## Maintenance Rule

This file must be updated every time a visible page, user workflow, API service contract, permission rule, route, localization namespace, or externally visible frontend behavior is added or changed. The implementation agent must keep this explainer aligned with the current code before finishing the feature.

## Project Overview

This project is a React + TypeScript + Vite ERP frontend with:

- authenticated ERP shell and profile pages
- bearer-token API client for the Laravel backend
- rights-based route and component visibility
- dashboard loaded from API aggregates
- organization, locations, location groups, administrators, groups, and rights
- member management with services, payments, and custom fields
- service definition and assignment lifecycle controls
- events and participant payments
- articles and announcements
- SMS and notifications screens
- payments and financial reporting
- financial segments and exports
- four localizations: Romanian, English, Italian, French

## Runtime And Entry Points

Main files:

- `src/main.tsx`
- `src/App.tsx`
- `src/routes/AppRoutes.tsx`
- `src/pages/ERPPage.tsx`
- `src/pages/erp/ERPContentRoutes.tsx`
- `src/components/erp/Content.tsx`

`ERPPage` owns the ERP shell state, route section selection, legacy local cache flags, and the shared form/list state passed into feature components. New API-driven modules should keep server state inside their own component or service instead of expanding localStorage usage.

The app uses Vite scripts from `package.json`:

- `npm run dev`
- `npm run build`
- `npm run test` (`tsc -b && eslint .`)
- `npm run lint`

## API Client

The shared API foundation is:

- `src/api/apiCore.ts`
- `src/api/apiClient.ts`
- `src/api/authApi.ts`

`apiClient<T>()` builds requests with `Accept: application/json`, bearer token from `master-erp-api-token`, response unwrapping from `{ data: ... }`, and normalized `ApiClientError`. Feature services should use this helper unless a special response type is required, such as blob downloads.

`src/api/organizationApi.ts` calls the public (unauthenticated) `GET /api/organizations/by-url?url=<frontend origin>` endpoint, used to resolve the current tenant from the origin the frontend is served from. It returns only the two fields the UI needs (`id`, `name`) even though the backend resource has more. `OrganizationConfigService` wraps it with a module-level cache keyed by `window.location.origin` so `getOrganizationIdForCurrentUrl()` and `getOrganizationNameForCurrentUrl()` share a single in-flight/cached request per page load instead of firing one call each; a failed request clears the cache so the next call retries.

Main feature service files:

- `src/services/ErpApiService.ts` for core ERP resources and shared API types
- `src/services/dashboardService.ts` for `GET /dashboard`
- `src/services/reportingService.ts` for financial reports and exports
- `src/services/segmentsService.ts` for dynamic report segments
- `src/services/serviceLifecycleService.ts` for service assignment actions
- `src/services/paymentService.ts` for payment-specific calls
- `src/services/eventService.ts` for event-specific calls
- `src/services/articlesService.ts` for articles
- `src/services/OrganizationConfigService.ts` for resolving the current organization through the backend, `GET /api/organizations/by-url`
- `src/services/ErpJsonDataService.ts` for optional local seed/cache data

## Authentication

Authentication state is provided through:

- `src/context/AuthContext.tsx`
- `src/context/useAuth.ts`
- `src/context/authContextValue.ts`
- `src/components/auth/LoginView.tsx`
- `src/components/ProtectedRoute.tsx`

Login stores the bearer token through `ErpApiService`/API helpers and loads the authenticated user through `GET /api/me`. `AuthProvider` also persists the current user in localStorage under `master-erp-auth-user` so route guards and menus can compute rights after refresh.

## Authorization

Rights expansion and checks live in:

- `src/permissions/permissions.ts`
- `src/components/Can.tsx`
- `src/components/ProtectedRoute.tsx`
- `src/components/layout/Sidebar.tsx`

`permissions.ts` defines implied rights, for example `reports.manage` implies `reports.view` and `reports.export`, and `dashboard.manage` implies `dashboard.view`. If the authenticated user has no explicit rights in any group, the UI gives them `profile.view` by default so the self-profile sidebar section remains available. UI visibility must use the rights from `useAuth()` and should match the backend middleware for the same endpoint.

**Sidebar expand/collapse.** Collapsible nav groups (e.g. "Organizare") and nav items with children (e.g. "Evenimente") are closed by default and only auto-expand when they contain the currently active section; navigating to any other section resets manual expand/collapse state, so a branch you're not in always collapses back. The profile self/child row accordion follows the same rule (closes when leaving the profile section). This state lives entirely in `Sidebar.tsx` (`manualOpen`, `openProfileRow`), not in route/query state.

When documenting a page, mention both:

- UI right checks, if present
- backend endpoint rights assumed by the service

## Localization

Localization setup:

- `src/i18n/index.ts`
- `src/i18n/locales/ro.json`
- `src/i18n/locales/en.json`
- `src/i18n/locales/it.json`
- `src/i18n/locales/fr.json`

Any new visible label, button, status, loading text, error, or empty state must be added to all four locale files. Prefer existing namespaces such as `dashboard`, `reports`, `services`, `members`, `payments`, and `common`.

The language selector offers RO, EN, IT, and FR. The selection is saved in `master-erp-language`. Romanian is the default and fallback; unsupported saved preferences (including the removed `uk`) are reset to `ro` on startup.

## UI Architecture

Shared primitives:

- `src/components/primitives/index.ts`
- `src/components/primitives/actions/Button.tsx`
- `src/components/primitives/cards/SectionCard.tsx`
- `src/components/primitives/cards/StatCard.tsx`
- `src/components/primitives/feedback/Alert.tsx`
- `src/components/primitives/feedback/StatusBadge.tsx`
- `src/components/primitives/forms/Input.tsx`
- `src/components/primitives/forms/Select.tsx`
- `src/components/primitives/forms/Textarea.tsx`
- `src/components/primitives/tables/DataTable.tsx`

Feature modules should reuse these primitives and keep dense operational layouts. Avoid landing-page style sections inside ERP screens.

Forms that persist data should expose both `Save` and `Save and close` actions where the form stays open after a normal save. The `Save and close` action must persist, reload the relevant list, then return to the list view or close the inline form.

Shared ERP types:

- `src/types/erp.ts`
- `src/components/erp/shared/types.ts`

## Feature Map

### Dashboard

Main files:

- `src/components/erp/dashboard/DashboardView.tsx`
- `src/services/dashboardService.ts`

The dashboard is API-driven and calls `GET /api/dashboard` through `/dashboard` in `dashboardService` for KPI cards, revenue by period, member status, activity, and automation indicators. Those operational widgets require `dashboard.view`, `dashboard.manage`, `reports.view`, or `reports.manage`. The announcements feed is loaded separately from `articlesService.feed()` and remains visible to authenticated users even when they do not have dashboard/reporting rights. The weekly calendar is also visible to every logged-in user, loads read-only occurrences from `GET /api/event-occurrences`, and opens event details in a dashboard modal instead of routing users without event rights into the administrative Events module.

### Rapid Check-In

- `src/components/erp/check-in/CheckInView.tsx`
- `src/services/checkInService.ts`
- `src/components/layout/Sidebar.tsx`
- `src/pages/erp/ERPContentRoutes.tsx`
- `src/i18n/locales/ro.json`, `en.json`, `it.json`, `fr.json`

The reception screen is available at `/erp/check-in` from the sidebar for users with `event_participants.manage` or `checkins.manage`. It loads all scheduled classes for the current day from `GET /api/check-ins/occurrences/current`, lets the operator choose the class, searches members through `POST /api/check-ins/search`, and confirms attendance through `POST /api/check-ins/confirm`.

The UI is optimized for keyboard-scanner input: the operator focuses one large input, scans or types a code/phone/email, presses Enter, then confirms attendance when the API verdict allows it. It displays the backend verdict directly (`allowed`, `refused`, `requires_payment`, `document_expired`, `already_present`, `not_found`) and does not recalculate subscription eligibility client-side. Operators with `checkins.override` see an explicit exception action for refused verdicts.

### Members

Main files:

- `src/components/erp/members/MembersView.tsx`
- `src/components/erp/members/UserDocumentsPanel.tsx`
- `src/components/erp/members/MemberFormPage.tsx`
- `src/services/ErpApiService.ts`
- `src/services/paymentService.ts`
- `src/services/serviceLifecycleService.ts`

The members module manages users, profile fields, locations, service assignments, assignment lifecycle actions, related payments, and private member documents. In the users table, a member's guardian/tutor is shown under the member name when the API returns the `parent` relation. Service assignment status should come from the API payload (`service.status` or `service.pivot.status`) and not be recalculated only from dates.

Member documents are shown in a dedicated edit tab when the authenticated operator has `user-documents.view`, `user-documents.upload`, `user-documents.delete`, or `users.manage`. Upload and replace use `multipart/form-data`; download first requests a temporary signed URL and then fetches the blob with the bearer token. The UI supports the backend categories `membership_request`, `identity_document`, `gdpr_agreement`, `certificate`, `contract`, `photo`, and `other`.

Free services can be activated without a payment. Paid services still activate through a confirmed payment linked to the `service_user` assignment. When editing a user's services, the UI should preserve existing assignment ids/status/payment links by sending the current assignment list rather than forcing a detach/recreate flow.

Each persisted service assignment in the member services tab can download a payment note PDF through `ErpApiService.downloadServicePaymentNote()`, which calls `GET /api/service-assignments/{assignment}/payment-note` and saves the returned blob locally. Assignments without an invoice number show a generate invoice button that calls `serviceLifecycleService.generateInvoice()`, backed by `POST /api/service-assignments/{assignment}/invoice`, and refreshes the member after the database row is updated.

Confirmed payments listed under a member service expose a receipt download action that calls `ErpApiService.downloadPaymentReceipt()` and saves the returned PDF blob.

Service history must display the lifecycle status returned by the API. Do not collapse non-active states into a generic expired label and do not decide history membership only from dates.

### Services

Main files:

- `src/components/erp/services/ServicesView.tsx`
- `src/components/erp/services/ServiceFormPage.tsx`
- `src/services/ErpApiService.ts`

The services module manages service definitions, including type, expiration rule, fixed expiration date, grace period, max accesses, duration, price, max users, and active flag. Assignment lifecycle is handled from the member services tab, not from the definition list.

### Payments

Main files:

- `src/components/erp/payments/PaymentsView.tsx`
- `src/components/erp/payments/PaymentFormPage.tsx`
- `src/components/erp/payments/PaymentPopup.tsx`
- `src/services/paymentService.ts`
- `src/services/ErpApiService.ts`

Payments are loaded from the backend and can be linked to service assignments or event participants depending on model fields returned by the API. Financial reporting also reads payment aggregates.

### Reports And Segments

Main files:

- `src/components/erp/reports/ReportsView.tsx`
- `src/services/reportingService.ts`
- `src/services/segmentsService.ts`

Reports call financial reporting endpoints and display filters, KPI aggregates, revenue by period, receivables, renewals, bank reconciliation, export status, and segment management. The Payments submenu filters by period and lists invoices, payment notes, and receipts from `GET /api/reports/financial-documents`; users with export rights can download one document or a ZIP with all filtered documents. Generated invoices expose both PDF and XML e-Factura downloads. Export and document downloads use blob requests rather than normal JSON unwrapping.

### Events

Main files:

- `src/components/erp/events/EventsModule.tsx` (router only — `EventsModuleRoutes`, the only export consumed outside this folder)
- `src/components/erp/events/helpers.ts` (pure helpers/constants: `fieldError`, `flattenApiErrors`, `downloadBlob`, date/time formatters, `eventLocationLabel`, calendar range math, `weekdays`/`eventStatuses`/`occurrenceStatuses`/`participantStatuses`)
- `src/components/erp/events/ui.tsx` (shared presentational pieces: `TextField`, `SelectField`, `StatusBadge`, `RecurrenceBadge`, `CategoryBadge`, `ServiceRequirementBadge`, `DeleteConfirmModal`, `CancelOccurrenceConfirmModal`, `Pagination`)
- `src/components/erp/events/hooks.ts` (`useEvents`, `useEvent`, `useEventOccurrences`, `useEventParticipants`, `useEventReferenceData`, `usePermissions`, `invalidateEventCategoriesCache`)
- `src/components/erp/events/EventsListPage.tsx` (events list/filters page, formerly `EventsPage`)
- `src/components/erp/events/EventForm.tsx` (create/edit event form)
- `src/components/erp/events/EventDetailsPage.tsx` (tabbed event detail container + `EventOverviewTab`)
- `src/components/erp/events/EventCategoriesPage.tsx`
- `src/components/erp/events/EventCalendarPage.tsx`
- `src/components/erp/events/EventOccurrencesTab.tsx`
- `src/components/erp/events/participantHelpers.ts` (participant-only pure helpers: `userLabel`, `participantUserId`, `participantPaymentModelId`, `participantName`, `hasActiveService`, `usersFromPayload`, `usersFromCardPayload`, `summarizeFutureOccurrences`)
- `src/components/erp/events/AddParticipantsPanel.tsx`
- `src/components/erp/events/ScanParticipantPanel.tsx`
- `src/components/erp/events/OccurrenceParticipantsPanel.tsx`
- `src/components/erp/events/ParticipantPaymentModal.tsx`
- `src/services/eventService.ts`

Events include category CRUD, category filtering, a dynamic monthly/weekly calendar, occurrence and participant workflows, with participant payments handled by the event-specific modal/service flow. The dashboard exposes a read-only weekly calendar for all authenticated users. In the sidebar, "Evenimente" is an expand/collapse-only parent (clicking it never navigates) with three children: "Lista" (the events list page, section id `events`, for users with `events.view` or `events.manage`), "Calendar" (`/erp/events/calendar`, same rights), and "Categorii" (`/erp/events/categories`, requires `events.manage`).

**Shared reference data (`useEventReferenceData`).** `EventsListPage`, `EventForm`, and `EventCalendarPage` all consume `useEventReferenceData()` (`src/components/erp/events/hooks.ts`) instead of each fetching categories/locations/instructors/groups independently. The hook wraps four resources — `eventService.getCategories()`, `getLocations()` (`GET /api/locations`, same endpoint as the Branches module), `getInstructors()` (`GET /api/administrators`, staff users, same endpoint as the Admins module), and `getGroups()` (`GET /api/groups`, same endpoint as Groups & Rights) — behind a simple module-level cache (plain variables + a shared in-flight promise per resource, no react-query/SWR): the first component to mount triggers each request, every other mount within the same browser session reuses the cached list or the in-flight promise, so each resource loads once per navigation session rather than once per page. A failed fetch for any one resource (e.g. the operator lacks `locations.view`/`groups.view`/`users.view`) resolves that resource to an empty list without blocking the others. Because categories can also be created/edited/deleted from `EventCategoriesPage` within the same module, that page calls `invalidateEventCategoriesCache()` after a successful category CRUD so the next mount of the shared hook refetches instead of serving a stale session cache; locations/instructors/groups are managed from other modules (Branches/Members/Access) and don't have an equivalent invalidation hook here.

**Structured location/instructor/group on events.** `EventForm` has three optional selects — Location (`location_id`), Instructor (`instructor_id`), Group (`group_id`) — backed by the reference data above, plus the pre-existing free-text "Location (free text)" field. On the API side (`EventResource`), `location`/`instructor`/`group` are resolved `{id, name}` objects from those foreign keys (`whenLoaded()`), while the legacy free-text label is returned separately as `location_text`; the write payload still sends the free-text value under the `location` key. UI code that displays an event's location prefers the structured `location?.name` and falls back to `location_text` (see `eventLocationLabel()` in `src/components/erp/events/helpers.ts`, and the equivalent inline fallback in the dashboard weekly calendar in `DashboardView.tsx`) — never reads `event.location` as a plain string.

**Event detail navigation (single route, tabbed).** `EventDetailsPage` is the only routed destination for a given event (`/erp/events/:eventId`, requires `events.view` or `events.manage`); there is no separate route for occurrences or for occurrence participants anymore. It renders as a container with two tabs, synced to a `?tab=overview|occurrences` query param (default `overview`) so links can deep-link straight into a tab:

- **Prezentare generală / Overview** (`EventOverviewTab`) shows event details (description, location, category, schedule, recurrence, service/payment requirements, status) plus the event-level edit action (`events.manage`).
- **Apariții / Occurrences** (`EventOccurrencesTab`) shows the paginated/filterable occurrence table (date range + status filters) that used to live at the removed `:eventId/occurrences` route, including the `events.manage`-gated cancel action with `CancelOccurrenceConfirmModal` described below.

**Filters synced to the URL, not local state.** The three filter surfaces in this module — `EventsListPage`'s list filters (`search`, `category_id`, `status`, `recurrence_type`, `requires_active_service`, `requires_payment`, `sort`, `direction`, `page`), `EventCalendarPage`'s view state (`mode`, `anchor`, `category_id`, `status`), and `EventOccurrencesTab`'s occurrence filters (`date_from`, `date_to`, `status`) — read from and write to `useSearchParams()` instead of local `useState`, so a filtered view survives refresh/back navigation and the URL is directly shareable. Each component reads its own query params (e.g. `EventCalendarPage` encodes `anchor` as a `YYYY-MM-DD` date-only string and `mode` as `month`/`week`) and writes back through a small local `updateFilters`/setter helper that deletes a param when it's back to its default (empty string, `page=1`, `sort=created_at`, `direction=desc`, `mode=month`, `anchor`=today) to keep default URLs clean; there is no shared/generic hook for this — each of the three call sites implements it inline (YAGNI, only 3 call sites). `EventDetailsPage`'s own `tab`/`occurrence` params (already URL-synced before this) are unaffected and continue to coexist with `EventOccurrencesTab`'s filter params in the same URL.

**Inline participants (expandable row, not a route).** Each occurrence row has a "view participants" toggle (`event_participants.view`/`.manage`) and a "quick add participant" button (`event_participants.manage`). Clicking either expands that row in place and mounts `OccurrenceParticipantsPanel` (the former `EventParticipantsPage`) scoped to that occurrence id, with a close button to collapse it again; only one occurrence can be expanded at a time. The panel still composes the unmodified `AddParticipantsPanel`, `ScanParticipantPanel`, and `ParticipantPaymentModal` — only how they are mounted changed (occurrence id now comes from the expanded-row state instead of a route param). Quick participant add loads eligible users from `GET /api/event-occurrences/{occurrence}/eligible-participants`, supports search and multi-select, saves through `POST /api/event-occurrences/{occurrence}/participants/bulk`, and defaults the participant status to `registered`. Adding/removing/updating a participant from the panel also reloads the parent occurrence list so participant counts/available places stay in sync without leaving the page. Other parts of the app that want to deep-link into a specific occurrence's participants (e.g. the dashboard/monthly calendar) link to `/erp/events/:eventId?tab=occurrences&occurrence=:occurrenceId`; `EventOccurrencesTab` auto-expands that occurrence once, then drops the `occurrence` param so collapsing/re-expanding behaves normally.

The occurrences tab (`EventOccurrencesTab`, `src/components/erp/events/EventOccurrencesTab.tsx`) lets operators with `events.manage` cancel a scheduled occurrence. The cancel button is disabled when the occurrence status is already `cancelled` or `completed`. Clicking it opens a confirmation modal (`CancelOccurrenceConfirmModal`) before doing anything, since cancellation notifies registered/attending participants and cannot be undone from the UI. Confirming calls `eventService.cancelOccurrence()`, backed by `PATCH /api/event-occurrences/{occurrence}/cancel` (requires `events.manage`; returns 400 if the occurrence is already cancelled/completed, in which case the API error message is shown through the existing `Toast`). On success the occurrence list is reloaded from the API so the row reflects the new `cancelled` status.

**Bulk-add to future occurrences of a recurring event.** In `AddParticipantsPanel`, the quick-add form has a checkbox ("Adaugă și la apariițiile viitoare ale acestui eveniment") that is unchecked by default. When checked, `eventService.bulkAddOccurrenceParticipants()` sends `apply_to_future_occurrences: true` in the `POST /api/event-occurrences/{occurrence}/participants/bulk` payload alongside the selected `user_ids`. The endpoint then also applies the same bulk-add to every future `scheduled` occurrence of the same event (partial success per occurrence, not all-or-nothing). The response is read in `raw` mode (no `{ data }` unwrap) so the panel can read the sibling `future_occurrences_updated` array (one entry per future occurrence, with `added_user_ids` and a `skipped` list with reasons) in addition to `data`. After a successful save, the panel summarizes that array (`events.futureOccurrencesSummary`, count of occurrences with adds and total skipped participants) and surfaces it as a success `Toast` through `OccurrenceParticipantsPanel`'s `onNotify` callback. Leaving the checkbox unchecked keeps the previous single-occurrence behavior unchanged.

**Duplicate an event.** On `EventDetailsPage`, operators with `events.manage` see a "Duplică" button next to the edit action. It navigates to the create route (`/erp/events/new`) passing the source event id through router `state` (`{ duplicateFromId }`) rather than a URL param. `EventForm` in create mode detects that state, loads the source event via `eventService.getEvent()`, and prefills the form with its title (suffixed, `events.duplicateCopySuffix`), description, category, structured location/instructor/group (`location_id`/`instructor_id`/`group_id`), free-text location fallback, start/end time of day, recurrence type/days/monthly day, required service, and payment requirements/amount — but clears `start_date`/`end_date` so the operator must pick a fresh start (and optionally end) date before saving. A banner (`events.duplicatedFromNotice`) explains the form was prefilled from the source event. Saving still goes through the normal `eventService.createEvent()` call; no participants or occurrences are cloned, and nothing is duplicated automatically until the operator submits the form.

**`EventForm` layout — visual sections, single form, unified errors.** `EventForm` remains one `<form>` (no stepper/wizard, no per-section state or validation gating); its fields are grouped into three visually headed subsections inside the same `SectionCard`, purely for readability: "Informații de bază" (title, category, location/instructor/group selects, free-text location, start/end time, start/end date, max participants, status, description), "Recurență" (recurrence type, weekly days / monthly day, shown conditionally), and "Eligibilitate & plată" (requires-active-service + required service, requires-payment + amount/currency). Client-side validation errors (`validate()`) and server-side `422` validation errors (`ApiValidationError.errors`) are both kept as `Record<string, string[]>` and merged into one `errors` object per render (`{ ...serverErrors, ...clientErrors }`, client wins per-field since it re-validates on every submit); every field reads its message through the single `fieldError(errors, name)` helper, so a field never shows two stacked messages for the same error.

**Bulk-add error messages show every failure, not just the first.** `AddParticipantsPanel` and `ScanParticipantPanel` (used from `OccurrenceParticipantsPanel`) both call bulk/single participant-add endpoints that can return multiple `422` validation entries (e.g. several ineligible users in one bulk request). Both panels flatten `apiError.errors` with `flattenApiErrors()` (`Object.values(errors).flat().join('\n')`) instead of reading only the first message of the first field, and the message is rendered with `whitespace-pre-line` so each error shows on its own line.

### Articles And Announcements

Main files:

- `src/components/erp/articles/ArticlesModule.tsx`
- `src/components/erp/articles/ArticlesList.tsx`
- `src/components/erp/articles/ArticleCreate.tsx`
- `src/components/erp/articles/ArticleEdit.tsx`
- `src/components/erp/articles/ArticleDetails.tsx`
- `src/components/erp/announcements/AnnouncementsView.tsx`
- `src/services/articlesService.ts`

Articles are API-driven and include audience/receipt behavior where exposed by the backend. Announcements are still represented by the ERP shared data shape and should be explained separately from articles when behavior differs.

### Campaigns

Main files:

- `src/components/erp/campaigns/CampaignsView.tsx`
- `src/services/campaignsService.ts`

Campaigns are API-driven and support the `mail` and `sms` channels. They can reference saved dynamic segments, show recipient preview, be scheduled or cancelled, and display delivery statistics.

### Organization And Access

Main files:

- `src/components/erp/branches/BranchesView.tsx`
- `src/components/erp/location-groups/LocationGroupsView.tsx`
- `src/components/erp/admins/AdminsView.tsx`
- `src/components/erp/access/GroupsRightsView.tsx`
- `src/components/erp/custom-fields/CustomFieldsView.tsx`
- `src/services/ErpApiService.ts`

These screens manage tenant structure, admins, rights/groups, and custom fields through the core ERP service.

### Profile

Main files:

- `src/components/erp/profile/ProfilePages.tsx`
- `src/context/AuthContext.tsx`
- `src/services/ErpApiService.ts`

Profile pages show the authenticated user's data, security area, event participation, and service status. In the sidebar, the self-profile row and any child rows are rendered after the operational navigation groups and are collapsed by default; expanding one row closes the previously open profile row. Service badges should use the lifecycle status returned by the API, with `is_currently_active` only as an active fallback.

## Local Cache And Demo Data

`ERPPage` has two environment flags:

- `VITE_USE_LOCAL_ERP_CACHE`
- `VITE_USE_LOCAL_ERP_SEED`

These are compatibility paths for local seed/cache behavior. New production workflows should prefer API services and explicit loading/error/empty states.

## Explanation Style

When explaining a frontend feature:

1. Start with what the user can do in business terms.
2. List the screen/component files involved.
3. List API service files and endpoints consumed.
4. Explain permission checks.
5. Explain state management and loading/error/empty behavior.
6. Mention localization namespaces/keys when relevant.
7. Mention edge cases and known risks if visible in the code.

Example response shape:

```text
Functionalitatea X permite ...

Ecrane:
- src/components/...

API:
- service: src/services/...
- endpoint: METHOD /api/...

Permisiuni:
- ...

State/UI:
- ...

Observatii:
- ...
```

## Known Implementation Notes

- The frontend uses React 19, TypeScript, Vite, Tailwind utility classes, lucide-react icons, and recharts.
- Build validation is `npm run build`; local test/lint validation is `npm run test`.
- If `npm` or `node` is not available in the shell PATH, record that validation could not be run.
- Keep UI explanations aligned with current source files, not older localStorage demo behavior.
- Do not claim a workflow is API-driven unless a service file actually calls the backend for it.
