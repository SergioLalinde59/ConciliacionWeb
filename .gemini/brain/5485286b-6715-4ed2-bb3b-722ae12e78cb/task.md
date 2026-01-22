# Task List

- [x] Modify `cuentas` table in PostgreSQL to add `permite_conciliar` (boolean)
    - [x] Analyze current schema and code
    - [x] Create and run Python script to ALTER TABLE
- [x] Update backend models to include `permite_conciliar`
- [x] Update repositories to handle `permite_conciliar`
- [x] Update API router `cuentas.py` to expose `permite_conciliar`
- [x] (Optional) Update frontend to handle the new field
    - [x] Update TypeScript interface for `Cuenta`
    - [x] Update `CuentasPage.tsx` and related components to display and edit `permite_conciliar`
