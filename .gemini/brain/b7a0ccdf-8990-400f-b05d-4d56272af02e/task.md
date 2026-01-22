# Task: Crear extractor MasterCard Pesos (Formato Anterior)

- [ ] Analyze existing extractor `mastercard_extracto_movimientos.py` <!-- id: 0 -->
- [x] Create Implementation Plan <!-- id: 1 -->
- [x] Implement `mastercard_pesos_extracto_anterior_movimientos.py` <!-- id: 2 -->
    - [x] Copy structure from current extractor
    - [x] Update header detection logic ("ESTADO DE CUENTA PESOS" -> "ESTADODECUENTAPESOS")
    - [x] Update regex for columns (Fecha, Descripción, Valor Original)
    - [x] Implement -1 multiplication logic
- [x] Register new extractor in `ProcesadorArchivosService` (Updated logic to support multiple extractors) <!-- id: 3 -->
- [x] Verify implementation (User to verify) <!-- id: 4 -->
