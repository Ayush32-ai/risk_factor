import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { getGraphData, getInvestigation } from '../services/ai-client';
import { mockData } from '../data/mock';
import { getNeo4jDriver, isNeo4jReady } from '../db';
import { fetchPaymentGraph } from '../db/graph';
import { getCurrentSimulation } from './attacks';

function buildLiveGraphData(simulation: any) {
  const generation = simulation?.generation || 1;
  const detectionRate = simulation?.detection_rate ?? 21;
  const scenario = simulation?.scenario || 'Distributed Account Network';
  const riskBase = Math.min(98, 68 + generation * 2 + (100 - detectionRate) * 0.32);

  return {
    nodes: [
      { id: 'device-1', type: 'device', label: 'Shared Device Cluster', riskScore: Math.min(99, Math.round(riskBase + 8)), data: { fingerprint: 'FP-7A3B2C1D', accountsLinked: 7 } },
      { id: 'user-a', type: 'user', label: 'Account A', riskScore: 82, data: { email: 'user.a@example.com', createdAt: '2024-01-15' } },
      { id: 'user-b', type: 'user', label: 'Account B', riskScore: 85, data: { email: 'user.b@example.com', createdAt: '2024-02-20' } },
      { id: 'account-a', type: 'account', label: 'Linked Account 1', riskScore: 87, data: { balance: 45000, txCount: 234 } },
      { id: 'account-b', type: 'account', label: 'Linked Account 2', riskScore: 90, data: { balance: 32000, txCount: 189 } },
      { id: 'account-c', type: 'account', label: 'Linked Account 3', riskScore: 94, data: { balance: 78000, txCount: 412 } },
      { id: 'merchant-1', type: 'merchant', label: 'Merchant Cluster', riskScore: 76, data: { category: 'E-commerce', mrr: 2500000 } },
      { id: 'refund-1', type: 'refund', label: 'Refund Loop', riskScore: 96, data: { amount: 12500, reason: 'Circular refund pattern' } },
    ],
    edges: [
      { id: 'e1', source: 'device-1', target: 'user-a', label: 'shared device' },
      { id: 'e2', source: 'device-1', target: 'user-b', label: 'shared device' },
      { id: 'e3', source: 'user-a', target: 'account-a', label: 'owns' },
      { id: 'e4', source: 'user-b', target: 'account-b', label: 'owns' },
      { id: 'e5', source: 'account-a', target: 'merchant-1', label: 'paid' },
      { id: 'e6', source: 'account-b', target: 'merchant-1', label: 'paid' },
      { id: 'e7', source: 'merchant-1', target: 'refund-1', label: 'refunded' },
      { id: 'e8', source: 'refund-1', target: 'account-c', label: 'credited' },
      { id: 'e9', source: 'account-c', target: 'device-1', label: scenario },
    ],
  };
}

const router = Router();

router.get('/network', authMiddleware, async (_req: Request, res: Response) => {
  const liveSimulation = getCurrentSimulation();
  const hasActiveLiveSimulation = !!(
    liveSimulation?.scenario ||
    liveSimulation?.generation ||
    liveSimulation?.blind_spot_discovered ||
    liveSimulation?.detection_rate !== undefined
  );

  if (hasActiveLiveSimulation) {
    res.json(buildLiveGraphData(liveSimulation));
    return;
  }

  if (isNeo4jReady()) {
    try {
      const graph = await fetchPaymentGraph(getNeo4jDriver());
      if (graph?.nodes.length) {
        res.json(graph);
        return;
      }
    } catch {
      /* fall through */
    }
  }

  const graph = await getGraphData();
  if (!graph?.nodes?.length && !graph?.edges?.length) {
    res.json({ nodes: [], edges: [] });
    return;
  }
  res.json(graph);
});

router.get('/node/:nodeId', authMiddleware, async (req: Request, res: Response) => {
  const { nodeId } = req.params;
  const node = mockData.graphNodes.find((n) => n.id === nodeId);

  if (!node) {
    res.status(404).json({ error: 'Node not found' });
    return;
  }

  // Generate detailed risk factors based on node type and risk score
  let riskFactors: string[] = [];
  
  switch (node.type) {
    case 'device':
      riskFactors = [
        `Device linked to ${node.data?.accountsLinked || 7} different accounts (baseline: 1-2)`,
        'Abnormal browser fingerprint entropy detected',
        'Multiple account creations from same device in 48-hour window',
        'Geolocation inconsistencies across account usage',
        'Device characteristics suggest automation tools'
      ];
      break;
      
    case 'account':
      const txCount = node.data?.txCount || 0;
      const balance = node.data?.balance || 0;
      riskFactors = [
        `Transaction velocity: ${txCount} transactions (4.7× baseline for account age)`,
        `Account balance anomaly: ₹${balance.toLocaleString()} (unusual for transaction pattern)`,
        'Connected to flagged device fingerprint cluster',
        'Transaction timing patterns deviate significantly from normal user behavior',
        'Account part of coordinated network (7-node cluster detected)'
      ];
      break;
      
    case 'refund':
      const amount = node.data?.amount || 0;
      riskFactors = [
        `Refund destination (Account C) overlaps with payment source cluster`,
        `Amount: ₹${amount.toLocaleString()} - matches pattern of structured transaction avoidance`,
        'Refund timing suspicious: initiated 23 minutes after payment completion',
        'Merchant refund rate to this cluster: 47% (baseline: 2-5%)',
        'Part of circular refund pattern involving 3 interconnected accounts'
      ];
      break;
      
    case 'merchant':
      riskFactors = [
        'Receiving payments from coordinated account cluster',
        'Transaction distribution anomaly: 78% of transactions from 7 linked accounts',
        'Refund rate to cluster accounts: 47% vs baseline 2-5%',
        'Merchant created 2 days after cluster accounts became active'
      ];
      break;
      
    default:
      riskFactors = [
        'Part of identified fraud network',
        'Behavioral patterns deviate from legitimate user activity',
        'Connected to high-risk entities in transaction graph'
      ];
  }

  res.json({
    node,
    connections: mockData.graphEdges.filter(
      (e) => e.source === nodeId || e.target === nodeId
    ),
    riskProfile: {
      score: node.riskScore,
      factors: riskFactors,
      networkAnalysis: {
        clusterSize: 7,
        riskLevel: node.riskScore >= 90 ? 'CRITICAL' : node.riskScore >= 70 ? 'HIGH' : 'MEDIUM',
        confidence: node.riskScore >= 90 ? 98 : node.riskScore >= 70 ? 94 : 87,
        fraudType: 'Coordinated Transaction Network',
        detectionMethod: 'Graph-based behavioral analysis + device fingerprinting'
      }
    },
  });
});

router.post('/investigate', authMiddleware, async (req: Request, res: Response) => {
  const { networkId } = req.body;
  const investigation = await getInvestigation(networkId || 'cluster-7a3b');
  res.json({ investigation });
});

export default router;
