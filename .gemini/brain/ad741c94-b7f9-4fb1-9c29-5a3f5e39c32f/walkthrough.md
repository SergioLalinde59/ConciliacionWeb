# Walkthrough - Fix Concept Repository Interface

## Changes Implemented
### Backend
- **`src/domain/ports/concepto_repository.py`**:
    - Renamed abstract method `buscar_por_grupoid` to `buscar_por_centro_costo_id` to match the implementation in `PostgresConceptoRepository`.
    - Updated parameter names in `buscar_por_nombre` and `obtener_id_traslados` to use `centro_costo_id` for consistency.

## Verification
### Automated Checks
- **Code Search**: Verified that `buscar_por_grupoid` is no longer used in the codebase.

### User Verification Steps
1. **Restart Application**: The backend needs to restart to pick up the code changes (usually automatic with `uvicorn --reload` but if it crashed hard, might need manual restart or just wait a moment).
2. **Reload Page**: Refresh the frontend.
3. **Verify Dropdown**: "Gestión de Conceptos" should now load the cost center dropdown list correctly.
4. **Verify Concepts**: Selecting a cost center should load the concepts.
