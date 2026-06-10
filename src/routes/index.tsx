import { createBrowserRouter } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import DashboardPage from '../pages/DashboardPage';
import PosPage from '../pages/PosPage';
import ProductsPage from '../pages/ProductsPage';
import IngredientsPage from '../pages/IngredientsPage';
import RecipesPage from '../pages/RecipesPage';
import HistoryPage from '../pages/HistoryPage';
import ReportsPage from '../pages/ReportsPage';
import BackupPage from '../pages/BackupPage';
import SettingsPage from '../pages/SettingsPage';

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <DashboardPage /> },
      { path: '/pos', element: <PosPage /> },
      { path: '/products', element: <ProductsPage /> },
      { path: '/ingredients', element: <IngredientsPage /> },
      { path: '/recipes', element: <RecipesPage /> },
      { path: '/history', element: <HistoryPage /> },
      { path: '/reports', element: <ReportsPage /> },
      { path: '/backup', element: <BackupPage /> },
      { path: '/settings', element: <SettingsPage /> },
    ],
  },
]);