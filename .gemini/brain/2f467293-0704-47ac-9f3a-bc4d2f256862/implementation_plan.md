# Automate Date Extraction for Bank Extracts

## Goal
Remove the need for users to manually select the "Year" and "Month" when uploading a bank extract. Instead, extract this information directly from the PDF file in the backend and use it to associate the data with the correct period.

## User Review Required
> [!IMPORTANT]
> The "Year" and "Month" selectors will be removed from the "Cargar Extracto" page. The application will rely entirely on the date found in the PDF. Ensure your PDFs are standard Bancolombia formats containing the period.

## Proposed Changes

### Backend

#### [MODIFY] [bancolombia.py](file:///f:/1.%20Cloud/4.%20AI/1.%20Antigravity/ConciliacionWeb/Backend/src/infrastructure/extractors/bancolombia.py)
- Update `_extraer_resumen_desde_texto` to parse the `PERÍODO:` field and return `year` and `month`.
- Update `extraer_resumen_bancolombia` to include these fields in the returned dictionary.

#### [MODIFY] [procesador_archivos_service.py](file:///f:/1.%20Cloud/4.%20AI/1.%20Antigravity/ConciliacionWeb/Backend/src/application/services/procesador_archivos_service.py)
- Update `procesar_extracto` to verify if `year` and `month` are provided.
- If not provided, use the values extracted from `analizar_extracto`.
- Raise an error if the period cannot be determined.

#### [MODIFY] [conciliaciones.py](file:///f:/1.%20Cloud/4.%20AI/1.%20Antigravity/ConciliacionWeb/Backend/src/infrastructure/api/routers/conciliaciones.py)
- Update `cargar_extracto` endpoint to make `year` and `month` optional properties in the form data (or remove from required args and get from optional form if maintaining backward compatibility, though removal is cleaner).

### Frontend

#### [MODIFY] [UploadExtractoPage.tsx](file:///f:/1.%20Cloud/4.%20AI/1.%20Antigravity/ConciliacionWeb/frontend/src/pages/UploadExtractoPage.tsx)
- Remove `year` and `month` state variables and the corresponding `<select>`/`<input>` elements from the UI.
- Update `ResumenExtracto` interface to include `year` and `month` (and `periodo_texto` for display).
- Display the detected period in the "Resumen del Periodo" section for user confirmation.
- Update `handleCargarDefinitivo` to call the API without sending explicit `year`/`month`.

#### [MODIFY] [api.ts](file:///f:/1.%20Cloud/4.%20AI/1.%20Antigravity/ConciliacionWeb/frontend/src/services/api.ts)
- Update `cargarExtracto` method to remove `year` and `month` arguments or make them optional.

## Verification Plan

### Manual Verification
1.  **Start the App**: Run `arranque_app.ps1`.
2.  **Navigate**: Go to "Cargar Extracto".
3.  **UI Check**: Verify that "Año" and "Mes" selectors are GONE.
4.  **Upload**: Select a valid Bancolombia PDF extract.
5.  **Analyze**: Click "Analizar Extracto".
6.  **Verify Analysis**: Check if the "Resumen del Periodo" shows the correct month and year extracted from the PDF (e.g., "Periodo: 2026 - Enero").
7.  **Confirm**: Click "Confirmar y Cargar".
8.  **Verify Result**: Ensure the success message shows the correct period (e.g., "Conciliación 2026-1 actualizada").
9.  **Database/Page Check**: Go to "Conciliación Mensual" for that period and verify the data is there.
