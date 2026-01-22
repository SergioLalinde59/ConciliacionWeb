# Implementation Plan - FondoRenta Movement Sign Logic

## Goal Description
Implement logic to correctly assign positive or negative signs to FondoRenta movements based on their description, as proposed by the user.
- **Ingresos (+)**: Movements with description "ADICION".
- **Egresos (-)**: All other movements.

## User Review Required
> [!IMPORTANT]
> This logic assumes that **only** "ADICION" represents an inflow. Any other transaction type (e.g., "RENDIMIENTOS", "INTERESES", or corrections) will be treated as an outflow (negative). Please confirm if there are other positive transaction types.

## Proposed Changes

### Backend

#### [MODIFY] [fondorenta_extracto_movimientos.py](file:///f:/1.%20Cloud/4.%20AI/1.%20Antigravity/ConciliacionWeb/Backend/src/infrastructure/extractors/bancolombia/fondorenta_extracto_movimientos.py)
- Modify `_extraer_movimientos_desde_texto` function.
- After extracting `descripcion` and `valor`:
    - Check if `descripcion` (normalized) contains "ADICION".
    - If yes, keep `valor` positive.
    - If no, multiply `valor` by -1.

## Verification Plan

### Automated Tests
- Create a temporary python script `test_fondorenta_logic.py` that mimics `_extraer_movimientos_desde_texto` with sample text containing both "ADICION" and other transaction types to verify the logic.

### Manual Verification
- The user can process the extract again and verify in the UI that "ADICION" is green (positive) and others are red (negative), or check the database.
