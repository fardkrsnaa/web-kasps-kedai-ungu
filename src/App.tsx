import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import { initializeDatabase } from './database';
import { useThemeStore } from './stores/useThemeStore';

export default function App() {
  const { theme, loadTheme } = useThemeStore();

  useEffect(() => {
    initializeDatabase().catch(console.error);
    loadTheme().catch(console.error);
  }, [loadTheme]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return <RouterProvider router={router} />;
}