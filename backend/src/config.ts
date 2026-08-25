import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'sentinel-dev-jwt-secret',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3001',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://sentinel:sentinel_dev@localhost:5432/sentinel',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  neo4j: {
    uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
    user: process.env.NEO4J_USER || 'neo4j',
    password: process.env.NEO4J_PASSWORD || 'sentinel_dev',
  },
  aiEngineUrl: process.env.AI_ENGINE_URL || 'http://localhost:8000',
};
