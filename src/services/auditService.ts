import { db, ensureDatabaseReady } from '../database';
import { returnStockForItems } from './transactionService';
import type { TransactionItem } from '../types';

// Get transaction items for stock return/deduction
async function getTransactionItems(transactionId: number): Promise<TransactionItem[]> {
  return db.transactionItems
    .where('transactionId')
    .equals(transactionId)
    .toArray();
}

// Soft delete a transaction - atomically
export async function deleteTransaction(
  transactionId: number,
  reason: string
): Promise<void> {
  await ensureDatabaseReady();

  const transaction = await db.transactions.get(transactionId);
  if (!transaction) throw new Error('Transaksi tidak ditemukan');
  if (transaction.status === 'deleted') throw new Error('Transaksi sudah dihapus');

  const now = new Date();
  const oldStatus = transaction.status;

  await db.transaction('rw', [db.transactions, db.ingredients, db.stockMovements, db.auditLogs, db.transactionItems], async () => {
    await db.transactions.update(transactionId, {
      status: 'deleted',
      deletedAt: now,
      deletedFromStatus: oldStatus,
      voidReason: reason || 'Dihapus',
      voidAt: now,
    } as any);

    // Only return stock if the transaction was 'completed' (was paid/reduced stock)
    if (oldStatus === 'completed') {
      const items = await getTransactionItems(transactionId);

      // Return stock by productId matching
      await returnStockForItems(
        items.map(item => ({ productId: item.productId, quantity: item.quantity })),
        `VOID-${transaction.invoiceNumber}`
      );

      await db.auditLogs.add({
        action: 'BATAL_POS',
        transactionId,
        invoiceNumber: transaction.invoiceNumber,
        timestamp: now,
        description: `Stok dikembalikan karena transaksi ${transaction.invoiceNumber} di-void (${reason})`,
        beforeData: JSON.stringify({ status: 'completed' }),
        afterData: JSON.stringify({ status: 'deleted', voidReason: reason }),
      });
    } else {
      // Just log deletion of queued/draft transaction
      await db.auditLogs.add({
        action: 'HAPUS_ANTREAN',
        transactionId,
        invoiceNumber: transaction.invoiceNumber,
        timestamp: now,
        description: `Hapus antrean/draft ${transaction.invoiceNumber}. Alasan: ${reason}`,
        beforeData: JSON.stringify({ status: oldStatus }),
        afterData: JSON.stringify({ status: 'deleted', voidReason: reason }),
      });
    }
  });
}

// Restore a deleted transaction - atomically
export async function restoreTransaction(
  transactionId: number,
  reason: string
): Promise<void> {
  await ensureDatabaseReady();

  const transaction = await db.transactions.get(transactionId);
  if (!transaction) throw new Error('Transaksi tidak ditemukan');
  if (transaction.status !== 'deleted') throw new Error('Hanya transaksi terhapus yang bisa dipulihkan');

  const now = new Date();
  const targetStatus = transaction.deletedFromStatus || 'completed';

  await db.transaction('rw', [db.transactions, db.ingredients, db.stockMovements, db.auditLogs, db.transactionItems], async () => {
    await db.transactions.update(transactionId, {
      status: targetStatus,
      restoredAt: now,
      restoredReason: reason || 'Dipulihkan',
      deletedAt: undefined,
      deletedFromStatus: undefined,
      voidAt: undefined,
      voidReason: undefined,
    } as any);

    // Only deduct stock if targetStatus is 'completed'
    if (targetStatus === 'completed') {
      const items = await getTransactionItems(transactionId);

      // Deduct stock again (by productId)
      for (const item of items) {
        const ingredient = await db.ingredients
          .where('productId')
          .equals(item.productId)
          .first();

        if (ingredient && ingredient.id) {
          const newStock = Math.max(0, ingredient.stock - item.quantity);

          await db.ingredients.update(ingredient.id, {
            stock: newStock,
            updatedAt: now,
          });

          await db.stockMovements.add({
            ingredientId: ingredient.id,
            ingredientName: ingredient.name,
            type: 'out',
            quantity: item.quantity,
            reference: `RESTORE-${transaction.invoiceNumber}`,
            createdAt: now,
          });
        }
      }

      await db.auditLogs.add({
        action: 'RESTORE_POS',
        transactionId,
        invoiceNumber: transaction.invoiceNumber,
        timestamp: now,
        description: `Stok dikurangi karena transaksi ${transaction.invoiceNumber} di-restore. Alasan: ${reason}`,
        beforeData: JSON.stringify({ status: 'deleted' }),
        afterData: JSON.stringify({ status: 'completed' }),
      });
    } else {
      // Restore to queued/draft
      await db.auditLogs.add({
        action: 'RESTORE_POS',
        transactionId,
        invoiceNumber: transaction.invoiceNumber,
        timestamp: now,
        description: `Restore transaksi ${transaction.invoiceNumber} ke ${targetStatus}. Alasan: ${reason}`,
        beforeData: JSON.stringify({ status: 'deleted' }),
        afterData: JSON.stringify({ status: targetStatus }),
      });
    }
  });
}

// Permanently delete a deleted transaction
export async function deleteTransactionPermanently(transactionId: number): Promise<void> {
  await ensureDatabaseReady();

  const transaction = await db.transactions.get(transactionId);
  if (!transaction) throw new Error('Transaksi tidak ditemukan');
  if (transaction.status !== 'deleted') throw new Error('Hanya transaksi terhapus yang bisa dihapus permanen');

  const now = new Date();

  await db.transaction('rw', [db.transactions, db.transactionItems, db.auditLogs], async () => {
    await db.auditLogs.add({
      action: 'DELETE_TRANSACTION',
      transactionId,
      invoiceNumber: transaction.invoiceNumber,
      timestamp: now,
      description: `Hapus permanen transaksi ${transaction.invoiceNumber}`,
    });

    await db.transactionItems.where('transactionId').equals(transactionId).delete();
    await db.transactions.delete(transactionId);
  });
}

// Bulk delete (soft delete)
export async function bulkDeleteTransactions(
  transactionIds: number[],
  reason: string
): Promise<void> {
  for (const id of transactionIds) {
    await deleteTransaction(id, reason);
  }
}

// Bulk restore
export async function bulkRestoreTransactions(
  transactionIds: number[],
  reason: string
): Promise<void> {
  for (const id of transactionIds) {
    await restoreTransaction(id, reason);
  }
}

// Bulk delete permanently
export async function bulkDeletePermanently(transactionIds: number[]): Promise<void> {
  for (const id of transactionIds) {
    await deleteTransactionPermanently(id);
  }
}
