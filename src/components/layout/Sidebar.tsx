import { NavLink } from 'react-router-dom';
import {
  HomeIcon,
  ShoppingCartIcon,
  CubeIcon,
  BeakerIcon,
  ClipboardDocumentListIcon,
  DocumentChartBarIcon,
  ArrowPathIcon,
  Cog6ToothIcon,
  XMarkIcon,
  BookOpenIcon,
} from '@heroicons/react/24/outline';

const navigation = [
  { name: 'Dashboard', to: '/', icon: HomeIcon },
  { name: 'POS / Kasir', to: '/pos', icon: ShoppingCartIcon },
  { name: 'Produk', to: '/products', icon: CubeIcon },
  { name: 'Bahan Baku', to: '/ingredients', icon: BeakerIcon },
  { name: 'Resep', to: '/recipes', icon: BookOpenIcon },
  { name: 'Riwayat', to: '/history', icon: ClipboardDocumentListIcon },
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
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar - uses CSS for desktop, transform for mobile */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-gray-200 shadow-lg
          transition-transform duration-300 ease-in-out
          dark:bg-gray-900 dark:border-gray-800
          lg:translate-x-0 lg:static lg:z-auto
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">KU</span>
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-900 dark:text-white">
                Kasir Kedai Ungu
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                POS System
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 lg:hidden dark:hover:bg-gray-800"
          >
            <XMarkIcon className="w-5 h-5 text-gray-500" />
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
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    className={`w-5 h-5 ${
                      isActive
                        ? 'text-primary-600 dark:text-primary-400'
                        : 'text-gray-400 dark:text-gray-500'
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