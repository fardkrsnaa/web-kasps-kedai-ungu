import { useThemeStore } from '../stores/useThemeStore';

export default function ThemeDebugPage() {
  const { theme } = useThemeStore();
  const rootClasses = document.documentElement.className;
  const bodyClasses = document.body.className;
  const localStorageTheme = localStorage.getItem('theme');

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Theme Debug</h1>
      
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">Current Theme:</h2>
          <p className="text-lg font-mono text-primary-600 dark:text-primary-400">{theme}</p>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">Root Classes:</h2>
          <pre className="bg-slate-50 dark:bg-slate-900 p-3 rounded text-xs font-mono text-slate-900 dark:text-white overflow-x-auto">
            {rootClasses || '(empty)'}
          </pre>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">Body Classes:</h2>
          <pre className="bg-slate-50 dark:bg-slate-900 p-3 rounded text-xs font-mono text-slate-900 dark:text-white overflow-x-auto">
            {bodyClasses || '(empty)'}
          </pre>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">LocalStorage Theme:</h2>
          <pre className="bg-slate-50 dark:bg-slate-900 p-3 rounded text-xs font-mono text-slate-900 dark:text-white overflow-x-auto">
            {localStorageTheme || '(not set)'}
          </pre>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Theme Preview</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Container</p>
            <div className="h-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded flex items-center justify-center text-xs text-slate-900 dark:text-white">
              Container
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Card</p>
            <div className="h-20 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded flex items-center justify-center text-xs text-slate-900 dark:text-white">
              Card
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Primary Text</p>
            <div className="h-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded flex items-center justify-center">
              <span className="text-slate-900 dark:text-white">Primary Text</span>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Secondary Text</p>
            <div className="h-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded flex items-center justify-center">
              <span className="text-slate-600 dark:text-slate-400">Secondary Text</span>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Hover State</p>
            <div className="h-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer text-xs text-slate-900 dark:text-white">
              Hover Me
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Border</p>
            <div className="h-20 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded flex items-center justify-center text-xs text-slate-900 dark:text-white">
              Border
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
