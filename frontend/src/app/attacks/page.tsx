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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['attack-simulation'] }),
  });

  const evolveMutation = useMutation({
    mutationFn: () => api.evolveAttack(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['attack-simulation'] }),
  });

  const sim = data?.simulation as Record<string, unknown> | undefined;
  const detectionRate = Number(sim?.detection_rate ?? 21.4);
  const isBlindSpot = sim?.blind_spot_discovered || detectionRate < 30;

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
              onClick={() => startMutation.mutate()}
              disabled={startMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-lg font-medium transition-colors"
            >
              <Icon 
                icon={startMutation.isPending ? Loader2 : Play} 
                className={`w-4 h-4 ${startMutation.isPending ? 'animate-spin' : ''}`}
                fallbackClassName="w-4 h-4 bg-white rounded"
              />
              Start Attack
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
            animate={{ scale: 1, opacity: 1 }}
            className="lg:col-span-2 sentinel-card border-red-500/20"
          >
            {isLoading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="w-8 h-8 animate-spin text-sentinel-muted" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold font-mono">
                    Generation {String(sim?.generation ?? 17)}
                  </h2>
                  <span className={`text-2xl font-bold font-mono ${detectionRate < 30 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {detectionRate.toFixed(1)}% detected
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-6 mb-6">
                  <div>
                    <p className="sentinel-label">Transactions</p>
                    <p className="text-2xl font-bold font-mono mt-1">
                      {formatNumber(Number(sim?.transactions_count ?? 84291))}
                    </p>
                  </div>
                  <div>
                    <p className="sentinel-label">Accounts</p>
                    <p className="text-2xl font-bold font-mono mt-1">
                      {formatNumber(Number(sim?.accounts_count ?? 421))}
                    </p>
                  </div>
                  <div>
                    <p className="sentinel-label">Merchants</p>
                    <p className="text-2xl font-bold font-mono mt-1">
                      {Number(sim?.merchants_count ?? 38)}
                    </p>
                  </div>
                </div>

                <ProgressBar
                  value={detectionRate}
                  variant={detectionRate < 30 ? 'danger' : 'success'}
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
              className="sentinel-card border-red-500/30 bg-red-500/5"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-red-500/10">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-red-400">BLIND SPOT DISCOVERED</h3>
                  <p className="text-white/80 mt-1">
                    Attack successfully bypassed current detection model.
                    Detection rate of {detectionRate.toFixed(1)}% indicates a critical gap in the risk engine.
                  </p>
                  <p className="text-sentinel-muted text-sm mt-2">
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
