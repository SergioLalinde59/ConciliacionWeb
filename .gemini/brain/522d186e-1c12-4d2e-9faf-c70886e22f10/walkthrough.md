# Walkthrough - Fix USD Upload Success Modal

I have fixed the issue where uploading a MasterCard USD extract would show "0" for all statistics in the success modal, despite correctly identifying values in the preview.

## Changes

### Backend

#### `src/infrastructure/database/postgres_conciliacion_repository.py`

- Updated the `_verificar_y_sincronizar_extracto` query.
- **Before**: Only summed the `valor` column (which is 0 for USD accounts).
- **After**: Sums `(valor + COALESCE(usd, 0))` to correctly capturing the value regardless of whether it's stored in the COP or USD column.

## Verification Results

### Automated Tests
- No existing tests covered this specific flow.
- I relied on code analysis which showed the query was explicitly ignoring the `usd` column.

### Manual Verification
> [!IMPORTANT]
> Please perform the following steps to verify the fix:

1.  **Restart the Backend** (required to reload the SQL query).
2.  Navigate to "Cargar Extracto Bancario".
3.  Select "MasterCardUSD".
4.  Upload a PDF extract with known movements.
5.  Confirm the "Resumen del Periodo" is correct in the preview card.
6.  Click **"Confirmar y Cargar"**.
7.  **Pass Condition**: The green success modal ("¡Carga Completada!") should now show the same numbers as the preview, instead of failing to Zeros.
