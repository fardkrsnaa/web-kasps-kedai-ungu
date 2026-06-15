import { useEffect, useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import { initializeDatabase } from './database';
import { useThemeStore } from './stores/useThemeStore';
import AnnouncementPopup from './components/ui/AnnouncementPopup';


export default function App() {
  const { theme, loadTheme } = useThemeStore();
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize database BEFORE app is usable.
    // This blocks rendering of all routes until migration is complete.
    initializeDatabase()
      .then(() => {
        setDbReady(true);
        console.log('[App] Database initialized successfully');
      })
      .catch((err) => {
        console.error('[App] Database initialization failed:', err);
        setDbError(err.message || 'Gagal menginisialisasi database');
      });

    loadTheme().catch(console.error);
  }, [loadTheme]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // Block rendering until database is ready
  if (!dbReady) {
    if (dbError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
          <div className="max-w-md p-6 bg-white dark:bg-slate-800 rounded-xl shadow-lg text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center mx-auto mb-4">
              <span className="text-red-600 dark:text-red-400 text-xl">⚠</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              Database Error
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              {dbError}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
            >
              Muat Ulang
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Menginisialisasi database...
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <AnnouncementPopup />
      <RouterProvider router={router} />
    </>
  );
}