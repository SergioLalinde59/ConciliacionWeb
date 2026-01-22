# Fix Page Loading Issues (Missing Function)

The "Carga a BD" (Import) and "Reporte Facturas" (Report) pages are consistently crashing (white screen) because of a `ReferenceError: formatCurrency is not defined` in `App.tsx`. This function is used to format monetary values in the summary cards but is not defined or imported.

## User Review Required

> [!NOTE]
> No critical user review required. This is a clear bug fix (restoring missing function).

## Proposed Changes

### Frontend
#### [NEW] [format.ts](file:///f:/1.%20Cloud/4.%20AI/1.%20Antigravity/Facturas/frontend/src/utils/format.ts)
- Create new utility file to hold formatting helpers.
- Implement `formatCurrency` function (reusing logic consistent with `CurrencyValue` component: COP currency, 0 decimals).

#### [MODIFY] [App.tsx](file:///f:/1.%20Cloud/4.%20AI/1.%20Antigravity/Facturas/frontend/src/App.tsx)
- Import `formatCurrency` from `src/utils/format`.
- (Optional) Ensure loading states provide better visual feedback.

## Verification Plan

### Automated Tests
- None existing for this UI logic.

### Manual Verification (Browser Subagent)
1.  **Open Browser**: Navigate to `http://facturas.local/`.
2.  **Navigate to Import**: Click "Carga a BD". Verify page renders (summary cards, table header, etc.) instead of white screen.
3.  **Navigate to Report**: Click "Ver Reporte". Verify page renders.
4.  **Check Console**: Ensure no `ReferenceError` or React unmount errors appear.
