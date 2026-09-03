 'use client';

import Image from 'next/image';
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
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/client-only';
import { api } from '@/lib/api';
import { useEffect } from 'react';

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

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    api.clearToken();
    router.push('/login');
  };

  const handleItemClick = () => {
    // Close sidebar on mobile when item is clicked
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      onClose?.();
    }
  };

  // Close sidebar on route change for mobile
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      onClose?.();
    }
  }, [pathname, onClose]);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (isOpen && typeof window !== 'undefined' && window.innerWidth < 1024) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:fixed lg:left-0 lg:top-0 lg:h-screen lg:w-64 xl:w-72 lg:flex lg:flex-col bg-white/80 backdrop-blur-sm border-r border-gray-200/50 z-50 shadow-lg overflow-y-auto">
        <div className="p-4 xl:p-6 border-b border-gray-200/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 xl:w-10 xl:h-10 rounded-lg overflow-hidden flex items-center justify-center shadow-lg bg-white flex-shrink-0">
              <Image
                src="/sentinel-logo.png"
                alt="Sentinel Logo"
                width={40}
                height={40}
                className="object-cover"
                onError={() => { /* Next/Image doesn't expose onError in SSR; fallback handled below */ }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="font-bold text-xs xl:text-sm tracking-wide text-gray-900 truncate">RAZORPAY SENTINEL</h1>
              <p className="text-xs text-gray-600 hidden xl:block truncate">Security Intelligence</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 xl:p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleItemClick}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group',
                  isActive 
                    ? 'bg-blue-50 text-blue-600 border border-blue-200 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/50 hover:shadow-sm'
                )}
                title={item.label}
              >
                <Icon icon={item.icon} className="w-4 h-4 flex-shrink-0" fallbackClassName="w-4 h-4 bg-gray-500 rounded flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 xl:p-4 border-t border-gray-200/50 space-y-3 flex-shrink-0">
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Icon 
              icon={Radio} 
              className="w-3 h-3 text-emerald-400 animate-pulse flex-shrink-0" 
              fallbackClassName="w-3 h-3 bg-emerald-500 rounded flex-shrink-0"
            />
            <span className="text-emerald-400 font-medium">LIVE</span>
            <span className="hidden xl:inline truncate">· All systems operational</span>
          </div>
          
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200 border border-red-200/50 hover:border-red-300 hover:shadow-sm"
          >
            <Icon icon={LogOut} className="w-4 h-4 flex-shrink-0" fallbackClassName="w-4 h-4 bg-red-500 rounded flex-shrink-0" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile sidebar */}
      <aside 
        className={cn(
          "lg:hidden fixed left-0 top-0 h-screen w-72 xxs:w-80 max-w-[85vw] bg-white/95 backdrop-blur-md border-r border-gray-200/50 z-50 shadow-2xl overflow-y-auto transition-all duration-300 mobile-safe-area",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
        aria-hidden={!isOpen}
      >
        {/* Mobile header */}
        <div className="flex items-center justify-between card-responsive-padding border-b border-gray-200/50 flex-shrink-0">
          <div className="flex items-center gap-2 xxs:gap-3 min-w-0 flex-1">
            <div className="w-8 h-8 xxs:w-10 xxs:h-10 rounded-lg overflow-hidden flex items-center justify-center shadow-lg bg-white flex-shrink-0">
              <Image
                src="/sentinel-logo.png"
                alt="Sentinel Logo"
                width={40}
                height={40}
                className="object-cover"
                onError={() => { /* Next/Image doesn't expose onError in SSR; fallback handled below */ }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="font-bold text-responsive-xs tracking-wide text-gray-900 truncate">RAZORPAY SENTINEL</h1>
              <p className="text-responsive-micro text-gray-600 truncate">Security Intelligence</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="card-responsive-padding-sm hover:bg-gray-100 rounded-lg transition-colors duration-200 flex-shrink-0 ml-2 touch-target"
            aria-label="Close navigation menu"
          >
            <Icon icon={X} className="icon-responsive-sm text-gray-600" fallbackClassName="icon-responsive-sm bg-gray-500 rounded" />
          </button>
        </div>

        <nav className="flex-1 card-responsive-padding space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleItemClick}
                className={cn(
                  'flex items-center gap-2 xxs:gap-3 card-responsive-padding-sm rounded-lg text-responsive-xs font-medium transition-all duration-200 group touch-target',
                  isActive 
                    ? 'bg-blue-50 text-blue-600 border border-blue-200 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/50 hover:shadow-sm active:bg-gray-100'
                )}
              >
                <Icon icon={item.icon} className="icon-responsive flex-shrink-0" fallbackClassName="icon-responsive bg-gray-500 rounded flex-shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="card-responsive-padding border-t border-gray-200/50 space-y-2 xxs:space-y-3 flex-shrink-0">
          <div className="flex items-center gap-1 xxs:gap-2 text-responsive-micro text-gray-600">
            <Icon 
              icon={Radio} 
              className="w-2 h-2 xxs:w-3 xxs:h-3 text-emerald-400 animate-pulse flex-shrink-0" 
              fallbackClassName="w-2 h-2 xxs:w-3 xxs:h-3 bg-emerald-500 rounded flex-shrink-0"
            />
            <span className="text-emerald-400 font-medium">LIVE</span>
            <span className="truncate">· All systems operational</span>
          </div>
          
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 xxs:gap-3 card-responsive-padding-sm text-responsive-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200 border border-red-200/50 hover:border-red-300 hover:shadow-sm active:bg-red-100 touch-target"
          >
            <Icon icon={LogOut} className="icon-responsive-sm flex-shrink-0" fallbackClassName="icon-responsive-sm bg-red-500 rounded flex-shrink-0" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
