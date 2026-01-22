# Debugging PDF Extraction

- [x] Locate the PDF extraction logic (likely in `backend/app/services/extractors`) <!-- id: 0 -->
- [x] Analyze `analizar_extracto` endpoint in `backend/app/routers/conciliaciones.py` <!-- id: 1 -->
- [x] Review the specific extractor code (e.g., `fondorenta.py`) for the "No se pudo extraer el resumen" error <!-- id: 2 -->
- [x] Determine why the extraction is failing (regex mismatch, missing fields) <!-- id: 3 -->
- [ ] Fix the extraction logic or improve error reporting <!-- id: 4 -->
    - [x] Add verbose logging to `fondorenta.py`
    - [x] Improve error messages in `conciliaciones.py`
    - [ ] **Action Required**: User to upload PDF again and check logs.
