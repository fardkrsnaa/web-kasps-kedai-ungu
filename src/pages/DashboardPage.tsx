import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  CurrencyDollarIcon,
  ChartBarIcon,
  DocumentTextIcon,
  ShoppingCartIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline';
import { useDashboard } from '../hooks/useDashboard';
import { formatCurrency, formatDateTime } from '../utils/format';
import SalesChart from '../components/ui/SalesChart';

type Period = 'weekly' | 'monthly';

export default function DashboardPage() {
  const { data, loading } = useDashboard();
  const [period, setPeriod] = useState<Period>('weekly');

  const stats = [
    {
      label: 'Omzet Hari Ini',
      value: formatCurrency(data.todayOmzet),
      icon: CurrencyDollarIcon,
      color: 'text-primary-600 bg-primary-50 dark:bg-primary-950 dark:text-primary-400',
    },
    {
      label: 'Profit Hari Ini',
      value: formatCurrency(data.todayProfit),
      icon: ArrowTrendingUpIcon,
      color: 'text-green-600 bg-green-50 dark:bg-green-950 dark:text-green-400',
    },
    {
      label: 'HPP Hari Ini',
      value: formatCurrency(data.todayHpp),
      icon: DocumentTextIcon,
      color: 'text-orange-600 bg-orange-50 dark:bg-orange-950 dark:text-orange-400',
    },
    {
      label: 'Transaksi Hari Ini',
      value: data.todayTransactions.toString(),
      icon: ShoppingCartIcon,
      color: 'text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-400',
    },
  ];

  const chartLabels =
    period === 'weekly'
      ? data.weeklySales.map((s) => s.date)
      : data.monthlySales.map((s) => s.date);

  const chartOmzet =
    period === 'weekly'
      ? data.weeklySales.map((s) => s.omzet)
      : data.monthlySales.map((s) => s.omzet);

  const chartProfit =
    period === 'weekly'
      ? data.weeklySales.map((s) => s.profit)
      : data.monthlySales.map((s) => s.profit);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Dashboard
        </h1>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className="p-5 bg-white rounded-xl shadow-sm border border-gray-100 dark:bg-gray-900 dark:border-gray-800"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 rounded-lg ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              {stat.label}
            </p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {loading ? (
                <span className="inline-block w-20 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              ) : (
                stat.value
              )}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Chart & Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="lg:col-span-2 p-5 bg-white rounded-xl shadow-sm border border-gray-100 dark:bg-gray-900 dark:border-gray-800"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Grafik Penjualan
            </h3>
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setPeriod('weekly')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  period === 'weekly'
                    ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Mingguan
              </button>
              <button
                onClick={() => setPeriod('monthly')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  period === 'monthly'
                    ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Bulanan
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <SalesChart
              labels={chartLabels}
              omzetData={chartOmzet}
              profitData={chartProfit}
            />
          )}
        </motion.div>

        {/* Top Products */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="p-5 bg-white rounded-xl shadow-sm border border-gray-100 dark:bg-gray-900 dark:border-gray-800"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Produk Terlaris Hari Ini
          </h3>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"
                />
              ))}
            </div>
          ) : data.topProducts.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-400 dark:text-gray-500">
              <div className="text-center">
                <ChartBarIcon className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Belum ada transaksi hari ini</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {data.topProducts.map((product, index) => (
                <div
                  key={product.name}
                  className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                    <span className="text-xs font-bold text-primary-600 dark:text-primary-400">
                      {index + 1}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {product.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {product.quantity} terjual
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(product.total)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Recent Transactions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
        className="mt-6 p-5 bg-white rounded-xl shadow-sm border border-gray-100 dark:bg-gray-900 dark:border-gray-800"
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Transaksi Terbaru
        </h3>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : data.recentTransactions.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-400 dark:text-gray-500">
            <p className="text-sm">Belum ada transaksi</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.recentTransactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {tx.invoiceNumber}
                    </p>
                    <span className={`inline-flex items-center px-1.5 py-0.5 text-[9px] font-medium rounded-full ${
                      tx.status === 'completed'
                        ? 'text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900'
                        : 'text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900'
                    }`}>
                      {tx.status === 'completed' ? '✓' : 'VOID'}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                    {formatDateTime(tx.createdAt)}
                  </p>
                  {/* Product list */}
                  {tx.items.length > 0 && (
                    <div className="mt-1">
                      {tx.items.slice(0, 3).map((item, i) => (
                        <p key={i} className="text-[11px] text-gray-600 dark:text-gray-400">
                          {item.productName} x{item.quantity}
                        </p>
                      ))}
                      {tx.items.length > 3 && (
                        <p className="text-[11px] text-gray-400 dark:text-gray-500">
                          +{tx.items.length - 3} lainnya
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">
                    {formatCurrency(tx.totalAmount)}
                  </p>
                  <p className={`text-[11px] ${tx.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {tx.totalProfit >= 0 ? '+' : ''}{formatCurrency(tx.totalProfit)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
