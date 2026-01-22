# Walkthrough - Unify Currency Presentation (Atomic Design)

I have refactored the currency presentation to use a dedicated Atomic Design component (`CurrencyValue`). This ensures that all currency values across the application are consistently formatted and colored, while non-monetary values remain neutral.

## Changes

### Atomic Component
- **[CurrencyValue](file:///f:/1.%20Cloud/4.%20AI/1.%20Antigravity/Facturas/frontend/src/components/atoms/CurrencyValue/CurrencyValue.tsx)**: A new atom that handles number formatting (`$ 1.000`) and conditional coloring (Green for positive, Red for negative).
- **[CurrencyValue.css](file:///f:/1.%20Cloud/4.%20AI/1.%20Antigravity/Facturas/frontend/src/components/atoms/CurrencyValue/CurrencyValue.css)**: dedicated styles.

### Refactoring
- **[StatCard.tsx](file:///f:/1.%20Cloud/4.%20AI/1.%20Antigravity/Facturas/frontend/src/components/molecules/StatCard/StatCard.tsx)**: Updated to accept `ReactNode` as a `value`, allowing direct injection of the `CurrencyValue` component.
- **[App.tsx](file:///f:/1.%20Cloud/4.%20AI/1.%20Antigravity/Facturas/frontend/src/App.tsx)**:
    - Updated Dashboard StatCards to use `<CurrencyValue />` for monetary stats.
    - Updated Report and Import tables to use `<CurrencyValue />` for monetary columns.

## Verification Results

### Dashboard
Final verification confirms that **Monto Total** is now correctly colored in Green.
- **Total Facturas (Count)**: Black.
- **Subtotal / IVA / Monto (Positive Currency)**: Green.
- **Descuentos (Negative Currency)**: Red.

![Dashboard Final Check](/brain/3e392191-b4a3-47a7-b46c-58f3da7823db/dashboard_final_check_1768407054203.png)

### Report Table
- Columns like `Subtotal`, `IVA`, `Total` are Green/Red.
- Columns like `Nit`, `Factura` are Black.

![Report Table Atomic Colors](/brain/3e392191-b4a3-47a7-b46c-58f3da7823db/report_results_table_1768406676319.png)
