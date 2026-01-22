# Implementation Plan - Fix Concept Management FK Error

## Goal Description
Fix the error in "Gestión de Conceptos" where an FK (Foreign Key) issue is preventing correct operation. The user mentioned reviewing the API and the FK topic.

## Proposed Changes
*Analysis Phase - exact changes to be determined after code review*

### Backend
- **Investigate**: `src/infrastructure/repositories/postgres_concept_repository.py` (assumed)
- **Investigate**: `src/infrastructure/api/routers/concept_router.py` (assumed)
- **Action**: Create a script `inspect_db.py` to query `information_schema` and check `conceptos` and `centro_costos` tables and their constraints. <!-- id: 16 -->
    - [x] Create script `inspect_db.py` <!-- id: 17 -->
    - [x] Run script and analyze output <!-- id: 18 -->
- [x] Create and run `test_fk.py` to verify FK constraints validation at DB level <!-- id: 19 -->

## Proposed Changes
### Backend
#### `src/infrastructure/api/routers/conceptos.py`
- **Modify**: Update `listar_conceptos` to accept optional `centro_costo_id` query parameter.
- **Modify**: If `centro_costo_id` is provided, use `repo.buscar_por_centro_costo_id` instead of `obtener_todos`.
- **Modify**: Add specific exception handling for `psycopg2.errors.ForeignKeyViolation` (or `IntegrityError`) in `crear_concepto` and `actualizar_concepto` to return 400 Bad Request instead of 500.

#### `src/infrastructure/api/dependencies.py` (if needed)
- No changes expected.

#### `src/infrastructure/database/postgres_concepto_repository.py`
- Verify `buscar_por_centro_costo_id` implementation (already verified, looks good).

## Verification Plan
### Manual Verification
- Attempt to fetch concepts.
- Attempt to create a concept linked to a cost center.
- Check application logs for FK violation errors.
- Run `inspect_db.py` and verify table structure.
