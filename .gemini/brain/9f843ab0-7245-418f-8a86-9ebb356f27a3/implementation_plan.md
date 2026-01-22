# Implementation Plan - Dynamic Extractor Configuration (Table-Based)

We will create a new table `cuenta_extractores` to manage the relationship between accounts and their extractor modules. This allows multiple extractor versions per account (1-to-N) and supports different types of extraction (Summary vs Movements).

## User Review Required

> [!IMPORTANT]
> This involves creating a new table and migrating configuration data. I will execute the SQL commands.

## Proposed Changes

### Database
- Create table `cuenta_extractores`:
    - `id` SERIAL PRIMARY KEY
    - `cuenta_id` INTEGER REFERENCES cuentas(cuentaid)
    - `tipo` VARCHAR(20) CHECK (tipo IN ('MOVIMIENTOS', 'RESUMEN')) -- To distinguish between summary and row extraction
    - `modulo` VARCHAR(100) -- The python module path/name
    - `orden` INTEGER DEFAULT 1 -- Priority (try 1, then 2...)
    - `activo` BOOLEAN DEFAULT TRUE

- Populate Table with Initial Data:
    - **Ahorros (ID 1)**:
        - MOVIMIENTOS: `ahorros_extracto_movimientos`
        - RESUMEN: `ahorros_extracto`
    - **FondoRenta (ID 3)**:
        - MOVIMIENTOS: `fondorenta_extracto_movimientos`
        - RESUMEN: `fondorenta_extracto`
    - **MasterCardPesos (ID 6)**:
        - MOVIMIENTOS (1): `mastercard_pesos_extracto_movimientos` (New)
        - MOVIMIENTOS (2): `mastercard_movimientos` (Old - as fallback)
        - RESUMEN (1): `mastercard_pesos_extracto`
        - RESUMEN (2): `mastercard_pesos_extracto_anterior`
    - **MasterCardUSD (ID 7)**:
        - MOVIMIENTOS (1): `mastercard_usd_extracto_movimientos`
        - RESUMEN (1): `mastercard_usd_extracto`
        - RESUMEN (2): `mastercard_usd_extracto_anterior`

### Backend

#### [NEW] [cuenta_extractor_repository.py]
- Create `CuentaExtractorRepository` to fetch extractors by `cuenta_id` and `tipo`, ordered by `orden`.

#### [Modify] [postgres_cuenta_repository.py]
- (Optional) Could integrate here, but separate repo is cleaner.

#### [Modify] [procesador_archivos_service.py](file:///f:/1.%20Cloud/4.%20AI/1.%20Antigravity/ConciliacionWeb/Backend/src/application/services/procesador_archivos_service.py)
- Inject `CuentaExtractorRepository`.
- Refactor `analizar_extracto` (Summary):
    - Remove hardcoded `if/else` block.
    - Fetch 'RESUMEN' extractors for the account.
    - Iterate and try each module until one succeeds.
- Refactor `procesar_extracto` / `_obtener_modulo_extractor_movimientos`:
    - Fetch 'MOVIMIENTOS' extractors.
    - Iterate and try each module until one succeeds (returns list > 0? or just doesn't raise error?).
    - *Decision*: For movements, an empty list might be valid. We should probably accept the first one that runs without *error*, even if it returns 0 movements (user verified). OR, if it fails to *parse*, it raises error.
    - We will assume: If `extraer_movimientos` runs without Exception, it is the correct format.

#### [Modify] [archivos.py](file:///f:/1.%20Cloud/4.%20AI/1.%20Antigravity/ConciliacionWeb/Backend/src/infrastructure/api/routers/archivos.py)
- Inject `CuentaExtractorRepository`.

## Verification Plan

### Manual Verification
1.  **Execute SQL**: Run creation and population script.
2.  **Upload Test**: Upload MasterCard Pesos PDF. Validates that the Service finds the new table entries and successfully extracts.
