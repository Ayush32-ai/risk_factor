import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { mockData } from '../data/mock';

interface LiveEvent {
  type: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

const auditEvents = [
  { description: 'High-risk transaction flagged by ML model', actor: 'AI', eventType: 'fraud_detection' },
  { description: 'Defense rule updated - velocity threshold adjusted', actor: 'System', eventType: 'defense_update' },
  { description: 'Suspicious device fingerprint detected', actor: 'AI', eventType: 'device_analysis' },
  { description: 'Cross-account pattern analysis completed', actor: 'Graph AI', eventType: 'pattern_analysis' },
  { description: 'New attack vector identified and blocked', actor: 'Defense Engine', eventType: 'attack_blocked' },
];

const activityEvents = [
  { description: 'Chargeback evidence automatically generated', actor: 'Evidence AI', eventType: 'chargeback_processing' },
  { description: 'Return risk assessment completed with 94% accuracy', actor: 'Return Engine', eventType: 'return_analysis' },
  { description: 'Fraud spike detected in merchant cluster', actor: 'Spike Detector', eventType: 'fraud_spike' },
  { description: 'Graph analysis revealed new suspicious network', actor: 'Graph Analyzer', eventType: 'network_discovery' },
  { description: 'AI model retrained with latest attack patterns', actor: 'ML Pipeline', eventType: 'model_training' },
];

export function setupWebSocket(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    console.log('🔌 WebSocket client connected');
    
    ws.send(JSON.stringify({
      type: 'connected',
      payload: { message: 'Sentinel real-time feed connected' },
      timestamp: new Date().toISOString(),
    }));

    // Send periodic audit events
    const auditInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        const event = auditEvents[Math.floor(Math.random() * auditEvents.length)];
        ws.send(JSON.stringify({
          type: 'audit_event',
          payload: event,
          timestamp: new Date().toISOString(),
        }));
      }
    }, 15000 + Math.random() * 10000); // 15-25 seconds

    // Send periodic activity events
    const activityInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        const event = activityEvents[Math.floor(Math.random() * activityEvents.length)];
        ws.send(JSON.stringify({
          type: 'activity_event',
          payload: event,
          timestamp: new Date().toISOString(),
        }));
      }
    }, 12000 + Math.random() * 8000); // 12-20 seconds

    // Send periodic metric updates
    const metricsInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'metric_update',
          payload: {
            modelHealth: 94.5 + (Math.random() - 0.5) * 0.4,
            transactionsTested: Math.floor(Math.random() * 100) + 50,
            attacksBlocked: 96.0 + (Math.random() - 0.5) * 0.6,
          },
          timestamp: new Date().toISOString(),
        }));
      }
    }, 8000 + Math.random() * 7000); // 8-15 seconds

    // Send periodic investigation updates
    const investigationInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        const updates = [
          'New behavioral anomaly detected in transaction timing',
          'Graph clustering algorithm identified suspicious merchant network',
          'Device fingerprint correlation analysis completed',
          'Risk score recalculated based on latest transaction data',
          'Cross-reference analysis with fraud database completed',
        ];
        
        ws.send(JSON.stringify({
          type: 'investigation_update',
          payload: {
            description: updates[Math.floor(Math.random() * updates.length)],
            riskScore: 88 + Math.floor(Math.random() * 10),
          },
          timestamp: new Date().toISOString(),
        }));
      }
    }, 20000 + Math.random() * 15000); // 20-35 seconds

    ws.on('close', () => {
      console.log('🔴 WebSocket client disconnected');
      clearInterval(auditInterval);
      clearInterval(activityInterval);
      clearInterval(metricsInterval);
      clearInterval(investigationInterval);
    });

    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
    });
  });

  console.log('🚀 WebSocket server setup complete on /ws');
  return wss;
}

export function broadcastEvent(wss: WebSocketServer, event: LiveEvent): void {
  const message = JSON.stringify(event);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

export { mockData };
