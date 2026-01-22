# Walkthrough - Implement CRUD for Extractores

I have implemented the CRUD operations for `cuenta_extractores` table, enabling the management of extractor configurations from the frontend.

## Changes

### Backend

- **Domain**: 
    - Created `src/domain/models/cuenta_extractor.py` model.
    - Updated `src/domain/ports/cuenta_extractor_repository.py` with CRUD methods.
- **Infrastructure**:
    - Updated `src/infrastructure/database/postgres_cuenta_extractor_repository.py` enabling full CRUD.
    - Created `src/infrastructure/api/routers/extractores.py` to expose API endpoints.
    - Updated `src/infrastructure/api/routers/catalogos.py` to expose `permite_carga` and `permite_conciliar` properties for accounts.
    - Registered the new router in `src/infrastructure/api/main.py`.

### Frontend

- **Types**: Added `CuentaExtractor` interface in `src/types.ts`.
- **Services**: 
    - Created `src/services/extractores.service.ts`.
    - Updated `src/services/api.ts` to include the new service.
- **Pages**: 
    - Created `src/pages/CuentaExtractoresPage.tsx`.
    - Implemented UI refinements:
        - Title changed to "Extractores PDF por Cuenta".
        - Button text changed to "Guardar".
        - Added account filter (ComboBox) above the list.
        - Replaced HTML table with `DataTable` component.
        - Fixed TypeScript build error related to `Column` type import.
        - Filtered account dropdowns (Form and Filter) to only show accounts where `permite_conciliar` is true.
- **Navigation**:
    - Added route `/maestros/extractores` in `src/App.tsx`.
    - Added "Extractores" menu item in `src/components/organisms/Sidebar.tsx`.

## Verification

The new page should be accessible via the Sidebar under "Maestros" -> "Extractores".
functionality includes:
- Listing existing extractors in a sortable `DataTable`.
- Filtering the list by Account (only showing conciliable accounts).
- creating a new extractor with Cuenta, Tipo, Modulo, Orden, and Active status.
- Editing existing extractors.
- Deleting extractors.
