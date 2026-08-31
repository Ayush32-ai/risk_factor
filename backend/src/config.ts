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

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
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
  redisUrl: (process.env.REDIS_URL && isValidUrl(process.env.REDIS_URL)) 
    ? process.env.REDIS_URL 
    : (process.env.NODE_ENV === 'production' ? null : 'redis://localhost:6379'),
  neo4j: {
    uri: (process.env.NEO4J_URI && isValidUrl(process.env.NEO4J_URI)) 
      ? process.env.NEO4J_URI 
      : (process.env.NODE_ENV === 'production' ? null : 'bolt://localhost:7687'),
    user: process.env.NEO4J_USER || 'neo4j',
    password: process.env.NEO4J_PASSWORD || 'sentinel_dev',
  },
  aiEngineUrl: process.env.AI_ENGINE_URL || 'http://localhost:8000',
} as const;
