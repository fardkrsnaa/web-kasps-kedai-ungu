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

interface NavItem {
  name: string;
  to: string;
  icon: typeof HomeIcon;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const sections: NavSection[] = [
  {
    title: 'GENERAL',
    items: [
      { name: 'Dashboard', to: '/', icon: HomeIcon },
      { name: 'POS / Kasir', to: '/pos', icon: ShoppingCartIcon },
      { name: 'Antrean', to: '/queue', icon: QueueListIcon },
    ],
  },
  {
    title: 'MASTER DATA',
    items: [
      { name: 'Produk', to: '/products', icon: CubeIcon },
      { name: 'Stok', to: '/ingredients', icon: BeakerIcon },
    ],
  },
  {
    title: 'TRANSAKSI',
    items: [
      { name: 'Riwayat', to: '/history', icon: ClipboardDocumentListIcon },
      { name: 'Laporan', to: '/reports', icon: DocumentChartBarIcon },
    ],
  },
  {
    title: 'SISTEM',
    items: [
      { name: 'Log Aktivitas', to: '/audit-log', icon: ClockIcon },
      { name: 'Tempat Sampah', to: '/trash', icon: TrashIcon },
      { name: 'Backup & Restore', to: '/backup', icon: ArrowPathIcon },
      { name: 'Pengaturan', to: '/settings', icon: Cog6ToothIcon },
    ],
  },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-md transition-opacity duration-300 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 z-50 h-full w-[280px] flex flex-col
          bg-[var(--sidebar-glass-dark)] dark:bg-[var(--sidebar-glass-dark)]
          bg-white
          border-r border-gray-200/80 dark:border-white/[0.06]
          transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
          lg:translate-x-0 lg:static lg:z-auto
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* ── Brand Header ── */}
        <div className="relative flex items-center gap-3.5 h-[72px] px-6 border-b border-gray-200/80 dark:border-white/[0.06]">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 flex items-center justify-center shadow-xl shadow-primary-500/25 flex-shrink-0">
            <span className="text-white font-extrabold text-base tracking-tight">KU</span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold text-gray-900 dark:text-white tracking-tight leading-tight">
              Kasir Kedai Ungu
            </h1>
            <p className="text-[10px] font-semibold text-primary-500 dark:text-primary-400 uppercase tracking-[0.2em]">
              POS System v2.0 Beta
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors lg:hidden"
          >
            <XMarkIcon className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* ── Navigation ── */}
        <nav className="flex-1 overflow-y-auto py-5 px-4 space-y-6 sidebar-scroll">
          {sections.map((section) => (
            <div key={section.title}>
              <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 dark:text-gray-500">
                {section.title}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `group relative flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 ${isActive
                        ? 'bg-gradient-to-r from-primary-500/15 to-primary-600/5 text-primary-600 dark:text-primary-300 shadow-sm shadow-primary-500/5'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.06] dark:hover:text-gray-200'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {/* Active indicator bar */}
                        {isActive && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full bg-gradient-to-b from-primary-500 to-primary-600 shadow-sm shadow-primary-500/40" />
                        )}
                        <div className={`p-1.5 rounded-lg transition-all duration-200 ${isActive
                          ? 'bg-primary-500/20 dark:bg-primary-500/20'
                          : 'group-hover:bg-gray-200 dark:group-hover:bg-white/[0.08]'
                          }`}>
                          <item.icon
                            className={`w-[18px] h-[18px] transition-colors duration-200 ${isActive
                              ? 'text-primary-500 dark:text-primary-400'
                              : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'
                              }`}
                          />
                        </div>
                        <span className="truncate">{item.name}</span>
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* ── Footer ── */}
        <div className="px-6 py-4 border-t border-gray-200/80 dark:border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center opacity-80">
              <span className="text-[8px] font-bold text-white">KU</span>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">Kedai Ungu</p>
              <p className="text-[9px] text-gray-400 dark:text-gray-600">v2.0 Beta</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}