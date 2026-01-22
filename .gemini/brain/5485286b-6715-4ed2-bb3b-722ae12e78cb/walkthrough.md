# Added `permite_conciliar` Field

## Overview
Added a new boolean field `permite_conciliar` to the `cuentas` table and exposed it via the API. This field controls which accounts are eligible for reconciliation.

## Changes

### Database
- **Schema**: Added `permite_conciliar` column (Boolean, default `False`) to the `cuentas` table.

### Backend
- **Model**: Updated `Cuenta` model in `src/domain/models/cuenta.py`.
- **Repository**: Updated `PostgresCuentaRepository` in `src/infrastructure/database/postgres_cuenta_repository.py` to handle the new field in CRUD operations.
- **API**: Updated `src/infrastructure/api/routers/cuentas.py` to include `permite_conciliar` in `CuentaDTO` and `CuentaResponse`.

### Frontend
- **Types**: Updated `Cuenta` interface in `frontend/src/types.ts` to include `permite_conciliar`.
- **Pages**: Updated `CuentasPage.tsx` to handle the new field in create/edit operations.
- **Components**: 
    - Updated `CuentasTable.tsx` to display the "Permite Conciliar" column.
    - Updated `CuentaModal.tsx` to include a checkbox for "Permite Conciliar".

## Verification Results

### Database Verification
Successfully verified that the column exists in the database.

### API Verification
Ran `verify_cuentas_api.py` which confirmed:
1.  **Creation**: Can create an account with `permite_conciliar=True`.
2.  **Retrieval**: The API returns the correct value for `permite_conciliar`.
3.  **Persistence**: Data is correctly saved and retrieved from the database.

```log
Verifying API endpoints...
Creating account via API: {'cuenta': 'API Test ...', 'permite_conciliar': True}
SUCCESS: API returned allows_conciliar=True on creation.
Found created account in list: {...}
SUCCESS: API list returned permite_conciliar=True.
Account deleted.
```

### Frontend Verification
Ran `npx tsc --noEmit` to verify type safety.
- **Result**: No errors found.
- The UI now includes a column for "Permite Conciliar" and a checkbox in the account modal.
