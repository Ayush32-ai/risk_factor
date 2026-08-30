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
    default: 'bg-white border-gray-200',
    danger: 'bg-white border-red-200',
    success: 'bg-white border-green-200',
    warning: 'bg-white border-yellow-200',
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
      className={cn('p-6 rounded-xl border shadow-sm hover:shadow-md transition-all', cardColors)}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-2">{label}</p>
          <p className={cn('text-2xl font-bold tracking-tight', valueColors)}>
            {value}
            {suffix && <span className="text-lg ml-1">{suffix}</span>}
          </p>
        </div>
        {Icon && (
          <div className={cn('p-3 rounded-lg', iconColors)}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </motion.div>
  );
}
