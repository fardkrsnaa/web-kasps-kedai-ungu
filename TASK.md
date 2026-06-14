# Task Tracking: HPP Removal + Stock Page Transformation

## Task 1: Remove HPP from RecipesPage.tsx
- [x] Remove HPP imports (getHppProfitForProduct, RecipeFormItem)
- [x] Remove ProductWithRecipe HPP fields (hpp, profit, margin)
- [x] Remove HPP calculation variables (hppPerPcs, profitPerPcs, margin, batchOmzet, batchProfit)
- [x] Remove autoDetectSuggestion logic
- [x] Simplify loadData to not call getHppProfitForProduct
- [x] Remove HPP/profit/margin display from product cards
- [x] Remove Analysis Cards (3 cards) from recipe modal
- [x] Remove auto-detect warning from recipe modal
- [x] Clean up unused imports (useMemo, AnimatePresence, ExclamationTriangleIcon, etc.)

## Task 2: Transform IngredientsPage -> Stock Page
- [x] Add tab navigation (Stok Saat Ini / Riwayat Stok)
- [x] Load stockMovements from database
- [x] Display stock movement history (in/out) with icons
- [x] Keep ingredient CRUD fully intact
- [x] Update sidebar label: "Bahan Baku" → "Stok"
- [x] Build passes with zero errors

## Verification
- [x] `npm run build` passes successfully
