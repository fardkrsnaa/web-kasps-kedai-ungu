import { db } from '../database';
import { generateInvoiceNumber, getTodayRange } from '../utils/format';

export interface CartItem {
  productId: number;
  productName: string;
  price: number;
  quantity: number;
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
  for (const item of items) {
    await db.transactionItems.add({
      transactionId: targetId,
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      price: item.price,
      notes: item.notes,
    });
  }

  // Log audit trail
  await db.auditLogs.add({
    action: 'TAMBAH_ANTREAN',
    transactionId: targetId,
    invoiceNumber,
    timestamp: new Date(),
    description: `Pesanan disimpan ke antrean (${queueNumber}). Invoice: ${invoiceNumber}`,
  });

  return { invoiceNumber, queueNumber };
}

/**
 * Deduct stock for a sold product — matches by productId.
 * Runs inside the caller's db.transaction('rw', ...) block.
 * Throws if no stock entry is linked to this product or stock is insufficient.
 */
async function deductStockForProduct(
  productId: number,
  productName: string,
  quantity: number,
  reference: string
): Promise<void> {
  const ingredient = await db.ingredients
    .where('productId')
    .equals(productId)
    .first();

  if (!ingredient || !ingredient.id) {
    throw new Error(
      `Stok untuk "${productName}" belum di-link. Buka halaman Stok dan hubungkan dengan produk ini.`
    );
  }

  if (ingredient.stock < quantity) {
    throw new Error(
      `Stok "${productName}" tidak mencukupi. Sisa: ${ingredient.stock} ${ingredient.unit}, diperlukan: ${quantity}.`
    );
  }

  const newStock = ingredient.stock - quantity;

  await db.ingredients.update(ingredient.id, {
    stock: newStock,
    updatedAt: new Date(),
  });

  await db.stockMovements.add({
    ingredientId: ingredient.id,
    ingredientName: ingredient.name,
    type: 'out',
    quantity,
    reference,
    createdAt: new Date(),
  });
}

/**
 * Return stock for a voided transaction (reverse of deduction) — matches by productId.
 * Must be called INSIDE a db.transaction('rw', ...) block.
 */
export async function returnStockForItems(
  items: { productId: number; quantity: number }[],
  reference: string
): Promise<void> {
  for (const item of items) {
    const ingredient = await db.ingredients
      .where('productId')
      .equals(item.productId)
      .first();

    if (ingredient && ingredient.id) {
      const newStock = ingredient.stock + item.quantity;

      await db.ingredients.update(ingredient.id, {
        stock: newStock,
        updatedAt: new Date(),
      });

      await db.stockMovements.add({
        ingredientId: ingredient.id,
        ingredientName: ingredient.name,
        type: 'in',
        quantity: item.quantity,
        reference,
        createdAt: new Date(),
      });
    }
  }
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

  // ── Atomic transaction: ALL operations succeed together or roll back together ──
  return db.transaction(
    'rw',
    [db.transactions, db.transactionItems, db.ingredients, db.stockMovements, db.auditLogs, db.packageDeals],
    async () => {
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
          discount: totalDiscount,
          paymentMethod,
          paymentAmount,
          changeAmount,
          status: 'completed',
          itemCount: items.length,
        });

        // Delete old items
        await db.transactionItems.where('transactionId').equals(finalTxId).delete();
      } else {
        // Normal checkout
        invoiceNumber = generateInvoiceNumber();
        finalTxId = (await db.transactions.add({
          invoiceNumber,
          totalAmount: finalAmount,
          discount: totalDiscount,
          paymentMethod,
          paymentAmount,
          changeAmount,
          status: 'completed',
          itemCount: items.length,
          createdAt: new Date(),
        })) as number;
      }

      // Save items and deduct stock atomically
      for (const item of items) {
        await db.transactionItems.add({
          transactionId: finalTxId,
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          price: item.price,
          notes: item.notes,
        });

        if (item.productId < 0) {
          // Package deal — expand into component items for stock deduction
          const pkgId = Math.abs(item.productId);
          const pkg = await db.packageDeals.get(pkgId);
          if (!pkg) {
            throw new Error(`Paket hemat tidak ditemukan (ID: ${pkgId})`);
          }
          for (const pkgItem of pkg.items) {
            const componentQty = pkgItem.quantity * item.quantity;
            await deductStockForProduct(pkgItem.productId, pkgItem.productName, componentQty, invoiceNumber);

            await db.auditLogs.add({
              action: 'AUTO_REDUCE_POS',
              transactionId: finalTxId,
              invoiceNumber,
              timestamp: new Date(),
              description: `Stok "${pkgItem.productName}" dikurangi ${componentQty} (Paket: ${pkg.name}, Invoice: ${invoiceNumber})`,
            });
          }

          await db.auditLogs.add({
            action: 'BAYAR_PAKET_HEMAT',
            transactionId: finalTxId,
            invoiceNumber,
            timestamp: new Date(),
            description: `Paket "${pkg.name}" terjual (${item.quantity}x). Harga: Rp${(item.price * item.quantity).toLocaleString('id-ID')}`,
          });
        } else {
          // Regular product — deduct stock by productId
          await deductStockForProduct(item.productId, item.productName, item.quantity, invoiceNumber);

          await db.auditLogs.add({
            action: 'AUTO_REDUCE_POS',
            transactionId: finalTxId,
            invoiceNumber,
            timestamp: new Date(),
            description: `Stok "${item.productName}" dikurangi ${item.quantity} (Invoice: ${invoiceNumber})`,
          });
        }
      }

      // Log audit: transaction created
      if (transactionId) {
        await db.auditLogs.add({
          action: 'BAYAR_POS',
          transactionId: finalTxId,
          invoiceNumber,
          timestamp: new Date(),
          description: `Bayar antrean ${invoiceNumber}. Total: Rp${finalAmount.toLocaleString('id-ID')}`,
        });
      } else {
        await db.auditLogs.add({
          action: 'BAYAR_POS',
          transactionId: finalTxId,
          invoiceNumber,
          timestamp: new Date(),
          description: `Transaksi baru ${invoiceNumber}. Total: Rp${finalAmount.toLocaleString('id-ID')}`,
        });
      }

      return { invoiceNumber };
    }
  );
}

export async function checkLowStockIngredients(): Promise<{ name: string; stock: number; unit: string }[]> {
  const ingredients = await db.ingredients.toArray();
  return ingredients
    .filter((ing) => ing.stock <= ing.minStock)
    .map((ing) => ({ name: ing.name, stock: ing.stock, unit: ing.unit }));
}