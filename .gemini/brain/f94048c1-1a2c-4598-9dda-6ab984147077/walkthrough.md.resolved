# Walkthrough - Disable Confirm Button on Zero Movements

I have implemented the logic to disable the "Confirmar y Cargar" button when there are no new movements to load.

## Changes

### Frontend

#### [UploadExtractoPage.tsx](file:///f:/1. Cloud/4. AI/1. Antigravity/ConciliacionWeb/Frontend/src/pages/UploadExtractoPage.tsx)

```diff
- disabled={!cuentaId || !resumen.year}
+ disabled={!cuentaId || !resumen.year || resumen.total_nuevos === 0}
```

The button will now be disabled if `total_nuevos` is 0, preventing the user from attempting to load an empty batch of movements.

## Verification Results

### Automated Tests
- None performed as this is a UI logic change dependent on backend data states.

### Manual Verification
- **Test Case**: Upload a PDF where all movements are duplicates.
- **Expected Result**: The "Confirmar y Cargar" button should be disabled (grayed out).
- **Test Case**: Upload a PDF with new movements.
- **Expected Result**: The "Confirmar y Cargar" button should be enabled (green).
