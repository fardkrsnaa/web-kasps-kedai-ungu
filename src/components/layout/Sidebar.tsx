import { NavLink } from 'react-router-dom';
import {
  HomeIcon,
  ShoppingCartIcon,
  QueueListIcon,
  CubeIcon,
  BeakerIcon,
  ClipboardDocumentListIcon,
  DocumentChartBarIcon,
  ArrowPathIcon,
  Cog6ToothIcon,
  XMarkIcon,
  ClockIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

const navigation = [
  { name: 'Dashboard', to: '/', icon: HomeIcon },
  { name: 'POS / Kasir', to: '/pos', icon: ShoppingCartIcon },
  { name: 'Antrean Pesanan', to: '/queue', icon: QueueListIcon },
  { name: 'Produk', to: '/products', icon: CubeIcon },
  { name: 'Stok', to: '/ingredients', icon: BeakerIcon },
  { name: 'Riwayat', to: '/history', icon: ClipboardDocumentListIcon },
  { name: 'Log Aktivitas', to: '/audit-log', icon: ClockIcon },
  { name: 'Tempat Sampah', to: '/trash', icon: TrashIcon },
  { name: 'Laporan', to: '/reports', icon: DocumentChartBarIcon },
  { name: 'Backup & Restore', to: '/backup', icon: ArrowPathIcon },
  { name: 'Pengaturan', to: '/settings', icon: Cog6ToothIcon },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-slate-200 shadow-lg
          transition-transform duration-300 ease-in-out
          dark:bg-slate-900 dark:border-slate-700
          lg:translate-x-0 lg:static lg:z-auto
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">KU</span>
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 dark:text-white">
                Kasir Kedai Ungu
              </h1>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                POS System
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 lg:hidden dark:hover:bg-slate-700"
          >
            <XMarkIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
        </div>

        <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100%-4rem)]">
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300'
                    : 'text-slate-900 hover:bg-slate-100 dark:text-white dark:hover:bg-slate-700'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    className={`w-5 h-5 ${
                      isActive
                        ? 'text-primary-600 dark:text-primary-400'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  />
                  {item.name}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}