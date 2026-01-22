# Conciliación Mensual - Implementation Plan

## Goal Description
Create a system to reconcile bank statements with registered movements. This involves a new table `conciliaciones` that stores both the values from the bank statement (manual/OCR input) and the calculated values from the system (movements).

## Proposed Changes

### Database
#### [NEW] `conciliaciones` table
- Stores `year`, `month`, `cuenta_id`.
- Stores "Extracto" values: `extracto_saldo_anterior`, `extracto_entradas`, `extracto_salidas`, `extracto_saldo_final`.
- Stores "Sistema" values: `sistema_entradas`, `sistema_salidas`, `sistema_saldo_final`.
- Stores calculated difference.
- `datos_extra` JSONB for reporting specifics.

### Backend
#### [NEW] `create_table_conciliaciones.py`
- Python script to execute the DDL.
