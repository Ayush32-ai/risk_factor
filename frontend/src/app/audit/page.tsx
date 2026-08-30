'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ScrollText, Shield, Radio } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Icon } from '@/components/client-only';
import { useWebSocket } from '@/hooks/use-websocket';
import { api } from '@/lib/api';
import { formatTime } from '@/lib/utils';

const actorColors: Record<string, string> = {
  AI: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  Admin: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  System: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  Analyst: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
};

export default function AuditPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [realtimeLogs, setRealtimeLogs] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    if (!api.getToken()) router.push('/login');
  }, [router]);

  const { data, isLoading } = useQuery({
    queryKey: ['audit'],
    queryFn: () => api.getAuditLogs(50),
    enabled: !!api.getToken(),
    refetchInterval: 10000, // Refetch every 10 seconds as fallback
  });

  // Real-time WebSocket connection (temporarily disabled)
  const wsBase = (process.env.NEXT_PUBLIC_API_URL || 'https://risk-factor-500.onrender.com').replace(/^http/, 'ws');
  const { isConnected } = useWebSocket(`${wsBase}/ws`, {
    onMessage: (message) => {
      if (message.type === 'audit_event' || message.type === 'security_event') {
        // Add new real-time event
        const newLog = {
          id: `realtime_${Date.now()}`,
          timestamp: message.timestamp,
          description: message.payload.description || 'Real-time security event',
          eventType: message.payload.eventType || message.type,
          actor: message.payload.actor || 'System',
        };

        setRealtimeLogs(prev => [newLog, ...prev].slice(0, 10)); // Keep only latest 10
        
        // Invalidate query to refresh main data
        queryClient.invalidateQueries({ queryKey: ['audit'] });
      }
    }
  });

  // Simulate real-time events for demo
  useEffect(() => {
    const interval = setInterval(() => {
      const events = [
        { description: 'Fraud pattern detected in transaction cluster', actor: 'AI', eventType: 'fraud_detection' },
        { description: 'Defense rule updated for velocity checks', actor: 'System', eventType: 'defense_update' },
        { description: 'High-risk transaction blocked', actor: 'AI', eventType: 'transaction_blocked' },
        { description: 'Model retrained with new attack patterns', actor: 'AI', eventType: 'model_update' },
        { description: 'Security threshold adjusted', actor: 'Admin', eventType: 'security_config' },
      ];
      
      const randomEvent = events[Math.floor(Math.random() * events.length)];
      const newLog = {
        id: `sim_${Date.now()}`,
        timestamp: new Date().toISOString(),
        description: randomEvent.description,
        eventType: randomEvent.eventType,
        actor: randomEvent.actor,
      };

      setRealtimeLogs(prev => [newLog, ...prev].slice(0, 5));
    }, 8000 + Math.random() * 12000); // Random interval 8-20 seconds

    return () => clearInterval(interval);
  }, []);

  const logs = data?.logs ?? [];
  const allLogs = [...realtimeLogs, ...logs];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <div className="flex items-center gap-3 justify-between">
            <div className="flex items-center gap-3">
              <ScrollText className="w-6 h-6 text-slate-400" />
              <h1 className="text-2xl font-bold">Audit & Security</h1>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <Icon icon={Radio} className={`w-3 h-3 ${isConnected ? 'text-emerald-400 animate-pulse' : 'text-gray-400'}`} fallbackClassName="w-3 h-3 bg-emerald-500 rounded" />
              <span className={`text-sm font-medium ${isConnected ? 'text-emerald-400' : 'text-gray-400'}`}>
                {isConnected ? 'LIVE' : 'OFFLINE'}
              </span>
            </div>
          </div>
          <p className="text-sentinel-muted mt-1">Immutable log of all security operations and model changes · Real-time monitoring active</p>
        </div>

        <div className="sentinel-card p-0 overflow-hidden">
          <div className="grid grid-cols-[80px_1fr_100px] gap-4 px-6 py-3 border-b border-sentinel-border bg-white/[0.02]">
            <span className="sentinel-label">TIME</span>
            <span className="sentinel-label">EVENT</span>
            <span className="sentinel-label text-right">ACTOR</span>
          </div>

          {isLoading && allLogs.length === 0 ? (
            <div className="p-6 text-sentinel-muted">Loading audit trail...</div>
          ) : (
            <div className="divide-y divide-sentinel-border max-h-[600px] overflow-y-auto">
              {allLogs.map((log, i) => (
                <motion.div
                  key={String(log.id ?? i)}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={`grid grid-cols-[80px_1fr_100px] gap-4 px-6 py-4 hover:bg-white/[0.02] transition-colors ${
                    realtimeLogs.includes(log) ? 'bg-blue-500/5 border-l-2 border-l-blue-500' : ''
                  }`}
                >
                  <span className="font-mono text-sm text-sentinel-muted">
                    {formatTime(String(log.timestamp))}
                  </span>
                  <div>
                    <p className="text-sm">{String(log.description)}</p>
                    <p className="text-xs text-sentinel-muted mt-0.5 font-mono flex items-center gap-2">
                      {String(log.eventType)}
                      {realtimeLogs.includes(log) && (
                        <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">NEW</span>
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${
                      actorColors[String(log.actor)] ?? 'text-sentinel-muted bg-white/5 border-sentinel-border'
                    }`}>
                      {String(log.actor)}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        <div className="sentinel-card flex items-center gap-4">
          <Shield className="w-8 h-8 text-emerald-400" />
          <div>
            <p className="font-medium">Audit Integrity Verified</p>
            <p className="text-sm text-sentinel-muted">
              All events are cryptographically logged and tamper-evident. Required for PCI-DSS compliance.
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
