import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  TrashIcon,
  ArrowUturnLeftIcon,
  MagnifyingGlassIcon,
  NoSymbolIcon,
} from '@heroicons/react/24/outline';
import { db } from '../database';
import type { Transaction, TransactionItem } from '../types';
import { formatCurrency, formatDateTime } from '../utils/format';
import { restoreTransaction, deleteTransactionPermanently } from '../services/auditService';
import Modal from '../components/ui/Modal';
import toast from 'react-hot-toast';

export default function TrashPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionItemsMap, setTransactionItemsMap] = useState<Map<number, TransactionItem[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<Transaction | null>(null);
  const [restoreReason, setRestoreReason] = useState('');

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);

  const loadTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await db.transactions
        .where('status')
        .equals('deleted')
        .reverse()
        .sortBy('createdAt');
      setTransactions(data.reverse());

      // Load transaction items
      const allItems = await db.transactionItems.toArray();
      const map = new Map<number, TransactionItem[]>();
      for (const item of allItems) {
        const existing = map.get(item.transactionId) || [];
        existing.push(item);
        map.set(item.transactionId, existing);
      }
      setTransactionItemsMap(map);
    } catch (error) {
      console.error('Failed to load void transactions:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const filtered = useMemo(() => {
    if (!search) return transactions;
    const s = search.toLowerCase();
    return transactions.filter((t) => {
      if (t.invoiceNumber.toLowerCase().includes(s)) return true;
      // Search by product name
      const items = transactionItemsMap.get(t.id!) || [];
      return items.some((item) => item.productName.toLowerCase().includes(s));
    });
  }, [transactions, search, transactionItemsMap]);

  const handleRestore = (t: Transaction) => {
    setRestoreTarget(t);
    setRestoreReason('');
    setShowRestoreModal(true);
  };

  const confirmRestore = async () => {
    if (!restoreTarget?.id) return;
    try {
      await restoreTransaction(restoreTarget.id, restoreReason);
      toast.success('Transaksi berhasil dipulihkan');
      setShowRestoreModal(false);
      await loadTransactions();
    } catch (error: any) {
      toast.error(error.message || 'Gagal restore');
    }
  };

  const handleDelete = (t: Transaction) => {
    setDeleteTarget(t);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget?.id) return;
    try {
      await deleteTransactionPermanently(deleteTarget.id);
      toast.success('Transaksi dihapus permanen');
      setShowDeleteModal(false);
      await loadTransactions();
    } catch (error: any) {
      toast.error(error.message || 'Gagal menghapus');
    }
  };

  const productEmoji = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('kebab')) return '🛒';
    if (n.includes('burger')) return '🍔';
    if (n.includes('squash') || n.includes('jus')) return '🥤';
    if (n.includes('kopi')) return '☕';
    if (n.includes('teh')) return '🍵';
    return '🛍️';
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <TrashIcon className="w-6 h-6 text-gray-400" />
          Tempat Sampah
        </h1>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {transactions.length} transaksi void
        </span>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Cari invoice atau produk..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
          <TrashIcon className="w-16 h-16 mb-4 opacity-50" />
          <p className="text-sm">Tempat sampah kosong</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((t) => {
            const items = transactionItemsMap.get(t.id!) || [];
            const maxShow = 3;
            const shown = items.slice(0, maxShow);
            const remaining = items.length - maxShow;

            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 opacity-80"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{t.invoiceNumber}</p>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900 rounded-full">
                        <NoSymbolIcon className="w-3 h-3" /> Void
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{formatDateTime(t.createdAt)}</p>
                    {t.voidReason && (
                      <p className="text-xs text-red-500 dark:text-red-400 mt-0.5">Alasan: {t.voidReason}</p>
                    )}
                    {/* Product list */}
                    {shown.length > 0 && (
                      <div className="mt-1.5 space-y-0.5">
                        {shown.map((item, i) => (
                          <p key={i} className="text-[11px] text-gray-600 dark:text-gray-400">
                            {productEmoji(item.productName)} {item.productName} x{item.quantity}
                          </p>
                        ))}
                        {remaining > 0 && (
                          <p className="text-[11px] text-gray-400 dark:text-gray-500">
                            +{remaining} produk lainnya
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="text-right mr-2">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(t.totalAmount)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleRestore(t)}
                      className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950 rounded-lg transition-colors" title="Restore">
                      <ArrowUturnLeftIcon className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(t)}
                      className="p-2 text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-colors" title="Hapus Permanen">
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Restore Modal */}
      <Modal isOpen={showRestoreModal} onClose={() => setShowRestoreModal(false)} title="Restore Transaksi" size="sm">
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-xl">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Restore <strong>{restoreTarget?.invoiceNumber}</strong>?
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Barang akan dikurangi kembali dari stok.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Alasan (opsional)</label>
            <input type="text" value={restoreReason} onChange={(e) => setRestoreReason(e.target.value)}
              placeholder="Alasan restore..."
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white" />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowRestoreModal(false)} className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg">Batal</button>
            <button onClick={confirmRestore} className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600">Restore</button>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Hapus Permanen" size="sm">
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Hapus permanen <strong>{deleteTarget?.invoiceNumber}</strong>?
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Data tidak dapat dikembalikan.</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowDeleteModal(false)} className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg">Batal</button>
            <button onClick={confirmDelete} className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-gray-600 rounded-lg hover:bg-gray-700">Hapus</button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}