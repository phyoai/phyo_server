import express from 'express';
import { env } from '../config/env';
import { sendSuccess } from '../utils/http';

const router = express.Router();

router.get('/', (_req, res) => {
  sendSuccess(
    res,
    'Service is healthy',
    {
      status: 'ok',
      environment: env.nodeEnv,
      uptimeSeconds: process.uptime(),
      timestamp: new Date().toISOString(),
    }
  );
});

export default router;
