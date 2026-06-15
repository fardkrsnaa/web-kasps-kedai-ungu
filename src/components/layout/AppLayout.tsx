import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8FAFC] dark:bg-[#09090B]">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-col flex-1 min-w-0">
        <Navbar onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="mx-auto max-w-[1600px]">
            <Outlet />
          </div>
        </main>
      </div>

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            borderRadius: '16px',
            padding: '12px 16px',
            fontSize: '14px',
            fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
            background: '#111827',
            color: '#f1f5f9',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 10px 40px -10px rgba(0,0,0,0.3)',
          },
          success: {
            iconTheme: {
              primary: '#8B5CF6',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#EF4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </div>
  );
}