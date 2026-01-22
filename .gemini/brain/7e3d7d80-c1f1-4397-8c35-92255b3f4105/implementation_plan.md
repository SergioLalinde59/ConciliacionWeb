# Debugging MasterCard Pesos Movement Extraction

The user is experiencing an issue where "0 movements" are found in the MasterCard Pesos extract, even though the summary stats are correct. This suggests the Extractor is failing to either identifying the pages or parse the lines.

## User Review Required
> [!IMPORTANT]
> This plan adds **debug logging** to the production code. This is necessary to see what the PDF text looks like since we cannot access the file directly. We will remove this logging after fixing the issue.

## Proposed Changes

### Backend

#### [MODIFY] [mastercard_pesos_extracto_anterior_movimientos.py](file:///f:/1.%20Cloud/4.%20AI/1.%20Antigravity/ConciliacionWeb/Backend/src/infrastructure/extractors/bancolombia/mastercard_pesos_extracto_anterior_movimientos.py)
- Invalid `ESTADODECUENTAPESOS` check?
    - Add logging to show exactly what text is being checked.
- Regex failure?
    - Add logging for lines that *almost* match or just log the first few lines of the text to see the format.
- Add a "Fallback" regex if the main one fails?

## Verification Plan

### Manual Verification
1.  **User Action**: Re-upload the PDF `2025-08 7796.pdf` in the "Cargar Extracto Bancario" screen.
2.  **Check Logs**: I (Antigravity) will read the `read_terminal` or user can check the backend logs.
3.  **Expected Result**: The logs will show:
    - "DEBUG LINEA: ..."
    - "HEADER CHECK: ..."
    - This will reveal if the header is missing or if the date format is different (e.g. `Aug 31` vs `31/08`).
