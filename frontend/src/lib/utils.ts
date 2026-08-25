export function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(' ');
}

export function formatNumber(n: number): string {
  if (typeof n !== 'number' || isNaN(n)) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString('en-IN');
}

export function formatCurrency(n: number): string {
  if (typeof n !== 'number' || isNaN(n)) return '₹0';
  if (n >= 10_000_00) return `₹${(n / 10_000_00).toFixed(1)}Cr`;
  if (n >= 10_000) return `₹${(n / 10_000).toFixed(1)}L`;
  return `₹${n.toLocaleString('en-IN')}`;
}

export function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  } catch {
    return '--:--';
  }
}

export function getRiskColor(score: number): string {
  if (score >= 80) return 'text-red-400';
  if (score >= 60) return 'text-orange-400';
  if (score >= 40) return 'text-yellow-400';
  return 'text-emerald-400';
}

export function getSeverityBadge(severity: string): string {
  switch (severity) {
    case 'critical': return 'sentinel-badge-critical';
    case 'high': return 'sentinel-badge-high';
    default: return 'sentinel-badge-success';
  }
}
