import { db } from '../database';
import { calculateHpp } from './hppEngine';
import { generateInvoiceNumber, getTodayRange } from '../utils/format';

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
  transactionId?: number; // Optional if paying a queued transaction
}

export interface SaveQueuePayload {
  items: CartItem[];
  discount: number;
  transactionId?: number; // Optional if updating an existing queued transaction
}

export async function generateQueueNumber(): Promise<string> {
  const { start, end } = getTodayRange();
  const todayTransactions = await db.transactions
    .where('createdAt')
    .between(start, end, true, true)
    .toArray();
  
  const numbers = todayTransactions
    .map((t) => t.queueNumber)
    .filter((q): q is string => typeof q === 'string' && /^A\d{3}$/.test(q))
    .map((q) => parseInt(q.substring(1), 10));
  
  const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0;
  const nextNumber = maxNumber + 1;
  return `A${nextNumber.toString().padStart(3, '0')}`;
}

export async function saveToQueue(payload: SaveQueuePayload): Promise<{ invoiceNumber: string; queueNumber: string }> {
  const { items, discount, transactionId } = payload;

  if (items.length === 0) {
    throw new Error('Keranjang kosong');
  }

  const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalDiscount = totalAmount > 0 ? Math.min(discount, totalAmount) : 0;
  const finalAmount = totalAmount - totalDiscount;

  // Calculate HPP per pcs for each item
  let totalHpp = 0;
  const itemsWithHpp = await Promise.all(
    items.map(async (item) => {
      const hppPerPcs = await calculateHpp(item.productId);
      totalHpp += hppPerPcs * item.quantity;
      return { ...item, hpp: hppPerPcs };
    })
  );

  const totalProfit = finalAmount - totalHpp;
  let invoiceNumber = '';
  let queueNumber = '';
  let targetId = transactionId;

  if (targetId) {
    // Updating existing queued transaction
    const existing = await db.transactions.get(targetId);
    if (!existing) {
      throw new Error('Transaksi antrean tidak ditemukan');
    }
    invoiceNumber = existing.invoiceNumber;
    queueNumber = existing.queueNumber || (await generateQueueNumber());

    await db.transactions.update(targetId, {
      totalAmount: finalAmount,
      totalHpp,
      totalProfit,
      discount: totalDiscount,
      itemCount: items.length,
      status: 'queued',
    });

    // Delete old items
    await db.transactionItems.where('transactionId').equals(targetId).delete();
  } else {
    // Creating a new queued transaction
    invoiceNumber = generateInvoiceNumber();
    queueNumber = await generateQueueNumber();

    targetId = (await db.transactions.add({
      invoiceNumber,
      queueNumber,
      totalAmount: finalAmount,
      totalHpp,
      totalProfit,
      discount: totalDiscount,
      paymentMethod: 'cash',
      paymentAmount: 0,
      changeAmount: 0,
      status: 'queued',
      itemCount: items.length,
      createdAt: new Date(),
    })) as number;
  }

  // Save new items
  for (const item of itemsWithHpp) {
    await db.transactionItems.add({
      transactionId: targetId,
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      price: item.price,
      hpp: item.hpp,
      profit: item.price - item.hpp,
      notes: item.notes,
    });
  }

  // Log audit trail
  await db.auditLogs.add({
    action: 'QUEUE_TRANSACTION',
    transactionId: targetId,
    invoiceNumber,
    timestamp: new Date(),
    description: `Pesanan disimpan ke antrean (${queueNumber}). Invoice: ${invoiceNumber}`,
  });

  return { invoiceNumber, queueNumber };
}

export async function processCheckout(payload: CheckoutPayload): Promise<{ invoiceNumber: string }> {
  const { items, discount, paymentMethod, paymentAmount, transactionId } = payload;

  if (items.length === 0) {
    throw new Error('Cart is empty');
  }

  const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalDiscount = totalAmount > 0 ? Math.min(discount, totalAmount) : 0;
  const finalAmount = totalAmount - totalDiscount;
  const changeAmount = paymentMethod === 'cash' ? Math.max(0, paymentAmount - finalAmount) : 0;

  // Calculate HPP per pcs for each item
  let totalHpp = 0;
  const itemsWithHpp = await Promise.all(
    items.map(async (item) => {
      // calculateHpp now returns HPP per pcs
      const hppPerPcs = await calculateHpp(item.productId);
      totalHpp += hppPerPcs * item.quantity;
      return { ...item, hpp: hppPerPcs };
    })
  );

  const totalProfit = finalAmount - totalHpp;
  let invoiceNumber = '';
  let finalTxId = transactionId;

  if (finalTxId) {
    // Paying a queued transaction
    const existing = await db.transactions.get(finalTxId);
    if (!existing) {
      throw new Error('Transaksi antrean tidak ditemukan');
    }
    invoiceNumber = existing.invoiceNumber;

    await db.transactions.update(finalTxId, {
      totalAmount: finalAmount,
      totalHpp,
      totalProfit,
      discount: totalDiscount,
      paymentMethod,
      paymentAmount,
      changeAmount,
      status: 'completed',
      itemCount: items.length,
      // Keep queueNumber and original createdAt
    });

    // Delete old items
    await db.transactionItems.where('transactionId').equals(finalTxId).delete();
  } else {
    // Normal checkout
    invoiceNumber = generateInvoiceNumber();
    finalTxId = (await db.transactions.add({
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
  }

  for (const item of itemsWithHpp) {
    await db.transactionItems.add({
      transactionId: finalTxId,
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      price: item.price,
      hpp: item.hpp,
      profit: item.price - item.hpp,
      notes: item.notes,
    });

    // Deduct ingredient stock based on recipe
    const recipes = await db.recipes
      .where('productId')
      .equals(item.productId)
      .toArray();

    for (const recipe of recipes) {
      const ingredient = await db.ingredients.get(recipe.ingredientId);
      if (ingredient && ingredient.id) {
        // recipe.quantity is amount per batch, we need per unit sold
        // recipe.quantity is total for productionQuantity items
        // so per item = recipe.quantity / productionQuantity
        const perUnit = recipe.productionQuantity > 0
          ? recipe.quantity / recipe.productionQuantity
          : recipe.quantity;
        const deductAmount = perUnit * item.quantity;
        const newStock = Math.max(0, ingredient.stock - deductAmount);
        await db.ingredients.update(ingredient.id, {
          stock: newStock,
          updatedAt: new Date(),
        });

        await db.stockMovements.add({
          ingredientId: ingredient.id,
          ingredientName: ingredient.name,
          type: 'out',
          quantity: deductAmount,
          reference: invoiceNumber,
          createdAt: new Date(),
        });
      }
    }
  }

  // Log audit
  if (transactionId) {
    await db.auditLogs.add({
      action: 'PAY_QUEUED_TRANSACTION',
      transactionId: finalTxId,
      invoiceNumber,
      timestamp: new Date(),
      description: `Bayar pesanan antrean ${invoiceNumber}. Total: Rp${finalAmount.toLocaleString('id-ID')}`,
    });
  } else {
    await db.auditLogs.add({
      action: 'CREATE_TRANSACTION',
      transactionId: finalTxId,
      invoiceNumber,
      timestamp: new Date(),
      description: `Transaksi baru ${invoiceNumber}. Total: Rp${finalAmount.toLocaleString('id-ID')}`,
    });
  }

  return { invoiceNumber };
}

export async function checkLowStockIngredients(): Promise<{ name: string; stock: number; unit: string }[]> {
  const ingredients = await db.ingredients.toArray();
  return ingredients
    .filter((ing) => ing.stock <= ing.minStock)
    .map((ing) => ({ name: ing.name, stock: ing.stock, unit: ing.unit }));
}