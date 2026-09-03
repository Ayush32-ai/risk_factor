'use client';

import { Sidebar } from './sidebar';
import { MobileSidebar } from './mobile-sidebar';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Swords,
  Network,
  Search,
  Eye,
  FlaskConical,
  ScrollText,
  TrendingUp,
  RotateCcw,
  CreditCard,
  BarChart3,
} from 'lucide-react';

const navItems = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/attacks', label: 'Attack Simulator', icon: Swords },
  { href: '/graph', label: 'Transaction Graph', icon: Network },
  { href: '/investigate', label: 'AI Investigation', icon: Search },
  { href: '/blind-spots', label: 'Blind Spots', icon: Eye },
  { href: '/defense', label: 'Defense Lab', icon: FlaskConical },
  { href: '/fraud-spikes', label: 'Fraud Spikes', icon: TrendingUp },
  { href: '/return-risk', label: 'Return Risk', icon: RotateCcw },
  { href: '/chargebacks', label: 'Chargebacks', icon: CreditCard },
  { href: '/ml-evaluation', label: 'Model Evaluation', icon: BarChart3 },
  { href: '/audit', label: 'Audit & Security', icon: ScrollText },
];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Desktop Sidebar */}
      <Sidebar isOpen={false} onClose={() => {}} />

      {/* Mobile Sidebar */}
      {mounted && <MobileSidebar navItems={navItems} />}

      {/* Main content */}
      <main className="lg:ml-64 min-h-screen">
        <div className="pt-16 lg:pt-0 px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </div>
      </main>
    </div>
  );
}