import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { callAiEngine } from '../services/ai-client';
import { logAuditEvent } from '../services/metrics';
import { getCurrentSimulation } from '../state/simulation';

// In-memory fraud spike history storage
interface FraudSpikeHistoryEntry {
  id: string;
  timestamp: Date;
  pattern: string;
  severity: 'high' | 'medium' | 'low';
  confidence: number;
  transactions: number;
  timeframe: string;
  riskScore: number;
  simulationId: string;
  generation: number;
  scenario: string;
}

let fraudSpikeHistory: FraudSpikeHistoryEntry[] = [];

// Helper functions for managing fraud spike history
export function addFraudSpikeToHistory(spike: Omit<FraudSpikeHistoryEntry, 'id' | 'timestamp'>) {
  const entry: FraudSpikeHistoryEntry = {
    id: `spike-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date(),
    ...spike,
  };
  
  fraudSpikeHistory.push(entry);
  
  // Keep only last 100 entries to prevent memory issues
  if (fraudSpikeHistory.length > 100) {
    fraudSpikeHistory = fraudSpikeHistory.slice(-100);
  }
  
  console.log(`📊 Added fraud spike to history: ${spike.pattern} (Total entries: ${fraudSpikeHistory.length})`);
}

export function getFraudSpikeHistory(limit: number = 20): FraudSpikeHistoryEntry[] {
  // Return most recent entries first
  return fraudSpikeHistory
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, limit);
}

export function clearFraudSpikeHistory() {
  fraudSpikeHistory = [];
  console.log('🗑️ Cleared fraud spike history');
}

// Initialize with some baseline fraud activity
export function initializeFraudSpikeHistory() {
  if (fraudSpikeHistory.length === 0) {
    const baselineSpikes = [
      {
        pattern: 'Card Testing Activity',
        severity: 'medium' as 'high' | 'medium' | 'low',
        confidence: 78.5,
        transactions: 145,
        timeframe: '2 hours ago',
        riskScore: 6.2,
        simulationId: 'baseline-activity',
        generation: 0,
        scenario: 'Background Activity',
      },
      {
        pattern: 'Unusual Login Pattern',
        severity: 'low' as 'high' | 'medium' | 'low',
        confidence: 65.3,
        transactions: 67,
        timeframe: '3 hours ago',
        riskScore: 4.8,
        simulationId: 'baseline-activity',
        generation: 0,
        scenario: 'Background Activity',
      },
      {
        pattern: 'Velocity Anomaly',
        severity: 'medium' as 'high' | 'medium' | 'low',
        confidence: 72.1,
        transactions: 203,
        timeframe: '4 hours ago',
        riskScore: 5.9,
        simulationId: 'baseline-activity',
        generation: 0,
        scenario: 'Background Activity',
      },
    ];

    baselineSpikes.forEach(spike => {
      const entry: FraudSpikeHistoryEntry = {
        id: `baseline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(Date.now() - Math.random() * 4 * 60 * 60 * 1000), // Random time in last 4 hours
        ...spike,
      };
      fraudSpikeHistory.push(entry);
    });

    console.log(`📊 Initialized fraud spike history with ${baselineSpikes.length} baseline entries`);
  }
}

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
  const generation = simulation.generation ?? 1;
  const simulationId = `sim-${scenario}-${generation}`;

  // Create realistic, time-based fraud spikes based on actual attack progression
  const now = new Date();
  
  // Calculate severities
  const primarySeverity = detectionRate < 25 ? 'high' : detectionRate < 50 ? 'medium' : 'low';
  const secondarySeverity = detectionRate < 30 ? 'high' : 'medium';
  const tertiarySeverity = detectionRate < 20 ? 'high' : detectionRate < 40 ? 'medium' : 'low';
  
  const currentSpikes = [
    {
      pattern: scenario, // Use actual scenario name
      severity: primarySeverity as 'high' | 'medium' | 'low',
      confidence: Math.min(99, 82 + (100 - detectionRate) / 2 + generation * 2),
      transactions: Math.max(300, Math.round(txCount * (0.12 + generation * 0.02))),
      timeframe: `Gen ${generation} active (${Math.floor((100 - detectionRate) * 1.2)}min ago)`,
      riskScore: Number((8.8 + Math.min(1.8, (100 - detectionRate) / 30) + generation * 0.3).toFixed(2)),
    },
    {
      pattern: 'Credential Stuffing Evolution',
      severity: secondarySeverity as 'high' | 'medium' | 'low',
      confidence: Math.min(96, 72 + (100 - detectionRate) / 3 + generation),
      transactions: Math.max(180, Math.round(txCount * (0.07 + generation * 0.01))),
      timeframe: `${Math.floor(20 + generation * 5)}min ago`,
      riskScore: Number((7.2 + Math.min(1.4, (100 - detectionRate) / 40) + generation * 0.2).toFixed(2)),
    },
    {
      pattern: `${scenario} Network Expansion`,
      severity: tertiarySeverity as 'high' | 'medium' | 'low',
      confidence: Math.min(97, 76 + (100 - detectionRate) / 2.5 + generation * 1.5),
      transactions: Math.max(220, Math.round(txCount * (0.09 + generation * 0.015))),
      timeframe: `${Math.floor(35 + generation * 8)}min ago`,
      riskScore: Number((8.3 + Math.min(1.7, (100 - detectionRate) / 35) + generation * 0.25).toFixed(2)),
    },
  ];

  // Add scenario-specific spikes
  if (scenario.includes('Refund')) {
    currentSpikes.push({
      pattern: 'Circular Refund Pattern',
      severity: 'high' as 'high' | 'medium' | 'low',
      confidence: Math.min(94, 85 + (100 - detectionRate) / 4),
      transactions: Math.round(txCount * 0.05),
      timeframe: `${Math.floor(15 + generation * 3)}min ago`,
      riskScore: Number((9.1 + Math.min(0.8, (100 - detectionRate) / 50)).toFixed(2)),
    });
  }

  if (scenario.includes('Velocity')) {
    currentSpikes.push({
      pattern: 'High-Velocity Transaction Burst',
      severity: 'high' as 'high' | 'medium' | 'low',
      confidence: Math.min(98, 88 + (100 - detectionRate) / 5),
      transactions: Math.round(txCount * 0.08),
      timeframe: `${Math.floor(8 + generation * 2)}min ago`,
      riskScore: Number((8.7 + Math.min(1.2, (100 - detectionRate) / 25)).toFixed(2)),
    });
  }

  if (scenario.includes('Device')) {
    currentSpikes.push({
      pattern: 'Fingerprint Rotation Attack',
      severity: 'high' as 'high' | 'medium' | 'low',
      confidence: Math.min(95, 80 + (100 - detectionRate) / 3),
      transactions: Math.round(txCount * 0.06),
      timeframe: `${Math.floor(12 + generation * 4)}min ago`,
      riskScore: Number((8.9 + Math.min(1.0, (100 - detectionRate) / 30)).toFixed(2)),
    });
  }

  // Add current spikes to history (but avoid duplicates)
  const existingPatterns = new Set(fraudSpikeHistory.slice(-10).map(h => `${h.pattern}-${h.generation}-${h.simulationId}`));
  
  currentSpikes.forEach(spike => {
    const patternKey = `${spike.pattern}-${generation}-${simulationId}`;
    if (!existingPatterns.has(patternKey)) {
      addFraudSpikeToHistory({
        ...spike,
        simulationId,
        generation,
        scenario,
      });
    }
  });

  // Get recent history (last 15 entries) and combine with current spikes
  const recentHistory = getFraudSpikeHistory(15);
  
  // Convert history entries to the expected format
  const historicalSpikes = recentHistory.map(entry => ({
    pattern: entry.pattern,
    severity: entry.severity,
    confidence: entry.confidence,
    transactions: entry.transactions,
    timeframe: entry.timeframe,
    riskScore: entry.riskScore,
  }));

  // Combine current spikes with historical data, removing duplicates
  const allSpikes = [...currentSpikes, ...historicalSpikes];
  const uniqueSpikes = allSpikes.filter((spike, index, arr) => 
    arr.findIndex(s => s.pattern === spike.pattern && s.timeframe === spike.timeframe) === index
  );

  return {
    totalSpikes: Math.max(3, Math.round(currentSpikes.length + (100 - detectionRate) / 3)),
    highRiskSpikes: Math.max(2, Math.round(uniqueSpikes.filter((spike) => spike.severity === 'high').length + (simulation.blind_spot_discovered ? 1 : 0))),
    averageConfidence: Number((currentSpikes.reduce((sum, spike) => sum + spike.confidence, 0) / currentSpikes.length).toFixed(1)),
    transactionsAffected: Math.max(700, Math.round(txCount * 0.18)),
    patternBreakdown: [
      { pattern: 'Account Takeover', count: Math.max(4, 8 + generation) },
      { pattern: 'Payment Velocity', count: Math.max(3, 6 + generation) },
      { pattern: 'Device Rotation', count: Math.max(2, 5 + generation) },
      { pattern: 'Card Testing', count: Math.max(1, 4 + Math.floor(generation / 2)) },
    ],
    recentSpikes: uniqueSpikes.slice(0, 20), // Show up to 20 most recent spikes including history
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
  // Even in fallback mode, include historical fraud spikes if available
  initializeFraudSpikeHistory();
  const recentHistory = getFraudSpikeHistory(10);
  
  const historicalSpikes = recentHistory.map(entry => ({
    pattern: entry.pattern,
    severity: entry.severity,
    confidence: entry.confidence,
    transactions: entry.transactions,
    timeframe: entry.timeframe,
    riskScore: entry.riskScore,
  }));

  return {
    totalSpikes: historicalSpikes.length,
    highRiskSpikes: historicalSpikes.filter(spike => spike.severity === 'high').length,
    averageConfidence: historicalSpikes.length > 0 
      ? Number((historicalSpikes.reduce((sum, spike) => sum + spike.confidence, 0) / historicalSpikes.length).toFixed(1))
      : 0,
    transactionsAffected: historicalSpikes.reduce((sum, spike) => sum + spike.transactions, 0),
    patternBreakdown: [
      { pattern: 'Account Takeover', count: 2 },
      { pattern: 'Payment Velocity', count: 1 },
      { pattern: 'Device Rotation', count: 1 },
      { pattern: 'Card Testing', count: 3 },
    ],
    recentSpikes: historicalSpikes,
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
      fraudEvents: 0,
      riskScore: 0,
    })),
  };
}

// Debug endpoint to check simulation state
router.get('/debug', authMiddleware, async (_req: Request, res: Response) => {
  const currentSimulation = getCurrentSimulation();
  const hasLiveSimulationState = !!(
    currentSimulation?.scenario ||
    currentSimulation?.generation ||
    currentSimulation?.detection_rate !== undefined ||
    currentSimulation?.blind_spot_discovered
  );
  
  const simulation = {
    scenario: currentSimulation?.scenario,
    generation: currentSimulation?.generation,
    detection_rate: currentSimulation?.detection_rate,
    blind_spot_discovered: currentSimulation?.blind_spot_discovered,
    transactions_count: currentSimulation?.transactions_count,
  };

  const historyEntries = getFraudSpikeHistory(10);

  if (hasLiveSimulationState) {
    const liveDashboard = buildLiveFraudSpikeDashboard(simulation);
    res.json({
      status: 'LIVE_SIMULATION_ACTIVE',
      currentSimulation,
      hasLiveSimulationState,
      fraudSpikeHistory: {
        totalEntries: fraudSpikeHistory.length,
        recentEntries: historyEntries.length,
        sample: historyEntries.slice(0, 3)
      },
      liveDashboardSample: {
        recentSpikesCount: liveDashboard.recentSpikes.length,
        firstSpike: liveDashboard.recentSpikes[0],
        attackContext: liveDashboard.attackContext,
      }
    });
  } else {
    res.json({
      status: 'NO_ACTIVE_SIMULATION',
      currentSimulation,
      hasLiveSimulationState,
      fraudSpikeHistory: {
        totalEntries: fraudSpikeHistory.length,
        recentEntries: historyEntries.length,
        sample: historyEntries.slice(0, 3)
      },
      message: 'Start an attack simulation to see live fraud spikes'
    });
  }
});

// History management endpoint
router.get('/history', authMiddleware, async (req: Request, res: Response) => {
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  const history = getFraudSpikeHistory(limit);
  
  res.json({
    history,
    totalEntries: fraudSpikeHistory.length,
    returned: history.length,
  });
});

// Clear history endpoint (for testing)
router.delete('/history', authMiddleware, async (_req: Request, res: Response) => {
  clearFraudSpikeHistory();
  res.json({ message: 'Fraud spike history cleared', totalEntries: 0 });
});

// Dashboard endpoint
router.get('/dashboard', authMiddleware, async (_req: Request, res: Response) => {
  try {
    // Initialize history with baseline data if empty
    initializeFraudSpikeHistory();
    
    const currentSimulation = getCurrentSimulation();
    console.log('🔍 Fraud spikes dashboard - current simulation:', currentSimulation);
    
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

    console.log('🔍 Has live simulation state:', hasLiveSimulationState, 'Simulation data:', simulation);

    if (hasLiveSimulationState) {
      const liveDashboard = buildLiveFraudSpikeDashboard(simulation);
      console.log('✅ Returning live dashboard data with recentSpikes:', liveDashboard.recentSpikes);
      res.json(liveDashboard);
      return;
    }

    const result = await callAiEngine<FraudSpikeDashboard>('/api/fraud-spikes/dashboard');

    if (!result) {
      console.log('⚠ No AI engine result, returning fallback data');
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

    console.log('✅ Returning transformed AI engine data:', transformed);
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
    // Prefer using the current in-memory simulation state when available
    const currentSimulation = getCurrentSimulation();

    const hasLiveSimulationState = !!(
      currentSimulation?.scenario ||
      currentSimulation?.generation ||
      currentSimulation?.detection_rate !== undefined ||
      currentSimulation?.blind_spot_discovered
    );

    if (hasLiveSimulationState) {
      const detectionRate = currentSimulation.detection_rate ?? 18;
      const txCount = currentSimulation.transactions_count ?? 42000;
      const generation = currentSimulation.generation ?? 1;
      const scenario = currentSimulation.scenario ?? 'Distributed Account Network';

      // Create realistic attack progression over 24 hours based on actual simulation
      const hourlyTrends = Array.from({ length: 24 }, (_, i) => {
        const hourIndex = i;
        
        // Simulate attack evolution - more activity in recent hours
        const timeFromNow = 24 - hourIndex;
        const attackIntensity = Math.max(0.1, 1 - (timeFromNow / 24));
        
        // Attack gets more sophisticated over time
        const evolutionFactor = 1 + (generation - 1) * 0.15;
        
        // Pattern based on actual scenario
        let patternMultiplier = 1;
        if (scenario.includes('Distributed')) patternMultiplier = 1.3;
        if (scenario.includes('Refund')) patternMultiplier = 0.8;
        if (scenario.includes('Velocity')) patternMultiplier = 1.1;
        
        // More fraud events when detection rate is low (successful attacks)
        const detectionGap = Math.max(0.2, (100 - detectionRate) / 100);
        const baseEvents = Math.round(txCount * 0.0008 * attackIntensity * evolutionFactor * patternMultiplier * detectionGap);
        
        const fraudEvents = Math.max(1, baseEvents + Math.floor(Math.random() * 5 - 2));
        const riskScore = Number(Math.min(9.9, 3 + (detectionGap * 6) + Math.random() * 0.5).toFixed(1));

        return {
          hour: `${hourIndex.toString().padStart(2, '0')}:00`,
          fraudEvents,
          riskScore,
        };
      });

      console.log('✅ Returning live fraud trends based on simulation:', {
        scenario,
        generation,
        detectionRate,
        dataPoints: hourlyTrends.length
      });

      res.json({ hourlyTrends });
      return;
    }

    // Fallback: try calling the AI engine (if configured)
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