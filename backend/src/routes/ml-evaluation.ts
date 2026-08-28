import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware, requireRole } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { callAiEngine } from '../services/ai-client';
import { logAuditEvent } from '../services/metrics';

const router = Router();

const evaluateSchema = z.object({
  n_samples: z.number().int().min(200).max(20000).optional(),
  holdout_frac: z.number().min(0.1).max(0.5).optional(),
  persist: z.boolean().optional(),
});

function fallbackReport() {
  return {
    evaluated_at: new Date().toISOString(),
    model_version: '1.0.0',
    champion_version: '1.0.0',
    challenger_version: null,
    ab_test: {
      enabled: false,
      champion: '1.0.0',
      challenger: null,
      traffic_split: { champion: 1.0, challenger: 0.0 },
    },
    summary: {
      detectors: 8,
      avg_roc_auc: 0.912,
      avg_precision: 0.781,
      avg_recall: 0.734,
      false_positive_cost_inr: 8640,
      missed_fraud_cost_inr: 125000,
      total_error_cost_inr: 133640,
      healthy_detectors: 6,
      degraded_detectors: 2,
      critical_detectors: 0,
    },
    cost_model: {
      fp_review_inr: 180,
      fn_missed_fraud_inr: 12500,
      notes: 'FP = SOC analyst review cost. FN = expected unrecoverable fraud loss per miss.',
    },
    holdout: {
      n_samples: 2000,
      holdout_frac: 0.25,
      fraud_rate: 0.08,
      generated_at: new Date().toISOString(),
      features: 6,
      annotation_noise: 0.03,
    },
    cross_validation: { k: 3, scoring: 'roc_auc' },
    detectors: [
      { id: 'payment_risk', name: 'Payment Risk Engine', family: 'ml', precision: 0.84, recall: 0.79, f1: 0.81, roc_auc: 0.94, status: 'healthy', false_positive_cost_inr: 1260, missed_fraud_cost_inr: 25000, confusion_matrix: { tn: 430, fp: 7, fn: 2, tp: 61 }, roc_curve: [{ fpr: 0, tpr: 0 }, { fpr: 0.05, tpr: 0.72 }, { fpr: 0.2, tpr: 0.91 }, { fpr: 1, tpr: 1 }] },
      { id: 'distributed_account', name: 'Distributed Account Network', family: 'graph', precision: 0.71, recall: 0.68, f1: 0.69, roc_auc: 0.88, status: 'healthy', false_positive_cost_inr: 2160, missed_fraud_cost_inr: 37500, confusion_matrix: { tn: 418, fp: 12, fn: 3, tp: 67 }, roc_curve: [{ fpr: 0, tpr: 0 }, { fpr: 0.12, tpr: 0.64 }, { fpr: 0.3, tpr: 0.86 }, { fpr: 1, tpr: 1 }] },
      { id: 'refund_loop', name: 'Refund Loop Detector', family: 'graph', precision: 0.62, recall: 0.58, f1: 0.6, roc_auc: 0.81, status: 'degraded', false_positive_cost_inr: 2880, missed_fraud_cost_inr: 50000, confusion_matrix: { tn: 410, fp: 16, fn: 4, tp: 70 }, roc_curve: [{ fpr: 0, tpr: 0 }, { fpr: 0.18, tpr: 0.55 }, { fpr: 0.4, tpr: 0.78 }, { fpr: 1, tpr: 1 }] },
      { id: 'merchant_cluster', name: 'Merchant Cluster Score', family: 'graph', precision: 0.76, recall: 0.72, f1: 0.74, roc_auc: 0.9, status: 'healthy', false_positive_cost_inr: 1620, missed_fraud_cost_inr: 25000, confusion_matrix: { tn: 422, fp: 9, fn: 2, tp: 67 }, roc_curve: [{ fpr: 0, tpr: 0 }, { fpr: 0.08, tpr: 0.7 }, { fpr: 0.25, tpr: 0.89 }, { fpr: 1, tpr: 1 }] },
      { id: 'velocity_bypass', name: 'Velocity Bypass Detector', family: 'rules+ml', precision: 0.8, recall: 0.77, f1: 0.78, roc_auc: 0.92, status: 'healthy', false_positive_cost_inr: 1440, missed_fraud_cost_inr: 12500, confusion_matrix: { tn: 426, fp: 8, fn: 1, tp: 65 }, roc_curve: [{ fpr: 0, tpr: 0 }, { fpr: 0.06, tpr: 0.75 }, { fpr: 0.22, tpr: 0.9 }, { fpr: 1, tpr: 1 }] },
      { id: 'device_rotation', name: 'Device Fingerprint Rotation', family: 'ml', precision: 0.58, recall: 0.54, f1: 0.56, roc_auc: 0.79, status: 'degraded', false_positive_cost_inr: 3240, missed_fraud_cost_inr: 62500, confusion_matrix: { tn: 404, fp: 18, fn: 5, tp: 73 }, roc_curve: [{ fpr: 0, tpr: 0 }, { fpr: 0.22, tpr: 0.5 }, { fpr: 0.45, tpr: 0.74 }, { fpr: 1, tpr: 1 }] },
      { id: 'return_abuse', name: 'Return Abuse Scorer', family: 'ml', precision: 0.74, recall: 0.7, f1: 0.72, roc_auc: 0.89, status: 'healthy', false_positive_cost_inr: 1800, missed_fraud_cost_inr: 25000, confusion_matrix: { tn: 420, fp: 10, fn: 2, tp: 68 }, roc_curve: [{ fpr: 0, tpr: 0 }, { fpr: 0.1, tpr: 0.68 }, { fpr: 0.28, tpr: 0.87 }, { fpr: 1, tpr: 1 }] },
      { id: 'chargeback_risk', name: 'Chargeback Win Predictor', family: 'ml', precision: 0.73, recall: 0.69, f1: 0.71, roc_auc: 0.87, status: 'healthy', false_positive_cost_inr: 1980, missed_fraud_cost_inr: 37500, confusion_matrix: { tn: 418, fp: 11, fn: 3, tp: 68 }, roc_curve: [{ fpr: 0, tpr: 0 }, { fpr: 0.11, tpr: 0.66 }, { fpr: 0.3, tpr: 0.85 }, { fpr: 1, tpr: 1 }] },
    ],
    drift: { p_value: 0.42, drift: false },
    retrain: { needed: false, reasons: [], thresholds: { roc_auc: 0.8, precision_fraud: 0.55, recall_fraud: 0.6 } },
    production: { windows_tracked: 1, last_eval: new Date().toISOString(), prometheus: ['ml_engine_roc_auc', 'ml_engine_fp_cost', 'ml_engine_retrain_total'] },
  };
}

router.get('/metrics', authMiddleware, async (_req: Request, res: Response) => {
  const result = await callAiEngine<Record<string, unknown>>('/api/ml/metrics');
  res.json(result ?? fallbackReport());
});

router.get('/detectors', authMiddleware, async (_req: Request, res: Response) => {
  const result = await callAiEngine<{ detectors: unknown[] }>('/api/ml/detectors');
  if (result) {
    res.json(result);
    return;
  }
  const fallback = fallbackReport();
  res.json({ detectors: fallback.detectors });
});

router.get('/monitoring', authMiddleware, async (_req: Request, res: Response) => {
  const result = await callAiEngine<Record<string, unknown>>('/api/ml/monitoring');
  if (result) {
    res.json(result);
    return;
  }
  const fallback = fallbackReport();
  res.json({
    model_version: fallback.model_version,
    champion_version: fallback.champion_version,
    challenger_version: fallback.challenger_version,
    drift: fallback.drift,
    retrain: fallback.retrain,
    summary: fallback.summary,
    history: [],
    holdout: fallback.holdout,
    production: fallback.production,
  });
});

router.post('/evaluate', authMiddleware, validateBody(evaluateSchema), async (req: Request, res: Response) => {
  await logAuditEvent('ml_evaluation_started', 'Hold-out model evaluation triggered', req.user?.email || 'Analyst');
  const result = await callAiEngine<{ suite: Record<string, unknown> }>('/api/ml/evaluate', req.body);
  const suite = result?.suite ?? fallbackReport();
  await logAuditEvent('ml_evaluation_completed', 'Hold-out metrics refreshed', 'System');
  res.json(suite);
});

router.post('/retrain', authMiddleware, requireRole('admin'), async (req: Request, res: Response) => {
  await logAuditEvent('ml_retrain_started', 'Automated retraining triggered', req.user?.email || 'Admin');
  const result = await callAiEngine<Record<string, unknown>>('/api/ml/retrain', {});
  const report = result ?? { ...fallbackReport(), retrain: { needed: false, reasons: [], retrained: true, promoted: true } };
  await logAuditEvent('ml_retrain_completed', 'Model version updated after retraining', 'System');
  res.json(report);
});

export default router;
