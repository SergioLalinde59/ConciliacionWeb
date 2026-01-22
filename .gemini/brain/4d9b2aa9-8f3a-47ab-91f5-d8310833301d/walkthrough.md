# Formatting Number Display Walkthrough

I have updated the "Conciliación" page to use strict number formatting and coloring conventions.

## Changes

### `CurrencyDisplay.tsx`
- Refactored to export `getNumberColorClass` logic.
- Ensures strict formatting:
    - **Positive**: Green (`text-emerald-600`)
    - **Negative**: Red (`text-rose-600`)
    - **Zero**: Blue (`text-blue-600`)
    - **Format**: Thousands separators, 0 decimal places.

### `ConciliacionPage.tsx`
- Integrated `CurrencyDisplay` for all read-only monetary values.
- Applied `getNumberColorClass` to input fields to dynamically color text as you type.
- Removed legacy `formatMoney` function.

## Verification Results

### 1. Browser Verification
I will inspect the page to verify:
- [ ] System columns display correctly colored values with separators.
- [ ] Difference column displays correctly colored values with separators.
- [ ] Inputs change color correctly when typing positive/negative numbers.
