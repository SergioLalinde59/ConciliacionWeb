
# Walkthrough: Enhance Download Page with Filters

The user wants to add the standard "FiltrosReporte" and the new export options (Sheets, Excel, CSV, PDF) to the `DescargarMovimientosPage.tsx`.
Currently, this page is a simple bulk downloader. We will upgrade it to be a "Filtered Export" tool.

## Steps

1.  **Refactor `DescargarMovimientosPage.tsx`**:
    *   **Imports**: Add `FiltrosReporte`, `useCatalogo`, hooks, icons, `toast`.
    *   **State**: Add filter states (`desde`, `hasta`, `cuenta`, `tercero`, etc.) similar to `MovimientosPage`.
    *   **Data Fetching**: Replace `exportarDatos` (which is raw) with `listar` (which supports filters).
        *   *Note*: We will handle the "Plain Format" (Raw IDs) option by transforming the data client-side before export, instead of requesting it from the backend.
    *   **Export Logic**: Reuse the `handleExport` logic from `MovimientosPage`, but adapted to support the "Plain Format" toggle (if checked, export IDs; if not, export Display names).
    *   **UI**:
        *   Add `FiltrosReporte` at the top.
        *   Show a preview table of the filtered data (limit to ~100 rows for performance in preview, but export ALL).
        *   Actually, since we fetch all for export, we can just show the first 100 in the UI.

2.  **Verify**:
    *   Check that filters work (date, account, etc.).
    *   Check that "Google Sheets" copies filtered data.
    *   Check that "Plain Format" toggle switches between "Cuenta Bancaria X" and "15" (ID).

## Detail on Plain Format
The existing page has a `plainFormat` checkbox.
*   If `plainFormat` is **OFF** (default): Export "Bancolombia", "Juan Perez", "Comida".
*   If `plainFormat` is **ON**: Export "1", "105", "45" (IDs).

We will implement this mapping in `handleExport`.
