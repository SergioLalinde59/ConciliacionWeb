# Add USD and TRM to Reconciliation Detail

## User Review Required
None

## Proposed Changes

### Frontend
#### [MODIFY] [ConciliacionMovimientosTab.tsx](file:///f:/1. Cloud/4. AI/1. Antigravity/ConciliacionWeb/Frontend/src/components/ConciliacionMovimientosTab.tsx)
- Add `usd` and `trm` columns to the movements table.
- Ensure these columns are only shown when relevant (e.g. for MasterCardUSD or generally if data exists).

#### [MODIFY] [types/index.ts](file:///f:/1. Cloud/4. AI/1. Antigravity/ConciliacionWeb/Frontend/src/types/index.ts)
- Update `Movimiento` and `MovimientoExtracto` interfaces to include `usd` and `trm` (number).

### Backend
#### [MODIFY] [conciliaciones.py](file:///f:/1. Cloud/4. AI/1. Antigravity/ConciliacionWeb/Backend/src/infrastructure/api/routers/conciliaciones.py)
- Update `obtener_movimientos_extracto` to return `usd` and `trm`.
- Update `comparar_movimientos` endpoint to calculate and return USD statistics.

#### [MODIFY] [movimiento_repository.py](file:///f:/1. Cloud/4. AI/1. Antigravity/ConciliacionWeb/Backend/src/infrastructure/database/postgres_movimiento_repository.py)
- (No changes needed, already selects fields)

#### [MODIFY] [movimiento_extracto_repository.py](file:///f:/1. Cloud/4. AI/1. Antigravity/ConciliacionWeb/Backend/src/infrastructure/database/postgres_movimiento_extracto_repository.py)
- (No changes needed, already selects fields)


## Verification Plan

### Manual Verification
1.  Run the backend: `python run.py` (or existing startup script)
2.  Run the frontend: `npm run dev`
3.  Go to `http://localhost:5173/conciliacion/detalle/{cuenta_id}/{year}/{month}` for a MasterCardUSD account.
4.  Verify that "USD" and "TRM" columns appear in both System and Extract tables.
5.  Verify that values are displayed correctly.
