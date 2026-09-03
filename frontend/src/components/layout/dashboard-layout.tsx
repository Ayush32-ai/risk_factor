'use client';

import { Sidebar } from './sidebar';
import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { Icon } from '@/components/client-only';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Close sidebar when clicking outside or on route change
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
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-2 left-2 xxs:top-3 xxs:left-3 sm:top-4 sm:left-4 z-50 mobile-safe-area">
        <button
          onClick={() => setSidebarOpen(true)}
          className="card-responsive-padding-sm bg-white/90 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200/50 hover:bg-white transition-all duration-200 active:scale-95 touch-target"
          aria-label="Open navigation menu"
        >
          <Icon icon={Menu} className="icon-responsive-sm text-gray-700" fallbackClassName="icon-responsive-sm bg-gray-500 rounded" />
        </button>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content */}
      <main className="lg:ml-64 min-h-screen transition-all duration-300">
        {/* Top padding for mobile menu button */}
        <div className="pt-12 xxs:pt-14 sm:pt-16 lg:pt-0">
          <div className="card-responsive-padding">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
