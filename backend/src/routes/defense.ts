import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware, requireRole } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { generateDefense, runDefenseSimulation } from '../services/ai-client';
import { logAuditEvent, broadcastActivityEvent } from '../services/metrics';
import { mockData } from '../data/mock';

const router = Router();

const defenseSchema = z.object({
  blindSpotId: z.string(),
  attackPattern: z.string().optional(),
  currentDetectionRate: z.number().optional(),
});

// Enhanced defense state management
interface DefenseState {
  current: any;
  history: any[];
  isSimulating: boolean;
  baselineRate: number;
  lastGenerated: string | null;
}

const defenseState: DefenseState = {
  current: mockData.defenseLab,
  history: [],
  isSimulating: false,
  baselineRate: 18.0,
  lastGenerated: null,
};

router.get('/current', authMiddleware, (_req: Request, res: Response) => {
  res.json({ 
    defense: defenseState.current, 
    isSimulating: defenseState.isSimulating,
    baselineRate: defenseState.baselineRate,
    history: defenseState.history.slice(-5), // Return last 5 defenses
  });
});

router.get('/history', authMiddleware, (_req: Request, res: Response) => {
  res.json({ 
    history: defenseState.history,
    totalGenerated: defenseState.history.length,
  });
});

router.post('/generate', authMiddleware, validateBody(defenseSchema), async (req: Request, res: Response) => {
  const { blindSpotId, attackPattern = 'default', currentDetectionRate } = req.body;

  await logAuditEvent('defense_generated', `AI generating defense rules for pattern: ${attackPattern}`, 'AI', { 
    blindSpotId, 
    attackPattern,
    currentDetectionRate 
  });

  await broadcastActivityEvent(
    `AI generating defense rules for attack pattern: ${attackPattern}`,
    'Defense Engine',
    'defense_generation'
  );

  try {
    const defense = await generateDefense(blindSpotId, attackPattern, currentDetectionRate);
    
    // Update state
    defenseState.current = defense;
    defenseState.history.push({
      ...defense,
      timestamp: new Date().toISOString(),
      action: 'generated'
    });
    defenseState.lastGenerated = new Date().toISOString();
    
    // If this is a different baseline, update it
    if (defense.existingDetectionRate) {
      defenseState.baselineRate = defense.existingDetectionRate;
    }

    await logAuditEvent('defense_generated', 
      `Defense rules generated: ${defense.generatedRules?.length || 0} rules, ${defense.improvement || 0}% improvement`, 
      'AI', 
      { 
        blindSpotId, 
        attackPattern,
        rulesCount: defense.generatedRules?.length || 0,
        improvement: defense.improvement || 0
      }
    );

    res.json({ defense: defenseState.current });
  } catch (error) {
    console.error('Defense generation failed:', error);
    res.status(500).json({ error: 'Failed to generate defense' });
  }
});

router.post('/simulate', authMiddleware, validateBody(defenseSchema), async (req: Request, res: Response) => {
  const { blindSpotId, attackPattern = 'default', currentDetectionRate } = req.body;
  
  defenseState.isSimulating = true;

  await logAuditEvent('defense_simulation', 
    `Defense simulation started — re-running attacks against pattern: ${attackPattern}`, 
    'AI',
    { blindSpotId, attackPattern }
  );

  try {
    const defense = await runDefenseSimulation(blindSpotId, attackPattern, currentDetectionRate);
    
    // Update state
    defenseState.current = defense;
    defenseState.history.push({
      ...defense,
      timestamp: new Date().toISOString(),
      action: 'simulated'
    });
    defenseState.isSimulating = false;

    await logAuditEvent('defense_simulation', 
      `Defense simulation completed: ${defense.attacksRerun || 10000} attacks, ${defense.improvement || 0}% improvement`, 
      'AI',
      { 
        blindSpotId, 
        attackPattern,
        attacksRerun: defense.attacksRerun || 10000,
        improvement: defense.improvement || 0,
        additionalBlocked: defense.attacksRerun || 0
      }
    );

    res.json({ defense: defenseState.current, isSimulating: false });
  } catch (error) {
    console.error('Defense simulation failed:', error);
    defenseState.isSimulating = false;
    res.status(500).json({ error: 'Failed to simulate defense' });
  }
});

router.post('/approve', authMiddleware, requireRole('admin'), async (req: Request, res: Response) => {
  const { defenseId } = req.body;

  await logAuditEvent('defense_approved', 
    `Defense rules approved for deployment (ID: ${defenseId || 'current'})`, 
    'Admin',
    { defenseId: defenseId || 'current' }
  );
  
  // Update baseline rate to reflect deployed defense
  if (defenseState.current.afterDetectionRate) {
    const improvement = (defenseState.current.afterDetectionRate - defenseState.baselineRate) * 0.3; // 30% of improvement persists
    defenseState.baselineRate = Math.min(defenseState.baselineRate + improvement, 45.0);
  }

  // Mark as approved in history
  if (defenseState.history.length > 0) {
    const lastDefense = defenseState.history[defenseState.history.length - 1];
    lastDefense.approved = true;
    lastDefense.approvedAt = new Date().toISOString();
  }

  await logAuditEvent('model_updated', 
    `Risk model updated with new defense rules — baseline improved to ${defenseState.baselineRate.toFixed(1)}%`, 
    'System',
    { 
      newBaselineRate: defenseState.baselineRate,
      defenseId: defenseId || 'current'
    }
  );

  res.json({ 
    status: 'approved', 
    defense: defenseState.current,
    newBaselineRate: defenseState.baselineRate
  });
});

router.get('/patterns', authMiddleware, (_req: Request, res: Response) => {
  // Return available attack patterns for dynamic selection
  const patterns = [
    { id: 'distributed_account_network', name: 'Distributed Account Network', description: 'Coordinated accounts acting as a network' },
    { id: 'refund_loop', name: 'Refund Loop Exploitation', description: 'Circular refund schemes' },
    { id: 'merchant_cluster', name: 'Merchant Cluster Abuse', description: 'Coordinated merchant networks' },
    { id: 'device_spoofing', name: 'Device Spoofing', description: 'Multiple accounts from same devices' },
    { id: 'velocity_attacks', name: 'Velocity Attacks', description: 'High-speed transaction patterns' },
    { id: 'default', name: 'General Patterns', description: 'Generic fraud patterns' },
  ];
  
  res.json({ patterns });
});

export default router;
