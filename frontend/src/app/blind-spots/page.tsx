'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Eye, ArrowRight, FlaskConical } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { ProgressBar } from '@/components/ui/progress-bar';
import { api } from '@/lib/api';
import { formatCurrency, getSeverityBadge } from '@/lib/utils';
import { Icon } from '@/components/client-only';

export default function BlindSpotsPage() {
  const router = useRouter();

  useEffect(() => {
    if (!api.getToken()) router.push('/login');
  }, [router]);

  const { data, isLoading } = useQuery({
    queryKey: ['blind-spots'],
    queryFn: () => api.getBlindSpots(),
    enabled: !!api.getToken(),
  });

  const spots = data?.blindSpots ?? [];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <div className="flex items-center gap-3">
            <Icon icon={Eye} className="w-6 h-6 text-orange-400" fallbackClassName="w-6 h-6 bg-orange-500 rounded" />
            <h1 className="text-2xl font-bold">Discovered Blind Spots</h1>
          </div>
          <p className="text-sentinel-muted mt-1">Detection gaps found by the AI red-team engine</p>
        </div>

        {isLoading ? (
          <div className="sentinel-card text-sentinel-muted">Scanning for blind spots...</div>
        ) : (
          <div className="space-y-6">
            {spots.map((spot, i) => (
              <motion.div
                key={String(spot.id)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`sentinel-card ${
                  spot.severity === 'critical' ? 'border-red-500/30' : 'border-orange-500/20'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <span className={getSeverityBadge(String(spot.severity))}>
                      {String(spot.severity).toUpperCase()}
                    </span>
                    <h2 className="text-xl font-bold mt-3">{String(spot.title)}</h2>
                  </div>
                  <div className="text-right">
                    <p className="sentinel-label">Detection Rate</p>
                    <p className="text-3xl font-bold font-mono text-red-400">
                      {Number(spot.detectionRate).toFixed(0)}%
                    </p>
                  </div>
                </div>

                <ProgressBar
                  value={Number(spot.detectionRate)}
                  variant="danger"
                  showValue={false}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  <div>
                    <p className="sentinel-label mb-1">Potential Exposure</p>
                    <p className="text-lg font-semibold text-red-400">
                      {formatCurrency(Number(spot.potentialExposure))} simulated
                    </p>
                  </div>
                  <div>
                    <p className="sentinel-label mb-1">Root Cause</p>
                    <p className="text-sm text-white/80">{String(spot.rootCause)}</p>
                  </div>
                </div>

                <div className="mt-4 p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
                  <p className="sentinel-label mb-1">AI Recommendation</p>
                  <p className="text-sm text-blue-300">{String(spot.aiRecommendation)}</p>
                </div>

                <div className="mt-4 flex justify-end">
                  <Link
                    href="/defense"
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors"
                  >
                    <Icon icon={FlaskConical} className="w-4 h-4" fallbackClassName="w-4 h-4 bg-white rounded" />
                    Simulate Defense
                    <Icon icon={ArrowRight} className="w-4 h-4" fallbackClassName="w-4 h-4 bg-white rounded" />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
