import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  CurrencyDollarIcon,
  ChartBarIcon,
  ShoppingCartIcon,
  CubeIcon,
  ArrowTrendingUpIcon,
  TrophyIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { useDashboard } from '../hooks/useDashboard';
import { formatCurrency, formatDateTime } from '../utils/format';
import SalesChart from '../components/ui/SalesChart';

type Period = 'weekly' | 'monthly';

/** Count-up animation hook */
function useCountUp(target: number, duration = 1000) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    const start = performance.now();
    const from = 0;

    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(from + target * eased));
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return value;
}

const statGradients: { from: string; to: string }[] = [
  { from: '#8B5CF6', to: '#A855F7' },
  { from: '#0EA5E9', to: '#38BDF8' },
  { from: '#10B981', to: '#34D399' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.4, 0, 0.2, 1] as const,
    },
  },
};

const rankBadges: Record<number, { bg: string; label: string; glow: string }> = {
  0: { bg: 'from-yellow-400 to-amber-500', label: '🥇 Terlaris', glow: 'shadow-yellow-500/30' },
  1: { bg: 'from-slate-300 to-slate-400', label: '🥈', glow: 'shadow-slate-400/30' },
  2: { bg: 'from-orange-300 to-orange-400', label: '🥉', glow: 'shadow-orange-400/30' },
};

export default function DashboardPage() {
  const { data, loading } = useDashboard();
  const [period, setPeriod] = useState<Period>('weekly');

  const omzetCount = useCountUp(data.todayOmzet);
  const txCount = useCountUp(data.todayTransactions);
  const prodCount = useCountUp(data.totalProducts);
  const stats: { label: string; value: string; raw: number; icon: typeof CurrencyDollarIcon; gradient: { from: string; to: string } }[] = [
    { label: 'Omset Hari Ini', value: formatCurrency(omzetCount), raw: data.todayOmzet, icon: CurrencyDollarIcon, gradient: statGradients[0]! },
    { label: 'Transaksi Hari Ini', value: txCount.toString(), raw: data.todayTransactions, icon: ShoppingCartIcon, gradient: statGradients[1]! },
    { label: 'Produk Aktif', value: prodCount.toString(), raw: data.totalProducts, icon: CubeIcon, gradient: statGradients[2]! },
  ];

  const chartLabels = period === 'weekly'
    ? data.weeklySales.map((s) => s.date)
    : data.monthlySales.map((s) => s.date);

  const chartOmzet = period === 'weekly'
    ? data.weeklySales.map((s) => s.omzet)
    : data.monthlySales.map((s) => s.omzet);

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible">
      {/* ═══════════════ SECTION 1: Hero Header ═══════════════ */}
      <motion.div variants={itemVariants} className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
              Selamat Datang
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-950/40">
                <span className="text-xl">👋</span>
              </span>
            </h1>
            <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400 max-w-xl">
              Kasir Kedai Ungu POS System — Pantau penjualan, kelola stok, dan lihat performa bisnis dalam satu dashboard.
            </p>
          </div>
          {!loading && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-2xl">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Sistem Aktif</span>
            </div>
          )}
        </div>
      </motion.div>

      {/* ═══════════════ SECTION 2: Stat Cards ═══════════════ */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
        {stats.map((stat) => (
          <motion.div
            key={stat.label}
            whileHover={{ y: -4 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="group relative p-6 bg-white dark:bg-[#111827] rounded-2xl border border-gray-100/80 dark:border-white/[0.08] shadow-sm hover:shadow-xl dark:hover:shadow-2xl dark:hover:shadow-black/30 transition-all duration-300"
          >
            {/* Gradient icon */}
            <div className="flex items-center justify-between mb-4">
              <div
                className="p-3 rounded-2xl"
                style={{
                  background: `linear-gradient(135deg, ${stat.gradient.from}15, ${stat.gradient.to}08)`,
                }}
              >
                <stat.icon
                  className="w-6 h-6"
                  style={{ color: stat.gradient.from }}
                />
              </div>
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 dark:bg-white/[0.04] opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowTrendingUpIcon className="w-4 h-4 text-emerald-500" />
              </div>
            </div>
            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">
              {stat.label}
            </p>
            <p className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white tabular-nums tracking-tight">
              {loading ? (
                <span className="inline-block w-28 h-8 skeleton" />
              ) : (
                stat.value
              )}
            </p>
          </motion.div>
        ))}
      </motion.div>

      {/* ═══════════════ SECTION 3: Chart + Top Products ═══════════════ */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
        {/* Sales Chart */}
        <motion.div
          variants={itemVariants}
          className="lg:col-span-2 p-6 bg-white dark:bg-[#111827] rounded-2xl border border-gray-100/80 dark:border-white/[0.08] shadow-sm"
        >
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary-50 dark:bg-primary-950/50">
                <ChartBarIcon className="w-5 h-5 text-primary-500" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Grafik Penjualan</h3>
                <p className="text-[11px] text-gray-400 dark:text-gray-500">Visualisasi omzet harian</p>
              </div>
            </div>
            <div className="flex gap-1 bg-gray-100 dark:bg-white/[0.06] rounded-2xl p-1">
              <button
                onClick={() => setPeriod('weekly')}
                className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all duration-200 ${
                  period === 'weekly'
                    ? 'bg-white dark:bg-white/10 text-primary-600 dark:text-primary-400 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                Mingguan
              </button>
              <button
                onClick={() => setPeriod('monthly')}
                className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all duration-200 ${
                  period === 'monthly'
                    ? 'bg-white dark:bg-white/10 text-primary-600 dark:text-primary-400 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                Bulanan
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-72">
              <div className="w-10 h-10 border-[3px] border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="h-72">
              <SalesChart labels={chartLabels} omzetData={chartOmzet} />
            </div>
          )}
        </motion.div>

        {/* Top Products */}
        <motion.div variants={itemVariants} className="p-6 bg-white dark:bg-[#111827] rounded-2xl border border-gray-100/80 dark:border-white/[0.08] shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50">
              <TrophyIcon className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Produk Terlaris</h3>
              <p className="text-[11px] text-gray-400 dark:text-gray-500">Hari ini</p>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-[68px] skeleton" />
              ))}
            </div>
          ) : data.topProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-52 text-gray-400 dark:text-gray-500">
              <ChartBarIcon className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm font-medium">Belum ada transaksi</p>
              <p className="text-xs mt-1">Mulai transaksi di POS</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.topProducts.map((product, index) => {
                const rank = rankBadges[index] || { bg: 'from-gray-400 to-gray-500', label: `#${index + 1}`, glow: '' };
                return (
                  <motion.div
                    key={product.name}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.06 }}
                    className="group relative flex items-center gap-3.5 p-3.5 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.04] hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-all duration-200"
                  >
                    {/* Rank badge */}
                    <div className={`flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br ${rank.bg} flex items-center justify-center shadow-sm ${rank.glow}`}>
                      <span className="text-xs font-black text-white">{index + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                        {product.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {product.quantity} terjual
                      </p>
                    </div>
                    <p className="text-sm font-black text-gray-900 dark:text-white tabular-nums">
                      {formatCurrency(product.total)}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* ═══════════════ SECTION 5: Recent Activity Timeline ═══════════════ */}
      <motion.div variants={itemVariants}>
        <div className="p-6 bg-white dark:bg-[#111827] rounded-2xl border border-gray-100/80 dark:border-white/[0.08] shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/50">
              <SparklesIcon className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Aktivitas Terbaru</h3>
              <p className="text-[11px] text-gray-400 dark:text-gray-500">Transaksi terkini</p>
            </div>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-4">
                  <div className="w-[2px] h-14 bg-gray-200 dark:bg-white/[0.06] rounded-full" />
                  <div className="flex-1 h-14 skeleton" />
                </div>
              ))}
            </div>
          ) : data.recentTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-28 text-gray-400 dark:text-gray-500">
              <p className="text-sm">Belum ada transaksi hari ini</p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-[7px] top-3 bottom-3 w-[2px] bg-gray-200 dark:bg-white/[0.06] rounded-full" />

              <div className="space-y-0">
                {data.recentTransactions.map((tx, index) => (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.04 }}
                    className="relative flex gap-4 pb-5 last:pb-0"
                  >
                    {/* Dot */}
                    <div className="relative z-10 flex-shrink-0 mt-1.5">
                      <div className={`w-[18px] h-[18px] rounded-full border-[3px] flex items-center justify-center ${
                        tx.status === 'completed'
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50'
                          : 'border-red-500 bg-red-50 dark:bg-red-950/50'
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          tx.status === 'completed' ? 'bg-emerald-500' : 'bg-red-500'
                        }`} />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-center gap-2.5">
                        <p className="text-sm font-bold text-gray-900 dark:text-white">
                          {tx.invoiceNumber}
                        </p>
                        <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-full ${
                          tx.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                        }`}>
                          {tx.status === 'completed' ? 'Berhasil' : 'Void'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {formatDateTime(tx.createdAt)}
                      </p>
                      {tx.items.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {tx.items.slice(0, 3).map((item, i) => (
                            <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-gray-400 rounded-lg">
                              {item.productName}
                              <span className="font-bold text-gray-700 dark:text-gray-300">x{item.quantity}</span>
                            </span>
                          ))}
                          {tx.items.length > 3 && (
                            <span className="inline-flex items-center px-2.5 py-1 text-[10px] font-medium text-gray-400 dark:text-gray-500">
                              +{tx.items.length - 3} lainnya
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Amount */}
                    <div className="flex-shrink-0 text-right pt-0.5">
                      <p className="text-sm font-black text-gray-900 dark:text-white tabular-nums">
                        {formatCurrency(tx.totalAmount)}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
