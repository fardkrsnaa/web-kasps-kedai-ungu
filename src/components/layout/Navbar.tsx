import { Bars3Icon, SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import { useThemeStore } from '../../stores/useThemeStore';

interface NavbarProps {
  onMenuClick: () => void;
}

export default function Navbar({ onMenuClick }: NavbarProps) {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 bg-white border-b border-gray-200 lg:px-6 dark:bg-gray-900 dark:border-gray-800">
      <button
        onClick={onMenuClick}
        className="p-2 -ml-2 rounded-lg hover:bg-gray-100 lg:hidden dark:hover:bg-gray-800"
      >
        <Bars3Icon className="w-6 h-6 text-gray-600 dark:text-gray-300" />
      </button>

      <div className="hidden lg:flex lg:flex-1" />

      <div className="flex items-center gap-3">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          {theme === 'dark' ? (
            <SunIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          ) : (
            <MoonIcon className="w-5 h-5 text-gray-500" />
          )}
        </button>
      </div>
    </header>
  );
}