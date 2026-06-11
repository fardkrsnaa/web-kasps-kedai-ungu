import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  MagnifyingGlassIcon,
  ClipboardDocumentListIcon,
  BanknotesIcon,
  TrashIcon,
  NoSymbolIcon,
  CheckCircleIcon,
  ArrowUturnLeftIcon,
} from '@heroicons/react/24/outline';
import { db } from '../database';
import type { Transaction, TransactionItem, AuditLog } from '../types';
import { formatCurrency, formatDateTime } from '../utils/format';
import {
  deleteTransaction,
  restoreTransaction,
  deleteTransactionPermanently,
  bulkDeleteTransactions,
  bulkRestoreTransactions,
  bulkDeletePermanently,
} from '../services/auditService';
import Modal from '../components/ui/Modal';
import toast from 'react-hot-toast';

type FilterTime = 'all' | 'today' | 'week' | 'month';
type FilterStatus = 'all' | 'completed' | 'deleted';

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

export default function HistoryPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionItemsMap, setTransactionItemsMap] = useState<Map<number, TransactionItem[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTime, setFilterTime] = useState<FilterTime>('all');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Detail modal
  const [showDetail, setShowDetail] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [detailItems, setDetailItems] = useState<TransactionItem[]>([]);
  const [detailAuditLogs, setDetailAuditLogs] = useState<AuditLog[]>([]);

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);

  // Void modal
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [voidTarget, setVoidTarget] = useState<Transaction | null>(null);
  const [voidReason, setVoidReason] = useState('');

  // Restore modal
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<Transaction | null>(null);
  const [restoreReason, setRestoreReason] = useState('');

  // Bulk Void Modal
  const [showBulkVoidModal, setShowBulkVoidModal] = useState(false);
  const [bulkVoidReason, setBulkVoidReason] = useState('');

  const loadTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await db.transactions
        .orderBy('createdAt')
        .reverse()
        .toArray();
      
      const activeData = data.filter(t => t.status === 'completed' || t.status === 'deleted');
      setTransactions(activeData);

      const allItems = await db.transactionItems.toArray();
      const map = new Map<number, TransactionItem[]>();
      for (const item of allItems) {
        const existing = map.get(item.transactionId) || [];
        existing.push(item);
        map.set(item.transactionId, existing);
      }
      setTransactionItemsMap(map);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const filtered = useMemo(() => {
    let result = transactions;

    if (filterStatus !== 'all') {
      result = result.filter(t => t.status === filterStatus);
    }

    if (filterTime !== 'all') {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      let start: Date;
      if (filterTime === 'today') {
        start = startOfDay;
      } else if (filterTime === 'week') {
        start = new Date(startOfDay);
        start.setDate(start.getDate() - start.getDay());
      } else {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
      }
      result = result.filter((t) => new Date(t.createdAt) >= start);
    }

    if (search) {
      const s = search.toLowerCase();
      result = result.filter((t) => {
        if (t.invoiceNumber.toLowerCase().includes(s)) return true;
        if (t.paymentMethod.toLowerCase().includes(s)) return true;
        const items = transactionItemsMap.get(t.id!) || [];
        return items.some((item) => item.productName.toLowerCase().includes(s));
      });
    }

    return result;
  }, [transactions, filterTime, filterStatus, search, transactionItemsMap]);

  const openDetail = async (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    const items = await db.transactionItems
      .where('transactionId')
      .equals(transaction.id as number)
      .toArray();
    setDetailItems(items);

    // Load audit logs
    const logs = await db.auditLogs
      .where('transactionId')
      .equals(transaction.id as number)
      .reverse()
      .sortBy('timestamp');
    setDetailAuditLogs(logs.reverse());

    setShowDetail(true);
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleVoid = (t: Transaction) => {
    setVoidTarget(t);
    setVoidReason('');
    setShowVoidModal(true);
  };

  const confirmVoid = async () => {
    if (!voidTarget?.id) return;
    try {
      await deleteTransaction(voidTarget.id, voidReason || 'Dihapus dari riwayat');
      toast.success('Transaksi berhasil dihapus');
      setShowVoidModal(false);
      await loadTransactions();
    } catch (error: any) {
      toast.error(error.message || 'Gagal menghapus transaksi');
    }
  };

  const handleRestore = (t: Transaction) => {
    setRestoreTarget(t);
    setRestoreReason('');
    setShowRestoreModal(true);
  };

  const confirmRestore = async () => {
    if (!restoreTarget?.id) return;
    try {
      await restoreTransaction(restoreTarget.id, restoreReason || 'Restore dari halaman riwayat');
      toast.success('Transaksi berhasil dipulihkan');
      setShowRestoreModal(false);
      await loadTransactions();
    } catch (error: any) {
      toast.error(error.message || 'Gagal memulihkan transaksi');
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

  // Bulk actions
  const handleBulkVoid = async () => {
    const voidable = selectedIds.filter((id) => {
      const t = transactions.find((tx) => tx.id === id);
      return t && t.status !== 'deleted';
    });
    if (voidable.length === 0) {
      toast.error('Tidak ada transaksi yang bisa di-void');
      return;
    }
    setBulkVoidReason('');
    setShowBulkVoidModal(true);
  };

  const confirmBulkVoid = async () => {
    const voidable = selectedIds.filter((id) => {
      const t = transactions.find((tx) => tx.id === id);
      return t && t.status !== 'deleted';
    });
    try {
      await bulkDeleteTransactions(voidable, bulkVoidReason || 'Bulk void');
      toast.success(`${voidable.length} transaksi berhasil di-void`);
      setSelectedIds([]);
      setShowBulkVoidModal(false);
      await loadTransactions();
    } catch (error: any) {
      toast.error(error.message || 'Gagal bulk void');
    }
  };

  const handleBulkRestore = async () => {
    const restorable = selectedIds.filter((id) => {
      const t = transactions.find((tx) => tx.id === id);
      return t && t.status === 'deleted';
    });
    if (restorable.length === 0) {
      toast.error('Tidak ada transaksi yang bisa dipulihkan');
      return;
    }
    try {
      await bulkRestoreTransactions(restorable, 'Bulk restore');
      toast.success(`${restorable.length} transaksi berhasil dipulihkan`);
      setSelectedIds([]);
      await loadTransactions();
    } catch (error: any) {
      toast.error(error.message || 'Gagal bulk restore');
    }
  };

  const handleBulkDelete = async () => {
    const deletable = selectedIds.filter((id) => {
      const t = transactions.find((tx) => tx.id === id);
      return t && t.status === 'deleted';
    });
    if (deletable.length === 0) {
      toast.error('Tidak ada transaksi yang bisa dihapus');
      return;
    }
    try {
      await bulkDeletePermanently(deletable);
      toast.success(`${deletable.length} transaksi dihapus permanen`);
      setSelectedIds([]);
      await loadTransactions();
    } catch (error: any) {
      toast.error(error.message || 'Gagal hapus permanen');
    }
  };

  const statusBadge = (status: string) => {
    if (status === 'completed') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900 rounded-full">
          <CheckCircleIcon className="w-3 h-3" />
          Completed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900 rounded-full">
        <NoSymbolIcon className="w-3 h-3" />
        Void
      </span>
    );
  };

  const auditActionBadge = (action: string) => {
    const config: Record<string, { color: string; icon: any; label: string }> = {
      CREATE_TRANSACTION: { color: 'green', icon: CheckCircleIcon, label: 'Created' },
      VOID_TRANSACTION: { color: 'red', icon: NoSymbolIcon, label: 'Void' },
      RESTORE_TRANSACTION: { color: 'blue', icon: ArrowUturnLeftIcon, label: 'Restore' },
      DELETE_TRANSACTION: { color: 'red', icon: TrashIcon, label: 'Deleted' },
      STOCK_RETURN: { color: 'amber', icon: ArrowUturnLeftIcon, label: 'Stock +' },
      STOCK_DEDUCTION: { color: 'amber', icon: ArrowUturnLeftIcon, label: 'Stock -' },
    };
    const c = config[action] || { color: 'gray', icon: CheckCircleIcon, label: action };
    const Icon = c.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-${c.color}-100 text-${c.color}-700 dark:bg-${c.color}-900 dark:text-${c.color}-300`}>
        <Icon className="w-3 h-3" />
        {c.label}
      </span>
    );
  };

  // Product summary for card display
  const renderProductSummary = (t: Transaction) => {
    const items = transactionItemsMap.get(t.id!) || [];
    if (items.length === 0) return null;

    const maxShow = 3;
    const shown = items.slice(0, maxShow);
    const remaining = items.length - maxShow;

    return (
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
    );
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Riwayat Transaksi</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        {(['all', 'completed', 'deleted'] as FilterStatus[]).map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
              filterStatus === s
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {s === 'all' ? 'Semua' : s === 'completed' ? 'Completed' : 'Void'}
          </button>
        ))}
        <span className="text-gray-300 dark:text-gray-600">|</span>
        {([
          { key: 'all' as FilterTime, label: 'Semua Waktu' },
          { key: 'today' as FilterTime, label: 'Hari Ini' },
          { key: 'week' as FilterTime, label: 'Minggu Ini' },
          { key: 'month' as FilterTime, label: 'Bulan Ini' },
        ]).map((f) => (
          <button
            key={f.key}
            onClick={() => setFilterTime(f.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
              filterTime === f.key
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Cari invoice, produk, status..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
        />
      </div>

      {/* Bulk Actions */}
      {selectedIds.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mb-4 p-3 bg-primary-50 dark:bg-primary-950 border border-primary-200 dark:border-primary-800 rounded-xl"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
              {selectedIds.length} transaksi dipilih
            </span>
            <div className="flex gap-2">
              <button onClick={handleBulkVoid}
                className="px-3 py-1.5 text-xs font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors">
                Void Terpilih
              </button>
              <button onClick={handleBulkRestore}
                className="px-3 py-1.5 text-xs font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors">
                Restore Terpilih
              </button>
              <button onClick={handleBulkDelete}
                className="px-3 py-1.5 text-xs font-medium text-white bg-gray-500 rounded-lg hover:bg-gray-600 transition-colors">
                Hapus Terpilih
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
          <ClipboardDocumentListIcon className="w-16 h-16 mb-4 opacity-50" />
          <p className="text-sm">Belum ada transaksi</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-white dark:bg-gray-900 rounded-xl shadow-sm border p-4 transition-colors ${
                selectedIds.includes(t.id!)
                  ? 'border-primary-400 dark:border-primary-600'
                  : 'border-gray-100 dark:border-gray-800 hover:border-primary-200 dark:hover:border-primary-800'
              } ${t.status === 'deleted' ? 'opacity-70' : ''}`}
            >
              <div className="flex items-start gap-3">
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={selectedIds.includes(t.id!)}
                  onChange={() => toggleSelect(t.id!)}
                  className="w-4 h-4 mt-1 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />

                {/* Content */}
                <button onClick={() => openDetail(t)} className="flex-1 text-left">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {t.invoiceNumber}
                        </p>
                        {statusBadge(t.status)}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {formatDateTime(t.createdAt)}
                      </p>
                      {/* Product summary */}
                      {renderProductSummary(t)}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400">{t.itemCount} item</span>
                        <span className="text-xs text-gray-300 dark:text-gray-600">|</span>
                        <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                          <BanknotesIcon className="w-3 h-3" />
                          {t.paymentMethod === 'cash' ? 'Tunai' : t.paymentMethod === 'qris' ? 'QRIS' : 'Transfer'}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">
                        {formatCurrency(t.totalAmount)}
                      </p>
                      <p className={`text-xs ${t.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {t.totalProfit >= 0 ? '+' : ''}{formatCurrency(t.totalProfit)}
                      </p>
                    </div>
                  </div>
                </button>

                {/* Actions */}
                <div className="flex items-center gap-1 ml-2">
                  {t.status === 'completed' ? (
                    <button onClick={() => handleVoid(t)}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-colors" title="Void">
                      <NoSymbolIcon className="w-4 h-4" />
                    </button>
                  ) : (
                    <>
                      <button onClick={() => handleRestore(t)}
                        className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950 rounded-lg transition-colors" title="Restore">
                        <ArrowUturnLeftIcon className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(t)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-colors" title="Hapus Permanen">
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      <Modal isOpen={showDetail} onClose={() => setShowDetail(false)} title="Detail Transaksi" size="lg">
        {selectedTransaction && (
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Invoice</span>
                <span className="font-medium text-gray-900 dark:text-white">{selectedTransaction.invoiceNumber}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 dark:text-gray-400">Status</span>
                {statusBadge(selectedTransaction.status)}
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Tanggal</span>
                <span className="font-medium text-gray-900 dark:text-white">{formatDateTime(selectedTransaction.createdAt)}</span>
              </div>
              {selectedTransaction.voidAt && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Tanggal Void</span>
                  <span className="font-medium text-red-600">{formatDateTime(selectedTransaction.voidAt)}</span>
                </div>
              )}
              {selectedTransaction.voidReason && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Alasan Void</span>
                  <span className="font-medium text-red-600">{selectedTransaction.voidReason}</span>
                </div>
              )}
              {selectedTransaction.restoredAt && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Tanggal Restore</span>
                  <span className="font-medium text-blue-600">{formatDateTime(selectedTransaction.restoredAt)}</span>
                </div>
              )}
              {selectedTransaction.restoredReason && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Alasan Restore</span>
                  <span className="font-medium text-blue-600">{selectedTransaction.restoredReason}</span>
                </div>
              )}
            </div>

            {/* Items */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Daftar Produk</p>
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800 text-xs">
                      <th className="text-left p-2 font-medium text-gray-500 dark:text-gray-400">Produk</th>
                      <th className="text-center p-2 font-medium text-gray-500 dark:text-gray-400">Qty</th>
                      <th className="text-right p-2 font-medium text-gray-500 dark:text-gray-400">Harga</th>
                      <th className="text-right p-2 font-medium text-gray-500 dark:text-gray-400">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailItems.map((item, i) => (
                      <tr key={i} className="border-t border-gray-100 dark:border-gray-700">
                        <td className="p-2 text-gray-900 dark:text-white">{item.productName}</td>
                        <td className="p-2 text-center text-gray-700 dark:text-gray-300">{item.quantity}</td>
                        <td className="p-2 text-right text-gray-700 dark:text-gray-300">{formatCurrency(item.price)}</td>
                        <td className="p-2 text-right font-medium text-gray-900 dark:text-white">{formatCurrency(item.price * item.quantity)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Total</span>
                <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(selectedTransaction.totalAmount)}</span>
              </div>
              {selectedTransaction.discount > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Diskon</span>
                  <span className="font-medium text-red-500">-{formatCurrency(selectedTransaction.discount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">HPP</span>
                <span className="font-medium text-orange-600">{formatCurrency(selectedTransaction.totalHpp)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-gray-200 dark:border-gray-700">
                <span className="font-medium text-gray-900 dark:text-white">Profit</span>
                <span className="font-bold text-green-600">{formatCurrency(selectedTransaction.totalProfit)}</span>
              </div>
            </div>

            {/* Audit Trail */}
            {detailAuditLogs.length > 0 && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Audit Trail</p>
                <div className="space-y-3">
                  {detailAuditLogs.map((log) => (
                    <div key={log.id} className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-primary-400 mt-1.5 flex-shrink-0" />
                      <div>
                        <div className="flex items-center gap-2">
                          {auditActionBadge(log.action)}
                          <span className="text-[10px] text-gray-400">{formatDateTime(log.timestamp)}</span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{log.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Void Modal */}
      <Modal isOpen={showVoidModal} onClose={() => setShowVoidModal(false)} title="Void Transaksi" size="sm">
        <div className="space-y-4">
          <div className="p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl">
            <p className="text-sm text-red-700 dark:text-red-300">
              Invoice: <strong>{voidTarget?.invoiceNumber}</strong>
            </p>
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">Barang akan dikembalikan ke stok. Transaksi tidak dihitung pada laporan.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Alasan (opsional)</label>
            <input type="text" value={voidReason} onChange={(e) => setVoidReason(e.target.value)}
              placeholder="Masukkan alasan void..."
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white" />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowVoidModal(false)} className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">Batal</button>
            <button onClick={confirmVoid} className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors">Void Sekarang</button>
          </div>
        </div>
      </Modal>

      {/* Restore Modal */}
      <Modal isOpen={showRestoreModal} onClose={() => setShowRestoreModal(false)} title="Restore Transaksi" size="sm">
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-xl">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Restore transaksi <strong>{restoreTarget?.invoiceNumber}</strong>?
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Barang akan dikurangi kembali dari stok.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Alasan (opsional)</label>
            <input type="text" value={restoreReason} onChange={(e) => setRestoreReason(e.target.value)}
              placeholder="Masukkan alasan restore..."
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white" />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowRestoreModal(false)} className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">Batal</button>
            <button onClick={confirmRestore} className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors">Restore</button>
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
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Data tidak dapat dikembalikan. Audit log tetap dipertahankan.</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowDeleteModal(false)} className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">Batal</button>
            <button onClick={confirmDelete} className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-gray-600 rounded-lg hover:bg-gray-700 transition-colors">Hapus</button>
          </div>
        </div>
      </Modal>

      {/* Bulk Void Modal */}
      <Modal isOpen={showBulkVoidModal} onClose={() => setShowBulkVoidModal(false)} title="Bulk Void" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Void {selectedIds.filter((id) => transactions.find((t) => t.id === id)?.status !== 'deleted').length} transaksi terpilih?
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Alasan</label>
            <input type="text" value={bulkVoidReason} onChange={(e) => setBulkVoidReason(e.target.value)}
              placeholder="Bulk void"
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white" />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowBulkVoidModal(false)} className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg">Batal</button>
            <button onClick={confirmBulkVoid} className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600">Void Sekarang</button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}