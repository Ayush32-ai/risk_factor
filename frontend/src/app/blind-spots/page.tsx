'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Eye, ArrowRight, FlaskConical, RefreshCw, AlertCircle, Target, Shield } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { AuthGuard } from '@/components/auth-guard';
import { MetricCard } from '@/components/ui/metric-card';
import { ProgressBar } from '@/components/ui/progress-bar';
import { api } from '@/lib/api';
import { formatCurrency, getSeverityBadge } from '@/lib/utils';

export default function BlindSpotsPage() {
  const router = useRouter();

  useEffect(() => {
    if (!api.getToken()) router.push('/login');
  }, [router]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['blind-spots'],
    queryFn: () => api.getBlindSpots(),
    enabled: !!api.getToken(),
  });

  const spots = data?.blindSpots ?? [];
  const totalSpots = spots.length;
  const criticalSpots = spots.filter((spot: any) => spot.severity === 'critical').length;
  const averageDetectionRate = spots.reduce((sum: number, spot: any) => sum + Number(spot.detectionRate), 0) / Math.max(spots.length, 1);
  const totalExposure = spots.reduce((sum: number, spot: any) => sum + Number(spot.potentialExposure), 0);

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="razorpay-page">
          {/* Header */}
          <div className="razorpay-header">
            <div className="p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-3xl font-bold razorpay-gradient-text">
                    Discovered Blind Spots
                  </h1>
                  <p className="text-gray-600 mt-1">Detection gaps found by the AI red-team engine</p>
                </div>
                <button
                  onClick={() => refetch()}
                  className="razorpay-button-primary"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Refresh</span>
                </button>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-8">
            {/* Summary Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricCard
                label="Total Blind Spots"
                value={totalSpots.toString()}
                icon={Eye}
                delay={0}
              />
              <MetricCard
                label="Critical Vulnerabilities"
                value={criticalSpots.toString()}
                icon={AlertCircle}
                variant="danger"
                delay={0.1}
              />
              <MetricCard
                label="Avg Detection Rate"
                value={averageDetectionRate.toFixed(1)}
                suffix="%"
                icon={Target}
                variant="warning"
                delay={0.2}
              />
              <MetricCard
                label="Potential Exposure"
                value={`₹${(totalExposure / 1000).toFixed(0)}K`}
                icon={Shield}
                variant="danger"
                delay={0.3}
              />
            </div>

            {isLoading ? (
              <div className="razorpay-card text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-6"></div>
                <p className="text-gray-600 text-lg">Scanning for blind spots...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {spots.map((spot: any, i: number) => (
                  <motion.div
                    key={String(spot.id)}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="razorpay-card p-6"
                  >
                    <div className="flex items-start justify-between mb-6">
                      <div>
                        <span className={`${
                          spot.severity === 'critical' 
                            ? 'razorpay-badge-danger'
                            : spot.severity === 'high'
                            ? 'razorpay-badge-warning'
                            : 'razorpay-badge-success'
                        }`}>
                          {String(spot.severity).toUpperCase()}
                        </span>
                        <h2 className="text-xl font-bold text-gray-900 mt-3">{String(spot.title)}</h2>
                      </div>
                      <div className="text-right bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-red-200 rounded-xl p-4">
                        <p className="text-sm font-semibold text-gray-700 mb-1">Detection Rate</p>
                        <p className="text-3xl font-bold text-red-500">
                          {Number(spot.detectionRate).toFixed(0)}%
                        </p>
                      </div>
                    </div>

                    <div className="mb-6">
                      <ProgressBar
                        value={Number(spot.detectionRate)}
                        variant="danger"
                        showValue={false}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div className="razorpay-card bg-white/90 p-4">
                        <p className="text-sm font-semibold text-gray-700 mb-2">Potential Exposure</p>
                        <p className="text-lg font-bold text-red-500">
                          {formatCurrency(Number(spot.potentialExposure))} simulated
                        </p>
                      </div>
                      <div className="razorpay-card bg-white/90 p-4">
                        <p className="text-sm font-semibold text-gray-700 mb-2">Root Cause</p>
                        <p className="text-sm text-gray-700">{String(spot.rootCause)}</p>
                      </div>
                    </div>

                    <div className="mb-6 p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="razorpay-icon-primary p-1">
                          <Target className="w-4 h-4 text-white" />
                        </div>
                        <p className="font-semibold text-blue-700">AI Recommendation</p>
                      </div>
                      <p className="text-sm text-blue-700">{String(spot.aiRecommendation)}</p>
                    </div>

                    <div className="flex justify-end">
                      <Link
                        href="/defense"
                        className="razorpay-button-secondary"
                      >
                        <FlaskConical className="w-4 h-4" />
                        <span>Simulate Defense</span>
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </motion.div>
                ))}
                
                {spots.length === 0 && (
                  <div className="razorpay-card text-center py-12">
                    <Shield className="w-16 h-16 text-emerald-400 mx-auto mb-6" />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No Blind Spots Detected</h3>
                    <p className="text-gray-600">Your security posture is looking strong!</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
