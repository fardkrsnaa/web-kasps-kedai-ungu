import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  MagnifyingGlassIcon,
  ClipboardDocumentListIcon,
  BanknotesIcon,
} from '@heroicons/react/24/outline';
import { db } from '../database';
import type { Transaction, TransactionItem } from '../types';
import { formatCurrency, formatDateTime } from '../utils/format';
import Modal from '../components/ui/Modal';

export default function HistoryPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showDetail, setShowDetail] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [detailItems, setDetailItems] = useState<TransactionItem[]>([]);

  const loadTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await db.transactions
        .orderBy('createdAt')
        .reverse()
        .toArray();
      setTransactions(data);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const openDetail = async (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    const items = await db.transactionItems
      .where('transactionId')
      .equals(transaction.id as number)
      .toArray();
    setDetailItems(items);
    setShowDetail(true);
  };

  const filtered = transactions.filter((t) =>
    t.invoiceNumber.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Riwayat Transaksi
        </h1>
      </div>

      <div className="relative mb-6">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Cari invoice..."
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
          <ClipboardDocumentListIcon className="w-16 h-16 mb-4 opacity-50" />
          <p className="text-sm">Belum ada transaksi</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => (
            <motion.button
              key={t.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => openDetail(t)}
              className="w-full text-left bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 hover:border-primary-200 dark:hover:border-primary-800 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {t.invoiceNumber}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {formatDateTime(t.createdAt)}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {t.itemCount} item
                    </span>
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
                  <p className="text-xs text-green-600">
                    +{formatCurrency(t.totalProfit)}
                  </p>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      <Modal
        isOpen={showDetail}
        onClose={() => setShowDetail(false)}
        title={`Detail Transaksi`}
        size="lg"
      >
        {selectedTransaction && (
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Invoice</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {selectedTransaction.invoiceNumber}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Tanggal</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatDateTime(selectedTransaction.createdAt)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Pembayaran</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {selectedTransaction.paymentMethod === 'cash'
                    ? 'Tunai'
                    : selectedTransaction.paymentMethod === 'qris'
                    ? 'QRIS'
                    : 'Transfer'}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Item</p>
              {detailItems.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm"
                >
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {item.productName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      x{item.quantity} @ {formatCurrency(item.price)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {formatCurrency(item.price * item.quantity)}
                    </p>
                    <p className="text-xs text-green-600">
                      Profit: {formatCurrency(item.profit * item.quantity)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Total</span>
                <span className="font-bold text-gray-900 dark:text-white">
                  {formatCurrency(selectedTransaction.totalAmount)}
                </span>
              </div>
              {selectedTransaction.discount > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Diskon</span>
                  <span className="font-medium text-red-500">
                    -{formatCurrency(selectedTransaction.discount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">HPP</span>
                <span className="font-medium text-orange-600">
                  {formatCurrency(selectedTransaction.totalHpp)}
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-gray-200 dark:border-gray-700">
                <span className="font-medium text-gray-900 dark:text-white">Profit</span>
                <span className="font-bold text-green-600">
                  {formatCurrency(selectedTransaction.totalProfit)}
                </span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </motion.div>
  );
}