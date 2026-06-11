# Global Dark/Light Theme System Implementation Plan

## Goal
Create a consistent theming system for the entire application that switches between Dark and Light modes, replaces all hard‑coded Tailwind colour utilities with a unified set of utility classes, persists the selected theme in `localStorage` (and optionally IndexedDB), and adds a debug page `/theme-debug`.

## Scope
- Audit every source file for hard‑coded theme tokens (`bg‑white`, `bg‑gray-*`, `bg‑slate-*`, `text‑black`, `text‑white`, `border‑gray-*`, `border‑slate-*`, etc.).
- Replace them with the global token set defined below.
- Add a global Theme Provider (React Context) that stores the current theme (`"light" | "dark"`).
- Provide a toggle component (e.g., a switch in the header) that updates the context and writes the value to `localStorage`.
- On app startup, read the saved theme from `localStorage` and apply it to the `<html>` element (`class="dark"` for dark mode).
- Ensure Tailwind’s `dark:` variant works by adding `dark` class to the root.
- Update the following pages/components to use the new utility classes:
  - Dashboard, POS, Products, Ingredients, Recipes, History, Trash, Activity Log, Reports, Backup, Settings.
  - Sidebar, Header (Navbar), Card components, Product cards, Cart panel.
- Create a new page `ThemeDebugPage` (`/theme-debug`) that displays the current theme, root classes, body classes, and `localStorage` value.
- Document all modified files and any remaining hard‑coded tokens.

## Global Token Set (Tailwind utilities)
| Concept | Light Mode | Dark Mode |
|---------|------------|----------|
| Container background | `bg-white` | `dark:bg-slate-900` |
| Card background | `bg-white` | `dark:bg-slate-800` |
| Primary text | `text-slate-900` | `dark:text-white` |
| Secondary text | `text-slate-600` | `dark:text-slate-400` |
| Border | `border-slate-200` | `dark:border-slate-700` |
| Hover background | `hover:bg-slate-100` | `dark:hover:bg-slate-700` |
| Sidebar background | `bg-white` (light) | `bg-slate-900` (dark) |
| Header background | `bg-white` (light) | `bg-slate-900` (dark) |
| Product card background | `bg-white` (light) | `bg-slate-800` (dark) |
| Cart panel background | `bg-white` (light) | `bg-slate-800` (dark) |

## Technical Steps
1. **Create Theme Context** (`src/context/ThemeContext.tsx`)
```tsx
import React, { createContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'light' | 'dark';
interface ThemeContextProps {
  theme: Theme;
  toggleTheme: () => void;
}
export const ThemeContext = createContext<ThemeContextProps>({
  theme: 'light',
  toggleTheme: () => {},
});

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<Theme>('light');

  // Load saved theme or respect system preference
  useEffect(() => {
    const saved = localStorage.getItem('theme') as Theme | null;
    if (saved) setTheme(saved);
    else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? 'dark' : 'light');
    }
  }, []);

  // Apply theme class to <html> and persist
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
```
2. **Wrap the application** in `ThemeProvider` (edit `src/main.tsx` or entry point):
```tsx
import { createRoot } from 'react-dom/client';
import App from './App';
import { ThemeProvider } from './context/ThemeContext';

const container = document.getElementById('root')!;
const root = createRoot(container);
root.render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
```
3. **Add ThemeToggle UI** inside `src/components/layout/Navbar.tsx` (or any header component). Example using a simple button:
```tsx
import { useContext } from 'react';
import { ThemeContext } from '../../context/ThemeContext';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useContext(ThemeContext);
  return (
    <button onClick={toggleTheme} className="p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700">
      {theme === 'dark' ? <SunIcon className="w-5 h-5"/> : <MoonIcon className="w-5 h-5"/>}
    </button>
  );
}
```
Place `<ThemeToggle />` next to the user avatar in the Navbar.
4. **Audit & Replace Tokens**
   - Use a script (`grep` or IDE search) to find all occurrences of the hard‑coded classes listed in the requirements.
   - Replace each with the corresponding utilities from the Global Token Set. Example:
```tsx
<div className="bg-white border-gray-200 text-black hover:bg-gray-100">
```
   becomes
```tsx
<div className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700">
```
5. **Update Specific Components**
   - **Sidebar (`src/components/layout/Sidebar.tsx`)**: root div `className="bg-white dark:bg-slate-900"`.
   - **Header (`src/components/layout/Navbar.tsx`)**: root div `className="bg-white dark:bg-slate-900"`.
   - **Pages** (`DashboardPage.tsx`, `PosPage.tsx`, `ProductsPage.tsx`, `IngredientsPage.tsx`, `RecipesPage.tsx`, `HistoryPage.tsx`, `TrashPage.tsx`, `AuditLogPage.tsx`, `ReportsPage.tsx`, `BackupPage.tsx`, `SettingsPage.tsx`):
     - Ensure outer containers use `bg-white dark:bg-slate-900`.
     - Card/panel elements use `bg-white dark:bg-slate-800`.
     - Text classes use `text-slate-900 dark:text-white` or `text-slate-600 dark:text-slate-400`.
     - Borders use `border-slate-200 dark:border-slate-700`.
     - Hover states use `hover:bg-slate-100 dark:hover:bg-slate-700`.
6. **Create Debug Page** (`src/pages/ThemeDebugPage.tsx`)
```tsx
import { useContext } from 'react';
import { ThemeContext } from '../context/ThemeContext';

export default function ThemeDebugPage() {
  const { theme } = useContext(ThemeContext);
  const rootClasses = document.documentElement.className;
  const bodyClasses = document.body.className;
  const storage = localStorage.getItem('theme');
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Theme Debug</h1>
      <pre className="bg-gray-100 dark:bg-slate-800 p-4 rounded whitespace-pre-wrap">
{`Current Theme: ${theme}\nRoot Classes: ${rootClasses}\nBody Classes: ${bodyClasses}\nLocalStorage Theme: ${storage}`}
      </pre>
    </div>
  );
}
```
   - Register the route in `src/routes/index.tsx`:
```tsx
{ path: '/theme-debug', element: <ThemeDebugPage /> },
```
7. **Persist Theme** – already handled by `ThemeProvider` using `localStorage`.
8. **Testing / Verification**
   - Run `npm run dev` and toggle the theme via the new switch. Verify all listed pages reflect the correct colours (container, cards, text, borders, hover).
   - Reload the page; the previously selected theme should be automatically applied.
   - Visit `/theme-debug` to confirm the `<html>` element has the `dark` class when dark mode is active and that `localStorage` contains the correct value.
9. **Documentation** – After implementation, produce a short report containing:
   - List of files modified.
   - Components fully updated to use the new token set.
   - Any remaining hard‑coded colour utilities (if any) for future cleanup.
   - Summary of the audit (total occurrences replaced).

## Open Questions (User Review Required)
- **Placement of the ThemeToggle button** – keep it in the Navbar next to the avatar, or add a dedicated entry in the Settings page?
- **Optional IndexedDB storage** – do you want the theme also saved in IndexedDB for offline‑first scenarios, or is `localStorage` sufficient?

## Verification Plan
- **Visual inspection** of each page after toggling.
- **Persistence check** after page refresh.
- **Debug page** confirms classes and storage.
- **Final grep** to ensure no `bg-white`, `bg-gray-`, `text-black`, etc., remain.

---
*Please review this plan and approve or suggest adjustments.*
