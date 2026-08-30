'use client';

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Activity,
  Shield,
  AlertTriangle,
  Target,
  Ban,
  Radio,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { AuthGuard } from '@/components/auth-guard';
import { MetricCard } from '@/components/ui/metric-card';
import { useWebSocket } from '@/hooks/use-websocket';
import { api } from '@/lib/api';
import { formatNumber, formatTime } from '@/lib/utils';

const chartData = [
  { time: '00:00', risk: 12, blocked: 145 },
  { time: '04:00', risk: 8, blocked: 98 },
  { time: '08:00', risk: 45, blocked: 312 },
  { time: '12:00', risk: 67, blocked: 489 },
  { time: '16:00', risk: 34, blocked: 267 },
  { time: '20:00', risk: 89, blocked: 534 },
  { time: 'Now', risk: 56, blocked: 401 },
];

export default function OverviewPage() {
  const [realtimeActivity, setRealtimeActivity] = useState<Array<Record<string, string>>>([]);
  const [liveMetrics, setLiveMetrics] = useState<Record<string, number>>({});

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['overview'],
    queryFn: () => api.getOverview(),
    refetchInterval: 15000, // Refetch every 15 seconds
  });

  // Real-time WebSocket connection
  const wsBase = (process.env.NEXT_PUBLIC_API_URL || 'https://risk-factor-500.onrender.com').replace(/^http/, 'ws');
  const { isConnected } = useWebSocket(`${wsBase}/ws`, {
    onMessage: (message) => {
      if (message.type === 'metric_update') {
        setLiveMetrics(prev => ({
          ...prev,
          ...(message.payload as Record<string, number>),
        }));
      } else if (message.type === 'activity_event') {
        const newActivity = {
          timestamp: message.timestamp,
          description: message.payload.description as string,
          actor: message.payload.actor as string,
          eventType: message.payload.eventType as string,
        };
        
        setRealtimeActivity(prev => [newActivity, ...prev].slice(0, 8));
      }
    }
  });

  // Simulate real-time activity for demo
  useEffect(() => {
    const interval = setInterval(() => {
      const activities = [
        { description: 'High-risk transaction flagged and blocked', actor: 'AI Engine', eventType: 'risk_detection' },
        { description: 'New attack pattern discovered in cluster analysis', actor: 'Graph AI', eventType: 'pattern_discovery' },
        { description: 'Defense rule effectiveness increased by 12%', actor: 'Defense Lab', eventType: 'rule_optimization' },
        { description: 'Suspicious device fingerprint added to blocklist', actor: 'Fraud Engine', eventType: 'device_blocked' },
        { description: 'Cross-account velocity threshold breached', actor: 'Velocity Engine', eventType: 'velocity_alert' },
        { description: 'Chargeback dispute evidence generated', actor: 'Evidence AI', eventType: 'chargeback_processing' },
        { description: 'Return risk assessment completed', actor: 'Return Engine', eventType: 'return_analysis' },
      ];

      const activity = activities[Math.floor(Math.random() * activities.length)];
      const newActivity = {
        timestamp: new Date().toISOString(),
        description: activity.description,
        actor: activity.actor,
        eventType: activity.eventType,
      };

      setRealtimeActivity(prev => [newActivity, ...prev].slice(0, 6));

      // Simulate metric updates
      setLiveMetrics(prev => ({
        modelHealth: (prev.modelHealth || 94.7) + (Math.random() - 0.5) * 0.1,
        transactionsTested: (prev.transactionsTested || 2800000) + Math.floor(Math.random() * 100),
        attacksBlocked: (prev.attacksBlocked || 96.3) + (Math.random() - 0.5) * 0.05,
      }));
    }, 6000 + Math.random() * 9000); // Random interval 6-15 seconds

    return () => clearInterval(interval);
  }, []);

  const metrics = { ...data?.metrics, ...liveMetrics };
  const allActivity = [...realtimeActivity, ...(data?.timeline || [])];

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
          {/* Header */}
          <div className="bg-white/70 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-10">
            <div className="p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Executive Overview
                  </h1>
                  <p className="text-gray-600 mt-1">Real-time security posture and risk intelligence</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 ${
                    isConnected 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                      : 'bg-gray-50 text-gray-500 border-gray-200'
                  }`}>
                    <Radio className={`w-4 h-4 ${isConnected ? 'text-emerald-600 animate-pulse' : 'text-gray-400'}`} />
                    <span className="text-sm font-semibold">
                      {isConnected ? 'LIVE' : 'OFFLINE'}
                    </span>
                  </div>
                  <button
                    onClick={() => refetch()}
                    disabled={isLoading}
                    className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2 font-semibold"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    <span>Refresh</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-8">
            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <MetricCard
                label="Risk Model Health"
                value={metrics?.modelHealth?.toFixed(1) ?? '—'}
                suffix="%"
                icon={Shield}
                variant="success"
                delay={0}
              />
              <MetricCard
                label="Transactions Tested"
                value={metrics ? formatNumber(metrics.transactionsTested) : '—'}
                icon={Activity}
                delay={0.1}
              />
              <MetricCard
                label="Blind Spots Found"
                value={metrics?.blindSpotsFound ?? '—'}
                icon={AlertTriangle}
                variant="warning"
                delay={0.2}
              />
              <MetricCard
                label="Critical Vulnerabilities"
                value={metrics?.criticalVulnerabilities ?? '—'}
                icon={Target}
                variant="danger"
                delay={0.3}
              />
              <MetricCard
                label="Attacks Blocked"
                value={metrics?.attacksBlocked?.toFixed(1) ?? '—'}
                suffix="%"
                icon={Ban}
                variant="success"
                delay={0.4}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Risk Activity Timeline */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="lg:col-span-2 bg-white/70 backdrop-blur-sm border-0 shadow-lg rounded-xl p-6"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                    <Activity className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">Risk Activity Timeline</h2>
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="blockGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="time" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        background: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                      }}
                    />
                    <Area type="monotone" dataKey="risk" stroke="#ef4444" fill="url(#riskGrad)" name="Risk Events" strokeWidth={3} />
                    <Area type="monotone" dataKey="blocked" stroke="#3b82f6" fill="url(#blockGrad)" name="Blocked" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </motion.div>

              {/* Recent Activity */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-white/70 backdrop-blur-sm border-0 shadow-lg rounded-xl p-6"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg">
                    <Activity className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    Recent Activity
                    <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-gray-400'}`}></span>
                  </h2>
                </div>
                <div className="space-y-4 max-h-[280px] overflow-y-auto">
                  {isLoading && allActivity.length === 0 ? (
                    <div className="text-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-400 mx-auto mb-4" />
                      <p className="text-gray-600 text-sm">Loading activity...</p>
                    </div>
                  ) : (
                    allActivity.slice(0, 8).map((event, i) => (
                      <motion.div
                        key={`${event.timestamp}-${i}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                          realtimeActivity.includes(event) 
                            ? 'bg-emerald-50 border-emerald-200' 
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900 leading-relaxed">
                              {event.description}
                            </p>
                            <div className="flex items-center gap-3 mt-2">
                              <span className="text-xs text-gray-600 font-mono">
                                {formatTime(event.timestamp)}
                              </span>
                              <span className="text-xs font-semibold text-blue-600">
                                {event.actor}
                              </span>
                              {realtimeActivity.includes(event) && (
                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold border border-emerald-200">
                                  LIVE
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
