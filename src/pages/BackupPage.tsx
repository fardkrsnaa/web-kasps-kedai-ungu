import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { db } from '../database';
import type { Backup } from '../types';
import toast from 'react-hot-toast';

export default function BackupPage() {
  const [loading, setLoading] = useState(false);

  const handleBackup = async () => {
    setLoading(true);
    try {
      const [products, ingredients, recipes, transactions, transactionItems, stockMovements, settings] =
        await Promise.all([
          db.products.toArray(),
          db.ingredients.toArray(),
          db.recipes.toArray(),
          db.transactions.toArray(),
          db.transactionItems.toArray(),
          db.stockMovements.toArray(),
          db.settings.toArray(),
        ]);

      const backup: Backup = {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        products,
        ingredients,
        recipes,
        transactions,
        transactionItems,
        stockMovements,
        settings,
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const filename = `kedai-ungu-backup-${new Date().toISOString().slice(0, 10)}.json`;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Backup berhasil: ${filename}`);
    } catch (error) {
      console.error('Backup failed:', error);
      toast.error('Gagal melakukan backup');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setLoading(true);
      try {
        const text = await file.text();
        const backup: Backup = JSON.parse(text);

        if (!backup.version || !backup.products) {
          toast.error('File backup tidak valid');
          return;
        }

        const confirmed = window.confirm(
          `Yakin ingin merestore data?\n\nData yang ada saat ini akan ditimpa.\n\nFile: ${file.name}\nTanggal: ${new Date(backup.exportedAt).toLocaleDateString('id-ID')}\nProduk: ${backup.products.length}\nBahan: ${backup.ingredients.length}\nTransaksi: ${backup.transactions.length}`
        );
        if (!confirmed) return;

        // Clear all existing data
        await Promise.all([
          db.products.clear(),
          db.ingredients.clear(),
          db.recipes.clear(),
          db.transactions.clear(),
          db.transactionItems.clear(),
          db.stockMovements.clear(),
          db.settings.clear(),
        ]);

        // Restore data
        await Promise.all([
          db.products.bulkAdd(backup.products),
          db.ingredients.bulkAdd(backup.ingredients),
          db.recipes.bulkAdd(backup.recipes),
          db.transactions.bulkAdd(backup.transactions),
          db.transactionItems.bulkAdd(backup.transactionItems),
          db.stockMovements.bulkAdd(backup.stockMovements),
          db.settings.bulkAdd(backup.settings),
        ]);

        toast.success('Restore berhasil! Silakan muat ulang halaman.');
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } catch (error) {
        console.error('Restore failed:', error);
        toast.error('Gagal merestore data. Periksa format file.');
      } finally {
        setLoading(false);
      }
    };
    input.click();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Backup & Restore
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
        {/* Backup Card */}
        <div className="p-6 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="w-12 h-12 rounded-lg bg-primary-100 dark:bg-primary-900 flex items-center justify-center mb-4">
            <ArrowDownTrayIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Backup Data
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Export seluruh data (produk, bahan, resep, transaksi, pengaturan) ke file JSON.
          </p>
          <button
            onClick={handleBackup}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            {loading ? 'Memproses...' : 'Download Backup'}
          </button>
        </div>

        {/* Restore Card */}
        <div className="p-6 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="w-12 h-12 rounded-lg bg-amber-100 dark:bg-amber-900 flex items-center justify-center mb-4">
            <ArrowUpTrayIcon className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Restore Data
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Import data dari file backup JSON. Data yang ada akan ditimpa.
          </p>
          <button
            onClick={handleRestore}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            <ArrowUpTrayIcon className="w-4 h-4" />
            {loading ? 'Memproses...' : 'Pilih File & Restore'}
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 rounded-xl border border-blue-100 dark:border-blue-900 max-w-2xl">
        <div className="flex items-start gap-3">
          <ShieldCheckIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
              Informasi Backup
            </p>
            <ul className="text-xs text-blue-600 dark:text-blue-300 mt-1 space-y-1">
              <li>Backup mencakup semua data: produk, bahan baku, resep, transaksi, dan pengaturan</li>
              <li>File backup dalam format JSON</li>
              <li>Restore akan menimpa seluruh data yang ada</li>
              <li>Disarankan melakukan backup secara berkala</li>
            </ul>
          </div>
        </div>
      </div>
    </motion.div>
  );
}