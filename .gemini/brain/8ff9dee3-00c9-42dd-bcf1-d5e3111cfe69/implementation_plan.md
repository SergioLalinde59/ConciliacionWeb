# Fix SQL Syntax Error in Repository

## Goal Description
The `PostgresMovimientoExtractoRepository.obtener_por_periodo` method contains a duplicate `FROM` clause in its SQL query, causing the "Detailed Reconciliation" page to fail loading data. The goal is to correct this syntax error.

## User Review Required
No specific user review required for this bug fix.

## Proposed Changes
### Backend / Database Repository
#### [MODIFY] [postgres_movimiento_extracto_repository.py](file:///f:/1.%20Cloud/4.%20AI/1.%20Antigravity/ConciliacionWeb/Backend/src/infrastructure/database/postgres_movimiento_extracto_repository.py)
- Remove duplicate `FROM movimientos_extracto me` line in `obtener_por_periodo` method.

## Verification Plan
### Manual Verification
1.  **Restart Backend**: Ensure the backend reloads the modified code (if auto-reload is active, just wait a moment).
2.  **Navigate to Detailed Reconciliation**: Go to the page shown in the user's screenshot.
3.  **Check Data**: Verify that the "No hay datos de comparación disponibles" message disappears and is replaced by the reconciliation details and movement list.
