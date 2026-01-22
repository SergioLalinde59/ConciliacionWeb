# Implementation Plan - Statistics in Upload Success Modal

The goal is to display statistics (Total Read, Duplicates, New) in the "Success Modal" after loading a bank extract. We will reuse the existing `ExtractoResumenCinta` component, following Atomic Design principles.

## User Review Required

> [!NOTE]
> We will modify `ExtractoResumenCinta` to accept a custom label for the "New" items card, allowing it to display "CARGADOS" instead of "A CARGAR" when used in the success context.

## Proposed Changes

### Frontend Components

#### [MODIFY] [ExtractoResumenCinta.tsx](file:///f:/1.%20Cloud/4.%20AI/1.%20Antigravity/ConciliacionWeb/frontend/src/components/molecules/ExtractoResumenCinta.tsx)
- Add optional prop `labelNuevos` to `ExtractoStatsProps`.
- Use `labelNuevos` if provided, otherwise default to "A CARGAR".

#### [MODIFY] [UploadExtractoPage.tsx](file:///f:/1.%20Cloud/4.%20AI/1.%20Antigravity/ConciliacionWeb/frontend/src/pages/UploadExtractoPage.tsx)
- Import `ExtractoResumenCinta`.
- In the `Modal` (Success Modal), insert `<ExtractoResumenCinta ... />` before the detailed balance breakdown.
- Pass `totalLeidos`, `totalDuplicados` from the `resumen` state.
- Pass `totalNuevos` from `result.movimientos_count` (which represents the successfully loaded movements).
- Set `labelNuevos="CARGADOS"`.

## Verification Plan

### Manual Verification
- The user will verify by uploading a file.
- **Expectation**:
    1.  Upload a file.
    2.  Click "Analizar".
    3.  See the "Resumen del Periodo" with the tape showing "A CARGAR".
    4.  Click "Confirmar y Cargar".
    5.  See the "Resumen de Carga" modal.
    6.  **Verify**: The modal now includes the statistics tape (Leídos, Duplicados, Cargados) with the label "CARGADOS" (or similar) on the third card.
