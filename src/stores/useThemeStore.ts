import { create } from 'zustand';
import { db } from '../database';

interface ThemeState {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  loadTheme: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'light',

  toggleTheme: async () => {
    const newTheme = get().theme === 'light' ? 'dark' : 'light';
    set({ theme: newTheme });
    const settings = await db.settings.toArray();
    if (settings[0]?.id !== undefined) {
      await db.settings.update(settings[0].id, { theme: newTheme });
    }
  },

  loadTheme: async () => {
    const settings = await db.settings.toArray();
    const savedTheme = settings[0]?.theme ?? 'light';
    set({ theme: savedTheme });
  },
}));