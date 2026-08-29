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
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Icon } from '@/components/client-only';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { AuthGuard } from '@/components/auth-guard';
import { ClientOnly } from '@/components/client-only';
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
  const queryClient = useQueryClient();
  const [realtimeActivity, setRealtimeActivity] = useState<Array<Record<string, string>>>([]);
  const [liveMetrics, setLiveMetrics] = useState<Record<string, number>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['overview'],
    queryFn: () => api.getOverview(),
    refetchInterval: 15000, // Refetch every 15 seconds
  });

  // Real-time WebSocket connection
  const { isConnected } = useWebSocket('ws://localhost:4000/ws', {
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
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Executive Risk Overview</h1>
            <p className="text-sentinel-muted mt-1">Real-time security posture and risk intelligence</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <Icon icon={Radio} className={`w-3 h-3 ${isConnected ? 'text-emerald-400 animate-pulse' : 'text-gray-400'}`} fallbackClassName="w-3 h-3 bg-emerald-500 rounded" />
            <span className={`text-sm font-medium ${isConnected ? 'text-emerald-400' : 'text-gray-400'}`}>
              {isConnected ? 'LIVE' : 'OFFLINE'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="lg:col-span-2 sentinel-card"
          >
            <h2 className="text-lg font-semibold mb-4">Risk Activity Timeline</h2>
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
                    background: '#111827',
                    border: '1px solid #1e293b',
                    borderRadius: '8px',
                  }}
                />
                <Area type="monotone" dataKey="risk" stroke="#ef4444" fill="url(#riskGrad)" name="Risk Events" />
                <Area type="monotone" dataKey="blocked" stroke="#3b82f6" fill="url(#blockGrad)" name="Blocked" />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="sentinel-card"
          >
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              Recent Activity
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></span>
            </h2>
            <div className="space-y-3 max-h-[280px] overflow-y-auto">
              {isLoading && allActivity.length === 0 ? (
                <p className="text-sentinel-muted text-sm">Loading...</p>
              ) : (
                allActivity.slice(0, 8).map((event, i) => (
                  <motion.div
                    key={`${event.timestamp}-${i}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className={`flex gap-3 text-sm p-2 rounded ${
                      realtimeActivity.includes(event) ? 'bg-green-500/5 border-l-2 border-l-green-500' : ''
                    }`}
                  >
                    <span className="text-sentinel-muted font-mono shrink-0 text-xs">
                      {formatTime(event.timestamp)}
                    </span>
                    <div className="flex-1">
                      <p className="text-white/90">{event.description}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-sentinel-muted text-xs">{event.actor}</p>
                        {realtimeActivity.includes(event) && (
                          <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded text-xs">LIVE</span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
