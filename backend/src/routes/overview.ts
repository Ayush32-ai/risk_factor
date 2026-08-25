import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { getOverviewMetrics, getActivityTimeline } from '../services/metrics';

const router = Router();

router.get('/', authMiddleware, async (_req: Request, res: Response) => {
  const [metrics, timeline] = await Promise.all([
    getOverviewMetrics(),
    getActivityTimeline(),
  ]);

  res.json({
    metrics: {
      modelHealth: Number(metrics.model_health),
      transactionsTested: Number(metrics.transactions_tested),
      blindSpotsFound: Number(metrics.blind_spots_count),
      criticalVulnerabilities: Number(metrics.critical_vulnerabilities),
      attacksBlocked: Number(metrics.attacks_blocked_rate),
    },
    timeline: timeline.map((t: Record<string, unknown>) => ({
      eventType: t.event_type,
      description: t.event_description,
      actor: t.actor,
      timestamp: t.created_at,
    })),
    status: 'live',
  });
});

export default router;
