/**
 * Pluribus Swarm - Backend Server
 * Express + tRPC server with LLM integration
 */

import express from 'express';
import cors from 'cors';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from './routers';
import { createContext } from './context';
import { initializeScheduledConvergence } from './scheduledConvergence';
import { startActiveInference } from './activeInference';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// tRPC API
app.use('/api/trpc', createExpressMiddleware({
  router: appRouter,
  createContext,
}));

// Start server
app.listen(PORT, () => {
  console.log(`🐝 Pluribus Swarm server running on http://localhost:${PORT}`);
  console.log(`📡 tRPC endpoint: http://localhost:${PORT}/api/trpc`);
  
  // Initialize Scheduled Auto-Convergence (runs every 24 hours)
  initializeScheduledConvergence(24);
  
  // Start Active Inference Loop (the system's "heartbeat")
  // Runs every 30 seconds, continuously predicting and adapting
  startActiveInference(30000);
});

export type { AppRouter } from './routers';
