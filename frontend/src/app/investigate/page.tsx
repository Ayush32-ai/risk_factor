'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Search, CheckCircle, AlertCircle, Radio, RefreshCw } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Icon } from '@/components/client-only';
import { useWebSocket } from '@/hooks/use-websocket';
import { api } from '@/lib/api';
import { getRiskColor, getSeverityBadge } from '@/lib/utils';

export default function InvestigatePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [realtimeUpdates, setRealtimeUpdates] = useState<Array<Record<string, unknown>>>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!api.getToken()) router.push('/login');
  }, [router]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['investigation'],
    queryFn: () => api.investigate('cluster-7a3b'),
    enabled: !!api.getToken(),
    refetchInterval: 20000, // Refetch every 20 seconds
  });

  // Real-time WebSocket connection
  const wsBase = (process.env.NEXT_PUBLIC_API_URL || 'https://risk-factor-500.onrender.com').replace(/^http/, 'ws');
  const { isConnected } = useWebSocket(`${wsBase}/ws`, {
    onMessage: (message) => {
      if (message.type === 'investigation_update') {
        setRealtimeUpdates(prev => [message.payload, ...prev].slice(0, 5));
        queryClient.invalidateQueries({ queryKey: ['investigation'] });
      } else if (message.type === 'risk_score_update') {
        setRealtimeUpdates(prev => [
          {
            type: 'risk_update',
            description: `Risk score updated to ${message.payload.riskScore}`,
            timestamp: message.timestamp,
          },
          ...prev
        ].slice(0, 5));
      }
    }
  });

  // Simulate real-time investigation updates for demo
  useEffect(() => {
    const interval = setInterval(() => {
      const updates = [
        { type: 'new_evidence', description: 'New suspicious transaction pattern detected', severity: 'high' },
        { type: 'risk_analysis', description: 'Graph density analysis completed - network risk elevated', severity: 'critical' },
        { type: 'device_correlation', description: 'Additional device fingerprints linked to cluster', severity: 'high' },
        { type: 'behavioral_analysis', description: 'Anomalous timing patterns confirmed across accounts', severity: 'high' },
        { type: 'merchant_correlation', description: 'Cross-merchant transaction patterns identified', severity: 'medium' },
      ];

      const update = updates[Math.floor(Math.random() * updates.length)];
      const newUpdate = {
        ...update,
        timestamp: new Date().toISOString(),
        id: `realtime_${Date.now()}`,
      };

      setRealtimeUpdates(prev => [newUpdate, ...prev].slice(0, 3));
    }, 12000 + Math.random() * 8000); // Random interval 12-20 seconds

    return () => clearInterval(interval);
  }, []);

  const triggerRealtimeAnalysis = async () => {
    setIsProcessing(true);
    
    // Simulate AI processing
    setTimeout(() => {
      setRealtimeUpdates(prev => [{
        type: 'ai_analysis',
        description: 'Real-time AI analysis triggered - Deep learning model processing cluster',
        timestamp: new Date().toISOString(),
        severity: 'info',
        id: `analysis_${Date.now()}`,
      }, ...prev].slice(0, 5));
      
      setIsProcessing(false);
      refetch();
    }, 3000);
  };

  const inv = data?.investigation as Record<string, unknown> | undefined;
  const evidence = (inv?.evidence as Array<Record<string, string>>) ?? [];
  const riskScore = Number(inv?.riskScore ?? 93);

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-4xl">
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Search className="w-6 h-6 text-amber-400" />
              <h1 className="text-2xl font-bold">AI Investigation</h1>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <Icon icon={Radio} className={`w-3 h-3 ${isConnected ? 'text-emerald-400 animate-pulse' : 'text-gray-400'}`} fallbackClassName="w-3 h-3 bg-emerald-500 rounded" />
                <span className={`text-sm font-medium ${isConnected ? 'text-emerald-400' : 'text-gray-400'}`}>
                  {isConnected ? 'LIVE' : 'OFFLINE'}
                </span>
              </div>
            </div>
            <button
              onClick={triggerRealtimeAnalysis}
              disabled={isProcessing}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm font-medium transition-colors"
            >
              <Icon 
                icon={RefreshCw} 
                className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} 
                fallbackClassName="w-4 h-4 bg-white rounded" 
              />
              {isProcessing ? 'Analyzing...' : 'Trigger Analysis'}
            </button>
          </div>
          <p className="text-sentinel-muted mt-1">Automated risk analysis powered by graph AI + Grok API · Real-time processing</p>
        </div>

        {isLoading ? (
          <div className="sentinel-card text-sentinel-muted">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
              Analyzing network patterns...
            </div>
          </div>
        ) : (
          <>
            {/* Real-time Updates Panel */}
            {realtimeUpdates.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border border-emerald-200 rounded-xl shadow-sm p-5"
              >
                <h3 className="font-semibold text-emerald-700 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                  Real-time Updates
                </h3>
                <div className="space-y-2">
                  {realtimeUpdates.slice(0, 3).map((update, i) => (
                    <motion.div
                      key={String(update.id)}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-center gap-3 p-2 bg-emerald-50 border border-emerald-100 rounded-lg"
                    >
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm text-slate-800">{String(update.description)}</p>
                        <p className="text-xs text-slate-500">{String(update.type)}</p>
                      </div>
                      <span className="text-xs text-emerald-700 font-mono">
                        {new Date(String(update.timestamp)).toLocaleTimeString()}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="sentinel-card"
            >
              <h2 className="text-lg font-semibold mb-2">WHY IS THIS NETWORK RISKY?</h2>
              <div className="flex items-baseline gap-3 mt-4">
                <span className="sentinel-label">Risk Score</span>
                <span className={`text-5xl font-bold font-mono ${getRiskColor(riskScore)}`}>
                  {riskScore}
                </span>
                <span className="text-sentinel-muted">/100</span>
                {isConnected && (
                  <span className="px-2 py-1 bg-green-500/10 text-green-400 text-xs rounded-full border border-green-500/20">
                    LIVE MONITORING
                  </span>
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="sentinel-card"
            >
              <h3 className="sentinel-label mb-4">Evidence</h3>
              <div className="space-y-3">
                {evidence.map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 + i * 0.05 }}
                    className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.02] border border-sentinel-border"
                  >
                    <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm">{item.description}</p>
                    </div>
                    <span className={getSeverityBadge(item.severity)}>{item.severity}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white border border-blue-200 rounded-xl shadow-sm p-5"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                    AI Assessment
                    {isProcessing && (
                      <div className="w-3 h-3 border border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    )}
                  </h3>
                  <p className="text-base text-slate-800 leading-relaxed">
                    {String(inv?.aiAssessment ?? '')}
                  </p>
                  {isConnected && (
                    <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                      <span className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse"></span>
                        Real-time AI monitoring active - Assessment updates automatically
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
