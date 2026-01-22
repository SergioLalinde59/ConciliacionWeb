# Implementation Plan - Configure Extractors for All Accounts

The current system relies on hardcoded fallback extractors which are outdated or incorrect for the current PDF formats. To ensure stability and correctness across all accounts, we will move the configuration to the database table `cuenta_extractores`.

## User Review Required
> [!IMPORTANT]
> This change applies to **ALL accounts** (Ahorros, FondoRenta, MasterCard).
> **Users may need to RELOAD previous extracts** if they want to benefit from the improved extraction logic for past months, as this change affects how future uploads are processed.
> Specifically for **FondoRenta**, re-uploading Jan, Feb, and April 2025 is required to fix the missing data.

## Proposed Changes

### Database Configuration
#### [INSERT] `cuenta_extractores`
We will insert or update the `MOVIMIENTOS` extractor configuration for the following accounts:

1.  **FondoRenta (ID 3)**
    -   Type: `MOVIMIENTOS`
    -   Module: `fondorenta_extracto_movimientos` (Fixes the missing data issue)
    -   Order: 1

2.  **Ahorros (ID 1)**
    -   Type: `MOVIMIENTOS`
    -   Module: `ahorros_extracto_movimientos` (Standardizes extraction from the monthly PDF)
    -   Order: 1

3.  **MasterCard Pesos (ID 6)**
    -   Type: `MOVIMIENTOS`
    -   Module: `mastercard_pesos_extracto_movimientos` (Primary)
    -   Order: 1
    -   Module: `mastercard_pesos_extracto_anterior_movimientos` (Secondary/Fallback for old format)
    -   Order: 2

4.  **MasterCard USD (ID 7)**
    -   Type: `MOVIMIENTOS`
    -   Module: `mastercard_usd_extracto_movimientos` (Primary)
    -   Order: 1
    -   Module: `mastercard_usd_extracto_anterior_movimientos` (Secondary/Fallback)
    -   Order: 2

## Verification Plan

### Automated Tests
- Run `debug_fondo_renta.py` (which I will rename or update to `verify_config.py`) to confirm that ALL accounts now have dynamic configuration in `cuenta_extractores`.

### Manual Verification
- **FondoRenta**: Upload April 2025 PDF again. Verify movements appear.
- **Ahorros**: Upload a recent Ahorros extract. Verify movements appear.
- **MasterCard**: Upload a recent MC extract. Verify movements appear.
