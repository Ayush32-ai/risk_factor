import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { initializeDatabase } from '../db';

const router = Router();

// Manual database initialization endpoint (admin only)
router.post('/init-db', authMiddleware, async (_req: Request, res: Response) => {
  try {
    await initializeDatabase();
    res.json({ 
      success: true, 
      message: 'Database tables initialized successfully' 
    });
  } catch (error) {
    console.error('Database initialization error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to initialize database tables',
      details: String(error)
    });
  }
});

export default router;