import { useState, useEffect } from 'react';
import { Bars3Icon, SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import { useThemeStore } from '../../stores/useThemeStore';

interface NavbarProps {
  onMenuClick: () => void;
}

function LiveDate() {
  const [date, setDate] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setDate(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 tabular-nums tracking-tight">
      {date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
    </span>
  );
}

function LiveClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 tabular-nums tracking-tight">
      {time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
    </span>
  );
}

export default function Navbar({ onMenuClick }: NavbarProps) {
  const { theme, toggleTheme } = useThemeStore();
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-[72px] px-5 lg:px-8 bg-white/70 dark:bg-[#09090B]/70 backdrop-blur-xl border-b border-gray-200/60 dark:border-white/[0.06]">
      {/* Left */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="flex items-center justify-center w-10 h-10 -ml-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors lg:hidden"
        >
          <Bars3Icon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        <div className="hidden sm:block">
          <p className="text-xs font-medium text-gray-400 dark:text-gray-500 leading-tight">Halo 👋</p>
          <p className="text-base font-bold text-gray-900 dark:text-white tracking-tight">Kasir Kedai Ungu</p>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-1">
        {/* Date & Clock */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-100/80 dark:bg-white/[0.04]">
          <LiveDate />
          <div className="w-px h-4 bg-gray-300 dark:bg-white/[0.12]" />
          <LiveClock />
        </div>

        {/* Theme Toggle */}
        <button
          onClick={() => toggleTheme()}
          className="relative flex items-center justify-center w-10 h-10 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <SunIcon className="w-[18px] h-[18px] text-amber-400" />
          ) : (
            <MoonIcon className="w-[18px] h-[18px] text-gray-600" />
          )}
        </button>

        {/* Status */}
        <div className="flex items-center gap-1.5 ml-1">
          <div className={`w-2 h-2 rounded-full ${online ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-gray-400'}`} />
          <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500 hidden lg:block">
            {online ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>
    </header>
  );
}