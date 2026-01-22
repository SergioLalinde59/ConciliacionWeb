# Cargar Extractos Implementation Plan

## Goal Description
Implement a new feature "Cargar Extractos" to load PDF extracts for specific accounts, validate against duplicates, and display extracted data (balances, entries, exits).

## User Review Required
- [ ] Confirmation on PDF parsing requirements (specific format?)

## Proposed Changes

## Proposed Changes

### Backend
- [ ] **Infrastructure**:
    - Update `src/infrastructure/extractors/bancolombia.py` (and others) to add `extraer_resumen` (Saldo Anterior, etc).
    - Create `src/infrastructure/api/routers/extractos.py` (or reuse `conciliaciones.py`? Better separate for clarity or add special endpoint). Let's use `POST /api/conciliaciones/cargar-extracto`.
- [ ] **Application**:
    - Update/Create service logic to parse PDF summary and save to `conciliacion` table using `ConciliacionRepository.guardar`.
    - Validate `anio` and `mes` from the PDF content match the intended period or auto-detect it.

### Frontend
- [ ] Create `UploadExtractoPage.tsx` (reusing logic from `UploadMovimientosPage`).
- [ ] Add sidebar option "Cargar Extractos".
- [ ] On upload success, show the updated conciliation summary (Saldo Anterior, Entradas, Salidas, Saldo Final).

## Verification Plan
- [ ] **Manual Verification**:
    - Upload a PDF extract.
    - Check `conciliaciones` table for updated values.
    - Verify the "Conciliación Mensual" page reflects these new extract values.


