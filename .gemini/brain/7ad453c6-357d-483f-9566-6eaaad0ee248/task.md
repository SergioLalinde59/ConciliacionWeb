# Tasks

- [x] Check backend `conciliaciones.py` to see how accounts are fetched. <!-- id: 0 -->
- [x] Check frontend `types.ts` to see if `permite_conciliar` is defined. <!-- id: 1 -->
- [x] Check frontend component rendering the list (likely `ConciliacionPage.tsx` or a sub-component) to see where to apply the filter. <!-- id: 2 -->
- [x] Apply the filter to show only accounts with `permite_conciliar === true`. <!-- id: 3 -->
- [x] Verify the changes. <!-- id: 4 -->

## Multi-Month View
- [x] Create helper `getMonthsBetween(startDate, endDate)` in `dateUtils.ts`. <!-- id: 5 -->
- [x] Refactor `ConciliacionPage` state to store data by key `"${cuentaId}-${year}-${month}"`. <!-- id: 6 -->
- [x] Update fetching logic in `ConciliacionPage` to iterate over all months in range. <!-- id: 7 -->
- [x] Update rendering logic to show multiple rows per account (one per month). <!-- id: 8 -->
- [x] Update `handleUpdate`, `handleSave`, `handleRecalculate` to work with compound keys / specific months. <!-- id: 9 -->

## Sorting
- [x] Sort displayed months from newest to oldest in `ConciliacionPage.tsx`. <!-- id: 10 -->
