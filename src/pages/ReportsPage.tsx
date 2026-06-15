import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  DocumentChartBarIcon,
  DocumentArrowDownIcon,
  PrinterIcon,
} from '@heroicons/react/24/outline';
import { db } from '../database';
import type { Transaction, TransactionItem } from '../types';
import { formatCurrency, formatDate, getTodayRange, getWeekRange, getMonthRange } from '../utils/format';
import { exportToExcel, exportToPdf } from '../utils/export';
import SalesChart from '../components/ui/SalesChart';
import toast from 'react-hot-toast';

type Period = 'daily' | 'weekly' | 'monthly';

interface ReportData {
  transactions: Transaction[];
  totalOmzet: number;
  totalTransactions: number;
  avgTransaction: number;
}

interface TransactionWithItems extends Transaction {
  items?: TransactionItem[];
}

export default function ReportsPage() {
  const [period, setPeriod] = useState<Period>('daily');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ReportData>({
    transactions: [],
    totalOmzet: 0,
    totalTransactions: 0,
    avgTransaction: 0,
  });
  const [chartLabels, setChartLabels] = useState<string[]>([]);
  const [chartOmzet, setChartOmzet] = useState<number[]>([]);
  const [transactionsWithItems, setTransactionsWithItems] = useState<TransactionWithItems[]>([]);

  const loadReport = useCallback(async () => {
    try {
      setLoading(true);

      let range: { start: Date; end: Date };
      if (period === 'daily') range = getTodayRange();
      else if (period === 'weekly') range = getWeekRange();
      else range = getMonthRange();

      const transactions = await db.transactions
        .where('createdAt')
        .between(range.start, range.end)
        .and((t) => t.status === 'completed')
        .toArray();

      const totalOmzet = transactions.reduce((s, t) => s + t.totalAmount, 0);
      const totalTransactions = transactions.length;
      const avgTransaction = totalTransactions > 0 ? totalOmzet / totalTransactions : 0;

      setData({ transactions, totalOmzet, totalTransactions, avgTransaction });

      // Load transaction items for each transaction
      const txIds = transactions.map((t) => t.id!).filter((id) => id !== undefined);
      const allItems = await db.transactionItems.where('transactionId').anyOf(txIds).toArray();

      const txItemMap = new Map<number, TransactionItem[]>();
      for (const item of allItems) {
        const list = txItemMap.get(item.transactionId) || [];
        list.push(item);
        txItemMap.set(item.transactionId, list);
      }

      const txs: TransactionWithItems[] = transactions.map((t) => ({
        ...t,
        items: txItemMap.get(t.id!) || [],
      }));
      setTransactionsWithItems(txs);

      // Build chart data
      const labels: string[] = [];
      const omzet: number[] = [];

      if (period === 'daily') {
        // Group by hour (6am - 10pm)
        for (let h = 6; h <= 22; h++) {
          const hourLabel = `${h.toString().padStart(2, '0')}:00`;
          labels.push(hourLabel);
          const hourTotal = transactions
            .filter((t) => new Date(t.createdAt).getHours() === h)
            .reduce((s, t) => s + t.totalAmount, 0);
          omzet.push(hourTotal);
        }
      } else if (period === 'weekly') {
        const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dayLabel = dayNames[d.getDay()]!;
          labels.push(dayLabel);
          const dayTotal = transactions
            .filter((t) => {
              const td = new Date(t.createdAt);
              return td.getDate() === d.getDate() && td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear();
            })
            .reduce((s, t) => s + t.totalAmount, 0);
          omzet.push(dayTotal);
        }
      } else {
        // Monthly - group by date
        const daysInMonth = new Date(range.start.getFullYear(), range.start.getMonth() + 1, 0).getDate();
        for (let d = 1; d <= daysInMonth; d++) {
          labels.push(`${d}`);
          const dayTotal = transactions
            .filter((t) => new Date(t.createdAt).getDate() === d)
            .reduce((s, t) => s + t.totalAmount, 0);
          omzet.push(dayTotal);
        }
      }

      setChartLabels(labels);
      setChartOmzet(omzet);
    } catch (error) {
      console.error('Failed to load report:', error);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const handleExportExcel = async () => {
    try {
      await exportToExcel(
          transactionsWithItems.map(t => ({
            Invoice: t.invoiceNumber,
            Tanggal: formatDate(t.createdAt),
            'Total (Rp)': t.totalAmount,
            'Metode Bayar': t.paymentMethod === 'cash' ? 'Tunai' : t.paymentMethod === 'qris' ? 'QRIS' : 'Transfer',
            'Jumlah Item': t.itemCount || 0,
          })),
          `Laporan_${period}_${new Date().toISOString().split('T')[0]}`
        );
      toast.success('Excel berhasil diunduh');
    } catch (error: any) {
      toast.error(error.message || 'Gagal export Excel');
    }
  };

  const handleExportPdf = async () => {
    try {
      await exportToPdf('report-content', `Laporan_${period}_${new Date().toISOString().split('T')[0]}`);
      toast.success('PDF berhasil diunduh');
    } catch (error: any) {
      toast.error(error.message || 'Gagal export PDF');
    }
  };

  return (
    <motion.div id="report-content" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Laporan</h1>
        <div className="flex gap-2">
          {transactionsWithItems.length > 0 && (
            <>
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/[0.08] rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <DocumentArrowDownIcon className="w-4 h-4" />
                Excel
              </button>
              <button
                onClick={handleExportPdf}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/[0.08] rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <PrinterIcon className="w-4 h-4" />
                PDF
              </button>
            </>
          )}
        </div>
      </div>

      {/* Period Filter */}
      <div className="flex gap-2 mb-6">
        {(['daily', 'weekly', 'monthly'] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              period === p
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 dark:bg-[#111827] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {p === 'daily' ? 'Harian' : p === 'weekly' ? 'Mingguan' : 'Bulanan'}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0 }}
          className="p-5 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800"
        >
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Omzet</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            {loading ? <span className="inline-block w-24 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /> : formatCurrency(data.totalOmzet)}
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="p-5 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800"
        >
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Transaksi</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            {loading ? <span className="inline-block w-16 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /> : data.totalTransactions}
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="p-5 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800"
        >
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Rata-rata Transaksi</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            {loading ? <span className="inline-block w-20 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /> : formatCurrency(data.avgTransaction)}
          </p>
        </motion.div>
      </div>

      {/* Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
        className="p-5 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 mb-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Grafik Penjualan</h3>
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="h-72">
            <SalesChart labels={chartLabels} omzetData={chartOmzet} />
          </div>
        )}
      </motion.div>

      {/* Transactions Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden"
      >
        <div className="p-5 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Daftar Transaksi</h3>
        </div>
        {loading ? (
          <div className="p-5 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : transactionsWithItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
            <DocumentChartBarIcon className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-sm">Belum ada transaksi</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-[#111827] text-xs">
                  <th className="text-left p-3 font-medium text-gray-500 dark:text-gray-400">Invoice</th>
                  <th className="text-left p-3 font-medium text-gray-500 dark:text-gray-400">Tanggal</th>
                  <th className="text-left p-3 font-medium text-gray-500 dark:text-gray-400">Produk</th>
                  <th className="text-right p-3 font-medium text-gray-500 dark:text-gray-400">Omzet</th>
                </tr>
              </thead>
              <tbody>
                {transactionsWithItems.map((t) => (
                  <tr key={t.id} className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="p-3 font-medium text-gray-900 dark:text-white">{t.invoiceNumber}</td>
                    <td className="p-3 text-gray-500 dark:text-gray-400">{formatDate(t.createdAt)}</td>
                    <td className="p-3">
                      <div className="text-gray-700 dark:text-gray-300 text-xs">
                        {t.items && t.items.length > 0 ? (
                          t.items.slice(0, 3).map((item) => (
                            <span key={item.id} className="block">{item.productName} x{item.quantity}</span>
                          ))
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                        {t.items && t.items.length > 3 && (
                          <span className="text-gray-400">+{t.items.length - 3} lainnya</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-right font-medium text-gray-900 dark:text-white">{formatCurrency(t.totalAmount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200 dark:border-white/[0.08] font-medium">
                  <td colSpan={3} className="p-3 text-right text-gray-700 dark:text-gray-300">Total Omzet</td>
                  <td className="p-3 text-right text-gray-900 dark:text-white">{formatCurrency(data.totalOmzet)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}