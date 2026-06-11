import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ClockIcon,
  PlayIcon,
  TrashIcon,
  ClipboardDocumentListIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { db } from '../database';
import type { Transaction, TransactionItem } from '../types';
import { formatCurrency, formatDateTime } from '../utils/format';
import { deleteTransaction } from '../services/auditService';
import toast from 'react-hot-toast';
import Modal from '../components/ui/Modal';

export default function QueuePage() {
  const navigate = useNavigate();
  const [queueTransactions, setQueueTransactions] = useState<Transaction[]>([]);
  const [itemsMap, setItemsMap] = useState<Map<number, TransactionItem[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Delete modal confirmation
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);

  const loadQueue = useCallback(async () => {
    try {
      setLoading(true);
      const data = await db.transactions
        .where('status')
        .equals('queued')
        .reverse()
        .sortBy('createdAt');
      
      setQueueTransactions(data);

      const allItems = await db.transactionItems.toArray();
      const map = new Map<number, TransactionItem[]>();
      for (const item of allItems) {
        const existing = map.get(item.transactionId) || [];
        existing.push(item);
        map.set(item.transactionId, existing);
      }
      setItemsMap(map);
    } catch (err) {
      console.error('Failed to load order queue:', err);
      toast.error('Gagal memuat antrean pesanan');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const filteredQueue = useMemo(() => {
    if (!search) return queueTransactions;
    const s = search.toLowerCase();
    return queueTransactions.filter((tx) => {
      const matchQueue = tx.queueNumber?.toLowerCase().includes(s);
      const matchInvoice = tx.invoiceNumber.toLowerCase().includes(s);
      const items = itemsMap.get(tx.id!) || [];
      const matchItems = items.some((item) => item.productName.toLowerCase().includes(s));
      return matchQueue || matchInvoice || matchItems;
    });
  }, [queueTransactions, search, itemsMap]);

  const handleProcess = (tx: Transaction) => {
    navigate('/pos', { state: { transactionId: tx.id } });
  };

  const handleConfirmDelete = (tx: Transaction) => {
    setDeleteTarget(tx);
    setShowDeleteModal(true);
  };

  const executeDelete = async () => {
    if (!deleteTarget?.id) return;
    try {
      await deleteTransaction(deleteTarget.id, 'Dihapus dari antrean pesanan');
      toast.success(`Antrean ${deleteTarget.queueNumber || ''} berhasil dihapus`);
      setShowDeleteModal(false);
      setDeleteTarget(null);
      await loadQueue();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghapus antrean');
    }
  };

  const productEmoji = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('kebab')) return '🛒';
    if (n.includes('burger')) return '🍔';
    if (n.includes('squash') || n.includes('jus') || n.includes('juice')) return '🥤';
    if (n.includes('kopi') || n.includes('coffee')) return '☕';
    if (n.includes('teh')) return '🍵';
    if (n.includes('nasi')) return '🍚';
    if (n.includes('mie')) return '🍜';
    if (n.includes('ayam')) return '🍗';
    if (n.includes('pizza')) return '🍕';
    if (n.includes('es ') || n.includes('ice')) return '🧊';
    return '🛍️';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ClockIcon className="w-6 h-6 text-primary-600" />
            Antrean Pesanan
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Kelola pesanan yang ditangguhkan/antrean sebelum pembayaran.
          </p>
        </div>
        <span className="px-3 py-1 bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300 text-xs font-semibold rounded-full">
          {queueTransactions.length} Menunggu
        </span>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Cari antrean, invoice, atau menu..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filteredQueue.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
          <ClipboardDocumentListIcon className="w-16 h-16 mb-4 opacity-50 text-gray-400" />
          <p className="text-sm">Tidak ada antrean pesanan aktif</p>
          {search && <p className="text-xs text-gray-400 mt-1">Coba gunakan kata kunci pencarian lain.</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredQueue.map((tx) => {
            const items = itemsMap.get(tx.id!) || [];
            return (
              <motion.div
                key={tx.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 flex flex-col justify-between hover:border-primary-300 dark:hover:border-primary-800 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono text-gray-400 dark:text-gray-500">
                      {tx.invoiceNumber}
                    </span>
                    <span className="px-2.5 py-1 bg-primary-100 dark:bg-primary-900/50 text-primary-800 dark:text-primary-300 text-sm font-bold rounded-lg">
                      {tx.queueNumber || 'N/A'}
                    </span>
                  </div>

                  {/* Menu Items */}
                  <div className="space-y-1.5 min-h-[5rem] max-h-32 overflow-y-auto pr-1">
                    {items.map((item, index) => (
                      <div key={index} className="flex justify-between items-start text-xs">
                        <span className="text-gray-700 dark:text-gray-300 flex items-center gap-1">
                          <span>{productEmoji(item.productName)}</span>
                          <span className="font-medium">{item.productName}</span>
                        </span>
                        <span className="text-gray-500 dark:text-gray-400 ml-2 font-mono">
                          x{item.quantity}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-gray-100 dark:border-gray-800 mt-4 pt-3 flex justify-between items-center text-sm">
                    <div>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500">Total Belanja</p>
                      <p className="font-bold text-gray-900 dark:text-white">
                        {formatCurrency(tx.totalAmount)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-gray-400 dark:text-gray-500">Waktu Dibuat</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {formatDateTime(tx.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                  <button
                    onClick={() => handleConfirmDelete(tx)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-semibold rounded-lg transition-colors"
                  >
                    <TrashIcon className="w-4 h-4" />
                    Hapus
                  </button>
                  <button
                    onClick={() => handleProcess(tx)}
                    className="flex-2 flex items-center justify-center gap-1.5 py-2 px-4 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-lg transition-colors"
                  >
                    <PlayIcon className="w-4 h-4 fill-white" />
                    Proses POS
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Hapus Antrean" size="sm">
        <div className="space-y-4">
          <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-xl">
            <p className="text-sm text-red-700 dark:text-red-300">
              Apakah Anda yakin ingin menghapus antrean <strong>{deleteTarget?.queueNumber || ''}</strong> ({deleteTarget?.invoiceNumber})?
            </p>
            <p className="text-xs text-red-600 dark:text-red-400 mt-2">
              Transaksi akan ditandai sebagai dihapus (deleted) dan stok bahan baku tidak akan berubah.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowDeleteModal(false)}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              Batal
            </button>
            <button
              onClick={executeDelete}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
            >
              Hapus Antrean
            </button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
