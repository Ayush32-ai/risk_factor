import { pool, isPostgresReady } from '../db';

export async function ensureTransactionSchema(): Promise<void> {
  await pool.query(`
    ALTER TABLE transactions ADD COLUMN IF NOT EXISTS is_fraud BOOLEAN DEFAULT FALSE;
    ALTER TABLE transactions ADD COLUMN IF NOT EXISTS detector_id VARCHAR(64);
    ALTER TABLE transactions ADD COLUMN IF NOT EXISTS velocity REAL DEFAULT 1;
    ALTER TABLE transactions ADD COLUMN IF NOT EXISTS linked_accounts INT DEFAULT 1;
    ALTER TABLE transactions ADD COLUMN IF NOT EXISTS device_risk REAL DEFAULT 0;
    ALTER TABLE transactions ADD COLUMN IF NOT EXISTS merchant_connections INT DEFAULT 1;
    ALTER TABLE transactions ADD COLUMN IF NOT EXISTS amount_risk REAL DEFAULT 0;
    ALTER TABLE transactions ADD COLUMN IF NOT EXISTS model_score REAL;
    ALTER TABLE transactions ADD COLUMN IF NOT EXISTS labeled BOOLEAN DEFAULT TRUE;
  `);
}
