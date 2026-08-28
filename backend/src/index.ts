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
import attackRoutes from './routes/attacks';
import graphRoutes from './routes/graph';
import blindspotRoutes from './routes/blindspots';
import defenseRoutes from './routes/defense';
import auditRoutes from './routes/audit';
import fraudSpikesRoutes from './routes/fraud-spikes';
import returnsRoutes from './routes/returns';
import chargebacksRoutes from './routes/chargebacks';
import mlEvaluationRoutes from './routes/ml-evaluation';

const app = express();
const server = createServer(app);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ 
  origin: [config.corsOrigin, 'http://localhost:3001', 'http://127.0.0.1:3001'],
  credentials: true 
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

async function start() {
  await connectDatabases();

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
