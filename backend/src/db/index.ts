import { Pool } from 'pg';
import Redis from 'ioredis';
import neo4j, { Driver } from 'neo4j-driver';
import { config } from '../config';

export const pool = new Pool({ connectionString: config.databaseUrl });

// Disable Redis for now to prevent connection errors
// export const redis = new Redis(config.redisUrl, {
//   maxRetriesPerRequest: 3,
//   lazyConnect: true,
// });

export const redis = {
  connect: () => Promise.reject(new Error('Redis disabled')),
  disconnect: () => {},
  get: () => Promise.resolve(null),
  set: () => Promise.resolve('OK'),
  del: () => Promise.resolve(0),
};

let neo4jDriver: Driver | null = null;

export function getNeo4jDriver(): Driver {
  if (!neo4jDriver) {
    neo4jDriver = neo4j.driver(
      config.neo4j.uri,
      neo4j.auth.basic(config.neo4j.user, config.neo4j.password)
    );
  }
  return neo4jDriver;
}

export async function connectDatabases(): Promise<void> {
  // PostgreSQL connection
  pool.query('SELECT 1')
    .then(() => console.log('✓ PostgreSQL connected'))
    .catch(() => console.warn('⚠ PostgreSQL unavailable — using in-memory fallback'));

  // Skip Redis connection for now
  console.warn('⚠ Redis disabled — caching disabled');

  // Neo4j connection
  try {
    const driver = getNeo4jDriver();
    await Promise.race([
      driver.verifyConnectivity(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
    ]);
    console.log('✓ Neo4j connected');
  } catch {
    console.warn('⚠ Neo4j unavailable — graph data from mock');
  }
}

export async function disconnectDatabases(): Promise<void> {
  await pool.end();
  redis.disconnect();
  if (neo4jDriver) await neo4jDriver.close();
}
