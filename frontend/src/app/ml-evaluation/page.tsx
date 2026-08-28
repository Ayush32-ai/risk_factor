'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Loader2,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AuthGuard } from '@/components/auth-guard';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { MetricCard } from '@/components/ui/metric-card';
import { Icon } from '@/components/client-only';
import { api, type MlDetectorMetrics, type MlEvaluationReport } from '@/lib/api';
import { formatCurrency, cn } from '@/lib/utils';

function statusClass(status: string) {
  if (status === 'healthy') return 'sentinel-badge-success';
  if (status === 'degraded') return 'sentinel-badge-high';
  return 'sentinel-badge-critical';
}

function ConfusionMatrix({ cm }: { cm: MlDetectorMetrics['confusion_matrix'] }) {
  const cells = [
    { label: 'TN', value: cm.tn, className: 'bg-emerald-500/10 text-emerald-300' },
    { label: 'FP', value: cm.fp, className: 'bg-red-500/10 text-red-300' },
    { label: 'FN', value: cm.fn, className: 'bg-amber-500/10 text-amber-300' },
    { label: 'TP', value: cm.tp, className: 'bg-blue-500/10 text-blue-300' },
  ];
  return (
    <div className="grid grid-cols-2 gap-2">
      {cells.map((c) => (
        <div key={c.label} className={cn('rounded-lg p-3 text-center border border-white/5', c.className)}>
          <p className="text-[10px] uppercase tracking-wider opacity-70">{c.label}</p>
          <p className="font-mono text-lg font-semibold">{c.value}</p>
        </div>
      ))}
    </div>
  );
}

export default function MlEvaluationPage() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['ml-metrics'],
    queryFn: () => api.getMlMetrics(),
    refetchInterval: 60_000,
  });

  const { data: monitoring } = useQuery({
    queryKey: ['ml-monitoring'],
    queryFn: () => api.getMlMonitoring(),
    refetchInterval: 60_000,
  });

  const evaluateMutation = useMutation({
    mutationFn: () => api.runMlEvaluation({ n_samples: 2000, holdout_frac: 0.25 }),
    onSuccess: (report) => {
      queryClient.setQueryData(['ml-metrics'], report);
      queryClient.invalidateQueries({ queryKey: ['ml-monitoring'] });
    },
  });

  const retrainMutation = useMutation({
    mutationFn: () => api.retrainMlModel(),
    onSuccess: (report) => {
      queryClient.setQueryData(['ml-metrics'], report);
      queryClient.invalidateQueries({ queryKey: ['ml-monitoring'] });
    },
  });

  const report: MlEvaluationReport | undefined = (evaluateMutation.data as MlEvaluationReport | undefined) ?? data;
  const detectors = report?.detectors ?? [];
  const selected = detectors.find((d) => d.id === (selectedId ?? detectors[0]?.id)) ?? detectors[0];

  const rocData = useMemo(() => {
    const pts = selected?.roc_curve ?? [];
    return pts.map((p) => ({ fpr: Number((p.fpr * 100).toFixed(1)), tpr: Number((p.tpr * 100).toFixed(1)) }));
  }, [selected]);

  const history = (monitoring?.history ?? []) as Array<{
    evaluated_at: string;
    avg_roc_auc: number;
    avg_precision: number;
    avg_recall: number;
  }>;

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="space-y-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-3">
                <Icon icon={BarChart3} className="w-6 h-6 text-blue-400" />
                <h1 className="text-2xl font-bold">Model Evaluation</h1>
              </div>
              <p className="text-sentinel-muted mt-1">
                Hold-out precision/recall, false-positive cost, ROC, drift, and retrain gates — measured, not claimed.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => evaluateMutation.mutate()}
                disabled={evaluateMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg font-medium transition-colors"
              >
                {evaluateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Run Hold-out Eval
              </button>
              <button
                onClick={() => retrainMutation.mutate()}
                disabled={retrainMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-sentinel-surface border border-sentinel-border hover:border-blue-500/40 disabled:opacity-50 rounded-lg font-medium transition-colors"
              >
                {retrainMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                Retrain + Promote
              </button>
            </div>
          </div>

          {isLoading && !report ? (
            <div className="sentinel-card text-sentinel-muted">Running measurement suite…</div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <MetricCard label="Avg ROC AUC" value={((report?.summary.avg_roc_auc ?? 0) * 100).toFixed(1)} suffix="%" icon={BarChart3} variant="success" />
                <MetricCard label="Precision (fraud)" value={((report?.summary.avg_precision ?? 0) * 100).toFixed(1)} suffix="%" icon={CheckCircle2} />
                <MetricCard label="Recall (fraud)" value={((report?.summary.avg_recall ?? 0) * 100).toFixed(1)} suffix="%" icon={ShieldAlert} variant="warning" />
                <MetricCard label="FP review cost" value={formatCurrency(report?.summary.false_positive_cost_inr ?? 0)} icon={AlertTriangle} variant="danger" />
                <MetricCard label="Missed fraud cost" value={formatCurrency(report?.summary.missed_fraud_cost_inr ?? 0)} icon={AlertTriangle} variant="danger" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="sentinel-card lg:col-span-2">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Detector scorecard</h2>
                    <span className="text-xs text-sentinel-muted font-mono">
                      v{report?.model_version} · hold-out {String(report?.holdout?.n_samples ?? 2000)} samples
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-sentinel-muted border-b border-sentinel-border">
                          <th className="py-2 pr-3 font-medium">Detector</th>
                          <th className="py-2 pr-3 font-medium">P</th>
                          <th className="py-2 pr-3 font-medium">R</th>
                          <th className="py-2 pr-3 font-medium">F1</th>
                          <th className="py-2 pr-3 font-medium">AUC</th>
                          <th className="py-2 pr-3 font-medium">FP ₹</th>
                          <th className="py-2 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detectors.map((d) => (
                          <tr
                            key={d.id}
                            onClick={() => setSelectedId(d.id)}
                            className={cn(
                              'border-b border-white/5 cursor-pointer hover:bg-white/[0.03]',
                              selected?.id === d.id && 'bg-blue-500/10'
                            )}
                          >
                            <td className="py-3 pr-3">
                              <p className="font-medium">{d.name}</p>
                              <p className="text-xs text-sentinel-muted">{d.family}</p>
                            </td>
                            <td className="py-3 pr-3 font-mono">{(d.precision * 100).toFixed(1)}%</td>
                            <td className="py-3 pr-3 font-mono">{(d.recall * 100).toFixed(1)}%</td>
                            <td className="py-3 pr-3 font-mono">{(d.f1 * 100).toFixed(1)}%</td>
                            <td className="py-3 pr-3 font-mono">{(d.roc_auc * 100).toFixed(1)}%</td>
                            <td className="py-3 pr-3 font-mono text-red-300">{formatCurrency(d.false_positive_cost_inr)}</td>
                            <td className="py-3">
                              <span className={statusClass(d.status)}>{d.status}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="sentinel-card space-y-4">
                  <h2 className="text-lg font-semibold">Production monitor</h2>
                  <div className="flex items-center justify-between">
                    <span className="sentinel-label">Drift</span>
                    <span className={report?.drift?.drift ? 'sentinel-badge-critical' : 'sentinel-badge-success'}>
                      {report?.drift?.drift ? 'DETECTED' : 'STABLE'}
                    </span>
                  </div>
                  <p className="text-xs text-sentinel-muted font-mono">p = {Number(report?.drift?.p_value ?? 1).toFixed(3)}</p>
                  <div className="flex items-center justify-between">
                    <span className="sentinel-label">Retrain gate</span>
                    <span className={report?.retrain?.needed ? 'sentinel-badge-high' : 'sentinel-badge-success'}>
                      {report?.retrain?.needed ? 'TRIGGERED' : 'HOLD'}
                    </span>
                  </div>
                  {(report?.retrain?.reasons?.length ?? 0) > 0 && (
                    <ul className="text-xs text-amber-300 space-y-1">
                      {report!.retrain.reasons.map((r) => (
                        <li key={r}>• {r}</li>
                      ))}
                    </ul>
                  )}
                  <div className="pt-2 border-t border-sentinel-border text-sm space-y-1">
                    <p>Champion <span className="font-mono text-blue-300">{report?.champion_version}</span></p>
                    <p>A/B split {Math.round((report?.ab_test.traffic_split.champion ?? 1) * 100)}% / {Math.round((report?.ab_test.traffic_split.challenger ?? 0) * 100)}%</p>
                    <p className="text-sentinel-muted text-xs">{report?.cost_model.notes}</p>
                  </div>
                </motion.div>
              </div>

              {selected && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="sentinel-card">
                    <h2 className="text-lg font-semibold mb-1">{selected.name}</h2>
                    <p className="text-sm text-sentinel-muted mb-4">{selected.description ?? selected.family}</p>
                    <p className="sentinel-label mb-3">Confusion matrix (hold-out)</p>
                    <ConfusionMatrix cm={selected.confusion_matrix} />
                    <p className="text-xs text-sentinel-muted mt-4">
                      Missed fraud cost {formatCurrency(selected.missed_fraud_cost_inr)} · FP review {formatCurrency(selected.false_positive_cost_inr)}
                    </p>
                  </div>
                  <div className="sentinel-card">
                    <h2 className="text-lg font-semibold mb-4">ROC curve</h2>
                    <ResponsiveContainer width="100%" height={260}>
                      <LineChart data={rocData}>
                        <XAxis dataKey="fpr" stroke="#64748b" fontSize={12} unit="%" />
                        <YAxis stroke="#64748b" fontSize={12} unit="%" domain={[0, 100]} />
                        <Tooltip
                          contentStyle={{ background: '#111827', border: '1px solid #1e293b', borderRadius: 8 }}
                          formatter={(v: number) => [`${v}%`]}
                        />
                        <Line type="monotone" dataKey="tpr" stroke="#3b82f6" strokeWidth={2} dot={false} name="TPR" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {history.length > 1 && (
                <div className="sentinel-card">
                  <h2 className="text-lg font-semibold mb-4">Eval history</h2>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={history}>
                      <XAxis dataKey="evaluated_at" hide />
                      <YAxis domain={[0, 1]} stroke="#64748b" fontSize={12} />
                      <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1e293b', borderRadius: 8 }} />
                      <Line type="monotone" dataKey="avg_roc_auc" stroke="#10b981" dot={false} name="ROC AUC" />
                      <Line type="monotone" dataKey="avg_precision" stroke="#3b82f6" dot={false} name="Precision" />
                      <Line type="monotone" dataKey="avg_recall" stroke="#f59e0b" dot={false} name="Recall" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          )}
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
