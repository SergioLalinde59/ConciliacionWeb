# Walkthrough - Year/Month in Upload Modal

I have updated the application to display the Year and Month of the uploaded extract in the success modal.

## Changes
-   **Fixed Docker Build**: Resolved the build cache error to allow the app to start.
-   **Updated Success Modal**: Modified `UploadExtractoPage.tsx` to:
    -   Display the period (e.g., "2024 - Enero") in the modal title.
    -   Add a dedicated "Periodo" badge in the modal body for better visibility.
    -   Handle cases where the backend doesn't return a pre-formatted text string.

## Verification Steps
1.  **Open the App**: Go to the "Cargar Extracto" page.
2.  **Upload File**: Select and analyze a valid PDF extract.
3.  **Confirm**: Click "Confirmar y Cargar".
4.  **Check Modal**: Verify the success modal appears and looks like this (with your specific date):

> [!NOTE]
> The modal should now show "Extracto Cargado - 2024 - Enero" (or similar) in the title and "Periodo: Enero 2024" in the body.

## Status
The application is running and ready for review.
