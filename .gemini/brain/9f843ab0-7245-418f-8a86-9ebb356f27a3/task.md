# Task List

- [x] Analyze the new MasterCard Pesos PDF format from the user provided image <!-- id: 0 -->
- [x] Read current `mastercard_pesos_extracto_movimientos.py` <!-- id: 1 -->
- [x] Implement `extraer_movimientos` in `mastercard_pesos_extracto_movimientos.py` adapting the logic from `fondorenta_extracto_movimientos.py` <!-- id: 2 -->
- [x] Add regex to capture `Fecha`, `Movimientos`, and `Valor movimiento` <!-- id: 3 -->
- [x] Add logging and error handling similar to FondoRenta <!-- id: 4 -->
- [x] Verify the implementation (by running the user's workflow or asking for verification) <!-- id: 5 -->
- [ ] Create `cuenta_extractores` table in DB <!-- id: 6 -->
- [ ] Populate `cuenta_extractores` with initial data (Ahorros, FondoRenta, MC Pesos, MC USD) <!-- id: 7 -->
- [ ] Create `CuentaExtractorRepository` (Port & Adapter) <!-- id: 8 -->
- [ ] Refactor `ProcesadorArchivosService` to use `CuentaExtractorRepository` <!-- id: 9 -->
- [ ] Verify functionality with `MasterCardPesos` upload <!-- id: 10 -->
