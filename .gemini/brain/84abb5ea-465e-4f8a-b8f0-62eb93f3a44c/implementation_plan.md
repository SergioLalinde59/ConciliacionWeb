# Implementation Plan - Fix MasterCard USD Header Detection

The MasterCard USD extractor fails to identify the USD section of the PDF because the header check `ESTADO DE CUENTA EN:  DOLARES` is too strict regarding whitespace. I will start by relaxing this check and adding better logging.

## Proposed Changes

### Backend

#### [MODIFY] [mastercard_usd_extracto_movimientos.py](file:///f:/1. Cloud/4. AI/1. Antigravity/ConciliacionWeb/Backend/src/infrastructure/extractors/bancolombia/mastercard_usd_extracto_movimientos.py)
- Import `re` (already imported).
- In `extraer_movimientos`:
    - Replace the strict string check with a regex search.
    - Regex: `r"ESTADO\s+DE\s+CUENTA\s+EN[:;]?\s+DOLARES"` which handles variable whitespace and potential separator variations.
    - Update the `else` block to print the first 200 characters of the page text to stdout (DEBUG log) to aid in future debugging if it still fails.

## Verification Plan

### Manual Verification
1.  Since I cannot run the extraction myself on the user's file, I will ask the user to:
    - Re-run the extraction (upload the PDF again).
    - Check the terminal logs (Img2).
    - Expect to see "DEBUG: Página detectada como DOLARES" instead of "Página ignorada".
    - Verify that movements are found (Count > 0).
