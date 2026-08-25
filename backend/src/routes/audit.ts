import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { getAuditLogs } from '../services/metrics';

const router = Router();

router.get('/', authMiddleware, async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const logs = await getAuditLogs(limit);

  res.json({
    logs: logs.map((l: Record<string, unknown>) => ({
      id: l.id,
      eventType: l.event_type,
      description: l.event_description,
      actor: l.actor,
      metadata: l.metadata,
      timestamp: l.created_at,
    })),
  });
});

export default router;
