# Task: Debug Upload Statistics for FondoRenta

## Issue
The "Cargar Movimientos Bancarios" page is displaying zero statistics (0 registros leídos, 0 duplicados, 0 a cargar) for a FondoRenta PDF file that actually contains 3 movements from January 13, 2026.

## Investigation & Resolution
- [x] Review the upload endpoint logic in backend
- [x] Check the PDF extraction logic for FondoRenta
- [/] Verify if the regex pattern correctly matches the movement lines
- [ ] Test the fix with the provided PDF
- [ ] Verify statistics are displayed correctly in the frontend

## Findings
The `extraer_movimientos_fondorenta` uses a regex pattern on line 80 that looks for lines starting with 8-digit dates (YYYYMMDD). The PDF shows "Movimientos: Inversiones" with 3 transactions but appears to be in the format "Traslado hacia/desde cuenta de ahorros" rather than the expected "ADICION/RETIRO" patterns.

