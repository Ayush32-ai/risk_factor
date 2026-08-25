'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ProgressBarProps {
  value: number;
  max?: number;
  variant?: 'default' | 'danger' | 'success';
  label?: string;
  showValue?: boolean;
}

export function ProgressBar({
  value,
  max = 100,
  variant = 'default',
  label,
  showValue = true,
}: ProgressBarProps) {
  const pct = Math.min(100, (value / max) * 100);

  const barColor = {
    default: 'bg-blue-500',
    danger: 'bg-red-500',
    success: 'bg-emerald-500',
  }[variant];

  return (
    <div className="space-y-2">
      {(label || showValue) && (
        <div className="flex justify-between text-sm">
          {label && <span className="text-sentinel-muted">{label}</span>}
          {showValue && <span className="font-mono font-medium">{value.toFixed(1)}%</span>}
        </div>
      )}
      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className={cn('h-full rounded-full', barColor)}
        />
      </div>
    </div>
  );
}
