import { db } from '../database';

export interface RecipeWithIngredient {
  id?: number;
  productId: number;
  ingredientId: number;
  quantity: number;
  ingredientName: string;
  ingredientUnit: string;
  unitCost: number;
}

export interface RecipeFormItem {
  productId: number;
  ingredientId: number;
  quantity: number;
  ingredientName: string;
  ingredientUnit: string;
  unitCost: number;
}

export async function getRecipeByProduct(productId: number): Promise<RecipeWithIngredient[]> {
  const recipes = await db.recipes
    .where('productId')
    .equals(productId)
    .toArray();

  const result: RecipeWithIngredient[] = [];

  for (const recipe of recipes) {
    const ingredient = await db.ingredients.get(recipe.ingredientId);
    if (ingredient) {
      result.push({
        id: recipe.id,
        productId: recipe.productId,
        ingredientId: recipe.ingredientId,
        quantity: recipe.quantity,
        ingredientName: ingredient.name,
        ingredientUnit: ingredient.unit,
        unitCost: ingredient.unitCost,
      });
    }
  }

  return result;
}

/**
 * Calculate total batch cost (Total Modal Batch)
 * = sum of (quantity * unitCost) for all ingredients
 */
export async function calculateBatchCost(productId: number): Promise<number> {
  const recipes = await db.recipes
    .where('productId')
    .equals(productId)
    .toArray();

  let totalBatchCost = 0;

  for (const recipe of recipes) {
    const ingredient = await db.ingredients.get(recipe.ingredientId);
    if (ingredient) {
      totalBatchCost += ingredient.unitCost * recipe.quantity;
    }
  }

  return totalBatchCost;
}

/**
 * Calculate HPP per pcs = Total Modal Batch / productionQuantity
 */
export async function calculateHppPerPcs(productId: number): Promise<number> {
  const recipes = await db.recipes
    .where('productId')
    .equals(productId)
    .toArray();

  if (recipes.length === 0) return 0;

  const productionQuantity = recipes[0]?.productionQuantity || 1;
  if (productionQuantity <= 0) return 0;

  const totalBatchCost = await calculateBatchCost(productId);
  return totalBatchCost / productionQuantity;
}

/**
 * Backward-compatible: calculateHpp returns HPP per pcs
 */
export async function calculateHpp(productId: number): Promise<number> {
  return calculateHppPerPcs(productId);
}

/**
 * Get productionQuantity for a product from its recipes
 */
export async function getProductionQuantity(productId: number): Promise<number> {
  const recipes = await db.recipes
    .where('productId')
    .equals(productId)
    .toArray();

  if (recipes.length === 0) return 1;
  return recipes[0]?.productionQuantity || 1;
}

export async function saveRecipe(
  productId: number,
  ingredients: { ingredientId: number; quantity: number }[],
  productionQuantity: number = 1
): Promise<void> {
  await db.recipes.where('productId').equals(productId).delete();

  const now = new Date();
  for (const item of ingredients) {
    if (item.quantity > 0) {
      await db.recipes.add({
        productId,
        ingredientId: item.ingredientId,
        quantity: item.quantity,
        productionQuantity,
        createdAt: now,
        updatedAt: now,
      });
    }
  }
}

export async function recalculateAllHpp(): Promise<number> {
  const products = await db.products.toArray();
  let totalHpp = 0;
  for (const product of products) {
    if (product.id) {
      totalHpp += await calculateHppPerPcs(product.id);
    }
  }
  return totalHpp;
}

export async function getHppProfitForProduct(productId: number): Promise<{
  batchCost: number;
  productionQuantity: number;
  hppPerPcs: number;
  sellingPrice: number;
  profitPerPcs: number;
  margin: number;
  batchOmzet: number;
  batchProfit: number;
}> {
  const product = await db.products.get(productId);
  const batchCost = await calculateBatchCost(productId);
  const productionQuantity = await getProductionQuantity(productId);
  const hppPerPcs = productionQuantity > 0 ? batchCost / productionQuantity : 0;
  const sellingPrice = product ? product.price : 0;
  const profitPerPcs = sellingPrice - hppPerPcs;
  const margin = sellingPrice > 0 ? (profitPerPcs / sellingPrice) * 100 : 0;
  const batchOmzet = sellingPrice * productionQuantity;
  const batchProfit = batchOmzet - batchCost;

  return {
    batchCost,
    productionQuantity,
    hppPerPcs,
    sellingPrice,
    profitPerPcs,
    margin,
    batchOmzet,
    batchProfit,
  };
}

export async function getAllProductsWithHpp(): Promise<
  {
    id: number;
    name: string;
    price: number;
    category: string;
    isActive: number;
    hpp: number;
    profit: number;
    margin: number;
  }[]
> {
  const products = await db.products.toArray();
  const result = [];

  for (const product of products) {
    if (!product.id) continue;
    const hpp = await calculateHppPerPcs(product.id);
    const profit = product.price - hpp;
    const margin = product.price > 0 ? (profit / product.price) * 100 : 0;
    result.push({
      id: product.id,
      name: product.name,
      price: product.price,
      category: product.category,
      isActive: product.isActive,
      hpp,
      profit,
      margin,
    });
  }

  return result;
}