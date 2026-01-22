# Implementation Plan - Fondo Renta Extract Upload

## Goal Description
Enable uploading and processing of "Fondo Renta" (Renta Fija Plazo) PDF extracts. Provide a summary of the extract for reconciliation.

## Debugging Phase (Current)
The extraction is failing with a 400 error. The text extraction debug logs aren't visible.
- **Action**: Modify `fondorenta.py` to dump extracted PDF text to a file (`debug_dump.txt`) for inspection.
- **Action**: Analyze the dump to adjust regex patterns.

## Proposed Changes
### Backend
#### [MODIFY] [fondorenta.py](file:///f:/1.%20Cloud/4.%20AI/1.%20Antigravity/ConciliacionWeb/Backend/src/infrastructure/extractors/fondorenta.py)
- Refine regex for summary extraction to be robust against "Units" columns and layout shifts.
- Implement strictly formatted number parsing (2 decimals).

#### [MODIFY] [procesador_archivos_service.py](file:///f:/1.%20Cloud/4.%20AI/1.%20Antigravity/ConciliacionWeb/Backend/src/application/services/procesador_archivos_service.py)
- Integrate `extraer_resumen_fondorenta`. (Already done, verified).

## Verification Plan
### Manual Verification
- Upload "Fondo Renta" PDF.
- Verify "Saldo Anterior", "Entradas", "Salidas", "Saldo Final" match the PDF summary table.
- Verify "Entradas" includes positive yields, "Salidas" includes negative yields/retentions.
