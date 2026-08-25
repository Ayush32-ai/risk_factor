import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { getBlindSpots } from '../services/metrics';

const router = Router();

router.get('/', authMiddleware, async (_req: Request, res: Response) => {
  const spots = await getBlindSpots();
  res.json({
    blindSpots: spots.map((s: Record<string, unknown>) => ({
      id: s.id,
      title: s.title,
      severity: s.severity,
      detectionRate: Number(s.detection_rate),
      potentialExposure: Number(s.potential_exposure),
      rootCause: s.root_cause,
      aiRecommendation: s.ai_recommendation,
      attackPattern: s.attack_pattern,
      status: s.status || 'open',
      discoveredAt: s.discovered_at,
    })),
  });
});

router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  const spots = await getBlindSpots();
  const spot = spots.find((s: Record<string, unknown>) => s.id === req.params.id);
  if (!spot) {
    res.status(404).json({ error: 'Blind spot not found' });
    return;
  }
  res.json({ blindSpot: spot });
});

export default router;
