import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  DocumentChartBarIcon,
  DocumentArrowDownIcon,
  PrinterIcon,
} from '@heroicons/react/24/outline';
import { db } from '../database';
import type { Transaction } from '../types';
import { formatCurrency, formatDate, getTodayRange, getWeekRange, getMonthRange } from '../utils/format';
import { exportToExcel, exportToPdf } from '../utils/export';
import SalesChart from '../components/ui/SalesChart';

type Period = 'daily' | 'weekly' | 'monthly';

interface ReportData {
  transactions: Transaction[];
  totalOmzet: number;
  totalProfit: number;
  totalHpp: number;
  totalTransactions: number;
  avgTransaction: number;
}

export default function ReportsPage() {
  const [period, setPeriod] = useState<Period>('daily');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ReportData>({
    transactions: [],
    totalOmzet: 0,
    totalProfit: 0,
    totalHpp: 0,
    totalTransactions: 0,
    avgTransaction: 0,
  });
  const [chartLabels, setChartLabels] = useState<string[]>([]);
  const [chartOmzet, setChartOmzet] = useState<number[]>([]);
  const [chartProfit, setChartProfit] = useState<number[]>([]);

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
      const totalProfit = transactions.reduce((s, t) => s + t.totalProfit, 0);
      const totalHpp = transactions.reduce((s, t) => s + t.totalHpp, 0);
      const totalTransactions = transactions.length;
      const avgTransaction = totalTransactions > 0 ? totalOmzet / totalTransactions : 0;

      setData({
        transactions,
        totalOmzet,
        totalProfit,
        totalHpp,
        totalTransactions,
        avgTransaction,
      });

      // Build chart data
      if (period === 'daily') {
        const hourlyMap = new Map<string, { omzet: number; profit: number }>();
        for (let h = 0; h < 24; h++) {
          hourlyMap.set(`${h}:00`, { omzet: 0, profit: 0 });
        }
        for (const t of transactions) {
          const d = new Date(t.createdAt);
          const hour = `${d.getHours()}:00`;
          const existing = hourlyMap.get(hour);
          if (existing) {
            existing.omzet += t.totalAmount;
            existing.profit += t.totalProfit;
          }
        }
        setChartLabels(Array.from(hourlyMap.keys()));
        setChartOmzet(Array.from(hourlyMap.values()).map((v) => v.omzet));
        setChartProfit(Array.from(hourlyMap.values()).map((v) => v.profit));
      } else if (period === 'weekly') {
        const dayMap = new Map<string, { omzet: number; profit: number }>();
        const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        days.forEach((d) => dayMap.set(d, { omzet: 0, profit: 0 }));
        for (const t of transactions) {
          const d = new Date(t.createdAt);
          const day = days[d.getDay()] ?? '';
          const existing = dayMap.get(day);
          if (existing) {
            existing.omzet += t.totalAmount;
            existing.profit += t.totalProfit;
          }
        }
        setChartLabels(days);
        setChartOmzet(days.map((d) => dayMap.get(d)?.omzet ?? 0));
        setChartProfit(days.map((d) => dayMap.get(d)?.profit ?? 0));
      } else {
        const dateMap = new Map<string, { omzet: number; profit: number }>();
        const now = new Date();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        for (let i = 1; i <= daysInMonth; i++) {
          dateMap.set(`${i}`, { omzet: 0, profit: 0 });
        }
        for (const t of transactions) {
          const d = new Date(t.createdAt);
          const key = `${d.getDate()}`;
          const existing = dateMap.get(key);
          if (existing) {
            existing.omzet += t.totalAmount;
            existing.profit += t.totalProfit;
          }
        }
        setChartLabels(Array.from(dateMap.keys()));
        setChartOmzet(Array.from(dateMap.values()).map((v) => v.omzet));
        setChartProfit(Array.from(dateMap.values()).map((v) => v.profit));
      }
    } catch (error) {
      console.error('Failed to load report:', error);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const handleExportExcel = () => {
    const rows = data.transactions.map((t) => ({
      Invoice: t.invoiceNumber,
      Tanggal: formatDate(t.createdAt),
      Pembayaran: t.paymentMethod === 'cash' ? 'Tunai' : t.paymentMethod === 'qris' ? 'QRIS' : 'Transfer',
      Total: `Rp${t.totalAmount.toLocaleString('id-ID')}`,
      HPP: `Rp${t.totalHpp.toLocaleString('id-ID')}`,
      Profit: `Rp${t.totalProfit.toLocaleString('id-ID')}`,
      Diskon: t.discount > 0 ? `Rp${t.discount.toLocaleString('id-ID')}` : '-',
      Item: t.itemCount,
    }));

    const periodLabel = period === 'daily' ? 'Harian' : period === 'weekly' ? 'Mingguan' : 'Bulanan';
    exportToExcel(rows, `Laporan_${periodLabel}_${new Date().toISOString().slice(0, 10)}`);
  };

  const handleExportPdf = () => {
    const periodLabel = period === 'daily' ? 'Harian' : period === 'weekly' ? 'Mingguan' : 'Bulanan';
    exportToPdf('report-content', `Laporan ${periodLabel}`);
  };

  const periodLabel = period === 'daily' ? 'Hari Ini' : period === 'weekly' ? 'Minggu Ini' : 'Bulan Ini';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Laporan</h1>
        <div className="flex gap-2">
          <button onClick={handleExportExcel} disabled={data.transactions.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed">
            <DocumentArrowDownIcon className="w-4 h-4" /> Excel
          </button>
          <button onClick={handleExportPdf} disabled={data.transactions.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed">
            <PrinterIcon className="w-4 h-4" /> PDF
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        {(['daily', 'weekly', 'monthly'] as const).map((p) => (
          <button key={p} onClick={() => setPeriod(p)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              period === p ? 'bg-primary-600 text-white' : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}>
            {p === 'daily' ? 'Harian' : p === 'weekly' ? 'Mingguan' : 'Bulanan'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
            ))}
          </div>
          <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
        </div>
      ) : (
        <div id="report-content">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="p-4 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Omzet {periodLabel}</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(data.totalOmzet)}</p>
            </div>
            <div className="p-4 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Profit</p>
              <p className="text-lg font-bold text-green-600">{formatCurrency(data.totalProfit)}</p>
            </div>
            <div className="p-4 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">HPP</p>
              <p className="text-lg font-bold text-orange-600">{formatCurrency(data.totalHpp)}</p>
            </div>
            <div className="p-4 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Transaksi</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{data.totalTransactions}</p>
            </div>
            <div className="p-4 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Rata-rata</p>
              <p className="text-lg font-bold text-blue-600">{formatCurrency(data.avgTransaction)}</p>
            </div>
          </div>

          <div className="p-5 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 mb-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Grafik Penjualan {periodLabel}</h3>
            <SalesChart labels={chartLabels} omzetData={chartOmzet} profitData={chartProfit} />
          </div>

          {data.transactions.length > 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-800">
                      <th className="text-left p-3 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase">Invoice</th>
                      <th className="text-left p-3 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase">Waktu</th>
                      <th className="text-left p-3 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase">Pembayaran</th>
                      <th className="text-right p-3 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase">Total</th>
                      <th className="text-right p-3 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase">HPP</th>
                      <th className="text-right p-3 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase">Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.transactions.map((t) => (
                      <tr key={t.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="p-3 text-gray-900 dark:text-white font-medium">{t.invoiceNumber}</td>
                        <td className="p-3 text-gray-500 dark:text-gray-400">{new Date(t.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</td>
                        <td className="p-3 text-gray-500 dark:text-gray-400 capitalize">{t.paymentMethod === 'cash' ? 'Tunai' : t.paymentMethod === 'qris' ? 'QRIS' : 'Transfer'}</td>
                        <td className="p-3 text-right text-gray-900 dark:text-white font-medium">{formatCurrency(t.totalAmount)}</td>
                        <td className="p-3 text-right text-orange-600">{formatCurrency(t.totalHpp)}</td>
                        <td className="p-3 text-right text-green-600 font-medium">{formatCurrency(t.totalProfit)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 dark:bg-gray-800/50 font-bold">
                      <td colSpan={3} className="p-3 text-gray-900 dark:text-white">Total</td>
                      <td className="p-3 text-right text-gray-900 dark:text-white">{formatCurrency(data.totalOmzet)}</td>
                      <td className="p-3 text-right text-orange-600">{formatCurrency(data.totalHpp)}</td>
                      <td className="p-3 text-right text-green-600">{formatCurrency(data.totalProfit)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
              <DocumentChartBarIcon className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-sm">Tidak ada transaksi {periodLabel}</p>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}