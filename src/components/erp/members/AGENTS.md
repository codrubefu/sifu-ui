# Member and administrator management

- Entry points: `../users/UsersView.tsx` and `../admins/AdminsView.tsx` configure
  `UserManagementView` in `MembersView.tsx`; check resource and relation-tab props.
- `MembersView.tsx` owns list filters/pagination, form state, save/reload handlers
  and relation tabs. Find the relevant handler/tab with rg before reading all JSX.
- `memberServiceAssignments.ts` owns service merging, assignment identity/status,
  date fallbacks and history selection. It has no fetching or state side effects.
- `UserDocumentsPanel.tsx` handles documents; privacy is in `../profile/PrivacyPanel.tsx`;
  payments reuse `../payments/PaymentPopup.tsx`.
- Data: `services/ErpApiService.ts` owns users and related DTOs/operations;
  `services/serviceLifecycleService.ts` owns assignment lifecycle actions.
  View-local form/payload helpers map API records to editable state and back.
- Preserve assignment ID versus service ID, explicit API statuses, pivot/history
  precedence, and member/admin permissions. Do not merge apparently similar date
  serializers without checking seconds and timezone behavior.
- No behavioral test suite exists. Run `npm test` and build after extraction;
  for workflow changes check member/admin forms, relation tabs and save/reload in
  the browser. Update the Members section of the functionality explainer as needed.
