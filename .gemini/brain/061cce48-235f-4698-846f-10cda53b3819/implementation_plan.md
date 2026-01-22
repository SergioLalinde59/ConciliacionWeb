# Refactor Filter Logic and Remove Preview Button

We need to remove the "Previsualizar" button from the Import view and trigger its logic automatically when date or provider filters change. Additionally, we need to fix the "Todos los proveedores" selection to correctly reset the filter.

## User Review Required
> [!IMPORTANT]
> The "Previsualizar" (Preview) action will now run automatically whenever you change a date or provider in the Import view. This assumes the backend operation is fast enough for real-time updates.

## Proposed Changes

### Frontend Component Layer

#### [MODIFY] [FilterBar.tsx](file:///f:/1. Cloud/4. AI/1. Antigravity/Facturas/frontend/src/components/organisms/FilterBar/FilterBar.tsx)
- Update the `options` prop passed to the `Select` component.
- explicit handling for "Todos los proveedores" to ensure it passes an empty string `""` as the value, instead of the label text. This fixes the issue where selecting "All" didn't update the page correctly.

#### [MODIFY] [App.tsx](file:///f:/1. Cloud/4. AI/1. Antigravity/Facturas/frontend/src/App.tsx)
- **Remove** the "Previsualizar" `Button` component from the `import` view rendering.
- **Add** a `useEffect` hook (or update existing) to watch for changes in `startDate`, `endDate`, and `provider`.
- **Logic**: When `activeView === 'import'` and filters change, automatically call `handleImportToDB(true)` (preview mode).

## Verification Plan

### Manual Verification
1.  **Start Application**: Ensure app is running.
2.  **Navigate to Import**: Go to "Carga Base Datos" view.
3.  **Select Directory**: Ensure a validity directory is selected (e.g., `/app/data/Facturas/2026`).
4.  **Test Filters**:
    - Change dates (Start/End). Verify that the dashboard/preview stats update automatically without pressing a button.
    - Select a specific provider. Verify results update.
    - Select "Todos los proveedores". Verify results update to show all providers (fixing the reported bug).
5.  **Verify Removal**: Check that the "Previsualizar" button is no longer visible in the top right or filter bar area.
