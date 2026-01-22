# Cargar Extractos - Walkthrough

I have implemented the "Cargar Extractos" feature to load PDF extracts into the `conciliacion` table.

## Features Implemented

1.  **Backend Extraction**:
    *   Added `extraer_resumen_bancolombia` to parse "Saldo Anterior", "Entradas", "Salidas", "Saldo Final" from Bancolombia PDFs.
2.  **Conciliation Storage**:
    *   Updated `ProcesadorArchivosService` to save extracted data into the `conciliacion` table (using Upsert to update if exists).
3.  **Frontend Interface**:
    *   Created `UploadExtractoPage` with Atomic Design Look & Feel.
    *   Added "Cargar Extractos" to the Sidebar.
    *   The page allows analyzing a PDF first (showing the read values) and then confirming the load.

## How to Verify

1.  **Navigate to "Cargar Extractos"**:
    *   Click on the new sidebar option under "Movimientos".
2.  **Select Account and Period**:
    *   Choose a Bancolombia account.
    *   Select the Year and Month corresponding to the extract (currently manual selection is required to ensure accuracy).
3.  **Upload PDF**:
    *   Select a Bancolombia PDF extract.
    *   Click "Analizar Extracto".
4.  **Review Summary**:
    *   The card will show "Saldo Anterior", "Entradas", "Salidas", "Saldo Final" read from the PDF.
    *   If the math doesn't add up, a warning is shown.
5.  **Confirm Load**:
    *   Click "Confirmar y Cargar".
    *   The application will save the data to the `conciliacion` table for the selected period.

## Code Changes

### Backend
- `src/infrastructure/extractors/bancolombia.py`: PDF regex parsing.
- `src/application/services/procesador_archivos_service.py`: `procesar_extracto` method.
- `src/infrastructure/api/routers/conciliaciones.py`: New endpoints.

### Frontend
- `src/pages/UploadExtractoPage.tsx`: New page.
- `src/services/conciliacionService.ts`: API methods.
- `src/components/organisms/Sidebar.tsx`: Menu item.
