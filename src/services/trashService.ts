import { db, ensureDatabaseReady } from '../database';

// Soft delete: mark transaction as 'deleted'
export async function deleteTransaction(transactionId: number): Promise<void> {
  await ensureDatabaseReady();

  const transaction = await db.transactions.get(transactionId);
  if (!transaction) throw new Error('Transaksi tidak ditemukan');
  if (transaction.status === 'deleted') throw new Error('Transaksi sudah dihapus');

  await db.transactions.update(transactionId, {
    status: 'deleted',
    deletedAt: new Date(),
  });
}

// Restore: mark deleted transaction back to 'completed'
export async function restoreTransaction(transactionId: number): Promise<void> {
  await ensureDatabaseReady();

  const transaction = await db.transactions.get(transactionId);
  if (!transaction) throw new Error('Transaksi tidak ditemukan');
  if (transaction.status !== 'deleted') throw new Error('Hanya transaksi yang dihapus yang bisa dipulihkan');

  await db.transactions.update(transactionId, {
    status: 'completed',
    deletedAt: undefined,
  });
}

// Permanently delete: remove transaction and its items from IndexedDB
export async function deleteTransactionPermanently(transactionId: number): Promise<void> {
  await ensureDatabaseReady();

  const transaction = await db.transactions.get(transactionId);
  if (!transaction) throw new Error('Transaksi tidak ditemukan');

  // Delete items first, then transaction
  await db.transactionItems
    .where('transactionId')
    .equals(transactionId)
    .delete();
  await db.transactions.delete(transactionId);
}

// Bulk soft delete
export async function bulkDeleteTransactions(transactionIds: number[]): Promise<void> {
  for (const id of transactionIds) {
    await deleteTransaction(id);
  }
}

// Bulk restore
export async function bulkRestoreTransactions(transactionIds: number[]): Promise<void> {
  for (const id of transactionIds) {
    await restoreTransaction(id);
  }
}

// Bulk permanent delete
export async function bulkDeletePermanently(transactionIds: number[]): Promise<void> {
  for (const id of transactionIds) {
    await deleteTransactionPermanently(id);
  }
}