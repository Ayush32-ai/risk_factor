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
  const valueColor = {
    default: 'text-white',
    danger: 'text-red-400',
    success: 'text-emerald-400',
    warning: 'text-amber-400',
  }[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="sentinel-card group hover:border-blue-500/30 transition-colors"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="sentinel-label mb-2">{label}</p>
          <p className={cn('sentinel-metric', valueColor)}>
            {value}
            {suffix && <span className="text-lg ml-1">{suffix}</span>}
          </p>
        </div>
        {Icon && (
          <div className="p-2 rounded-lg bg-white/5 group-hover:bg-blue-500/10 transition-colors">
            <Icon className="w-5 h-5 text-sentinel-muted group-hover:text-blue-400 transition-colors" />
          </div>
        )}
      </div>
    </motion.div>
  );
}
