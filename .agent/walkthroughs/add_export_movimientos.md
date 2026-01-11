
# Walkthrough: Add Export Options to Movements Report

The user wants to add export capabilities (Google Sheets, Excel, CSV, PDF) to the "Gestión de Movimientos" report (`MovimientosPage.tsx`).
This report already includes the "FiltrosReporte" component, so the focus is on adding the export functionality using the currently filtered data.

## Steps

1.  **Modify `MovimientosPage.tsx`**:
    *   Import necessary icons (`Download`, `FileSpreadsheet`, `FileText`, `Printer`, `Copy`, `Check`) from `lucide-react`.
    *   Import `toast` from `react-hot-toast`.
    *   Implement `handleExport(format)` function:
        *   **CSV**: Generate a comma-separated text file and trigger download.
        *   **Excel**: Generate a CSV file (compatible with Excel) and trigger download.
        *   **Google Sheets**: Format data as TSV (Tab Separated Values) and copy to clipboard for easy pasting into Sheets.
        *   **PDF**: Trigger `window.print()` to use the browser's PDF generation.
    *   Add the Export UI buttons to the page header (next to "Nuevo Movimiento").

2.  **Add Print Styles**:
    *   Update `src/index.css` or add a `<style>` block in the component to hide non-essential elements (Sidebar, Buttons, Filters) during printing, ensuring a clean PDF output.

## Verification
*   Check that "Exportar" buttons appear.
*   Verify "CSV" and "Excel" download files.
*   Verify "Google Sheets" copies data to clipboard.
*   Verify "PDF" opens the print dialog with a clean view.
