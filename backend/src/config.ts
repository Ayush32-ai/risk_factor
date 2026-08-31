import dotenv from 'dotenv';
dotenv.config();

const parsedCorsOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// Helper function to check if URL is a valid, non-placeholder URL
const isValidUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    // Check if it's not a placeholder or localhost in production
    if (process.env.NODE_ENV === 'production') {
      return !url.includes('localhost') && 
             !url.includes('127.0.0.1') &&
             !url.includes('<') && 
             !url.includes('>') && 
             parsed.hostname !== 'localhost' &&
             parsed.hostname !== '127.0.0.1';
    }
    return true;
  } catch {
    return false;
  }
};

// Force disable optional services in production if they're localhost
const getRedisUrl = (): string | null => {
  const redisUrl = process.env.REDIS_URL;
  const isProduction = process.env.NODE_ENV === 'production' || !!process.env.PORT;
  
  if (!redisUrl) return null;
  
  // In production, disable Redis if it's localhost
  if (isProduction) {
    if (redisUrl.includes('localhost') || redisUrl.includes('127.0.0.1')) {
      console.log('⚠ Redis URL is localhost in production - disabling Redis');
      return null;
    }
  }
  
  return isValidUrl(redisUrl) ? redisUrl : null;
};

const getNeo4jUri = (): string | null => {
  const neo4jUri = process.env.NEO4J_URI;
  const isProduction = process.env.NODE_ENV === 'production' || !!process.env.PORT;
  
  if (!neo4jUri) return null;
  
  // In production, disable Neo4j if it's localhost
  if (isProduction) {
    if (neo4jUri.includes('localhost') || neo4jUri.includes('127.0.0.1')) {
      console.log('⚠ Neo4j URI is localhost in production - disabling Neo4j');
      return null;
    }
  }
  
  return isValidUrl(neo4jUri) ? neo4jUri : null;
};

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || (process.env.PORT ? 'production' : 'development'), // Auto-detect production from PORT
  jwtSecret: process.env.JWT_SECRET || 'sentinel-dev-jwt-secret',
  corsOrigin: parsedCorsOrigins[0] || 'http://localhost:3001',
  corsOrigins: [
    ...parsedCorsOrigins,
    'http://localhost:3001',
    'http://127.0.0.1:3001',
    'https://risk-factor400.onrender.com',
    'https://risk-factor-500.onrender.com',
  ],
  databaseUrl: process.env.DATABASE_URL || 'postgresql://sentinel:sentinel_dev@localhost:5432/sentinel',
  redisUrl: getRedisUrl(),
  neo4j: {
    uri: getNeo4jUri(),
    user: process.env.NEO4J_USER || 'neo4j',
    password: process.env.NEO4J_PASSWORD || 'sentinel_dev',
  },
  aiEngineUrl: process.env.AI_ENGINE_URL || 'http://localhost:8000',
} as const;
