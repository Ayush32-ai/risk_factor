import { pool, redis, isPostgresReady, isRedisReady } from '../db';
import { callAiEngine } from './ai-client';

export type LabeledTxn = {
  velocity: number;
  linked_accounts: number;
  device_risk: number;
  merchant_connections: number;
  amount_risk: number;
  amount: number;
  is_fraud: number;
  detector: string;
  created_at?: string;
  model_score?: number;
};

const DETECTORS = [
  'payment_risk',
  'distributed_account',
  'refund_loop',
  'merchant_cluster',
  'velocity_bypass',
  'device_rotation',
  'return_abuse',
  'chargeback_risk',
] as const;

const SCENARIO_TO_DETECTOR: Record<string, string> = {
  'Distributed Account Network': 'distributed_account',
  'Refund Loop Exploitation': 'refund_loop',
  'Merchant Cluster Abuse': 'merchant_cluster',
  'Velocity Limit Bypass': 'velocity_bypass',
  'Device Fingerprint Rotation': 'device_rotation',
};

const memoryStore: LabeledTxn[] = [];
const MAX_MEMORY = 4000;

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function fingerprint(shared: boolean) {
  if (shared) return `FP-7A3B-${Math.floor(Math.random() * 4)}`;
  return `FP-${Math.random().toString(16).slice(2, 10)}`;
}

export function generateLabeledTxn(opts?: { fraud?: boolean; detector?: string }): LabeledTxn {
  const isFraud = opts?.fraud ?? Math.random() < 0.12;
  const detector = isFraud
    ? (opts?.detector ?? pick([...DETECTORS.filter((d) => d !== 'payment_risk'), 'distributed_account']))
    : 'payment_risk';

  const profiles: Record<string, () => LabeledTxn> = {
    payment_risk: () => ({
      velocity: rand(0.4, 2.2),
      linked_accounts: Math.floor(rand(1, 3)),
      device_risk: rand(0.02, 0.25),
      merchant_connections: Math.floor(rand(1, 3)),
      amount_risk: rand(5, 35),
      amount: rand(200, 18000),
      is_fraud: 0,
      detector: 'payment_risk',
    }),
    distributed_account: () => ({
      velocity: rand(2.5, 8),
      linked_accounts: Math.floor(rand(5, 14)),
      device_risk: rand(0.65, 0.98),
      merchant_connections: Math.floor(rand(2, 6)),
      amount_risk: rand(40, 90),
      amount: rand(8000, 85000),
      is_fraud: 1,
      detector: 'distributed_account',
    }),
    refund_loop: () => ({
      velocity: rand(1.5, 5),
      linked_accounts: Math.floor(rand(3, 8)),
      device_risk: rand(0.4, 0.85),
      merchant_connections: Math.floor(rand(1, 4)),
      amount_risk: rand(55, 95),
      amount: rand(5000, 42000),
      is_fraud: 1,
      detector: 'refund_loop',
    }),
    merchant_cluster: () => ({
      velocity: rand(2, 6),
      linked_accounts: Math.floor(rand(3, 9)),
      device_risk: rand(0.35, 0.8),
      merchant_connections: Math.floor(rand(5, 12)),
      amount_risk: rand(30, 80),
      amount: rand(4000, 60000),
      is_fraud: 1,
      detector: 'merchant_cluster',
    }),
    velocity_bypass: () => ({
      velocity: rand(6, 18),
      linked_accounts: Math.floor(rand(4, 11)),
      device_risk: rand(0.25, 0.7),
      merchant_connections: Math.floor(rand(1, 5)),
      amount_risk: rand(20, 60),
      amount: rand(900, 12000),
      is_fraud: 1,
      detector: 'velocity_bypass',
    }),
    device_rotation: () => ({
      velocity: rand(1, 4),
      linked_accounts: Math.floor(rand(2, 7)),
      device_risk: rand(0.75, 0.99),
      merchant_connections: Math.floor(rand(1, 4)),
      amount_risk: rand(15, 50),
      amount: rand(1500, 22000),
      is_fraud: 1,
      detector: 'device_rotation',
    }),
    return_abuse: () => ({
      velocity: rand(1.2, 4.5),
      linked_accounts: Math.floor(rand(1, 5)),
      device_risk: rand(0.2, 0.6),
      merchant_connections: Math.floor(rand(2, 7)),
      amount_risk: rand(45, 92),
      amount: rand(3000, 28000),
      is_fraud: 1,
      detector: 'return_abuse',
    }),
    chargeback_risk: () => ({
      velocity: rand(0.8, 3.5),
      linked_accounts: Math.floor(rand(2, 8)),
      device_risk: rand(0.3, 0.75),
      merchant_connections: Math.floor(rand(1, 5)),
      amount_risk: rand(50, 98),
      amount: rand(7000, 95000),
      is_fraud: 1,
      detector: 'chargeback_risk',
    }),
  };

  const txn = isFraud ? profiles[detector]() : profiles.payment_risk();
  txn.created_at = new Date(Date.now() - Math.floor(Math.random() * 14 * 24 * 3600 * 1000)).toISOString();
  return txn;
}

async function scoreTxn(txn: LabeledTxn): Promise<number> {
  const result = await callAiEngine<{ risk_score: number }>('/api/score', {
    velocity: txn.velocity,
    linked_accounts: txn.linked_accounts,
    device_risk: txn.device_risk,
    merchant_connections: txn.merchant_connections,
    amount_risk: txn.amount_risk,
  });
  if (result?.risk_score != null) return result.risk_score;
  const heuristic =
    txn.velocity * 8 +
    txn.linked_accounts * 4 +
    txn.device_risk * 40 +
    txn.merchant_connections * 3 +
    txn.amount_risk * 0.4;
  return Math.max(0, Math.min(99, heuristic));
}

export async function persistTxns(txns: LabeledTxn[]): Promise<void> {
  for (const t of txns) {
    if (!t.model_score) t.model_score = await scoreTxn(t);
    memoryStore.push(t);
  }
  while (memoryStore.length > MAX_MEMORY) memoryStore.shift();

  if (!isPostgresReady()) return;

  for (const t of txns) {
    try {
      await pool.query(
        `INSERT INTO transactions
          (amount, currency, status, device_fingerprint, user_id, account_id, merchant_id,
           risk_score, is_flagged, is_fraud, detector_id, velocity, linked_accounts,
           device_risk, merchant_connections, amount_risk, model_score, labeled, created_at)
         VALUES ($1,'INR',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,TRUE,$17)`,
        [
          t.amount,
          t.is_fraud ? 'flagged' : 'captured',
          fingerprint(t.device_risk > 0.6),
          `usr_${Math.floor(Math.random() * 900 + 100)}`,
          `acc_${Math.floor(Math.random() * 900 + 100)}`,
          `mer_${Math.floor(Math.random() * 40 + 1)}`,
          t.model_score,
          (t.model_score ?? 0) >= 70,
          Boolean(t.is_fraud),
          t.detector,
          t.velocity,
          t.linked_accounts,
          t.device_risk,
          t.merchant_connections,
          t.amount_risk,
          t.model_score,
          t.created_at ? new Date(t.created_at) : new Date(),
        ]
      );
    } catch (err) {
      console.warn('txn persist failed', (err as Error).message);
    }
  }

  if (isRedisReady()) {
    try {
      await redis.del('ml:eval:latest');
    } catch {
      /* ignore */
    }
  }
}

export async function seedLabeledTransactions(n = 900): Promise<number> {
  if (isPostgresReady()) {
    try {
      const { rows } = await pool.query(`SELECT COUNT(*)::int AS n FROM transactions WHERE labeled = TRUE`);
      if (rows[0]?.n >= 200) return rows[0].n;
    } catch {
      /* seed anyway */
    }
  } else if (memoryStore.length >= 200) {
    return memoryStore.length;
  }

  const batch: LabeledTxn[] = [];
  for (let i = 0; i < n; i++) batch.push(generateLabeledTxn());
  await persistTxns(batch);
  console.log(`✓ Seeded ${batch.length} labeled transactions for model evaluation`);
  return batch.length;
}

export async function ingestLiveTick(): Promise<void> {
  const count = 2 + Math.floor(Math.random() * 6);
  const batch = Array.from({ length: count }, () => {
    const t = generateLabeledTxn();
    t.created_at = new Date().toISOString();
    return t;
  });
  await persistTxns(batch);
}

export async function ingestAttackBatch(scenario: string, count = 60): Promise<void> {
  const detector = SCENARIO_TO_DETECTOR[scenario] || 'distributed_account';
  const batch = Array.from({ length: count }, () => {
    const t = generateLabeledTxn({ fraud: true, detector });
    t.created_at = new Date().toISOString();
    return t;
  });
  await persistTxns(batch);
}

export async function loadLabeledTransactions(limit = 2500): Promise<LabeledTxn[]> {
  if (isPostgresReady()) {
    try {
      const { rows } = await pool.query(
        `SELECT velocity, linked_accounts, device_risk, merchant_connections, amount_risk,
                amount, CASE WHEN is_fraud THEN 1 ELSE 0 END AS is_fraud,
                COALESCE(detector_id, 'payment_risk') AS detector,
                created_at, model_score
         FROM transactions
         WHERE labeled = TRUE
         ORDER BY created_at ASC
         LIMIT $1`,
        [limit]
      );
      if (rows.length) {
        return rows.map((r) => ({
          velocity: Number(r.velocity),
          linked_accounts: Number(r.linked_accounts),
          device_risk: Number(r.device_risk),
          merchant_connections: Number(r.merchant_connections),
          amount_risk: Number(r.amount_risk),
          amount: Number(r.amount),
          is_fraud: Number(r.is_fraud),
          detector: String(r.detector),
          created_at: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
          model_score: r.model_score != null ? Number(r.model_score) : undefined,
        }));
      }
    } catch (err) {
      console.warn('load labeled txns failed', (err as Error).message);
    }
  }
  return memoryStore.slice(-limit);
}

export async function labeledStats() {
  const rows = await loadLabeledTransactions();
  const fraud = rows.filter((r) => r.is_fraud).length;
  return {
    n: rows.length,
    fraud,
    fraud_rate: rows.length ? fraud / rows.length : 0,
    source: isPostgresReady() ? 'postgres' : 'memory',
  };
}

export function startLiveIngest(intervalMs = 8000): NodeJS.Timeout {
  return setInterval(() => {
    ingestLiveTick().catch((err) => console.warn('live ingest', err.message));
  }, intervalMs);
}
