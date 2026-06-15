import { motion } from 'framer-motion';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import { useThemeStore } from '../../stores/useThemeStore';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <button
      onClick={() => toggleTheme()}
      className="relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors duration-200"
      aria-label="Toggle theme"
    >
      <motion.div
        key={theme}
        initial={{ scale: 0.5, rotate: -90, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        {theme === 'dark' ? (
          <SunIcon className="w-5 h-5 text-amber-400" />
        ) : (
          <MoonIcon className="w-5 h-5 text-slate-600" />
        )}
      </motion.div>
    </button>
  );
}
