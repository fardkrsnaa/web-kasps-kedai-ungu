import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  SunIcon,
  MoonIcon,
  CheckCircleIcon,
  CubeIcon,
  ArchiveBoxIcon,
  CreditCardIcon,
  QueueListIcon,
  ClockIcon,
  ArrowPathIcon,
  ChartBarIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  InformationCircleIcon,
  ChevronDownIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import { db } from '../database';
import { useThemeStore } from '../stores/useThemeStore';
import toast from 'react-hot-toast';

interface GuideItem {
  icon: typeof CubeIcon;
  title: string;
  steps: string[];
}

const guideData: GuideItem[] = [
  {
    icon: CubeIcon,
    title: 'Langkah 1 — Menambahkan Produk',
    steps: [
      'Masuk ke menu Produk.',
      'Tambahkan seluruh menu yang dijual seperti Kebab Mini, Burger, Squash Melon, Spaghetti, dan lainnya.',
      'Isi nama produk, harga jual, lalu pilih kategori yang sesuai.',
    ],
  },
  {
    icon: ArchiveBoxIcon,
    title: 'Langkah 2 — Mengelola Stok',
    steps: [
      'Masuk ke menu Stok.',
      'Tambahkan data stok sesuai barang yang tersedia (Kebab Mini Frozen, Burger Frozen, Roti, Minuman, dll).',
      'Agar stok berkurang otomatis saat transaksi POS, hubungkan stok dengan produk menggunakan fitur Link ke Produk.',
      'Jika tidak dihubungkan, stok hanya menjadi pencatatan manual.',
    ],
  },
  {
    icon: CreditCardIcon,
    title: 'Langkah 3 — Melakukan Penjualan',
    steps: [
      'Masuk ke menu POS / Kasir.',
      'Pilih produk yang dibeli pelanggan.',
      'Jumlahkan sesuai pesanan lalu tekan Bayar untuk menyelesaikan transaksi.',
      'Jika stok telah dihubungkan dengan produk, stok akan otomatis berkurang sesuai jumlah yang terjual.',
    ],
  },
  {
    icon: QueueListIcon,
    title: 'Langkah 4 — Menggunakan Antrean',
    steps: [
      'Jika pelanggan belum siap membayar, tekan tombol Simpan Antrean.',
      'Pesanan akan disimpan sementara.',
      'Saat pelanggan kembali, buka menu Antrean, pilih pesanan tersebut, lalu lanjutkan ke proses pembayaran tanpa perlu memasukkan ulang item.',
    ],
  },
  {
    icon: ClockIcon,
    title: 'Langkah 5 — Melihat Riwayat',
    steps: [
      'Menu Riwayat digunakan untuk melihat seluruh transaksi yang telah dilakukan.',
      'Setiap transaksi menampilkan nomor invoice, daftar menu yang dibeli, jumlah item, total pembayaran, status transaksi, dan waktu transaksi.',
    ],
  },
  {
    icon: ArrowPathIcon,
    title: 'Langkah 6 — Void dan Restore',
    steps: [
      'Gunakan fitur Void untuk membatalkan transaksi jika terjadi kesalahan.',
      'Stok yang sebelumnya keluar akan otomatis kembali.',
      'Semua aktivitas akan tercatat di Log Aktivitas.',
      'Jika transaksi ingin digunakan kembali, lakukan Restore, maka stok akan otomatis berkurang lagi.',
    ],
  },
  {
    icon: ArchiveBoxIcon,
    title: 'Langkah 7 — Memantau Stok',
    steps: [
      'Menu Stok dapat digunakan untuk melihat jumlah stok saat ini dan riwayat keluar masuk stok.',
      'Pantau penambahan stok manual, pengurangan stok otomatis dari transaksi POS, serta pengembalian stok saat Void.',
    ],
  },
  {
    icon: DocumentTextIcon,
    title: 'Langkah 8 — Melihat Log Aktivitas',
    steps: [
      'Menu Log Aktivitas mencatat seluruh aktivitas penting di dalam sistem.',
      'Termasuk tambah/edit/hapus produk, tambah/pengurangan stok, checkout, void, restore, dan aktivitas lainnya.',
      'Sehingga seluruh perubahan dapat ditelusuri dengan mudah.',
    ],
  },
  {
    icon: ChartBarIcon,
    title: 'Langkah 9 — Melihat Laporan',
    steps: [
      'Menu Laporan digunakan untuk memantau performa penjualan.',
      'Lihat total omzet, jumlah transaksi, produk terlaris, statistik penjualan, grafik penjualan, dan rekap transaksi berdasarkan periode.',
    ],
  },
  {
    icon: ShieldCheckIcon,
    title: 'Langkah 10 — Backup & Restore',
    steps: [
      'Disarankan melakukan Backup secara berkala.',
      'Backup menyimpan seluruh data penting: produk, stok, riwayat transaksi, antrean, log aktivitas, dan pengaturan aplikasi.',
      'Gunakan fitur Restore untuk mengembalikan seluruh data jika berpindah perangkat atau terjadi masalah.',
    ],
  },
];

export default function SettingsPage() {
  const { theme, toggleTheme } = useThemeStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [storeName, setStoreName] = useState('');
  const [address, setAddress] = useState('');
  const [expandedGuide, setExpandedGuide] = useState<number | null>(null);

  const loadSettings = useCallback(async () => {
    try {
      const settings = await db.settings.toArray();
      const current = settings[0];
      if (current) {
        setStoreName(current.storeName);
        setAddress(current.address);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const settings = await db.settings.toArray();
      const current = settings[0];
      if (current?.id !== undefined) {
        await db.settings.update(current.id, {
          storeName: storeName.trim() || 'Kedai Ungu',
          address: address.trim(),
        });
      }
      toast.success('Pengaturan berhasil disimpan');
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Gagal menyimpan pengaturan');
    } finally {
      setSaving(false);
    }
  };

  const toggleGuide = (index: number) => {
    setExpandedGuide(prev => (prev === index ? null : index));
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse mb-6" />
        <div className="max-w-2xl space-y-4">
          <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
          <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
          <div className="h-48 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-2xl mx-auto pb-12"
    >
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Pengaturan
        </h1>
      </div>

      <div className="space-y-6">
        {/* ── Informasi Toko ── */}
        <div className="p-6 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Informasi Toko
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nama Toko
              </label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
                placeholder="Nama toko Anda"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Alamat
              </label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={3}
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white resize-none"
                placeholder="Alamat toko"
              />
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              <CheckCircleIcon className="w-4 h-4" />
              {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
            </button>
          </div>
        </div>

        {/* ── Tema Tampilan ── */}
        <div className="p-6 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Tema Tampilan
          </h2>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {theme === 'dark' ? (
                <MoonIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              ) : (
                <SunIcon className="w-5 h-5 text-gray-500" />
              )}
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {theme === 'dark' ? 'Mode Gelap' : 'Mode Terang'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {theme === 'dark'
                    ? 'Tampilan dengan latar belakang gelap'
                    : 'Tampilan dengan latar belakang terang'}
                </p>
              </div>
            </div>
            <button
              onClick={toggleTheme}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                theme === 'dark' ? 'bg-primary-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                  theme === 'dark' ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* ── Informasi Aplikasi ── */}
        <div className="p-6 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <InformationCircleIcon className="w-5 h-5 text-primary-600" />
            Informasi Aplikasi
          </h2>
          <div className="space-y-3 text-sm mb-5 pb-5 border-b border-gray-100 dark:border-gray-800">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Aplikasi</span>
              <span className="font-medium text-gray-900 dark:text-white">Kasir Kedai Ungu POS System</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Versi</span>
              <span className="font-medium text-gray-900 dark:text-white">1.0.0 — Beta</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Database</span>
              <span className="font-medium text-gray-900 dark:text-white">IndexedDB</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Mode</span>
              <span className="font-medium text-green-600">Offline 100%</span>
            </div>
          </div>

          {/* Tentang Pengembang */}
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <UsersIcon className="w-5 h-5 text-primary-600" />
              Tentang Pengembang
            </h3>
            <div className="text-sm text-gray-700 dark:text-gray-300 space-y-3 leading-relaxed">
              <p>
                <strong>Website ini diinisiasi dan dikembangkan oleh:</strong>
              </p>
              <p className="font-medium text-primary-700 dark:text-primary-400">
                Farid Krsna (@fardkrsna_)
              </p>
              <p>
                Dikembangkan dengan bantuan teknologi Artificial Intelligence (AI) sebagai partner
                dalam proses perancangan, pengembangan, dan penyempurnaan sistem, sehingga menghasilkan
                aplikasi yang lebih efisien, modern, dan mudah digunakan.
              </p>
            </div>

            <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-1">Status Pengembangan</p>
              <p className="text-sm text-amber-700 dark:text-amber-400 leading-relaxed">
                Website <strong>Kasir Kedai Ungu POS System</strong> akan terus mendapatkan pembaruan
                dan pengembangan fitur di masa mendatang. Saat ini aplikasi masih berada pada tahap{' '}
                <strong>uji coba (Beta Testing)</strong>, namun seluruh fitur utama sudah dapat
                digunakan secara normal untuk operasional harian. Aplikasi ini telah dirancang agar
                dapat digunakan dengan stabil dan mendukung aktivitas penjualan, manajemen stok,
                laporan, antrean, backup data, serta fitur lainnya.
              </p>
            </div>

            <div className="mt-4 p-4 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
              <p className="text-sm font-medium text-red-800 dark:text-red-300 mb-2">Laporan Bug atau Kendala</p>
              <p className="text-sm text-red-700 dark:text-red-400 leading-relaxed">
                Apabila menemukan error, bug, tampilan yang tidak sesuai, perhitungan yang tidak benar,
                atau masalah pada transaksi, backup, restore, atau sinkronisasi stok, silakan langsung
                menghubungi:
              </p>
              <p className="mt-2 font-semibold text-red-800 dark:text-red-300">@fardkrsna_</p>
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                Masukan dan laporan pengguna sangat membantu proses pengembangan agar aplikasi menjadi
                lebih baik pada versi berikutnya.
              </p>
            </div>
          </div>
        </div>

        {/* ── Panduan Penggunaan ── */}
        <div className="p-6 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <DocumentTextIcon className="w-5 h-5 text-primary-600" />
            Panduan Penggunaan Website
          </h2>
          <div className="space-y-2">
            {guideData.map((item, index) => (
              <div
                key={index}
                className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden transition-all duration-200"
              >
                <button
                  onClick={() => toggleGuide(index)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className="w-9 h-9 rounded-xl bg-primary-50 dark:bg-primary-950/50 flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  </div>
                  <span className="flex-1 text-sm font-medium text-gray-900 dark:text-white">
                    {item.title}
                  </span>
                  <ChevronDownIcon
                    className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                      expandedGuide === index ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                <motion.div
                  initial={false}
                  animate={{
                    height: expandedGuide === index ? 'auto' : 0,
                    opacity: expandedGuide === index ? 1 : 0,
                  }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 pt-1">
                    <ul className="space-y-2">
                      {item.steps.map((step, sIdx) => (
                        <li key={sIdx} className="flex items-start gap-2.5 text-sm text-gray-600 dark:text-gray-400">
                          <span className="mt-0.5 w-5 h-5 rounded-full bg-primary-100 dark:bg-primary-950/50 text-primary-700 dark:text-primary-400 flex items-center justify-center flex-shrink-0 text-[10px] font-bold">
                            {sIdx + 1}
                          </span>
                          <span className="leading-relaxed">{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Penutup ── */}
        <div className="p-6 bg-gradient-to-br from-primary-50 to-primary-100/50 dark:from-primary-950/30 dark:to-primary-900/20 rounded-xl border border-primary-200 dark:border-primary-800 text-center">
          <p className="text-sm text-primary-800 dark:text-primary-300 leading-relaxed">
            Terima kasih telah menggunakan <strong>Kasir Kedai Ungu POS System</strong>.
            Dukungan, saran, dan laporan dari pengguna sangat berarti untuk pengembangan aplikasi
            ini agar semakin stabil, cepat, dan bermanfaat bagi banyak usaha di Indonesia.
          </p>
        </div>
      </div>
    </motion.div>
  );
}