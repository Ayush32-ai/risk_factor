'use client';

import { Sidebar } from './sidebar';
import { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar when screen becomes large
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Mobile menu button - Only visible on small screens */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-3 bg-white shadow-lg rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
        aria-label="Open menu"
      >
        <Menu className="w-6 h-6 text-gray-600" />
      </button>

      {/* Backdrop overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
      />

      {/* Main content */}
      <main className="lg:ml-64 min-h-screen">
        {/* Add top padding on mobile to account for menu button */}
        <div className="pt-16 lg:pt-0 px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </div>
      </main>
    </div>
  );
}
