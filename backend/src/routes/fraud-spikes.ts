import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { callAiEngine } from '../services/ai-client';
import { logAuditEvent } from '../services/metrics';
import { getCurrentSimulation } from './attacks';

const router = Router();

const analyzeSchema = z.object({
  timeframe_minutes: z.number().int().min(15).max(1440).default(60),
  pattern_type: z.string().optional(),
});

interface FraudSpikeDashboard {
  current_spikes: number;
  severity_breakdown: Record<string, number>;
  overall_risk_level: string;
  active_patterns: number;
  trends: Record<string, unknown>;
  recent_spikes: Array<{
    pattern: string;
    severity: string;
    confidence: number;
    transactions: number;
    timeframe: string;
    riskScore: number;
  }>;
  attack_context?: {
    active_attack?: boolean;
    attack_scenario?: string;
    attack_generation?: number;
    defense_effectiveness?: number;
    network_risk_score?: number;
  };
}

interface FraudTrends {
  hourlyTrends: Array<{
    hour: string;
    fraudEvents: number;
    riskScore: number;
  }>;
}

interface AnalyzeResult {
  spikes: Array<{
    pattern: string;
    severity: string;
    confidence: number;
    transactions: number;
    timeframe: string;
    riskScore: number;
  }>;
  analysis_time: number;
}

export function buildLiveFraudSpikeDashboard(simulation: {
  scenario?: string;
  generation?: number;
  detection_rate?: number;
  blind_spot_discovered?: boolean;
  transactions_count?: number;
}) {
  const detectionRate = simulation.detection_rate ?? 18;
  const activeAttack = !!simulation.blind_spot_discovered || (simulation.generation ?? 0) > 0;
  const scenario = simulation.scenario || 'Distributed Account Network';
  const txCount = simulation.transactions_count ?? 42000;

  const baseSpikes = [
    {
      pattern: 'Distributed Account Network',
      severity: 'high' as const,
      confidence: Math.min(99, 82 + (100 - detectionRate) / 2),
      transactions: Math.max(300, Math.round(txCount * 0.12)),
      timeframe: `Gen ${simulation.generation ?? 1} momentum`,
      riskScore: 8.8 + Math.min(1.8, (100 - detectionRate) / 30),
    },
    {
      pattern: 'Credential Stuffing Burst',
      severity: 'medium' as const,
      confidence: Math.min(96, 72 + (100 - detectionRate) / 3),
      transactions: Math.max(180, Math.round(txCount * 0.07)),
      timeframe: 'Within last 20 min',
      riskScore: 7.2 + Math.min(1.4, (100 - detectionRate) / 40),
    },
    {
      pattern: 'Device Rotation Cluster',
      severity: 'high' as const,
      confidence: Math.min(97, 76 + (100 - detectionRate) / 2.5),
      transactions: Math.max(220, Math.round(txCount * 0.09)),
      timeframe: 'Within last 35 min',
      riskScore: 8.3 + Math.min(1.7, (100 - detectionRate) / 35),
    },
  ];

  return {
    totalSpikes: Math.max(3, Math.round(baseSpikes.length + (100 - detectionRate) / 3)),
    highRiskSpikes: Math.max(2, Math.round(baseSpikes.filter((spike) => spike.severity === 'high').length + (simulation.blind_spot_discovered ? 1 : 0))),
    averageConfidence: Number((baseSpikes.reduce((sum, spike) => sum + spike.confidence, 0) / baseSpikes.length).toFixed(1)),
    transactionsAffected: Math.max(700, Math.round(txCount * 0.18)),
    patternBreakdown: [
      { pattern: 'Account Takeover', count: 8 },
      { pattern: 'Payment Velocity', count: 6 },
      { pattern: 'Device Rotation', count: 5 },
      { pattern: 'Card Testing', count: 4 },
    ],
    recentSpikes: baseSpikes,
    attackContext: {
      activeAttack,
      attackScenario: activeAttack ? scenario : 'None',
      attackGeneration: simulation.generation ?? 0,
      defenseEffectiveness: activeAttack ? Math.max(58, 100 - detectionRate) : 0,
      networkRiskScore: Number(Math.max(0.45, Math.min(0.98, (100 - detectionRate) / 100)).toFixed(2)),
    },
  };
}

export function buildFallbackDashboardResponse() {
  return {
    totalSpikes: 12,
    highRiskSpikes: 3,
    averageConfidence: 87.3,
    transactionsAffected: 2547,
    patternBreakdown: [
      { pattern: 'Account Takeover', count: 8 },
      { pattern: 'Payment Velocity', count: 6 },
      { pattern: 'Device Rotation', count: 4 },
      { pattern: 'Card Testing', count: 3 },
    ],
    recentSpikes: [
      {
        pattern: 'Account Takeover Spike',
        severity: 'high',
        confidence: 92.3,
        transactions: 847,
        riskScore: 8.7,
        timeframe: '2 hours ago',
      },
      {
        pattern: 'Velocity Pattern Anomaly',
        severity: 'medium',
        confidence: 78.9,
        transactions: 324,
        riskScore: 6.2,
        timeframe: '45 minutes ago',
      },
    ],
    attackContext: {
      activeAttack: false,
      attackScenario: 'None',
      attackGeneration: 0,
      defenseEffectiveness: 0,
      networkRiskScore: 0,
    },
  };
}

export function buildFallbackTrendsResponse() {
  return {
    hourlyTrends: Array.from({ length: 24 }, (_, i) => ({
      hour: `${i.toString().padStart(2, '0')}:00`,
      fraudEvents: Math.floor(Math.random() * 50) + 10,
      riskScore: Math.random() * 10,
    })),
  };
}

// Dashboard endpoint
router.get('/dashboard', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const currentSimulation = getCurrentSimulation();
    const simulation = {
      scenario: currentSimulation?.scenario,
      generation: currentSimulation?.generation,
      detection_rate: currentSimulation?.detection_rate,
      blind_spot_discovered: currentSimulation?.blind_spot_discovered,
      transactions_count: currentSimulation?.transactions_count,
    };

    const hasLiveSimulationState = !!(
      simulation.scenario ||
      simulation.generation ||
      simulation.detection_rate !== undefined ||
      simulation.blind_spot_discovered
    );

    if (hasLiveSimulationState) {
      res.json(buildLiveFraudSpikeDashboard(simulation));
      return;
    }

    const result = await callAiEngine<FraudSpikeDashboard>('/api/fraud-spikes/dashboard');

    if (!result) {
      res.json(buildFallbackDashboardResponse());
      return;
    }

    const attackContext = result.attack_context || {};

    const transformed = {
      totalSpikes: result.current_spikes,
      highRiskSpikes: result.severity_breakdown.high + result.severity_breakdown.critical || 0,
      averageConfidence: result.recent_spikes?.reduce((sum, spike) => sum + spike.confidence, 0) / Math.max(1, result.recent_spikes?.length || 1) || 85.5,
      transactionsAffected: result.recent_spikes?.reduce((sum, spike) => sum + spike.transactions, 0) || 0,
      patternBreakdown: Object.entries(result.trends || {}).map(([pattern, count]: [string, any]) => ({
        pattern: pattern.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        count: typeof count === 'number' ? count : count.recent_count || count.average_count || 1,
      })),
      recentSpikes: result.recent_spikes || [],
      attackContext: {
        activeAttack: attackContext.active_attack || false,
        attackScenario: attackContext.attack_scenario || 'None',
        attackGeneration: attackContext.attack_generation || 0,
        defenseEffectiveness: attackContext.defense_effectiveness || 0,
        networkRiskScore: attackContext.network_risk_score || 0,
      }
    };

    res.json(transformed);
  } catch (error) {
    console.error('Fraud spikes dashboard error:', error);
    res.json(buildFallbackDashboardResponse());
  }
});

// Analyze patterns endpoint
router.post('/analyze', authMiddleware, validateBody(analyzeSchema), async (req: Request, res: Response) => {
  try {
    const { timeframe_minutes, pattern_type } = req.body;

    await logAuditEvent('fraud_analysis', `Fraud pattern analysis started for ${timeframe_minutes}min window`, 'AI');

    const result = await callAiEngine<AnalyzeResult>('/api/fraud-spikes/analyze', {
      timeframe_minutes,
      pattern_type,
    });

    if (result) {
      res.json(result);
    } else {
      // Fallback mock data
      const mockSpikes = [
        {
          pattern: 'High-Velocity Card Testing',
          severity: 'high' as const,
          confidence: 94.2,
          transactions: 1247,
          riskScore: 9.1,
          timeframe: `Last ${timeframe_minutes} minutes`,
        },
        {
          pattern: 'Account Enumeration Pattern',
          severity: 'medium' as const,
          confidence: 81.7,
          transactions: 632,
          riskScore: 7.4,
          timeframe: `Last ${timeframe_minutes} minutes`,
        },
      ];

      res.json({
        spikes: mockSpikes,
        analysis_time: timeframe_minutes,
      });
    }

    await logAuditEvent('fraud_analysis_completed', `Found ${result?.spikes?.length || 2} fraud spikes`, 'AI');
  } catch (error) {
    console.error('Fraud analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze fraud patterns' });
  }
});

// Trends endpoint
router.get('/trends', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const result = await callAiEngine<FraudTrends>('/api/fraud-spikes/trends');

    if (!result) {
      res.json(buildFallbackTrendsResponse());
      return;
    }

    res.json(result);
  } catch (error) {
    console.error('Fraud trends error:', error);
    res.json(buildFallbackTrendsResponse());
  }
});

export default router;