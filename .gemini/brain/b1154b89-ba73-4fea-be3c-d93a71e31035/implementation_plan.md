# Implementation Plan - Update Success Modal Info

## Goal
Update the "Extracto Cargado" success modal in `UploadExtractoPage.tsx` to display:
1.  **Header**: "Extracto Cargado: [Cuenta] - [Year] - [Month]"
2.  **Body**: Display "[CuentaId] - [Cuenta]" before the Periodo section.

## User Review Required
> [!NOTE]
> I will assume "moth" in the request meant "month" (e.g., Abril).

## Proposed Changes

### Frontend
#### [MODIFY] [UploadExtractoPage.tsx](file:///f:/1.%20Cloud/4.%20AI/1.%20Antigravity/ConciliacionWeb/frontend/src/pages/UploadExtractoPage.tsx)
- Update the `Modal` `title` prop logic.
- Add a new block displaying `${cuentaId} - ${tipoCuenta}` inside the `Modal` content, immediately before the "Periodo" block (around line 313).
- Refactor the month name lookup into a small helper or reuse the existing array logic inline if it's short enough.

## Verification Plan

### Manual Verification
- Since I cannot easily simulate a full file upload flow without a valid sample extract, I will rely on code review and requesting the user to verify the changes in their running application.
- I will verify the code compiles (TSX logic is sound).
