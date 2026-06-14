import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { db } from '../database';
import type { Backup } from '../types';
import toast from 'react-hot-toast';
import Modal from '../components/ui/Modal';

export default function BackupPage() {
  const [loading, setLoading] = useState(false);

  // Backup modal
  const [showBackupModal, setShowBackupModal] = useState(false);

  // Restore modals
  const [showRestorePreviewModal, setShowRestorePreviewModal] = useState(false);
  const [showRestoreSuccessModal, setShowRestoreSuccessModal] = useState(false);
  const [showRestoreErrorModal, setShowRestoreErrorModal] = useState(false);

  // Restore data
  const [pendingRestore, setPendingRestore] = useState<{
    backup: Backup;
    fileName: string;
    transactionCount: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Backup ────────────────────────────────────────────────
  const openBackupModal = () => {
    setShowBackupModal(true);
  };

  const executeBackup = async () => {
    setShowBackupModal(false);
    setLoading(true);
    try {
      const [products, ingredients, transactions, transactionItems, stockMovements, settings, auditLogs] =
        await Promise.all([
          db.products.toArray(),
          db.ingredients.toArray(),
          db.transactions.toArray(),
          db.transactionItems.toArray(),
          db.stockMovements.toArray(),
          db.settings.toArray(),
          db.auditLogs.toArray(),
        ]);

      const backup: Backup = {
        version: '1.1.0',
        exportedAt: new Date().toISOString(),
        products,
        ingredients,
        transactions,
        transactionItems,
        stockMovements,
        auditLogs,
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

  // ─── Restore ───────────────────────────────────────────────
  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const text = await file.text();
      const backup: Backup = JSON.parse(text);

      if (!backup.version || !backup.products) {
        toast.error('File backup tidak valid');
        return;
      }

      // Store pending restore data
      setPendingRestore({
        backup,
        fileName: file.name,
        transactionCount: backup.transactions?.length ?? 0,
      });
      setShowRestorePreviewModal(true);
    } catch (error) {
      console.error('Failed to parse backup file:', error);
      setShowRestoreErrorModal(true);
    } finally {
      setLoading(false);
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const executeRestore = async () => {
    if (!pendingRestore) return;
    setShowRestorePreviewModal(false);
    setLoading(true);

    try {
      const { backup } = pendingRestore;

      // Clear all existing data
      await Promise.all([
        db.products.clear(),
        db.ingredients.clear(),
        db.transactions.clear(),
        db.transactionItems.clear(),
        db.stockMovements.clear(),
        db.settings.clear(),
        db.auditLogs.clear(),
      ]);

      // Restore data
      await Promise.all([
        db.products.bulkAdd(backup.products),
        db.ingredients.bulkAdd(backup.ingredients),
        db.transactions.bulkAdd(backup.transactions),
        db.transactionItems.bulkAdd(backup.transactionItems),
        db.stockMovements.bulkAdd(backup.stockMovements),
        db.settings.bulkAdd(backup.settings),
        ...(backup.auditLogs ? [db.auditLogs.bulkAdd(backup.auditLogs)] : []),
      ]);

      setShowRestoreSuccessModal(true);
      setPendingRestore(null);
    } catch (error) {
      console.error('Restore failed:', error);
      setShowRestoreErrorModal(true);
      setPendingRestore(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFileSelect}
      />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Backup & Restore</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ── Backup Card ── */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="p-6 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-primary-50 dark:bg-primary-950">
              <ArrowDownTrayIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Backup Data</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Download seluruh data sebagai file JSON
              </p>
            </div>
          </div>
          <button
            onClick={openBackupModal}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Memproses...
              </>
            ) : (
              <>
                <ArrowDownTrayIcon className="w-4 h-4" />
                Download Backup
              </>
            )}
          </button>
        </motion.div>

        {/* ── Restore Card ── */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="p-6 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-950">
              <ArrowUpTrayIcon className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Restore Data</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Pulihkan data dari file backup JSON
              </p>
            </div>
          </div>
          <button
            onClick={openFilePicker}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Memproses...
              </>
            ) : (
              <>
                <ArrowUpTrayIcon className="w-4 h-4" />
                Pilih File Backup
              </>
            )}
          </button>
        </motion.div>
      </div>

      {/* ── Info ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
        className="mt-6 p-5 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800"
      >
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950">
            <ShieldCheckIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
              Informasi Backup
            </h4>
            <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
              <li>• Backup mencakup semua data: produk, stok, transaksi, dan log aktivitas.</li>
              <li>• File backup dalam format JSON.</li>
              <li>• Restore akan menimpa semua data yang ada saat ini.</li>
              <li>• Pastikan Anda memiliki backup terbaru sebelum melakukan restore.</li>
            </ul>
          </div>
        </div>
      </motion.div>

      {/* ════════════════════════════════════════════════════════ */}
      {/* ═══ MODALS ════════════════════════════════════════════ */}
      {/* ════════════════════════════════════════════════════════ */}

      {/* ── Backup Confirmation Modal ── */}
      <Modal isOpen={showBackupModal} onClose={() => setShowBackupModal(false)} title="Backup Data" size="sm">
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
              Anda akan membuat file backup seluruh data aplikasi.
            </p>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
              Data yang akan dicadangkan:
            </p>
            <ul className="space-y-1.5">
              {['Produk', 'Stok', 'Riwayat Transaksi', 'Log Aktivitas', 'Pengaturan'].map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowBackupModal(false)}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              Batal
            </button>
            <button
              onClick={executeBackup}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
            >
              Download Backup
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Restore Preview Modal ── */}
      <Modal isOpen={showRestorePreviewModal} onClose={() => setShowRestorePreviewModal(false)} title="Preview Data Backup" size="md">
        <div className="space-y-4">
          {/* Backup info cards */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Nama File</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{pendingRestore?.fileName}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Tanggal Backup</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {pendingRestore?.backup.exportedAt
                    ? new Date(pendingRestore.backup.exportedAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })
                    : '-'}
                </p>
              </div>
            </div>

            <div className="h-px bg-gray-200 dark:bg-gray-700" />

            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  <strong>{pendingRestore?.backup.products?.length ?? 0}</strong> Produk
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  <strong>{pendingRestore?.backup.ingredients?.length ?? 0}</strong> Stok / Bahan
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  <strong>{pendingRestore?.transactionCount ?? 0}</strong> Transaksi
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-gray-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  <strong>{pendingRestore?.backup.auditLogs?.length ?? 0}</strong> Log Aktivitas
                </span>
              </div>
            </div>
          </div>

          {/* Warning */}
          <div className="flex gap-3 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl">
            <ExclamationTriangleIcon className="w-5 h-5 text-amber-500 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800 dark:text-amber-300 leading-relaxed">
              Restore akan menggantikan seluruh data yang ada saat ini. Pastikan Anda telah membuat backup
              terbaru sebelum melanjutkan.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                setShowRestorePreviewModal(false);
                setPendingRestore(null);
              }}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              Batal
            </button>
            <button
              onClick={executeRestore}
              disabled={loading}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Memproses...
                </span>
              ) : (
                'Restore Data'
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Restore Success Modal ── */}
      <Modal isOpen={showRestoreSuccessModal} onClose={() => setShowRestoreSuccessModal(false)} title="Restore Berhasil" size="sm">
        <div className="space-y-4">
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl">
            <div className="flex items-start gap-3">
              <CheckCircleIcon className="w-5 h-5 text-emerald-500 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300 mb-2">
                  Data berhasil dipulihkan dari file backup.
                </p>
                <ul className="space-y-1">
                  {['Produk dipulihkan', 'Stok dipulihkan', 'Transaksi dipulihkan', 'Log aktivitas dipulihkan'].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
                      <CheckCircleIcon className="w-3.5 h-3.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowRestoreSuccessModal(false)}
            className="w-full px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            Tutup
          </button>
        </div>
      </Modal>

      {/* ── Restore Error Modal ── */}
      <Modal isOpen={showRestoreErrorModal} onClose={() => setShowRestoreErrorModal(false)} title="Restore Gagal" size="sm">
        <div className="space-y-4">
          <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl">
            <div className="flex items-start gap-3">
              <XCircleIcon className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800 dark:text-red-300 leading-relaxed">
                File backup tidak valid atau terjadi kesalahan saat proses restore.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowRestoreErrorModal(false)}
            className="w-full px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            Tutup
          </button>
        </div>
      </Modal>
    </motion.div>
  );
}