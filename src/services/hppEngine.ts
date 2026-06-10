import { db } from '../database';

export interface RecipeWithIngredient {
  id?: number;
  productId: number;
  ingredientId: number;
  quantity: number;
  ingredientName: string;
  ingredientUnit: string;
  purchasePrice: number;
}

export interface RecipeFormItem {
  productId: number;
  ingredientId: number;
  quantity: number;
  ingredientName: string;
  ingredientUnit: string;
  purchasePrice: number;
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
        purchasePrice: ingredient.purchasePrice,
      });
    }
  }

  return result;
}

export async function calculateHpp(productId: number): Promise<number> {
  const recipes = await db.recipes
    .where('productId')
    .equals(productId)
    .toArray();

  let totalHpp = 0;

  for (const recipe of recipes) {
    const ingredient = await db.ingredients.get(recipe.ingredientId);
    if (ingredient) {
      totalHpp += ingredient.purchasePrice * recipe.quantity;
    }
  }

  return totalHpp;
}

export async function saveRecipe(
  productId: number,
  ingredients: { ingredientId: number; quantity: number }[]
): Promise<void> {
  // Remove existing recipes for this product
  await db.recipes.where('productId').equals(productId).delete();

  // Add new recipes
  const now = new Date();
  for (const item of ingredients) {
    if (item.quantity > 0) {
      await db.recipes.add({
        productId,
        ingredientId: item.ingredientId,
        quantity: item.quantity,
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
      totalHpp += await calculateHpp(product.id);
    }
  }
  return totalHpp;
}

export async function getHppProfitForProduct(productId: number): Promise<{
  hpp: number;
  profit: number;
  margin: number;
}> {
  const product = await db.products.get(productId);
  const hpp = await calculateHpp(productId);
  const profit = product ? product.price - hpp : 0;
  const margin = product && product.price > 0 ? (profit / product.price) * 100 : 0;

  return { hpp, profit, margin };
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
    const { hpp, profit, margin } = await getHppProfitForProduct(product.id);
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