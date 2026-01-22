# Walkthrough - Extraction Configuration Fix

I have updated the system to explicitly use the correct extractor modules for all accounts, solving the issue where FondoRenta data was missing because it was falling back to an incompatible legacy extractor.

## Changes Made

### Database Configuration
Updated the `cuenta_extractores` table to map each account to its specific movement extractor module:

| Component | Account | Extractor Module | Status |
| :--- | :--- | :--- | :--- |
| **Database** | Ahorros (ID 1) | `ahorros_extracto_movimientos` | [x] Updated |
| **Database** | FondoRenta (ID 3) | `fondorenta_extracto_movimientos` | [x] Updated |
| **Database** | MasterCard Pesos (ID 6) | `mastercard_pesos_extracto_movimientos` | [x] Updated |
| **Database** | MasterCard USD (ID 7) | `mastercard_usd_extracto_movimientos` | [x] Updated |

## Verification Results

### Configuration Check
Ran the update script and verified the database rows were inserted correctly:
- Account 3 (FondoRenta) is now configured to use `fondorenta_extracto_movimientos`.
- Accounts 1, 6, and 7 are also correctly configured.

## Next Steps for User
> [!IMPORTANT]
> **Action Required:** Please **RE-UPLOAD** the PDF extracts for **January, February, and April 2025** for FondoRenta. The system will now use the correct logic to read the movements and populate the "Conciliación Mensual" table correctly.
