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
  // Check if Redis URL is available and valid
  if (!config.redisUrl) {
    console.log('⚠ Redis URL not provided - Redis disabled');
    redisClient = createNoopRedis();
  } else {
    // Validate URL format
    new URL(config.redisUrl);

    redisClient = new Redis(config.redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => (times > 8 ? null : Math.min(times * 200, 2000)),
      lazyConnect: true,
      enableOfflineQueue: false,
      connectTimeout: 10000,
    });

    redisClient.on('error', (err: Error) => {
      console.warn('⚠ Redis error:', err?.message || err);
    });
  }
} catch (err) {
  console.warn('⚠ Redis disabled or misconfigured; caching disabled. REDIS_URL=', config.redisUrl);
  redisClient = createNoopRedis();
}

export const redis = redisClient;

let neo4jDriver: Driver | null = null;
let neo4jReady = false;
let postgresReady = false;
let redisReady = false;

export function getNeo4jDriver(): Driver | null {
  if (!config.neo4j.uri) {
    console.log('⚠ Neo4j URI not provided - Neo4j disabled');
    return null;
  }
  
  if (!neo4jDriver) {
    try {
      neo4jDriver = neo4j.driver(
        config.neo4j.uri,
        neo4j.auth.basic(config.neo4j.user, config.neo4j.password),
        { 
          connectionTimeout: 15_000, 
          maxConnectionLifetime: 60_000,
          connectionAcquisitionTimeout: 10_000
        }
      );
    } catch (err) {
      console.warn('⚠ Failed to create Neo4j driver:', (err as Error).message);
      return null;
    }
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
    if (!config.redisUrl) {
      redisReady = false;
      console.log('⚠ Redis URL not configured — caching disabled');
    } else {
      await redis.connect();
      await redis.ping();
      redisReady = true;
      console.log('✓ Redis connected');
    }
  } catch (err) {
    redisReady = false;
    console.warn('⚠ Redis unavailable — caching disabled');
  }

  try {
    if (!config.neo4j.uri) {
      neo4jReady = false;
      console.log('⚠ Neo4j URI not configured — graph data from mock');
    } else {
      const driver = getNeo4jDriver();
      if (driver) {
        await driver.verifyConnectivity();
        await seedPaymentGraph(driver);
        neo4jReady = true;
        console.log('✓ Neo4j connected (payment graph seeded)');
      } else {
        neo4jReady = false;
        console.log('⚠ Neo4j driver creation failed — graph data from mock');
      }
    }
  } catch (err) {
    neo4jReady = false;
    console.warn('⚠ Neo4j unavailable — graph data from mock');
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
