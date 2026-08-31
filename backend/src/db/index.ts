import { Pool } from 'pg';
import Redis from 'ioredis';
import neo4j, { Driver } from 'neo4j-driver';
import { config } from '../config';
import { seedPaymentGraph } from './graph';

export const pool = new Pool({
  connectionString: config.databaseUrl,
  connectionTimeoutMillis: 8000,
  max: 10,
});

// Create Redis client only if the configured URL is valid. In production it's
// common to forget to set env vars (or accidentally leave placeholder values)
// which would crash the process when ioredis tries to parse them. Guard that
// here and provide a no-op stub so the server can start and surface a clear
// warning instead of crashing the deploy.
let redisClient: any;
const createNoopRedis = () => ({
  connect: async () => {},
  ping: async () => { throw new Error('Redis disabled'); },
  get: async (_k: string) => null,
  set: async (_k: string, _v: any) => {},
  disconnect: () => {},
  on: () => {},
});

try {
  // Validate URL format
  // `new URL()` will throw for invalid URLs like 'redis://[:<password>@]<redis-host>:6379'
  // which are commonly left as placeholders in deployment configs.
  // If invalid, fall back to noop client.
  if (!config.redisUrl) throw new Error('no redis url');
  // eslint-disable-next-line no-new
  new URL(config.redisUrl);

  redisClient = new Redis(config.redisUrl, {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => (times > 8 ? null : Math.min(times * 200, 2000)),
    lazyConnect: true,
    enableOfflineQueue: false,
  });

  redisClient.on('error', (err: Error) => {
    console.warn('⚠ Redis error:', err?.message || err);
  });
} catch (err) {
  console.warn('⚠ Redis disabled or misconfigured; caching disabled. REDIS_URL=', config.redisUrl);
  redisClient = createNoopRedis();
}

export const redis = redisClient;

let neo4jDriver: Driver | null = null;
let neo4jReady = false;
let postgresReady = false;
let redisReady = false;

export function getNeo4jDriver(): Driver {
  if (!neo4jDriver) {
    neo4jDriver = neo4j.driver(
      config.neo4j.uri,
      neo4j.auth.basic(config.neo4j.user, config.neo4j.password),
      { connectionTimeout: 15_000, maxConnectionLifetime: 60_000 }
    );
  }
  return neo4jDriver;
}

export function isPostgresReady() {
  return postgresReady;
}

export function isNeo4jReady() {
  return neo4jReady;
}

export function isRedisReady() {
  return redisReady;
}

export async function connectDatabases(): Promise<void> {
  try {
    await pool.query('SELECT 1');
    postgresReady = true;
    console.log('✓ PostgreSQL connected');
  } catch (err) {
    postgresReady = false;
    console.warn('⚠ PostgreSQL unavailable — using in-memory fallback', (err as Error).message);
  }

  try {
    await redis.connect();
    await redis.ping();
    redisReady = true;
    console.log('✓ Redis connected');
  } catch (err) {
    redisReady = false;
    console.warn('⚠ Redis unavailable — caching disabled', (err as Error).message);
  }

  try {
    const driver = getNeo4jDriver();
    await driver.verifyConnectivity();
    await seedPaymentGraph(driver);
    neo4jReady = true;
    console.log('✓ Neo4j connected (payment graph seeded)');
  } catch (err) {
    neo4jReady = false;
    console.warn('⚠ Neo4j unavailable — graph data from mock', (err as Error).message);
  }
}

export async function disconnectDatabases(): Promise<void> {
  await pool.end();
  try {
    redis.disconnect();
  } catch {
    /* ignore */
  }
  if (neo4jDriver) await neo4jDriver.close();
}
