import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { runAttackSimulation } from '../services/ai-client';
import { logAuditEvent } from '../services/metrics';
import { mockData } from '../data/mock';

const router = Router();

const simulateSchema = z.object({
  target: z.string().default('Payment Risk Engine'),
  scenario: z.string().default('Distributed Account Network'),
  generation: z.number().int().min(1).max(100).default(1),
});

export let currentSimulation = {
  id: '',
  target: '',
  scenario: '',
  generation: 0,
  transactions_count: 0,
  accounts_count: 0,
  merchants_count: 0,
  detection_rate: 0,
  status: 'idle',
  blind_spot_discovered: false,
};

export function getCurrentSimulation() {
  return currentSimulation;
}

router.get('/current', authMiddleware, (_req: Request, res: Response) => {
  res.json({ simulation: currentSimulation });
});

router.get('/scenarios', authMiddleware, (_req: Request, res: Response) => {
  res.json({
    scenarios: [
      { id: 'distributed_account_network', name: 'Distributed Account Network', description: 'Multiple accounts coordinated via shared devices' },
      { id: 'refund_loop', name: 'Refund Loop Exploitation', description: 'Circular refund patterns to extract funds' },
      { id: 'merchant_cluster', name: 'Merchant Cluster Abuse', description: 'Coordinated payments to high-risk merchants' },
      { id: 'velocity_bypass', name: 'Velocity Limit Bypass', description: 'Split transactions across linked accounts' },
      { id: 'device_rotation', name: 'Device Fingerprint Rotation', description: 'Rapid device fingerprint changes' },
    ],
  });
});

router.post('/start', authMiddleware, validateBody(simulateSchema), async (req: Request, res: Response) => {
  const { target, scenario, generation } = req.body;

  await logAuditEvent('simulation_started', `Attack simulation started — ${scenario}`, 'AI');

  const result = await runAttackSimulation(scenario, generation);
  currentSimulation = {
    id: result.id || `sim-${Date.now()}`,
    target,
    scenario,
    generation: result.generation || generation,
    transactions_count: result.transactions_count,
    accounts_count: result.accounts_count,
    merchants_count: result.merchants_count,
    detection_rate: result.detection_rate,
    status: 'completed',
    blind_spot_discovered: result.detection_rate < 30,
  };

  if (currentSimulation.blind_spot_discovered) {
    await logAuditEvent(
      'blind_spot_discovered',
      `Blind spot discovered: ${scenario} (${currentSimulation.detection_rate}% detection)`,
      'AI'
    );
  }

  res.json({ simulation: currentSimulation });
});

router.post('/evolve', authMiddleware, async (_req: Request, res: Response) => {
  const nextGen = (currentSimulation.generation || 1) + 1;
  const result = await runAttackSimulation(currentSimulation.scenario, nextGen);

  currentSimulation = {
    ...currentSimulation,
    generation: nextGen,
    transactions_count: result.transactions_count + Math.floor(Math.random() * 5000),
    accounts_count: result.accounts_count + Math.floor(Math.random() * 20),
    detection_rate: Math.max(12, result.detection_rate - Math.random() * 2),
    blind_spot_discovered: result.detection_rate < 30,
  };

  res.json({ simulation: currentSimulation });
});

export default router;
