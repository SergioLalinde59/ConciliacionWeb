# Walkthrough - Statistics in Upload Success Modal

I have implemented the statistics display in the success modal after uploading a bank extract and fixed a bug where the modal appeared empty.

## Changes

### 1. `ExtractoResumenCinta.tsx`
- Modified to accept an optional `labelNuevos` prop.
- Defaults to "A CARGAR" if not provided.
- Allows flexibility for different contexts (e.g., "CARGADOS", "PENDIENTES").

### 2. `UploadExtractoPage.tsx`
- Integrated `ExtractoResumenCinta` into the success modal.
- **Bug Fix**: Moved the logic that resets the form (`setFile(null)`, etc.) from the success callback to the `handleCloseSuccessModal` function. This prevents a `useEffect` from triggering immediately and clearing the results before the modal can display them.

## Verification Results

### Manual Verification Steps
1. Navigate to the "Cargar Extracto" page.
2. Select an account and upload a valid PDF extract.
3. Click "Analizar Extracto".
    - *Check*: The "Resumen del Periodo" should show the tape with "A CARGAR".
4. Click "Confirmar y Cargar".
5. Wait for the success modal.
    - *Check*: The modal should **NOT** be empty.
    - *Check*: The modal should display the statistics tape at the top, showing:
        - "REGISTROS LEÍDOS"
        - "DUPLICADOS"
        - "CARGADOS"
    - *Check*: The balance details (Saldo Anterior, Entradas, Salidas, Saldo Final) should be clearly visible with **no overlapping text**, thanks to the wider modal (XL) and improved grid responsiveness.
    - *Check*: Clicking "Entendido" closes the modal and resets the form (file input cleared).
