# Fix FondoRenta Movement Extraction

## Problem Description

When uploading a FondoRenta movements PDF using the "Cargar Movimientos Bancarios" page, the system reports **0 registros leídos** (0 records read). The investigation revealed that:

1. The API call flow is correct from frontend to backend
2. The file type mapping (`'fondo_renta'`) matches correctly in the backend service
3. The issue is in the `_extraer_movimientos_desde_texto()` function in `fondorenta.py`
4. The regex pattern does NOT match the actual format of the PDF lines

## Root Cause

The regex pattern in line 80 of `fondorenta.py` expects:
```
^(\d{8})\s+(.+?)\s+([\d]{1,3}(?:[.]\d{3})*,\d{2})\s+
```

This pattern was designed assuming a specific format, but we don't know if it matches the actual PDF content.

## Proposed Changes

### Phase 1: Identify PDF Format

#### [MODIFY] [fondorenta.py](file:///f:/1.%20Cloud/4.%20AI/1.%20Antigravity/ConciliacionWeb/Backend/src/infrastructure/extractors/fondorenta.py)

**Location**: Lines 66-71  
**Action**: Add debug logging to print the extracted PDF text

```python
def _extraer_movimientos_desde_texto(texto: str) -> List[Dict]:
    movimientos = []
    lines = texto.split('\n')
    
    # DEBUG: Print full text to identify format
    import logging
    logger = logging.getLogger("app_logger")
    logger.error("=" * 80)
    logger.error("DEBUG FONDORENTA - TEXTO EXTRAÍDO DEL PDF:")
    logger.error(texto)
    logger.error("=" * 80)
    logger.error(f"Total de líneas: {len(lines)}")
    logger.error("=" * 80)
    
    for line in lines:
        line = line.strip()
        # ... rest of the function
```

**Rationale**: Use `logger.error()` instead of `print()` to ensure the output appears in the logs even if stdout is redirected. This will allow us to see the exact format of the PDF text.

### Phase 2: Adjust Regex Pattern

Once we see the actual PDF format from the logs, we will:

1. Analyze the movement line structure
2. Design a new regex pattern that matches the actual format
3. Update line 80 in `fondorenta.py` with the corrected pattern
4. Test with the same PDF to verify extraction works

**Note**: This phase will be planned after examining the debug output.

---

## Verification Plan

### Step 1: Capture Debug Output

1. Apply the debug logging changes to `fondorenta.py`
2. Restart the backend server to load the updated code
3. Upload the same FondoRenta PDF (`MovimientosTusInversionesBancolombia13Ene26.pdf`) via the "Cargar Movimientos Bancarios" page
4. Check the backend logs (in terminal or `logs/backend_development.log`) for the debug output
5. **Expected output**: Complete PDF text printed between separator lines

### Step 2: Analyze and Fix Regex

1. Review the debug output to identify the movement line format
2. Create a test regex pattern using an online regex tester (e.g., regex101.com)
3. Update the regex in `fondorenta.py` line 80
4. Remove the debug logging code

### Step 3: Integration Test

**Manual Test**:
1. Upload the FondoRenta PDF again via "Cargar Movimientos Bancarios"
2. Click "Analizar archivo"
3. **Expected result**: 
   - "REGISTROS LEÍDOS" > 0 (should show actual number of movements in the PDF)
   - Preview table shows the extracted movements with correct dates, descriptions, and values
   - "A CARGAR" shows number of new movements (non-duplicates)

---

## User Review Required

> [!IMPORTANT]
> **Action Required**: After applying Phase 1 changes, you will need to:
> 1. Upload the FondoRenta PDF again
> 2. Share the debug output from the backend logs
>
> This will allow us to see the actual PDF format and design the correct regex pattern in Phase 2.
