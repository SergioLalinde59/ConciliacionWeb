# Frontend Update for `permite_conciliar`

The goal is to update the frontend to display and edit the new `permite_conciliar` field in the Cuentas management page.

## Proposed Changes

### Frontend

#### [MODIFY] [cuenta.ts] (Exact path to be determined)
- Update `Cuenta` interface to include `permite_conciliar: boolean`.

#### [MODIFY] [CuentasPage.tsx](file:///f:/1.%20Cloud/4.%20AI/1.%20Antigravity/ConciliacionWeb/frontend/src/pages/CuentasPage.tsx)
- Add a column for "Permite Conciliar" in the table.
- Add a checkbox or switch in the Create/Edit modal/form for `permite_conciliar`.
- Update the create/edit logic to send this field to the backend.

## Verification Plan

### Manual Verification
- Open the "Maestros -> Cuentas" page.
- Verify the new column is visible.
- Edit an existing account and toggle "Permite Conciliar". Save and verify persistence.
- Create a new account with "Permite Conciliar" checked. Verify persistence.
