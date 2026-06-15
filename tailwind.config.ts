import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
          950: '#2e1065',
        },
        success: {
          50: '#f0fdf4',
          400: '#4ade80',
          500: '#22C55E',
          600: '#16a34a',
        },
        warning: {
          50: '#fffbeb',
          400: '#fbbf24',
          500: '#F59E0B',
          600: '#d97706',
        },
        danger: {
          50: '#fef2f2',
          400: '#f87171',
          500: '#EF4444',
          600: '#dc2626',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '20px',
      },
    },
  },
  plugins: [],
} satisfies Config;
