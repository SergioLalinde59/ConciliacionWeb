# Implementation Plan - Disable Confirm Button on Zero Movements

Disable the 'Confirmar y Cargar' button when there are 0 movements to load (total_nuevos is 0), as requested by the user.

## Proposed Changes

### Frontend

#### [MODIFY] [UploadExtractoPage.tsx](file:///f:/1. Cloud/4. AI/1. Antigravity/ConciliacionWeb/Frontend/src/pages/UploadExtractoPage.tsx)

- Update the `disabled` condition for the "Confirmar y Cargar" button.
- Current condition: `disabled={!cuentaId || !resumen.year}`
- New condition: `disabled={!cuentaId || !resumen.year || resumen.total_nuevos === 0}`
- Update the class logic to reflect the disabled state visually (though the existing ternary handles `disabled` via styling usually, line 273 checks variables explicitly). I will update the class condition to match.

## Verification Plan

### Manual Verification
- Since I cannot easily simulate a 0 movement PDF without a specific file, I will rely on code review and user verification.
- **Steps**:
    1.  The user should upload a PDF that results in 0 "A CARGAR" movements (e.g., a file where all movements are duplicates).
    2.  Verify that the "Confirmar y Cargar" button is grayed out/disabled.
    3.  Verify that the "Cancelar" button still works.
