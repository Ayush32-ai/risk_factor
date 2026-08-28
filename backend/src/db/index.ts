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

export const redis = new Redis(config.redisUrl, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => (times > 8 ? null : Math.min(times * 200, 2000)),
  lazyConnect: true,
  enableOfflineQueue: false,
});

redis.on('error', (err) => {
  console.warn('⚠ Redis error:', err.message);
});

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
