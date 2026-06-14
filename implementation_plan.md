# Implementation Plan: Remove HPP from Recipes + Transform Ingredients to Stock

## Task 1: Remove HPP from RecipesPage.tsx
Remove all HPP/profit/margin calculations and displays. Keep recipe management (ingredient assignment, save).

**Files to change:** `src/pages/RecipesPage.tsx` only.
**Files NOT touched:** hppEngine.ts, transactionService.ts, types, database, etc.

### Changes:
1. Remove hppEngine imports (getHppProfitForProduct, RecipeFormItem)
2. Remove ProductWithRecipe interface (hpp, profit, margin fields)
3. Remove HPP calculation variables (hppPerPcs, profitPerPcs, margin, etc.)
4. Remove autoDetectSuggestion logic
5. Simplify loadData to not call getHppProfitForProduct
6. Remove HPP/profit/margin display from product cards
7. Remove Analysis Cards from recipe modal

## Task 2: Transform IngredientsPage -> Stock Page
Show stock movement history (in/out) alongside current stock levels.

**Files to change:** `src/pages/IngredientsPage.tsx`, `src/components/layout/Sidebar.tsx`
**Files NOT touched:** Any other files.

### Changes:
1. Add "Riwayat Stok" tab showing stock movements (in/out)
2. Keep ingredient list as "Stok Saat Ini" tab
3. Sidebar: "Bahan Baku" -> "Stok"
