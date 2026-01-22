# Walkthrough - Extract Statistics Ribbon

I have implemented the "Read / Duplicates / To Load" ribbon in the Extract Upload modal.

## Changes

### Backend
- **[procesador_archivos_service.py](file:///f:/1.%20Cloud/4.%20AI/1.%20Antigravity/ConciliacionWeb/Backend/src/application/services/procesador_archivos_service.py)**: Updated `analizar_extracto` to iterate through extracted movements and check for duplicates against the database. It now returns `total_leidos`, `total_duplicados`, and `total_nuevos`.

### Frontend
- **[ExtractoResumenCinta.tsx](file:///f:/1.%20Cloud/4.%20AI/1.%20Antigravity/ConciliacionWeb/frontend/src/components/molecules/ExtractoResumenCinta.tsx)**: Created a new component to display the statistics in three cards (Blue, Orange, Green).
- **[UploadExtractoPage.tsx](file:///f:/1.%20Cloud/4.%20AI/1.%20Antigravity/ConciliacionWeb/frontend/src/pages/UploadExtractoPage.tsx)**:
    - Imported and integrated `ExtractoResumenCinta`.
    - Removed the old "Se encontraron X movimientos" message.
    - Updated `ResumenExtracto` interface to support the new fields.

> [!NOTE]
> **Update**: The duplicate check logic now verifies against `movimientos_extracto` effectively checking if the extract (or parts of it) has already been uploaded previously.

## Verification

The feature is implemented. As requested, no manual verification was performed by me.
You should verify:
1.  Uploading a PDF extract.
2.  Checking that the ribbon appears with the correct numbers.
3.  Confirming "Duplicados" is > 0 if you re-upload a previously uploaded extract.
