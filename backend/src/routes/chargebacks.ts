import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { callAiEngine } from '../services/ai-client';
import { logAuditEvent, broadcastActivityEvent } from '../services/metrics';

const router = Router();

const processChargebackSchema = z.object({
  transaction_id: z.string().min(1),
  customer_id: z.string().min(1),
  merchant_id: z.string().min(1),
  amount: z.number().positive(),
  reason: z.string().default('consumer_dispute'),
});

interface ChargebackAnalytics {
  totalChargebacks: number;
  successfulDisputes: number;
  winRate: number;
  totalAmount: number;
  reasonBreakdown: Array<{
    reason: string;
    count: number;
    winRate: number;
  }>;
  strengthDistribution: Array<{
    strength: string;
    count: number;
  }>;
  monthlyTrends: Array<{
    month: string;
    chargebacks: number;
    winRate: number;
    amount: number;
  }>;
}

interface ChargebackCase {
  case_id: string;
  transaction_id: string;
  chargeback_reason: string;
  chargeback_amount: number;
  response_strength: number;
  win_probability: number;
  recommended_action: string;
  evidence_count: number;
  evidence_summary: Array<{
    type: string;
    description: string;
    relevance_score: number;
  }>;
  due_date: string;
  created_at: string;
}

// Analytics endpoint
router.get('/analytics', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const result = await callAiEngine<any>('/api/chargebacks/analytics');
    
    if (result) {
      // Transform AI engine response to match frontend expectations  
      const transformed = {
        totalChargebacks: result.total_chargebacks_month || 0,
        successfulDisputes: result.cases_won || 0,
        winRate: result.win_rate || 0,
        totalAmount: Math.floor((result.total_chargebacks_month || 100) * 4000 + Math.random() * 1000000), // Mock amount
        reasonBreakdown: Object.entries(result.reason_breakdown || {}).map(([reason, count]) => ({
          reason: reason.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          count: count as number,
          winRate: Math.random() * 20 + 75, // 75-95% mock win rate
        })),
        strengthDistribution: [
          { strength: 'Strong', count: Math.floor((result.total_chargebacks_month || 100) * 0.58) },
          { strength: 'Moderate', count: Math.floor((result.total_chargebacks_month || 100) * 0.26) },
          { strength: 'Weak', count: Math.floor((result.total_chargebacks_month || 100) * 0.16) },
        ],
        monthlyTrends: Array.from({ length: 12 }, (_, i) => {
          const month = new Date(2024, i, 1).toLocaleString('default', { month: 'short' });
          return {
            month,
            chargebacks: Math.floor(Math.random() * 40) + 20,
            winRate: Math.random() * 20 + 75, // 75-95%
            amount: Math.floor(Math.random() * 200000) + 50000,
          };
        }),
      };
      
      res.json(transformed);
    } else {
      // Fallback mock analytics
      const mockAnalytics = {
        totalChargebacks: 342,
        successfulDisputes: 287,
        winRate: 83.9,
        totalAmount: 1456780,
        reasonBreakdown: [
          { reason: 'Consumer Dispute', count: 156, winRate: 78.2 },
          { reason: 'Fraud', count: 89, winRate: 91.0 },
          { reason: 'Authorization', count: 47, winRate: 87.2 },
          { reason: 'Processing Error', count: 32, winRate: 93.8 },
          { reason: 'Duplicate Processing', count: 18, winRate: 88.9 },
        ],
        strengthDistribution: [
          { strength: 'Strong', count: 198 },
          { strength: 'Moderate', count: 89 },
          { strength: 'Weak', count: 55 },
        ],
        monthlyTrends: Array.from({ length: 12 }, (_, i) => {
          const month = new Date(2024, i, 1).toLocaleString('default', { month: 'short' });
          return {
            month,
            chargebacks: Math.floor(Math.random() * 40) + 20,
            winRate: Math.random() * 20 + 75, // 75-95%
            amount: Math.floor(Math.random() * 200000) + 50000,
          };
        }),
      };
      
      res.json(mockAnalytics);
    }
  } catch (error) {
    console.error('Chargeback analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch chargeback analytics' });
  }
});

// Process chargeback endpoint
router.post('/process', authMiddleware, validateBody(processChargebackSchema), async (req: Request, res: Response) => {
  try {
    const chargebackData = req.body;

    await logAuditEvent('chargeback_processing', `Chargeback processing started for transaction ${chargebackData.transaction_id}`, 'AI');
    
    await broadcastActivityEvent(
      `Processing chargeback for transaction ${chargebackData.transaction_id}`,
      'Chargeback Engine',
      'chargeback_processing'
    );

    const result = await callAiEngine<ChargebackCase>('/api/chargebacks/process', chargebackData);

    if (result) {
      res.json(result);
    } else {
      // Generate mock chargeback case
      const winProbability = Math.random() * 0.4 + 0.6; // 60-100%
      const responseStrength = Math.random() * 0.5 + 0.5; // 50-100%
      
      const evidenceTypes = [
        { type: 'Transaction Receipt', description: 'Digital receipt showing completed transaction', relevance: 0.9 },
        { type: 'Customer Communication', description: 'Email correspondence with customer', relevance: 0.7 },
        { type: 'Shipping Tracking', description: 'Delivery confirmation and tracking details', relevance: 0.85 },
        { type: 'Device Fingerprint', description: 'Device authentication data at time of purchase', relevance: 0.6 },
        { type: 'Payment Authorization', description: 'Bank authorization codes and timestamps', relevance: 0.95 },
      ];

      const selectedEvidence = evidenceTypes
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.floor(Math.random() * 3) + 3);

      const mockCase = {
        case_id: `CHB_${Date.now()}`,
        transaction_id: chargebackData.transaction_id,
        chargeback_reason: chargebackData.reason,
        chargeback_amount: chargebackData.amount,
        response_strength: responseStrength,
        win_probability: winProbability,
        recommended_action: winProbability > 0.8 
          ? 'Proceed with dispute - Strong evidence available'
          : winProbability > 0.65
          ? 'Proceed with caution - Moderate evidence strength'
          : 'Consider settlement - Weak evidence available',
        evidence_count: selectedEvidence.length,
        evidence_summary: selectedEvidence.map(e => ({
          type: e.type,
          description: e.description,
          relevance_score: e.relevance,
        })),
        due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days from now
        created_at: new Date().toISOString(),
      };

      res.json(mockCase);
    }

    await logAuditEvent('chargeback_processed', `Chargeback case created with ${(result?.win_probability || 0.65) * 100}% win probability`, 'AI');
    
    await broadcastActivityEvent(
      `Chargeback case created with ${((result?.win_probability || 0.65) * 100).toFixed(0)}% win probability`,
      'Evidence AI',
      'chargeback_completed'
    );
  } catch (error) {
    console.error('Chargeback processing error:', error);
    res.status(500).json({ error: 'Failed to process chargeback' });
  }
});

export default router;