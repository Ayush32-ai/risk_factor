'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Play, FastForward, AlertTriangle, Loader2 } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { ProgressBar } from '@/components/ui/progress-bar';
import { api } from '@/lib/api';
import { formatNumber } from '@/lib/utils';
import { Icon } from '@/components/client-only';

export default function AttacksPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedScenario, setSelectedScenario] = useState('Distributed Account Network');

  useEffect(() => {
    if (!api.getToken()) router.push('/login');
  }, [router]);

  const { data: scenarios } = useQuery({
    queryKey: ['scenarios'],
    queryFn: () => api.getScenarios(),
    enabled: !!api.getToken(),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['attack-simulation'],
    queryFn: () => api.getAttackSimulation(),
    enabled: !!api.getToken(),
  });

  const startMutation = useMutation({
    mutationFn: () => api.startAttack({ scenario: selectedScenario, generation: 1 }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['attack-simulation'] }),
        queryClient.invalidateQueries({ queryKey: ['graph'] }),
        queryClient.invalidateQueries({ queryKey: ['fraud-spikes-dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['fraud-trends'] }),
      ]);
    },
  });

  const evolveMutation = useMutation({
    mutationFn: () => api.evolveAttack(),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['attack-simulation'] }),
        queryClient.invalidateQueries({ queryKey: ['graph'] }),
        queryClient.invalidateQueries({ queryKey: ['fraud-spikes-dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['fraud-trends'] }),
      ]);
    },
  });

  const demoMutation = useMutation({
    mutationFn: () => api.startDemoAttack(),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['attack-simulation'] }),
        queryClient.invalidateQueries({ queryKey: ['graph'] }),
        queryClient.invalidateQueries({ queryKey: ['fraud-spikes-dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['fraud-trends'] }),
        queryClient.invalidateQueries({ queryKey: ['blind-spots'] }),
      ]);
    },
  });

  const stopMutation = useMutation({
    mutationFn: () => api.stopAttack(),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['attack-simulation'] }),
        queryClient.invalidateQueries({ queryKey: ['graph'] }),
        queryClient.invalidateQueries({ queryKey: ['fraud-spikes-dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['fraud-trends'] }),
        queryClient.invalidateQueries({ queryKey: ['blind-spots'] }),
      ]);
    },
  });

  const sim = data?.simulation as Record<string, unknown> | undefined;
  const detectionRate = Number(sim?.detection_rate ?? 21.4);
  const blindSpotDiscovered = sim?.blind_spot_discovered === true;
  // Use the backend's calculation instead of frontend threshold
  const isBlindSpot = blindSpotDiscovered;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Icon icon={Swords} className="w-6 h-6 text-red-400" fallbackClassName="w-6 h-6 bg-red-500 rounded" />
              <h1 className="text-2xl font-bold">AI Attack Simulator</h1>
            </div>
            <p className="text-sentinel-muted mt-1">Red-team engine that discovers detection blind spots</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => demoMutation.mutate()}
              disabled={demoMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg font-medium transition-colors"
            >
              <Icon 
                icon={demoMutation.isPending ? Loader2 : Play} 
                className={`w-4 h-4 ${demoMutation.isPending ? 'animate-spin' : ''}`}
                fallbackClassName="w-4 h-4 bg-white rounded"
              />
              Demo Attack
            </button>
            <button
              onClick={() => startMutation.mutate()}
              disabled={startMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-lg font-medium transition-colors"
            >
              <Icon 
                icon={startMutation.isPending ? Loader2 : Play} 
                className={`w-4 h-4 ${startMutation.isPending ? 'animate-spin' : ''}`}
                fallbackClassName="w-4 h-4 bg-white rounded"
              />
              {sim?.generation > 0 ? `Continue Gen ${sim.generation}` : 'Start Attack'}
            </button>
            <button
              onClick={() => evolveMutation.mutate()}
              disabled={evolveMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-sentinel-surface border border-sentinel-border hover:border-blue-500/30 rounded-lg font-medium transition-colors"
            >
              <Icon 
                icon={evolveMutation.isPending ? Loader2 : FastForward} 
                className={`w-4 h-4 ${evolveMutation.isPending ? 'animate-spin' : ''}`}
                fallbackClassName="w-4 h-4 bg-white rounded"
              />
              Evolve (+1 Gen)
            </button>
            {(sim?.status === 'running' || sim?.status === 'completed') && (
              <button
                onClick={() => stopMutation.mutate()}
                disabled={stopMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-blue-500 hover:bg-blue-50 disabled:opacity-50 rounded-lg font-medium transition-colors text-black"
              >
                <Icon 
                  icon={stopMutation.isPending ? Loader2 : AlertTriangle} 
                  className={`w-4 h-4 text-black ${stopMutation.isPending ? 'animate-spin' : ''}`}
                  fallbackClassName="w-4 h-4 bg-black rounded"
                />
                Stop
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="sentinel-card space-y-4">
            <h3 className="sentinel-label">Target</h3>
            <p className="text-lg font-semibold">{String(sim?.target ?? 'Payment Risk Engine')}</p>

            <h3 className="sentinel-label mt-4">Scenario</h3>
            <select
              value={selectedScenario}
              onChange={(e) => setSelectedScenario(e.target.value)}
              className="w-full px-3 py-2 bg-sentinel-bg border border-sentinel-border rounded-lg text-sm focus:outline-none focus:border-blue-500/50"
            >
              {scenarios?.scenarios?.map((s) => (
                <option key={s.id} value={s.name}>{s.name}</option>
              )) ?? (
                <option>Distributed Account Network</option>
              )}
            </select>
          </div>

          <motion.div
            key={String(sim?.generation)}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ 
              scale: 1, 
              opacity: 1,
              ...(isBlindSpot && {
                boxShadow: [
                  "0 0 20px rgba(239, 68, 68, 0.3)",
                  "0 0 40px rgba(239, 68, 68, 0.2)",
                  "0 0 20px rgba(239, 68, 68, 0.3)"
                ]
              })
            }}
            transition={{
              boxShadow: {
                duration: 2,
                repeat: isBlindSpot ? Infinity : 0,
                repeatType: "reverse"
              }
            }}
            className={`lg:col-span-2 sentinel-card ${
              isBlindSpot 
                ? 'border-red-500 bg-red-50/50 shadow-red-500/20 shadow-lg' 
                : 'border-red-500/20'
            }`}
          >
            {isLoading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="w-8 h-8 animate-spin text-sentinel-muted" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h2 className={`text-xl font-bold font-mono ${
                    isBlindSpot ? 'text-red-600' : 'text-white'
                  }`}>
                    Generation {String(sim?.generation ?? 17)}
                    {isBlindSpot && (
                      <span className="ml-2 text-sm font-normal bg-red-600 text-white px-2 py-1 rounded">
                        COMPROMISED
                      </span>
                    )}
                  </h2>
                  <span className={`text-2xl font-bold font-mono ${
                    isBlindSpot 
                      ? 'text-red-600 animate-pulse' 
                      : detectionRate < 30 
                      ? 'text-red-500' 
                      : detectionRate < 50 
                      ? 'text-orange-500' 
                      : detectionRate < 70 
                      ? 'text-yellow-500' 
                      : detectionRate < 85 
                      ? 'text-blue-500' 
                      : 'text-emerald-500'
                  }`}>
                    {detectionRate.toFixed(1)}% detected
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-6 mb-6">
                  <div>
                    <p className="sentinel-label">Transactions</p>
                    <p className={`text-2xl font-bold font-mono mt-1 ${
                      isBlindSpot ? 'text-red-600' : ''
                    }`}>
                      {formatNumber(Number(sim?.transactions_count ?? 84291))}
                    </p>
                  </div>
                  <div>
                    <p className="sentinel-label">Accounts</p>
                    <p className={`text-2xl font-bold font-mono mt-1 ${
                      isBlindSpot ? 'text-red-600' : ''
                    }`}>
                      {formatNumber(Number(sim?.accounts_count ?? 421))}
                    </p>
                  </div>
                  <div>
                    <p className="sentinel-label">Merchants</p>
                    <p className={`text-2xl font-bold font-mono mt-1 ${
                      isBlindSpot ? 'text-red-600' : ''
                    }`}>
                      {Number(sim?.merchants_count ?? 38)}
                    </p>
                  </div>
                </div>

                <ProgressBar
                  value={detectionRate}
                  variant={isBlindSpot ? 'danger' : detectionRate < 30 ? 'danger' : detectionRate < 60 ? 'warning' : 'success'}
                  label="Detection Rate"
                />
              </>
            )}
          </motion.div>
        </div>

        <AnimatePresence>
          {isBlindSpot && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white border border-red-200 rounded-xl shadow-sm p-5"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-red-100">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-red-600">BLIND SPOT DISCOVERED</h3>
                  <p className="text-slate-800 mt-1">
                    {detectionRate < 20 
                      ? `Critical vulnerability detected! Attack achieved ${detectionRate.toFixed(1)}% detection rate, indicating a severe gap in defense systems.`
                      : detectionRate < 35
                      ? `Significant blind spot found. Detection rate of ${detectionRate.toFixed(1)}% suggests attackers can exploit this pattern with high success.`
                      : `Potential vulnerability identified. ${detectionRate.toFixed(1)}% detection rate indicates room for improvement in this attack scenario.`
                    }
                  </p>
                  <p className="text-slate-600 text-sm mt-2">
                    Scenario: {String(sim?.scenario ?? selectedScenario)} · Generation {String(sim?.generation ?? 17)}
                    {Number(sim?.generation) > 1 && ` · Evolved attack pattern`}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
          {!isBlindSpot && sim?.status && sim?.status !== 'idle' && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white border border-emerald-200 rounded-xl shadow-sm p-5"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-emerald-100">
                  <Icon 
                    icon={AlertTriangle} 
                    className="w-6 h-6 text-emerald-600 rotate-180" 
                    fallbackClassName="w-6 h-6 bg-emerald-600 rounded"
                  />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-emerald-600">ATTACK NEUTRALIZED</h3>
                  <p className="text-slate-800 mt-1">
                    {detectionRate > 80 
                      ? `Excellent defense! ${detectionRate.toFixed(1)}% detection rate shows the security system effectively identified and blocked this attack pattern.`
                      : detectionRate > 60
                      ? `Good defense coverage. ${detectionRate.toFixed(1)}% detection rate indicates solid protection against this attack scenario.`
                      : `Moderate defense effectiveness. ${detectionRate.toFixed(1)}% detection rate provides acceptable coverage but could be improved.`
                    }
                  </p>
                  <p className="text-slate-600 text-sm mt-2">
                    Scenario: {String(sim?.scenario ?? selectedScenario)} · Generation {String(sim?.generation ?? 17)}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
