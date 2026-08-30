'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Sparkles, Zap, Play } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { AuthGuard } from '@/components/auth-guard';
import { ProgressBar } from '@/components/ui/progress-bar';
import { ClientOnly } from '@/components/client-only';
import { api } from '@/lib/api';

// Define attack patterns available for selection
const ATTACK_PATTERNS = [
  { id: 'distributed_account_network', name: 'Distributed Account Network', description: 'Coordinated accounts acting as a network' },
  { id: 'refund_loop', name: 'Refund Loop Exploitation', description: 'Circular refund schemes' },
  { id: 'merchant_cluster', name: 'Merchant Cluster Abuse', description: 'Coordinated merchant networks' },
  { id: 'device_spoofing', name: 'Device Spoofing', description: 'Multiple accounts from same devices' },
  { id: 'velocity_attacks', name: 'Velocity Attacks', description: 'High-speed transaction patterns' },
  { id: 'default', name: 'General Patterns', description: 'Generic fraud patterns' },
];

export default function DefensePage() {
  const queryClient = useQueryClient();
  const [simulating, setSimulating] = useState(false);
  const [approved, setApproved] = useState(false);
  const [selectedPattern, setSelectedPattern] = useState('distributed_account_network');
  const [showHistory, setShowHistory] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data, isLoading, error } = useQuery({
    queryKey: ['defense'],
    queryFn: () => {
      console.log('📡 Fetching defense data...');
      return api.getDefense();
    },
    refetchInterval: 5000, // Refetch every 5 seconds for dynamic updates
    enabled: mounted,
  });

  const { data: historyData } = useQuery({
    queryKey: ['defense-history'],
    queryFn: () => api.get('/api/defense/history'),
    enabled: showHistory && mounted,
  });

  const generateMutation = useMutation({
    mutationFn: () => {
      console.log('🚀 Generate Defense clicked for pattern:', selectedPattern);
      return api.generateDefense('1', selectedPattern, data?.baselineRate);
    },
    onSuccess: (data) => {
      console.log('✅ Defense generation successful:', data);
      queryClient.invalidateQueries({ queryKey: ['defense'] });
      queryClient.invalidateQueries({ queryKey: ['defense-history'] });
      
      if (mounted && typeof window !== 'undefined') {
        // Show success notification
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-emerald-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2';
        notification.innerHTML = `<span>✅</span><span>Defense rules generated for ${selectedPattern}!</span>`;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 4000);
      }
    },
    onError: (error) => {
      console.error('❌ Defense generation failed:', error);
    }
  });

  const simulateMutation = useMutation({
    mutationFn: async () => {
      setSimulating(true);
      try {
        console.log('🚀 Starting simulation for pattern:', selectedPattern);
        // Add realistic delay for simulation
        await new Promise((r) => setTimeout(r, 3000));
        const result = await api.simulateDefense('1', selectedPattern, data?.baselineRate);
        console.log('✅ Simulation result:', result);
        return result;
      } finally {
        // Always reset simulating state
        setSimulating(false);
      }
    },
    onSuccess: (result) => {
      console.log('✅ Simulation successful with data:', result);
      queryClient.invalidateQueries({ queryKey: ['defense'] });
      queryClient.invalidateQueries({ queryKey: ['defense-history'] });
      
      const attackCount = result?.defense?.attacksRerun || '10,000';
      
      if (mounted && typeof window !== 'undefined') {
        // Show success notification
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2';
        notification.innerHTML = `<span>🎯</span><span>Simulation complete: ${attackCount.toLocaleString()} attacks tested!</span>`;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 4000);
      }
    },
    onError: (error) => {
      console.error('❌ Simulation failed:', error);
      setSimulating(false);
    }
  });

  const approveMutation = useMutation({
    mutationFn: () => api.approveDefense((data?.defense as any)?.id),
    onSuccess: () => {
      setApproved(true);
      queryClient.invalidateQueries({ queryKey: ['defense'] });
    }
  });

  if (!mounted) {
    return (
      <AuthGuard>
        <DashboardLayout>
          <div className="space-y-8">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-blue-500 rounded" />
              <h1 className="text-2xl font-bold">Defense Lab</h1>
            </div>
            <div className="sentinel-card">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-700 rounded w-3/4" />
                <div className="h-4 bg-gray-700 rounded w-1/2" />
              </div>
            </div>
          </div>
        </DashboardLayout>
      </AuthGuard>
    );
  }

  const defense = data?.defense as Record<string, unknown> | undefined;
  const rules = (defense?.generatedRules as Array<Record<string, any>>) ?? [];
  const before = Number(defense?.beforeDetectionRate ?? data?.baselineRate ?? 18);
  const after = Number(defense?.afterDetectionRate ?? 94);
  const improvement = Number(defense?.improvement ?? 76);
  const attacksRerun = Number(defense?.attacksRerun ?? 10000);
  const baselineRate = Number(data?.baselineRate ?? 18);
  
  // Use fresh data from simulation if available
  const latestSimulation = simulateMutation.data?.defense || defense;
  const currentAttacksRerun = Number(latestSimulation?.attacksRerun ?? attacksRerun);
  const currentImprovement = Number(latestSimulation?.improvement ?? improvement);
  const currentAfter = Number(latestSimulation?.afterDetectionRate ?? after);
  const currentBefore = Number(latestSimulation?.beforeDetectionRate ?? before);

  console.log('🎯 Defense page state:', { 
    isLoading, 
    error: error?.message, 
    hasData: !!data, 
    defense, 
    rulesCount: rules.length,
    selectedPattern,
    baselineRate,
    simulationData: simulateMutation.data,
    isSimulating: simulating || simulateMutation.isPending
  });

  return (
    <AuthGuard>
      <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-blue-500 rounded" />
              <h1 className="text-2xl font-bold">Defense Lab</h1>
              <span className="px-2 py-1 text-xs bg-blue-500/20 text-blue-400 rounded-full">
                Dynamic AI
              </span>
              <span className="flex items-center gap-1 px-2 py-1 text-xs bg-purple-500/20 text-purple-400 rounded-full">
                <Brain className="w-3 h-3" />
                Powered by Groq AI
              </span>
            </div>
            <p className="text-sentinel-muted mt-1">AI-generated counter-measures against discovered blind spots</p>
            <div className="flex items-center gap-4 mt-2 text-sm">
              <span className="flex items-center gap-1 text-sentinel-muted">
                <div className="w-4 h-4 bg-gray-500 rounded" />
                Baseline: {baselineRate.toFixed(1)}%
              </span>
              {data?.history && (
                <span className="flex items-center gap-1 text-sentinel-muted">
                  <div className="w-4 h-4 bg-gray-500 rounded" />
                  {data.history.length} defenses generated
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="px-3 py-2 text-sm bg-white text-slate-900 border border-blue-500 hover:bg-blue-50 rounded-lg transition-colors shadow-sm"
            >
              {showHistory ? 'Hide' : 'Show'} History
            </button>
            <button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-lg font-medium transition-colors"
            >
              {generateMutation.isPending ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <div className="relative">
                  <Brain className="w-4 h-4 text-white" />
                  <Sparkles className="w-2 h-2 text-purple-300 absolute -top-0.5 -right-0.5" />
                </div>
              )}
              Generate Defense
            </button>
            <button
              onClick={() => simulateMutation.mutate()}
              disabled={simulateMutation.isPending || simulating || !rules.length}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg font-medium transition-colors"
            >
              {(simulateMutation.isPending || simulating) ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Zap className="w-4 h-4 text-white" />
              )}
              Re-run {currentAttacksRerun.toLocaleString()} Attacks
            </button>
          </div>
        </div>

        {/* Attack Pattern Selection */}
        <div className="sentinel-card">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <div className="w-5 h-5 bg-blue-500 rounded" />
            Target Attack Pattern
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {ATTACK_PATTERNS.map((pattern) => (
              <button
                key={pattern.id}
                onClick={() => setSelectedPattern(pattern.id)}
                className={`p-3 rounded-lg border text-left transition-all ${
                  selectedPattern === pattern.id
                    ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                    : 'border-sentinel-border bg-white/[0.02] hover:border-blue-500/30'
                }`}
              >
                <p className="font-medium">{pattern.name}</p>
                <p className="text-xs text-sentinel-muted mt-1">{pattern.description}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ClientOnly fallback={
            <div className="sentinel-card">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-700 rounded w-1/2" />
                <div className="h-16 bg-gray-700 rounded" />
              </div>
            </div>
          }>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="sentinel-card"
            >
              <h3 className="sentinel-label mb-4">Current Detection Rate</h3>
              <p className="text-5xl font-bold font-mono text-red-400">{before}%</p>
              <ProgressBar value={before} variant="danger" showValue={false} />
              <p className="text-xs text-sentinel-muted mt-2">
                Against {selectedPattern.replace(/_/g, ' ')} attacks
              </p>
            </motion.div>
          </ClientOnly>

          <ClientOnly fallback={
            <div className="sentinel-card border-emerald-500/20">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-700 rounded w-1/2" />
                <div className="h-16 bg-gray-700 rounded" />
              </div>
            </div>
          }>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="sentinel-card border-emerald-500/20"
            >
              <h3 className="sentinel-label mb-4">After AI Defense</h3>
              <p className="text-5xl font-bold font-mono text-emerald-400">{after}%</p>
              <ProgressBar value={after} variant="success" showValue={false} />
              <p className="text-xs text-sentinel-muted mt-2">
                Projected improvement: +{improvement}%
              </p>
            </motion.div>
          </ClientOnly>
        </div>

        {/* Defense History */}
        {showHistory && historyData?.history && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="bg-white border border-blue-500 rounded-xl shadow-sm p-5"
          >
            <h3 className="text-lg font-semibold mb-4 text-black">Defense Generation History</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {historyData.history.slice(-10).reverse().map((entry: any, i: number) => (
                <div key={i} className="p-3 rounded-lg border border-blue-200 bg-white shadow-sm">
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{entry.attackPattern?.replace(/_/g, ' ') || 'General'}</p>
                      <p className="text-xs text-slate-700">
                        {entry.improvement || 0}% improvement • {entry.generatedRules?.length || 0} rules
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </p>
                      {entry.approved && (
                        <span className="text-xs text-emerald-600 font-medium">✓ Deployed</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        <div className="sentinel-card">
          <h3 className="text-lg font-semibold mb-4">AI Generated Defense Rules</h3>
          
          {/* Show loading state during generation */}
          {generateMutation.isPending ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="relative mx-auto mb-4">
                  <div className="w-8 h-8 border-4 border-purple-400 border-t-transparent rounded-full animate-spin" />
                  <Brain className="w-4 h-4 text-purple-400 absolute top-2 left-2" />
                </div>
                <p className="text-lg font-medium flex items-center justify-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  Groq AI Generating Defense Rules...
                </p>
                <p className="text-sm text-sentinel-muted mt-1">
                  Analyzing {selectedPattern.replace(/_/g, ' ')} attack patterns with advanced AI
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rules.length > 0 ? (
                rules.map((rule, i) => (
                  <motion.div
                    key={`${rule.name}-${i}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="p-4 rounded-lg bg-white/[0.02] border border-sentinel-border hover:border-blue-500/30 transition-colors"
                  >
                    <p className="font-medium text-blue-400">+ {rule.name}</p>
                    <p className="text-sm text-sentinel-muted mt-1">{rule.description}</p>
                    <div className="flex justify-between items-center mt-3">
                      {rule.impact && (
                        <p className="text-xs text-emerald-400">Impact: +{rule.impact} points</p>
                      )}
                      {rule.confidence && (
                        <p className="text-xs text-blue-400">{rule.confidence}% confidence</p>
                      )}
                    </div>
                    {rule.generated_at && (
                      <p className="text-xs text-sentinel-muted mt-1">
                        Generated: {new Date(rule.generated_at).toLocaleTimeString()}
                      </p>
                    )}
                  </motion.div>
                ))
              ) : (
                <div className="col-span-full text-center py-8">
                  <p className="text-sentinel-muted">Select an attack pattern and click "Generate Defense" to create AI-powered counter-measures</p>
                </div>
              )}
            </div>
          )}
        </div>



        <ClientOnly fallback={null}>
          <AnimatePresence>
            {(simulating || simulateMutation.isSuccess) && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="sentinel-card text-center py-12 border-emerald-500/30 bg-emerald-500/5"
              >
                {simulating ? (
                  <div>
                    <div className="relative mx-auto mb-4">
                      <div className="w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
                      <Zap className="w-6 h-6 text-blue-400 absolute top-3 left-3" />
                    </div>
                    <p className="text-lg font-medium flex items-center justify-center gap-2">
                      <Zap className="w-5 h-5 text-blue-400" />
                      Re-running {currentAttacksRerun.toLocaleString()} attacks...
                    </p>
                    <p className="text-sentinel-muted text-sm mt-1">
                      Testing defense rules against evolved {selectedPattern.replace(/_/g, ' ')} patterns
                    </p>
                  </div>
                ) : (
                  <div>
                    <motion.p
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 200 }}
                      className="text-7xl font-bold font-mono text-emerald-400"
                    >
                      +{currentImprovement}%
                    </motion.p>
                    <p className="text-2xl font-bold mt-2">IMPROVEMENT</p>
                    <p className="text-sentinel-muted mt-2">
                      Detection improved from {currentBefore}% to {currentAfter}%
                    </p>
                    <div className="flex justify-center gap-6 mt-4 text-sm">
                      <div className="text-center">
                        <p className="text-lg font-bold text-blue-400">{currentAttacksRerun.toLocaleString()}</p>
                        <p className="text-sentinel-muted">Attacks Tested</p>
                      </div>
                      {latestSimulation?.additionalAttacksBlocked != null && (
                        <div className="text-center">
                          <p className="text-lg font-bold text-emerald-400">
                            +{Number(latestSimulation.additionalAttacksBlocked).toLocaleString()}
                          </p>
                          <p className="text-sentinel-muted">Additional Blocked</p>
                        </div>
                      )}
                      {latestSimulation?.effectivenessScore != null && (
                        <div className="text-center">
                          <p className="text-lg font-bold text-purple-400">
                            {Number(latestSimulation.effectivenessScore).toFixed(1)}
                          </p>
                          <p className="text-sentinel-muted">Effectiveness Score</p>
                        </div>
                      )}
                    </div>

                    {!approved && (
                      <button
                        onClick={() => approveMutation.mutate()}
                        disabled={approveMutation.isPending}
                        className="mt-6 flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg font-medium transition-colors mx-auto"
                      >
                        <div className="w-5 h-5 bg-white rounded" />
                        Approve & Deploy Defense
                      </button>
                    )}

                    {approved && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mt-6 text-emerald-400 flex items-center justify-center gap-2"
                      >
                        <div className="w-5 h-5 bg-emerald-500 rounded" />
                        Defense approved and model updated — baseline improved to {(data as any)?.newBaselineRate?.toFixed(1)}%
                      </motion.p>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </ClientOnly>
      </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
