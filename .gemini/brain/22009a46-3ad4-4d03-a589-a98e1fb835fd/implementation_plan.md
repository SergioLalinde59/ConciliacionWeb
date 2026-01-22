# Result Modal for Bank Movements Upload

## Goal Description
The goal is to display a modal with detailed statistics (records loaded, duplicates, errors) after a successful upload of bank movements, replacing the current simple inline message. The backend already returns these statistics, so the work is purely frontend.

## User Review Required
> [!NOTE]
> No backend changes are required as the `procesador_archivos_service.py` already provides `total_extraidos`, `nuevos_insertados`, `duplicados`, and `errores`.

## Proposed Changes

### Frontend

#### [MODIFY] [UploadMovimientosPage.tsx](file:///f:/1.%20Cloud/4.%20AI/1.%20Antigravity/ConciliacionWeb/Frontend/src/pages/UploadMovimientosPage.tsx)
- Import `Modal` component from `../components/molecules/Modal`.
- Add state `showSuccessModal` (boolean).
- Update `handleCargarDefinitivo` to open the modal upon success.
- Implement the `Modal` component in the render method to display:
    - Total records processed
    - New records inserted (highlighted)
    - Duplicates found
    - Errors (if any)
- Remove the existing inline "Carga Exitosa" message.

## Verification Plan

### Manual Verification
1.  Navigate to "Cargar Movimientos Bancarios".
2.  Select an account and upload a PDF file (user can provide a test file or use an existing one).
3.  Click "Analizar Archivo".
4.  Click "Cargar X Registros".
5.  **Verify**: A modal should appear in the center of the screen showing the number of records loaded, duplicates, etc.
6.  **Verify**: The modal can be closed.
