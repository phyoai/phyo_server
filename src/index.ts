import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
import './instrument.js';
import * as Sentry from '@sentry/node';
// Ensure Buffer and crypto are available globally for crypto operations
import { Buffer } from 'buffer';
import crypto from 'crypto';

if (typeof global !== 'undefined') {
  if (!global.Buffer) {
    (global as any).Buffer = Buffer;
  }
  if (!global.crypto) {
    (global as any).crypto = crypto;
  }
}

import express from 'express';
import cors from 'cors';
import path from 'path';
import { OpenAI } from 'openai';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { initSwagger } from './swagger-setup';
import { env, validateCriticalEnv } from './config/env';
import { logger } from './utils/logger';
import { attachRequestContext, requestLogger } from './middleware/requestContext';
import { apiRateLimiter, basicSecurityHeaders } from './middleware/security';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

// Import models to ensure they're registered
import Influencer from './models/influencer';
import { user, brand, influencer, serviceProvider, userAuth } from './models/auth';
import { connectToMongo } from './connections/db';
import socketHandler from './socket';
import { initializePlans } from './controllers/payment';
import { initializeSuperAdmin } from './controllers/admin';

// Import routes
import authRoute from './routes/auth';
import conversationRoute from './routes/conversation';
import messagesRoute from './routes/messages';
import userRoute from './routes/user';
import campaignRoute from './routes/campaign';
import uploadRoute from './routes/upload';
import askRoute from './routes/ask';
import projectRoute from './routes/project';
import portfolioRoute from './routes/portfolio';
import influencerRoute from './routes/influencer';
import paymentRoute from './routes/payment';
import migrationRoute from './routes/migration';
import metaRoute from './routes/meta';
import brandRequestRoute from './routes/brandRequest';
import influencerRequestRoute from './routes/influencerRequest';
import adminRoute from './routes/admin';
import notificationRoute from './routes/notification';
import analyticsRoute from './routes/analytics';
import dashboardRoute from './routes/dashboard';
import favoritesRoute from './routes/favorites';
import accountRoute from './routes/account';
import brandRoute from './routes/brand';
import trendingRoute from './routes/trending';
import locationRoute from './routes/location';
import paymentAliasRoute from './routes/paymentAlias';
import landingRoute from './routes/landing';
import healthRoute from './routes/health';

// Sentry.logger.info('User triggered test log', { action: 'test_log' })

validateCriticalEnv();

const app = express();
const PORT = env.port;

// Middleware
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(express.urlencoded({ extended: false }));
app.use(attachRequestContext);
app.use(basicSecurityHeaders);
app.use(apiRateLimiter);

// Skip JSON parsing for webhook endpoint to preserve raw body for signature verification
app.use((req, res, next) => {
  if ((req as any).path === '/api/payment/webhook') {
    return next(); // Skip to raw middleware
  }
  express.json()(req, res, next);
});

app.use(cors({
  origin: env.corsOrigin,
  credentials: true
}));

if (env.requestLogEnabled) {
  app.use(requestLogger);
}

// Initialize Swagger documentation
initSwagger(app);

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Database connection
connectToMongo(env.mongoUri)
  .then(() => {
    logger.info('MongoDB connected');
    // Initialize subscription plans
    initializePlans();
    // Initialize super admin
    initializeSuperAdmin();
  })
  .catch((error) => logger.error('MongoDB connection error', {
    error: error instanceof Error ? error.message : 'Unknown error',
  }));

// OpenAI setup
new OpenAI({
  apiKey: env.openAiApiKey
});

// Socket.IO setup
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: ["https://phyo.ai", "http://localhost:3000", "http://localhost:4000"],
    credentials: true
  }
});

socketHandler(io);

// Routes
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: 'Phyo API home',
    data: {
      docs: '/swagger-ui',
      apiDocs: '/api-docs',
      health: env.healthPath,
    }
  });
});

app.use(env.healthPath, healthRoute);
app.use('/api/health', healthRoute);

// Webhook middleware for raw JSON (Razorpay webhooks)
app.use("/api/payment/webhook", express.raw({ type: 'application/json' }));

app.use("/api/user", authRoute);
app.use("/api/auth", authRoute); // Mount auth routes at /api/auth as well
app.use("/api/conversation", conversationRoute);
app.use("/api/messages", messagesRoute);
app.use("/api/users", userRoute);
app.use("/api/campaigns", campaignRoute);
app.use("/api/upload", uploadRoute);
app.use("/api/ask", askRoute);
app.use("/api/projects", projectRoute);
app.use("/api/portfolios", portfolioRoute);
app.use("/api/influencers", influencerRoute);
app.use("/api/payment", paymentRoute);
app.use("/api/migration", migrationRoute);
app.use("/api/meta", metaRoute);
app.use("/api/brand-requests", brandRequestRoute);
app.use("/api/influencer-requests", influencerRequestRoute);
app.use("/api/admin", adminRoute);
app.use("/api/notifications", notificationRoute);
app.use("/api/analytics", analyticsRoute);
app.use("/api/dashboard", dashboardRoute);
app.use("/api/landing", landingRoute);
app.use("/api/favorites", favoritesRoute);
app.use("/api/account", accountRoute);
app.use("/api/brands", brandRoute);
app.use("/api/trending", trendingRoute);
app.use("/api/payments", paymentAliasRoute);
app.use("/api", locationRoute);

// Serve static files from the "public" directory
app.use(express.static(path.join(process.cwd(), 'src/public')));
app.use(express.static(path.join(__dirname, 'public')));
Sentry.setupExpressErrorHandler(app);
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
server.listen(PORT, () => {
  console.log("╔═══════════════════════════════════════════════════════╗");
  console.log("║         Phyo Server is running                         ║");
  console.log("╚═══════════════════════════════════════════════════════╝");
  console.log(`📍 Server: http://localhost:${PORT}`);
  console.log(`📖 Swagger UI: http://localhost:${PORT}/swagger-ui`);
  console.log(`📋 API Docs: http://localhost:${PORT}/api-docs`);
  console.log(`📚 Markdown Docs: http://localhost:${PORT}/docs`);
  console.log("═══════════════════════════════════════════════════════");
});
