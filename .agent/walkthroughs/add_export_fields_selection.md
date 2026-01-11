
# Walkthrough: Add Field Selection to Export Page

The user wants to select specific fields to export from the `DescargarMovimientosPage`.
We will implement a column selector that allows users to toggle visibility of available columns. This filtering will apply to:
1.  The Preview Table.
2.  The Exported Files (CSV, Excel, Sheets, PDF).

## Steps

1.  **Define Columns**:
    Create a constant definition of all available columns with their ID (key) and Label.
    Available keys: `id`, `fecha`, `cuenta`, `tercero`, `grupo`, `concepto`, `descripcion`, `referencia`, `valor`, `moneda`, `usd`, `trm`.

2.  **Add State**:
    `selectedColumns`: Array of strings (keys). Initialize with all by default.

3.  **UI Implementation**:
    *   Add a collapsible or modal-based "Selección de Campos" component (or just a simple flex-wrap checkbox list) in the toolbar.
    *   Let's create a `Dropdown` or `Popover` for "Campos" to keep the UI clean, or expanding section. A simple expanding detail/summary or a button that shows a popover is good. We'll use a simple `details` element or a state-managed div for simplicity.

4.  **Update Logic**:
    *   **Preview**: Filter table headers and body cells based on `selectedColumns`.
    *   **Export**: Inside `handleExport`, iterate over `selectedColumns` to generate the header row and data rows.

5.  **Refine "Plain Format" Interaction**:
    *   The "Plain Format" toggle just changes *how* the data is rendered (Display Name vs ID), but the *selection* of columns is orthogonal.
    *   Example: If `Cuenta` is selected:
        *   Plain=False -> `m.cuenta_display`
        *   Plain=True -> `m.cuenta_id`

## Columns Configuration
| Key | Label | Plain Field (ID) | Display Field |
| :--- | :--- | :--- | :--- |
| `id` | ID | id | id |
| `fecha` | Fecha | fecha | fecha |
| `cuenta` | Cuenta | cuenta_id | cuenta_display |
| `tercero` | Tercero | tercero_id | tercero_display |
| `grupo` | Grupo | grupo_id | grupo_display |
| `concepto` | Concepto | concepto_id | concepto_display |
| `descripcion` | Descripción | descripcion | descripcion |
| `referencia` | Referencia | referencia | referencia |
| `valor` | Valor | valor | valor |
| `moneda` | Moneda | moneda_id | moneda_display |
| `usd` | Valor USD | usd | usd |
| `trm` | TRM | trm | trm |

