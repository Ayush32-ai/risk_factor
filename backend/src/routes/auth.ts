import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { config } from '../config';
import { pool } from '../db';
import { validateBody } from '../middleware/validate';
import { authMiddleware } from '../middleware/auth';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const DEMO_USERS = [
  { id: '1', email: 'admin@razorpay.com', password: 'sentinel123', name: 'Sentinel Admin', role: 'admin' as const },
  { id: '2', email: 'analyst@razorpay.com', password: 'sentinel123', name: 'Risk Analyst', role: 'analyst' as const },
];

router.post('/login', validateBody(loginSchema), async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (rows[0]) {
      const valid = await bcrypt.compare(password, rows[0].password_hash);
      if (!valid) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }
      const token = jwt.sign(
        { userId: rows[0].id, email: rows[0].email, role: rows[0].role },
        config.jwtSecret,
        { expiresIn: '24h' }
      );
      res.json({ token, user: { id: rows[0].id, email: rows[0].email, name: rows[0].name, role: rows[0].role } });
      return;
    }
  } catch {
    /* fallback to demo users */
  }

  const demoUser = DEMO_USERS.find((u) => u.email === email && u.password === password);
  if (!demoUser) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const token = jwt.sign(
    { userId: demoUser.id, email: demoUser.email, role: demoUser.role },
    config.jwtSecret,
    { expiresIn: '24h' }
  );
  res.json({ token, user: { id: demoUser.id, email: demoUser.email, name: demoUser.name, role: demoUser.role } });
});

router.get('/me', authMiddleware, (req: Request, res: Response) => {
  res.json({ user: req.user });
});

export default router;
