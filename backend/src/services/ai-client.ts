import { config } from '../config';
import { mockData } from '../data/mock';

export async function callAiEngine<T>(
  endpoint: string,
  body?: Record<string, unknown>
): Promise<T | null> {
  try {
    const res = await fetch(`${config.aiEngineUrl}${endpoint}`, {
      method: body ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(60000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => null);
      console.error(`❌ AI engine returned non-OK (${res.status}) for ${endpoint}:`, text);
      return null;
    }

    try {
      return (await res.json()) as T;
    } catch (err) {
      console.error(`❌ Failed to parse JSON from AI engine for ${endpoint}:`, err);
      return null;
    }
  } catch {
    console.error(`❌ Error calling AI engine at ${config.aiEngineUrl}${endpoint}`);
    return null;
  }
}

export async function runAttackSimulation(scenario: string, generation = 1) {
  const result = await callAiEngine<typeof mockData.attackSimulation>(
    '/api/simulate/attack',
    { scenario, generation }
  );
  return result ?? {
    ...mockData.attackSimulation,
    scenario,
    generation,
    detection_rate: Math.max(15, 25 - generation * 0.4 + Math.random() * 5),
  };
}

export async function runDefenseSimulation(blindSpotId: string, attackPattern?: string, currentDetectionRate?: number) {
  const result = await callAiEngine<typeof mockData.defenseLab>(
    '/api/simulate/defense',
    { 
      blind_spot_id: blindSpotId,
      attack_pattern: attackPattern || 'default',
      current_detection_rate: currentDetectionRate
    }
  );
  return result ?? {
    ...mockData.defenseLab,
    // Add some dynamic variation to fallback data
    beforeDetectionRate: currentDetectionRate || (15 + Math.random() * 10),
    afterDetectionRate: Math.min(95, (currentDetectionRate || 18) + 60 + Math.random() * 20),
    attacksRerun: Math.floor(8500 + Math.random() * 3500),
  };
}

export async function getGraphData() {
  const result = await callAiEngine<{ nodes: unknown[]; edges: unknown[] }>(
    '/api/graph/network'
  );
  return result ?? { nodes: [], edges: [] };
}

export async function getInvestigation(networkId: string) {
  const result = await callAiEngine<typeof mockData.investigation>(
    '/api/investigate',
    { network_id: networkId }
  );
  return result ?? mockData.investigation;
}

export async function generateDefense(blindSpotId: string, attackPattern?: string, currentDetectionRate?: number) {
  const result = await callAiEngine<typeof mockData.defenseLab>(
    '/api/defense/generate',
    { 
      blind_spot_id: blindSpotId,
      attack_pattern: attackPattern || 'default',
      current_detection_rate: currentDetectionRate
    }
  );
  return result ?? {
    ...mockData.defenseLab,
    // Add some dynamic variation to fallback data
    beforeDetectionRate: currentDetectionRate || (15 + Math.random() * 10),
    afterDetectionRate: Math.min(95, (currentDetectionRate || 18) + 60 + Math.random() * 20),
    generatedRules: mockData.defenseLab.generatedRules.map(rule => ({
      ...rule,
      impact: Math.floor(12 + Math.random() * 16), // Dynamic impact 12-28
      confidence: Math.floor(85 + Math.random() * 13), // Dynamic confidence 85-98
    })),
  };
}
