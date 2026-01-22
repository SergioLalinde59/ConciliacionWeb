# Walkthrough - Reconciliation Page Refactor

I have refactored the `ConciliacionPage.tsx` to align with the application's Atomic Design system and unify the UI with the "Gestión de Movimientos" page.

## Changes

### 1. Unified UI & Atomic Design
-   **FiltrosReporte**: Integrated the `FiltrosReporte` organism to provide consistent filtering capabilities.
-   **Table Styling**: Updated the reconciliation table to match the visual style of the `MovimientosPage` (white background, rounded corners, shadow, consistent padding/fonts).
-   **Layout**: Ensured proper integration with the `MainLayout` (provided by `App.tsx`).

### 2. New Filters
-   **Date Range**: Replaced the simple Year/Month dropdowns with the standard Date Range picker. The logic automatically derives the reconciliation month from the selected start date.
-   **Account Filter**: Added a specific "Cuenta" filter to allow viewing a single account or all accounts at once.

## Code Changes

### `src/pages/ConciliacionPage.tsx`

```tsx
// Key implementation details
export const ConciliacionPage = () => {
    // ...
    // Using reusable FiltrosReporte
    <FiltrosReporte
        desde={desde}
        hasta={hasta}
        onDesdeChange={setDesde}
        onHastaChange={setHasta}
        cuentaId={cuentaId}             // New Account Filter
        onCuentaChange={setCuentaId}
        cuentas={cuentas}
        // ...
    />
    // ...
}
```

## Verification
-   Verified imports align with project structure.
-   Ensured `MainLayout` is not double-wrapped (removed local wrapper).
-   Matched standard Tailwind classes for table/typography.
