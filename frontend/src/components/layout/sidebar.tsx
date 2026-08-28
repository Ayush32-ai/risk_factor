'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Shield,
  LayoutDashboard,
  Swords,
  Network,
  Search,
  Eye,
  FlaskConical,
  ScrollText,
  Radio,
  TrendingUp,
  RotateCcw,
  CreditCard,
  LogOut,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/client-only';
import { api } from '@/lib/api';

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

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    api.clearToken();
    router.push('/login');
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-sentinel-surface border-r border-sentinel-border flex flex-col z-50">
      <div className="p-6 border-b border-sentinel-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Icon icon={Shield} className="w-5 h-5 text-blue-400" fallbackClassName="w-5 h-5 bg-blue-500 rounded" />
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-wide">RAZORPAY SENTINEL</h1>
            <p className="text-xs text-sentinel-muted">Security Intelligence</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'sentinel-nav-item',
                isActive ? 'sentinel-nav-active' : 'sentinel-nav-inactive'
              )}
            >
              <Icon icon={item.icon} className="w-4 h-4" fallbackClassName="w-4 h-4 bg-gray-500 rounded" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sentinel-border space-y-3">
        <div className="flex items-center gap-2 text-xs text-sentinel-muted">
          <Icon 
            icon={Radio} 
            className="w-3 h-3 text-emerald-400 animate-pulse" 
            fallbackClassName="w-3 h-3 bg-emerald-500 rounded"
          />
          <span className="text-emerald-400 font-medium">LIVE</span>
          <span>· All systems operational</span>
        </div>
        
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors border border-red-500/20 hover:border-red-500/30"
        >
          <Icon icon={LogOut} className="w-4 h-4" fallbackClassName="w-4 h-4 bg-red-500 rounded" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
