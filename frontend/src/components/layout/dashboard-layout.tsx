'use client';

import { Sidebar } from './sidebar';
import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';

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

  // Debug log for sidebar state
  useEffect(() => {
    console.log('Sidebar state changed:', sidebarOpen);
  }, [sidebarOpen]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Mobile menu button - Enhanced visibility and accessibility */}
      {isMounted && (
        <div className="lg:hidden fixed top-4 left-4 z-[60]">
          <button
            onClick={() => {
              console.log('Mobile menu clicked, current state:', sidebarOpen);
              setSidebarOpen(!sidebarOpen);
            }}
            className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-2xl border-2 border-white/20 hover:scale-105 transition-all duration-200 min-h-[50px] min-w-[50px] flex items-center justify-center"
            aria-label="Toggle navigation menu"
          >
            {sidebarOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      )}

      {/* Overlay for mobile - Ensure proper z-index */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
          onClick={() => {
            console.log('Overlay clicked, closing sidebar');
            setSidebarOpen(false);
          }}
          aria-hidden="true"
          style={{ zIndex: 40 }}
        />
      )}

      {/* Sidebar - Pass isMounted prop */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => {
          console.log('Sidebar onClose called');
          setSidebarOpen(false);
        }}
        isMounted={isMounted}
      />

      {/* Main content */}
      <main className="lg:ml-64 min-h-screen transition-all duration-300">
        {/* Top padding for mobile menu button */}
        <div className="pt-16 lg:pt-0">
          <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
