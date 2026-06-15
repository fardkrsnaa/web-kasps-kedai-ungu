import { create } from 'zustand';
import { db } from '../database';

interface ThemeState {
  theme: 'light' | 'dark';
  toggleTheme: () => Promise<void>;
  loadTheme: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  // Initialize: always default to 'light'. User must manually toggle to dark.
  theme: (() => {
    if (typeof window === 'undefined') return 'light';
    const saved = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (saved) return saved;
    return 'light'; // Always default to light, ignore system preference
  })(),

  toggleTheme: async () => {
    const newTheme = get().theme === 'light' ? 'dark' : 'light';
    set({ theme: newTheme });

    // Apply dark class to HTML element
    const root = document.documentElement;
    if (newTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Save to localStorage for fast initial load
    localStorage.setItem('theme', newTheme);

    // Save to IndexedDB for persistence
    try {
      const settings = await db.settings.toArray();
      if (settings[0]?.id !== undefined) {
        await db.settings.update(settings[0].id, { theme: newTheme });
      }
    } catch (e) {
      console.warn('[Theme] Failed to save to IndexedDB:', e);
    }
  },

  loadTheme: async () => {
    // Priority: localStorage > IndexedDB > system preference
    const localTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;

    let savedTheme: 'light' | 'dark';
    if (localTheme) {
      savedTheme = localTheme;
    } else {
      try {
        const settings = await db.settings.toArray();
        savedTheme = settings[0]?.theme as 'light' | 'dark' ?? 'light';
      } catch {
        savedTheme = 'light'; // Default light, ignore system preference
      }
    }

    set({ theme: savedTheme });

    // Apply dark class to HTML element
    const root = document.documentElement;
    if (savedTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Sync localStorage
    localStorage.setItem('theme', savedTheme);
  },
}));