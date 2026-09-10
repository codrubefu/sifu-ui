# Self-profile info in main menu + guardian (parent_user) support

## Context

Today a logged-in user's own info (Info, Security, Privacy, Announcements, Events, Services) lives in a dropdown under the avatar in the **top header** (`Header.tsx`), unguarded by any specific permission. The admin "members" zone (`MembersView.tsx` / `UserManagementView`) has a much richer tabbed view of a user's data (Details, Cod, Informații/custom fields, Grupuri, Locații, Servicii, Grade, Documente, Privacy, **Activity**).

The ask:
1. Users holding the `profile.view` right should see, for themselves, everything the members-zone tabs show **except Activity** (which is an admin audit log with no self-service meaning).
2. This content moves out of the top header entirely into the **main menu (Sidebar)**, as a collapsible section named after the user (`first_name last_name`).
3. Users gain a `parent_user` relation (a guardian/tutor). A guardian can also see (read-only) each child's version of this same info. In the sidebar, self and every child each appear as their own named, collapsible row — all siblings, not nested under one dropdown. Only one is expanded at a time; the logged-in user's own row is expanded by default, opening any other row collapses the previous one.
4. A user who has a `parent_user` (i.e. is a "child") is not required to have `email`/`phone` — those become optional for such users.

There is no existing parent/child/guardian concept anywhere in either repo — this is greenfield. There is also no `profile.view` gating anywhere on the frontend today.

## Backend (`erp-laravel`)

**Users table & model**
- New migration: add nullable `parent_user_id` (unsigned FK to `users.id`, same table, `nullOnDelete`) to `users`.
- New migration: drop the `NOT NULL` constraint on `email` (the existing composite unique index `(organization_id, email)` already tolerates multiple NULLs, exactly like `phone` today).
- `app/Users/Models/User.php`: add `parent_user_id` to `$fillable`; add `parent(): BelongsTo` and `children(): HasMany` (self-referential on `parent_user_id`).

**Validation** (`app/Users/Http/Requests/StoreUserRequest.php`, `UpdateUserRequest.php`)
- `email`: change from unconditionally `required` to `required_without:parent_user_id` (stays `nullable` otherwise), keeping the existing per-organization uniqueness rule.
- `phone` is already `nullable` for everyone — no rule change needed there, just confirm it stays that way.
- Add `parent_user_id` rule: `nullable`, `integer`, `Rule::exists('users','id')->where('organization_id', ...)`, plus a check rejecting self-reference on `UpdateUserRequest` (a user cannot be its own parent).

**Email-dependent code paths** — guard against `null` email now that it's possible:
- `UserController::sendPasswordSetupEmail()` (skip when `$user->email` is null — a child has no independent login anyway).
- `PasswordResetController` (`sendResetLink`) — same guard.
- `PasswordSetupMail` (uses `urlencode($user->email)`) — only relevant if email present, per above.

**`UserResource`**: expose `parent_user_id` in `toArray()`.

**Self-service ("me") endpoints** — `app/Users/Http/Controllers/Api/MeController.php`, wired in `routes/user.php` under the existing `auth.bearer` group:
- Add a private `resolveSubject(Request $request): User` helper: if the request has a `child_id` query param, look up `User::where('id', $childId)->where('parent_user_id', $request->user()->id)->where('organization_id', $request->user()->organization_id)->firstOrFail()`; otherwise return `$request->user()`.
- Update `show()`, `customFields()`, `events()`, `services()` to fetch through `resolveSubject()` instead of `$request->user()` directly (adds child support for free).
- Add `children(): AnonymousResourceCollection` → `UserResource::collection($request->user()->children)` for `GET /me/children` (list used to populate the sidebar rows).
- Add `grades()` → mirror the admin `listUserGrades` logic, scoped via `resolveSubject()`, for `GET /me/grades`.
- Add `documents()` (list only, no upload) mirroring `UserDocumentController::index`, scoped via `resolveSubject()`, for `GET /me/documents`.
- Add `downloadDocument(Request $request, UserDocument $document)` for `GET /me/documents/{document}/download`, authorizing when `$document->user_id === $request->user()->id` OR the document's owner's `parent_user_id === $request->user()->id`.
- `updatePassword()` stays self-only (no `child_id` support — children don't log in independently).

**GDPR read access** — `app/Users/Http/Controllers/Api/GdprController.php`: extend `access()` only (the read endpoint) to resolve a child subject from `?child_id=` the same way as `MeController::resolveSubject`, when hit via `/me/privacy/data` (i.e. `$user` route param is null). Leave `export`/`rectify`/`consent`/`requestErasure` untouched — those stay self-only, since a guardian's view of a child is read-only.

**Routes** (`routes/user.php`, inside the existing `auth.bearer` group): add
```
GET /me/children
GET /me/grades
GET /me/documents
GET /me/documents/{document}/download
```
and no changes needed to the existing `/me`, `/me/events`, `/me/services`, `/me/custom-fields`, `/me/privacy/data` route declarations (only their controller methods change to accept `?child_id=`).

## Frontend (`erp-ui`)

**Types**
- `ErpApiService.ts`: relax `ApiUser.email` to `string | null`; add `parent_user_id?: number | null`.
- `types/erp.ts`: add `'profile-code' | 'profile-grades' | 'profile-documents'` to the `SectionId` union.

**API layer** (`src/api/authApi.ts`)
- Add an optional `childId?: number` param (sent as `?child_id=`) to `getAuthenticatedUser`, `getAuthenticatedUserEvents`, `getAuthenticatedUserServices`, `getAuthenticatedUserCustomFields`.
- Add `getAuthenticatedUserChildren()`, `getAuthenticatedUserGrades(childId?)`, `getAuthenticatedUserDocuments(childId?)`, `downloadAuthenticatedUserDocument(documentId, childId?)`.
- `src/services/gdprService.ts`: give `access()` an optional `childId` (hits `/me/privacy/data?child_id=`), leave the write actions (`createExport`, `rectify`, `consent`, `requestErasure`) untouched.

**Sidebar (main menu)** — `src/components/layout/Sidebar.tsx`
- New section, visible only when `hasAnyRight(['profile.view'])`, rendered after the existing `navGroups` (not merged into them, since its rows aren't rights-gated `NavItem`s but data-driven person rows).
- Fetch `getAuthenticatedUserChildren()` once on mount (only when the section is visible).
- Rows: `{ id: 'self', label: '${user.first_name} ${user.last_name}' }` followed by one row per child (`{ id: child.id, label: '${child.first_name} ${child.last_name}' }`).
- Local state `openProfileRow: 'self' | number | null` defaulting to `null` — this is a true accordion (opening one row sets the others closed, clicking it again closes it), distinct from the existing `openGroups` behavior which allows multiple groups open at once.
- Expanded row shows sub-items: Info, Security, Privacy, Announcements, Events, Services, Cod, Grade, Documente — **no Activity**. The `'self'` row includes Security; child rows omit it (children don't log in, no password to change).
- Clicking a sub-item calls `setCurrent('profile-info' | ... )` plus a new `setProfileChildId(rowId === 'self' ? null : rowId)` — mirroring how `AppLayout`/`ERPPage` already lifts state for the existing `current`/`page` (this app does not route sub-navigation through the URL; state is lifted in `ERPPage.tsx` and threaded through `ContentProps`, same pattern as the rest of the app).

**`ERPPage.tsx` / `Content.tsx` / `shared/types.ts`**
- Add `profileChildId: number | null` state in `ERPPage.tsx` (reset to `null` whenever a `profile-*` section is entered via `'self'`), pass it down through `ContentProps`.
- Add the three new `case 'profile-code' | 'profile-grades' | 'profile-documents'` branches in `Content.tsx`, and pass `childId={profileChildId}` to all `Profile*Page` components.
- Update `SECTION_IDS` in `ERPPage.tsx` to include the three new ids.

**Profile pages** (`src/components/erp/profile/ProfilePages.tsx` plus new files for the 3 new tabs)
- Every `Profile*Page` accepts an optional `childId?: number`. When set: fetch via the child-aware API calls, and hide all editing/action affordances (no save buttons on Info-equivalent edits, no password page reachable, GDPR page renders with `canExport={false} canProcess={false}` and passes `childId` into `PrivacyPanel`/`gdprService.access`).
- `PrivacyPanel.tsx`: add an optional `childId` prop; when present, fetch through `gdprService.access(undefined, childId)` and force `canExport`/`canProcess` to `false` regardless of the props passed in (belt-and-suspenders for the read-only guarantee).
- New `ProfileCodePage`: read-only display of `user_code` (self or child), no barcode scanning (that's an admin-only workflow).
- New `ProfileGradesPage`: read-only grade + grade history list, modeled on the admin `grades` tab in `MembersView.tsx`, backed by `getAuthenticatedUserGrades(childId)`.
- New `ProfileDocumentsPage`: reuse `UserDocumentsPanel.tsx`'s presentation but with `canUpload={false} canDelete={false}` always, and swap its data calls for the new `getAuthenticatedUserDocuments`/`downloadAuthenticatedUserDocument` (self/child) instead of the admin `listUserDocuments`/`downloadUserDocument`(`/users/{id}/...`). This likely means adding a small prop to `UserDocumentsPanel` to select which API functions back it, since it currently hardcodes the admin `userId`-based endpoints.
- Groups/locations already appear as read-only badges inside `ProfileInfoPage` (per existing behavior) — no separate tab needed for those, consistent with "informational, minus Activity."

**Header (top menu)** — `src/components/layout/Header.tsx`
- Remove the avatar/name dropdown entirely: delete `profileItems`, `userMenuOpen` state/effects, and the dropdown markup.
- Keep the standalone Logout button, but make it visible on mobile too (it's currently `hidden md:inline-flex`) since the dropdown's mobile-only Logout row is being removed along with the dropdown.

**User create/edit form** (`src/components/erp/members/MembersView.tsx`)
- Add a `parent_user_id` field to `UserForm`/`emptyForm`/`buildPayload` (a select of other users in the same organization, excluding self on edit).
- When `parent_user_id` is set, stop treating `email` as implicitly needed — no client-side required-check exists today (validation is server-driven), so this is mainly about the payload; the backend will accept a missing email once `parent_user_id` is present.

## Verification
- Backend: `php artisan test` (or the relevant Feature test suite for `Users`/`Me`/`Gdpr`) after adding migrations; manually hit `POST /users` with `parent_user_id` set and no email/phone to confirm it now passes validation, and without `parent_user_id` to confirm email is still required.
- Frontend: `npm run typecheck` / `npm run build` for type safety across the `ApiUser`/`SectionId` changes.
- Manual/browser check via the `run` skill: log in as a user with `profile.view`, confirm the header dropdown is gone (Logout still reachable on mobile width), confirm the sidebar shows collapsed accordion rows at the bottom for your name and any children, expanding a row shows Info/Security/Privacy/Announcements/Events/Services/Cod/Grade/Documente (no Activity), create a test child user (`parent_user_id` pointing at the logged-in user, no email/phone), confirm a second row appears for the child, expanding it collapses your own row, and all child data renders read-only with no editable fields/buttons.

## Implementation status (as of 2026-09-01)

Both the backend (erp-laravel) and frontend (erp-ui) portions of this plan have been implemented and verified:
- Backend: migrations applied against the docker test DB, model relations/validation confirmed via tinker, and a live HTTP smoke test exercised `/me/children`, `/me?child_id=`, `/me/grades`, `/me/documents`, and `/me/privacy/data?child_id=` end-to-end. Existing test suite failure count (11 failed / 22 passed) confirmed unchanged from baseline.
- Frontend: `tsc -b` and `vite build` both pass clean.
- Neither repo's changes have been committed yet, and migrations have not been run against the real dev database — only the docker test DB used for verification.
