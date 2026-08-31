import { pool, redis, isRedisReady } from '../db';
import { getCurrentSimulation } from '../state/simulation';
import { mockData } from '../data/mock';

// Store WebSocket server reference for broadcasting
let wsServer: any = null;

export function setWebSocketServer(wss: any) {
  wsServer = wss;
}

export async function getOverviewMetrics() {
  try {
    if (isRedisReady()) {
      const cached = await redis.get('overview:metrics');
      if (cached) return JSON.parse(cached);
    }
    const { rows } = await pool.query(
      `SELECT * FROM risk_metrics ORDER BY recorded_at DESC LIMIT 1`
    );
    if (rows[0]) {
      if (isRedisReady()) {
        await redis.set('overview:metrics', JSON.stringify(rows[0]), 'EX', 15);
      }
      return rows[0];
    }
  } catch {
    /* fallback */
  }
  return mockData.overview;
}

export async function getActivityTimeline() {
  try {
    const { rows } = await pool.query(
      `SELECT event_type, event_description, actor, created_at
       FROM audit_logs ORDER BY created_at DESC LIMIT 20`
    );
    if (rows.length) return rows;
  } catch {
    /* fallback */
  }
  return mockData.activityTimeline;
}

export async function getBlindSpots() {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM blind_spots ORDER BY
        CASE severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 ELSE 3 END,
        detection_rate ASC`
    );
    // Prefer current in-memory simulation state when available
    try {
      const liveSim = getCurrentSimulation();
      if (liveSim && (liveSim.blind_spot_discovered || liveSim.detection_rate || liveSim.detectionRate)) {
        const detectionRate = liveSim.detection_rate ?? liveSim.detectionRate ?? 0;
        if (liveSim.blind_spot_discovered || detectionRate < 30) {
          const simSpot = {
            id: liveSim.id || `sim-${Date.now()}`,
            title: `${liveSim.scenario || 'Simulated Attack'} Blind Spot`,
            severity: detectionRate && detectionRate < 20 ? 'critical' : 'high',
            detectionRate: detectionRate,
            detection_rate: detectionRate,
            potential_exposure: Math.round((liveSim.transactions_count || 0) * 0.12),
            root_cause: 'Detection gap identified by attack simulator',
            ai_recommendation: 'Increase detection rules and review velocity checks',
            attack_pattern: liveSim.scenario || 'simulated_pattern',
            status: 'open',
            discovered_at: new Date().toISOString(),
          };
          return [simSpot, ...rows];
        }
      }

      // If no in-memory sim, try persisted Redis simulation (legacy-tolerant)
      if (isRedisReady()) {
        const raw = await redis.get('sentinel:current_simulation');
        if (raw) {
          try {
            const sim = JSON.parse(raw);
            const detectionRate = sim?.detection_rate ?? sim?.detectionRate ?? 0;
            const blindDiscovered = sim?.blind_spot_discovered === true || sim?.blind_spot_discovered === 'true' || detectionRate < 30;
            if (blindDiscovered) {
              const simSpot = {
                id: sim.id || `sim-${Date.now()}`,
                title: `${sim.scenario || 'Simulated Attack'} Blind Spot`,
                severity: detectionRate && detectionRate < 20 ? 'critical' : 'high',
                detectionRate: detectionRate,
                detection_rate: detectionRate,
                potential_exposure: Math.round((sim.transactions_count || 0) * 0.12),
                root_cause: 'Detection gap identified by attack simulator',
                ai_recommendation: 'Increase detection rules and review velocity checks',
                attack_pattern: sim.scenario || 'simulated_pattern',
                status: 'open',
                discovered_at: new Date().toISOString(),
              };
              return [simSpot, ...rows];
            }
          } catch (err) {
            console.warn('⚠ Failed to parse persisted simulation from Redis', err);
          }
        }
      }
    } catch (e) {
      console.warn('⚠ Failed to augment blind spots from simulation state', e);
    }

    if (rows.length) return rows;
  } catch {
    /* fallback */
  }
  return mockData.blindSpots;
}

export async function getAuditLogs(limit = 50) {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT $1`,
      [limit]
    );
    if (rows.length) return rows;
  } catch {
    /* fallback */
  }
  return mockData.auditLogs;
}

export async function logAuditEvent(
  eventType: string,
  description: string,
  actor: string,
  metadata: Record<string, unknown> = {}
) {
  try {
    await pool.query(
      `INSERT INTO audit_logs (event_type, event_description, actor, metadata)
       VALUES ($1, $2, $3, $4)`,
      [eventType, description, actor, JSON.stringify(metadata)]
    );

    // Broadcast real-time audit event
    if (wsServer) {
      const event = {
        type: 'audit_event',
        payload: {
          eventType,
          description,
          actor,
          metadata,
        },
        timestamp: new Date().toISOString(),
      };

      wsServer.clients.forEach((client: any) => {
        if (client.readyState === 1) { // WebSocket.OPEN
          client.send(JSON.stringify(event));
        }
      });
    }
  } catch (error) {
    console.error('Failed to log audit event:', error);
  }
}

export async function broadcastActivityEvent(description: string, actor: string, eventType: string) {
  if (wsServer) {
    const event = {
      type: 'activity_event',
      payload: {
        description,
        actor,
        eventType,
      },
      timestamp: new Date().toISOString(),
    };

    wsServer.clients.forEach((client: any) => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(JSON.stringify(event));
      }
    });
  }
}
