# Debugging PDF Extraction Failure Plan

## Goal Description
Resolve the "No se pudo extraer el resumen del archivo" error when uploading "FondoRenta" PDF statements.
The current issue is that the text extraction logic returns no data, likely due to regex mismatches with the PDF format.
To debug this, we need to see the raw text extracted from the PDF, which requires ensuring the latest code (with debug logging) is running.

## User Review Required
> [!IMPORTANT]
> **Action Required**: You may need to re-upload the PDF file after I restart the backend service. This will generate a debug file (`debug_extract_dump.txt`) containing the PDF text, allowing me to fix the extraction logic.

## Proposed Changes

### Phase 1: Fix Frontend Logic (Root Cause)
The frontend defaults `tipo_cuenta` to `bancolombia_ahorro` and fails to update it for "FondoRenta".
1.  **Modify `UploadExtractoPage.tsx`**: Update the `onChange` handler for the account selector to set `tipoCuenta = 'FondoRenta'` when the account name contains "Rent" or "Fondo".

### Phase 2: Cleanup Debug Instrumentation
1.  **Revert Backend Changes**: Remove the debug logging and `force reload` logic from `procesador_archivos_service.py`.
2.  **Restart Backend**: Apply the cleanup.

## Verification Plan

### Manual Verification
- **User Action**: Refresh the page, select "FondoRenta", upload the PDF.
- **Success Criteria**:
    - The backend log should show `analizar_extracto called with FondoRenta`.
    - The extraction should proceed (assuming the cached code in `fondorenta.py` is actually correct for the PDF format).
    - If extraction still fails *content-wise*, we will get a new error, but at least we cleared the parameter mismatch.
