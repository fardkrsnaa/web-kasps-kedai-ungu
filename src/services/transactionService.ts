import { db } from '../database';
import { calculateHpp } from './hppEngine';
import { generateInvoiceNumber } from '../utils/format';

export interface CartItem {
  productId: number;
  productName: string;
  price: number;
  quantity: number;
  hpp: number;
  notes?: string;
}

export interface CheckoutPayload {
  items: CartItem[];
  discount: number;
  paymentMethod: 'cash' | 'qris' | 'transfer';
  paymentAmount: number;
}

export async function processCheckout(payload: CheckoutPayload): Promise<{ invoiceNumber: string }> {
  const { items, discount, paymentMethod, paymentAmount } = payload;

  if (items.length === 0) {
    throw new Error('Cart is empty');
  }

  const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalDiscount = totalAmount > 0 ? Math.min(discount, totalAmount) : 0;
  const finalAmount = totalAmount - totalDiscount;
  const changeAmount = paymentMethod === 'cash' ? Math.max(0, paymentAmount - finalAmount) : 0;

  let totalHpp = 0;
  const itemsWithHpp = await Promise.all(
    items.map(async (item) => {
      const hpp = await calculateHpp(item.productId);
      totalHpp += hpp * item.quantity;
      return { ...item, hpp };
    })
  );

  const totalProfit = finalAmount - totalHpp;
  const invoiceNumber = generateInvoiceNumber();

  const transactionId = (await db.transactions.add({
    invoiceNumber,
    totalAmount: finalAmount,
    totalHpp,
    totalProfit,
    discount: totalDiscount,
    paymentMethod,
    paymentAmount,
    changeAmount,
    status: 'completed',
    itemCount: items.length,
    createdAt: new Date(),
  })) as number;

  for (const item of itemsWithHpp) {
    await db.transactionItems.add({
      transactionId,
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      price: item.price,
      hpp: item.hpp,
      profit: item.price - item.hpp,
      notes: item.notes,
    });

    const recipes = await db.recipes
      .where('productId')
      .equals(item.productId)
      .toArray();

    for (const recipe of recipes) {
      const ingredient = await db.ingredients.get(recipe.ingredientId);
      if (ingredient && ingredient.id) {
        const newStock = Math.max(0, ingredient.stock - recipe.quantity * item.quantity);
        await db.ingredients.update(ingredient.id, {
          stock: newStock,
          updatedAt: new Date(),
        });

        await db.stockMovements.add({
          ingredientId: ingredient.id,
          ingredientName: ingredient.name,
          type: 'out',
          quantity: recipe.quantity * item.quantity,
          reference: invoiceNumber,
          createdAt: new Date(),
        });
      }
    }
  }

  return { invoiceNumber };
}

export async function checkLowStockIngredients(): Promise<{ name: string; stock: number; unit: string }[]> {
  const ingredients = await db.ingredients.toArray();
  return ingredients
    .filter((ing) => ing.stock <= ing.minStock)
    .map((ing) => ({ name: ing.name, stock: ing.stock, unit: ing.unit }));
}