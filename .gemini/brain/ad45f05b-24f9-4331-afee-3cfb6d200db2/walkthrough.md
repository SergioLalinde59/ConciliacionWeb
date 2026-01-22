# Fix Page Loading (White Screen)

This walkthough documents the fix for the issue where the "Carga a BD" (Import) and "Reporte Facturas" (Report) pages were rendering as a white screen.

## Root Cause
The `App.tsx` file was attempting to use a function named `formatCurrency` to display monetary values in the summary cards for these pages. However, this function was **not defined or imported**, causing a `ReferenceError` that crashed the entire React application whenever these routes were accessed.

## Changes Made

### 1. Created Utility Function
Created a new file `src/utils/format.ts` to centralize formatting logic and provide the missing function.

```typescript
// src/utils/format.ts
export const formatCurrency = (value: number, decimals: number = 0): string => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(value);
};
```

### 2. Imported Function in App.tsx
Updated `src/App.tsx` to import the new utility.

```typescript
// src/App.tsx
import { Sidebar, FilterBar, StatCardGrid } from './components/organisms';
import { formatCurrency } from './utils/format'; // [NEW] Added import
```

## Verification Results

### Browser Verification
We verified the fix by navigating to the affected pages:

1.  **Dashboard**: Loads correctly (was previously working).
2.  **Carga a BD**: Now loads correctly with all summary cards and data.
3.  **Reporte Facturas**: Now loads correctly with the report table.

No console errors were observed during verification.
