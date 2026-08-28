import { pool, redis, isRedisReady } from '../db';
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
