import { createBrowserRouter } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import DashboardPage from '../pages/DashboardPage';
import PosPage from '../pages/PosPage';
import ProductsPage from '../pages/ProductsPage';
import IngredientsPage from '../pages/IngredientsPage';
import HistoryPage from '../pages/HistoryPage';
import AuditLogPage from '../pages/AuditLogPage';
import TrashPage from '../pages/TrashPage';
import ReportsPage from '../pages/ReportsPage';
import BackupPage from '../pages/BackupPage';
import SettingsPage from '../pages/SettingsPage';
import QueuePage from '../pages/QueuePage';
import ThemeDebugPage from '../pages/ThemeDebugPage';

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <DashboardPage /> },
      { path: '/pos', element: <PosPage /> },
      { path: '/products', element: <ProductsPage /> },
      { path: '/ingredients', element: <IngredientsPage /> },
      { path: '/queue', element: <QueuePage /> },
      { path: '/history', element: <HistoryPage /> },
      { path: '/audit-log', element: <AuditLogPage /> },
      { path: '/trash', element: <TrashPage /> },
      { path: '/reports', element: <ReportsPage /> },
      { path: '/backup', element: <BackupPage /> },
      { path: '/settings', element: <SettingsPage /> },
      { path: '/theme-debug', element: <ThemeDebugPage /> },
    ],
  },
]);
