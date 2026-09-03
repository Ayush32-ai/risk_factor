import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { runAttackSimulation } from '../services/ai-client';
import { logAuditEvent } from '../services/metrics';
import { mockData } from '../data/mock';
import { redis, isRedisReady } from '../db';
import { getCurrentSimulation, setCurrentSimulation } from '../state/simulation';

const router = Router();

const simulateSchema = z.object({
  target: z.string().default('Payment Risk Engine'),
  scenario: z.string().default('Distributed Account Network'),
  generation: z.number().int().min(1).max(100).default(1),
});

const SIM_KEY = 'sentinel:current_simulation';

// Intelligent blind spot detection based on multiple factors
function calculateBlindSpotDiscovery(detectionRate: number, generation: number, scenario: string): boolean {
  // Base threshold varies by scenario - higher thresholds make blind spots rarer
  const scenarioThresholds = {
    'Distributed Account Network': 20,  // Conservative - need very low detection
    'Refund Loop Exploitation': 25,     // Moderate threshold 
    'Merchant Cluster Abuse': 30,       // Higher threshold - easier to find blind spots
    'Velocity Limit Bypass': 15,        // Very conservative - this is well-defended
    'Device Fingerprint Rotation': 35,  // Highest threshold - often has blind spots
  };
  
  const threshold = scenarioThresholds[scenario as keyof typeof scenarioThresholds] || 25;
  
  // Generation factor - higher generations get slight bonus but diminishing returns
  const generationBonus = Math.min(generation * 1.5, 8); // Max 8% bonus at gen 5+
  const adjustedThreshold = threshold + generationBonus;
  
  // Add significant randomness - 30% of blind spot discovery is pure chance
  const randomFactor = (Math.random() - 0.5) * 15; // ±7.5% random variation
  const finalThreshold = adjustedThreshold + randomFactor;
  
  // Additional random chance - sometimes attacks just fail regardless of detection rate
  const randomFailure = Math.random() < 0.15; // 15% chance attack just fails
  if (randomFailure && detectionRate > threshold * 0.7) {
    return false; // Attack failed to find blind spot despite low detection
  }
  
  // Blind spot discovered if detection rate is below the dynamic threshold
  return detectionRate < finalThreshold;
}

export async function initializeAttackState() {
  try {
    if (isRedisReady()) {
      const raw = await redis.get(SIM_KEY);
      if (raw) {
        try {
          setCurrentSimulation(JSON.parse(raw));
          console.log('✓ Loaded persisted attack simulation from Redis:', getCurrentSimulation());
        } catch (e) {
          // Attempt to recover from legacy or malformed key formats like: {id:sim-123,target:...}
          try {
            const parseLegacy = (s: string) => {
              const out: Record<string, any> = {};
              const trimmed = s.replace(/^[^{]*{?/, '').replace(/}\s*$/, '');
              const parts = trimmed.split(/,(?=[^,]*:)/g);
              for (const p of parts) {
                const idx = p.indexOf(':');
                if (idx === -1) continue;
                const k = p.slice(0, idx).trim().replace(/^['"`]?(.*?)['"`]?$/,'$1');
                let v = p.slice(idx + 1).trim();
                v = v.replace(/^['"]|['"]$/g, '');
                if (/^-?\d+(?:\.\d+)?$/.test(v)) out[k] = Number(v);
                else if (/^(true|false)$/i.test(v)) out[k] = v.toLowerCase() === 'true';
                else out[k] = v;
              }
              return out;
            };

            const normalized = parseLegacy(raw);
            // Ensure keys align with expected shape
            if (normalized.detectionRate && !normalized.detection_rate) {
              normalized.detection_rate = normalized.detectionRate;
            }
            const normalizedSim = {
              id: normalized.id || `sim-${Date.now()}`,
              target: normalized.target || 'Payment Risk Engine',
              scenario: normalized.scenario || normalized.attack_pattern || 'Distributed Account Network',
              generation: Number(normalized.generation || normalized.generation || 1),
              transactions_count: Number(normalized.transactions_count || 0),
              accounts_count: Number(normalized.accounts_count || 0),
              merchants_count: Number(normalized.merchants_count || 0),
              detection_rate: Number(normalized.detection_rate || 0),
              status: normalized.status || 'running',
              blind_spot_discovered: normalized.blind_spot_discovered === true || normalized.blind_spot_discovered === 'true' || (Number(normalized.detection_rate || 0) < 30),
            };
            setCurrentSimulation(normalizedSim);

            // Persist normalized JSON back to Redis so other services can read it reliably
            try {
              await redis.set(SIM_KEY, JSON.stringify(getCurrentSimulation()));
              console.log('✓ Rewrote corrupted persisted simulation to normalized JSON in Redis');
            } catch (err) {
              console.warn('⚠ Could not rewrite normalized simulation to Redis', err);
            }
          } catch (err2) {
            console.warn('⚠ Failed to parse legacy persisted attack simulation', err2);
          }
        }
      } else {
        console.log('ℹ No persisted attack simulation found - starting with default state');
      }
    } else {
      console.log('ℹ Redis not available - starting with default simulation state');
    }
  } catch (err) {
    console.warn('⚠ Failed to load persisted attack simulation from Redis', err);
  }

  // Log current simulation state
  console.log('ℹ Current simulation state:', getCurrentSimulation());
}

// use shared simulation state

router.get('/current', authMiddleware, (_req: Request, res: Response) => {
  res.json({ simulation: getCurrentSimulation() });
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
  
  // More intelligent blind spot detection
  const isBlindSpot = calculateBlindSpotDiscovery(result.detection_rate, generation, scenario);
  
  const simObj = {
    id: result.id || `sim-${Date.now()}`,
    target,
    scenario,
    generation: result.generation || generation,
    transactions_count: result.transactions_count,
    accounts_count: result.accounts_count,
    merchants_count: result.merchants_count,
    detection_rate: result.detection_rate,
    status: 'completed',
    blind_spot_discovered: isBlindSpot,
  };
  setCurrentSimulation(simObj);

  if (simObj.blind_spot_discovered) {
    await logAuditEvent(
      'blind_spot_discovered',
      `Blind spot discovered: ${scenario} (${getCurrentSimulation().detection_rate}% detection)`,
      'AI'
    );
  }

  res.json({ simulation: getCurrentSimulation() });
  
  // Persist to Redis so other services share the same simulation state
  try {
    if (isRedisReady()) await redis.set(SIM_KEY, JSON.stringify(getCurrentSimulation()));
  } catch (err) {
    console.warn('⚠ Failed to persist attack simulation to Redis', err);
  }
});

router.post('/evolve', authMiddleware, async (_req: Request, res: Response) => {
  const current = getCurrentSimulation();
  const nextGen = (current.generation || 1) + 1;
  const result = await runAttackSimulation(current.scenario, nextGen);

  // Calculate evolved metrics with more realistic progression
  const baseTransactions = result.transactions_count || current.transactions_count || 25000;
  const baseAccounts = result.accounts_count || current.accounts_count || 100;
  const baseMerchants = result.merchants_count || current.merchants_count || 15;
  
  const evolved = {
    ...current,
    generation: nextGen,
    transactions_count: Math.floor(baseTransactions + Math.random() * 10000 + nextGen * 2000),
    accounts_count: Math.floor(baseAccounts + Math.random() * 30 + nextGen * 8),
    merchants_count: Math.floor(baseMerchants + Math.random() * 8 + nextGen * 2),
    detection_rate: result.detection_rate,
    blind_spot_discovered: calculateBlindSpotDiscovery(result.detection_rate, nextGen, current.scenario),
  };

  setCurrentSimulation(evolved);

  res.json({ simulation: getCurrentSimulation() });
  
  try {
    if (isRedisReady()) await redis.set(SIM_KEY, JSON.stringify(getCurrentSimulation()));
  } catch (err) {
    console.warn('⚠ Failed to persist attack simulation to Redis', err);
  }
});

router.post('/start/demo', authMiddleware, async (_req: Request, res: Response) => {
  try {
    // Create a demo simulation with realistic data that may or may not show blind spot
    const demoDetectionRate = 35 + Math.random() * 50; // 35-85% range - much wider and higher
    const demoGeneration = Math.floor(1 + Math.random() * 3); // Gen 1-3 for demo
    const demoScenario = 'Distributed Account Network';
    
    const demoSim = {
      id: `demo-${Date.now()}`,
      target: 'Payment Risk Engine',
      scenario: demoScenario,
      generation: demoGeneration,
      transactions_count: Math.floor(30000 + Math.random() * 40000),
      accounts_count: Math.floor(80 + Math.random() * 100),
      merchants_count: Math.floor(15 + Math.random() * 25),
      detection_rate: Math.round(demoDetectionRate * 10) / 10,
      status: 'running',
      blind_spot_discovered: calculateBlindSpotDiscovery(demoDetectionRate, demoGeneration, demoScenario),
    };

    setCurrentSimulation(demoSim);
    
    await logAuditEvent('demo_simulation_started', `Demo attack simulation started — ${demoSim.scenario}`, 'System');

    console.log('✅ Demo simulation started:', demoSim);
    
    res.json({ 
      simulation: getCurrentSimulation(),
      message: 'Demo simulation started with active attack data'
    });
    
    // Persist to Redis so other services share the same simulation state
    try {
      if (isRedisReady()) await redis.set(SIM_KEY, JSON.stringify(getCurrentSimulation()));
    } catch (err) {
      console.warn('⚠ Failed to persist demo simulation to Redis', err);
    }
  } catch (error) {
    console.error('Demo simulation error:', error);
    res.status(500).json({ error: 'Failed to start demo simulation' });
  }
});

router.post('/stop', authMiddleware, async (_req: Request, res: Response) => {
  try {
    // Reset to idle state
    const idleSim = {
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

    setCurrentSimulation(idleSim);
    
    await logAuditEvent('simulation_stopped', 'Attack simulation stopped', 'User');

    console.log('🛑 Simulation stopped');
    
    res.json({ 
      simulation: getCurrentSimulation(),
      message: 'Simulation stopped'
    });
    
    // Clear from Redis
    try {
      if (isRedisReady()) await redis.del(SIM_KEY);
    } catch (err) {
      console.warn('⚠ Failed to clear simulation from Redis', err);
    }
  } catch (error) {
    console.error('Stop simulation error:', error);
    res.status(500).json({ error: 'Failed to stop simulation' });
  }
});

export default router;

// Optional: force-start simulation without auth when ALLOW_FORCE_SIM is enabled
router.post('/start/force', async (req: Request, res: Response) => {
  try {
    const allow = (process.env.ALLOW_FORCE_SIM || '').toLowerCase();
    if (!['1', 'true', 'yes'].includes(allow)) {
      return res.status(403).json({ error: 'force simulation disabled' });
    }

    const body = req.body || {};
    const scenario = body.scenario || 'Distributed Account Network';
    const generation = Number(body.generation || 1);

    const result = await runAttackSimulation(scenario, generation);
    const simObj = {
      id: result.id || `sim-${Date.now()}`,
      target: body.target || 'Payment Risk Engine',
      scenario,
      generation: result.generation || generation,
      transactions_count: result.transactions_count,
      accounts_count: result.accounts_count,
      merchants_count: result.merchants_count,
      detection_rate: result.detection_rate,
      status: 'running',
      blind_spot_discovered: result.detection_rate < 30,
    };

    setCurrentSimulation(simObj);

    res.json({ simulation: getCurrentSimulation(), note: 'force simulation started' });
  } catch (err) {
    console.error('Force start simulation error:', err);
    res.status(500).json({ error: 'failed to start simulation' });
  }
});
