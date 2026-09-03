import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { config } from './config';
import { connectDatabases } from './db';
import { setupWebSocket } from './ws';
import { setWebSocketServer } from './services/metrics';

import authRoutes from './routes/auth';
import overviewRoutes from './routes/overview';
import attackRoutes, { initializeAttackState } from './routes/attacks';
import graphRoutes from './routes/graph';
import blindspotRoutes from './routes/blindspots';
import defenseRoutes from './routes/defense';
import auditRoutes from './routes/audit';
import fraudSpikesRoutes from './routes/fraud-spikes';
import returnsRoutes from './routes/returns';
import chargebacksRoutes from './routes/chargebacks';
import mlEvaluationRoutes from './routes/ml-evaluation';
import adminRoutes from './routes/admin';

const app = express();
const server = createServer(app);

const allowedOrigins = new Set(config.corsOrigins);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`Origin not allowed by CORS: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));
app.use(express.json());
app.use(rateLimit({ windowMs: 60_000, max: 200 }));

// Add request logging
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.path} from ${req.headers.origin || 'no origin'}`);
  next();
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'sentinel-backend', version: '1.0.0' });
});

// Simple test endpoint for frontend connectivity
app.get('/test', (_req, res) => {
  res.json({ message: 'Backend is working!', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/overview', overviewRoutes);
app.use('/api/attacks', attackRoutes);
app.use('/api/graph', graphRoutes);
app.use('/api/blind-spots', blindspotRoutes);
app.use('/api/defense', defenseRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/fraud-spikes', fraudSpikesRoutes);
app.use('/api/returns', returnsRoutes);
app.use('/api/chargebacks', chargebacksRoutes);
app.use('/api/ml', mlEvaluationRoutes);
app.use('/api/admin', adminRoutes);

async function start() {
  // Warn if critical services are pointed at localhost - common prod misconfiguration
  const warnIfLocal = (name: string, value: string | null | undefined) => {
    if (!value) return;
    if (value.includes('localhost') || value.includes('127.0.0.1')) {
      console.warn(`⚠ ${name} appears to be localhost - ensure this is intentional in production: ${value}`);
    }
  };

  warnIfLocal('DATABASE_URL', config.databaseUrl);
  warnIfLocal('REDIS_URL', config.redisUrl);
  warnIfLocal('NEO4J_URI', config.neo4j.uri);
  warnIfLocal('AI_ENGINE_URL', config.aiEngineUrl);

  await connectDatabases();
  // Load persisted attack simulation (if any) so dashboard/trends show consistent state
  try {
    await initializeAttackState();
  } catch (err) {
    console.warn('⚠ Failed to initialize attack state from persistence', err);
  }

  const wss = setupWebSocket(server);
  setWebSocketServer(wss); // Connect WebSocket to metrics for broadcasting

  server.listen(config.port, () => {
    console.log(`
╔══════════════════════════════════════════╗
║     RAZORPAY SENTINEL — Backend API      ║
║     http://localhost:${config.port}               ║
║     WebSocket: ws://localhost:${config.port}/ws   ║
║     🔴 REAL-TIME EVENTS ENABLED          ║
╚══════════════════════════════════════════╝
    `);
  });
}

start().catch(console.error);

export default app;
