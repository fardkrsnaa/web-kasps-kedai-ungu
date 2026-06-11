import { create } from 'zustand';
import { db } from '../database';

interface ThemeState {
  theme: 'light' | 'dark';
  toggleTheme: () => Promise<void>;
  loadTheme: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'light',

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
    const settings = await db.settings.toArray();
    if (settings[0]?.id !== undefined) {
      await db.settings.update(settings[0].id, { theme: newTheme });
    }
  },

  loadTheme: async () => {
    // Try localStorage first for instant load
    const localTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    
    // Then load from IndexedDB
    const settings = await db.settings.toArray();
    const savedTheme = settings[0]?.theme ?? localTheme ?? 'light';
    
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