# Task: Add USD and TRM Columns to Reconciliation Detail

- [x] Explore codebase
    - [x] Locate frontend component for reconciliation detail view <!-- id: 0 -->
    - [x] Locate backend models and API for reconciliation data <!-- id: 1 -->
    - [x] Verify database schema (via models and repo) <!-- id: 2 -->
- [x] Backend Changes
    - [x] Update `conciliaciones.py` to select/save `usd`, `trm` and calculate stats <!-- id: 3 -->
    - [x] Update `Movimiento` and `MovimientoExtracto` interfaces in `types/Conciliacion.ts` <!-- id: 6 -->
    - [x] Update `ConciliacionMovimientosTab.tsx` <!-- id: 7 -->
        - [x] Add columns to "Movimientos" table
        - [x] Add columns to "Movimientos Extracto" table
        - [x] Update summary cards to show USD/TRM stats
- [ ] Verification
    - [ ] Verify changes with user <!-- id: 8 -->
