'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  suffix?: string;
  icon?: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  variant?: 'default' | 'danger' | 'success' | 'warning';
  delay?: number;
}

export function MetricCard({
  label,
  value,
  suffix,
  icon: Icon,
  variant = 'default',
  delay = 0,
}: MetricCardProps) {
  const cardColors = {
    default: 'bg-white/80 backdrop-blur-sm border-gray-200',
    danger: 'bg-white/80 backdrop-blur-sm border-red-200',
    success: 'bg-white/80 backdrop-blur-sm border-green-200',
    warning: 'bg-white/80 backdrop-blur-sm border-yellow-200',
  }[variant];

  const valueColors = {
    default: 'text-gray-900',
    danger: 'text-red-600',
    success: 'text-green-600',
    warning: 'text-yellow-600',
  }[variant];

  const iconColors = {
    default: 'text-blue-600 bg-blue-50',
    danger: 'text-red-600 bg-red-50',
    success: 'text-green-600 bg-green-50',
    warning: 'text-yellow-600 bg-yellow-50',
  }[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className={cn(
        'card-responsive-padding-sm rounded-lg sm:rounded-xl border-2 shadow-sm hover:shadow-lg transition-all duration-200',
        cardColors
      )}
    >
      <div className="flex items-start justify-between gap-2 xxs:gap-2 sm:gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-responsive-micro font-medium text-gray-600 mb-1 xxs:mb-1 sm:mb-2 truncate">{label}</p>
          <div className={cn('font-bold tracking-tight', valueColors)}>
            <span className="text-responsive-lg xxs:text-responsive-xl lg:text-responsive-2xl xl:text-responsive-3xl">
              {value}
            </span>
            {suffix && <span className="text-responsive-xs xxs:text-responsive-sm lg:text-responsive-lg ml-1">{suffix}</span>}
          </div>
        </div>
        {Icon && (
          <div className={cn('card-responsive-padding-sm rounded-lg flex-shrink-0', iconColors)}>
            <Icon className="icon-responsive" />
          </div>
        )}
      </div>
    </motion.div>
  );
}
