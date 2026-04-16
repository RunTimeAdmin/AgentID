require('dotenv').config();

// Required environment variables - server will not start without these
const required = ['DATABASE_URL', 'BAGS_API_KEY', 'REDIS_URL'];
const missing = required.filter(key => !process.env[key]);
if (missing.length > 0) {
  console.error('========================================');
  console.error('FATAL: Missing required environment variables:');
  missing.forEach(key => console.error(`  - ${key}`));
  console.error('');
  console.error('Copy .env.example to .env and configure:');
  console.error('  cp .env.example .env');
  console.error('========================================');
  process.exit(1);
}

// Recommended environment variables - warn but allow startup
const recommended = ['CORS_ORIGIN', 'AGENTID_BASE_URL'];
const missingRecommended = recommended.filter(key => !process.env[key]);
if (missingRecommended.length > 0) {
  console.warn('WARNING: Missing recommended environment variables (using defaults):');
  missingRecommended.forEach(key => console.warn(`  - ${key}`));
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./src/config');
const errorHandler = require('./src/middleware/errorHandler');
const { defaultLimiter } = require('./src/middleware/rateLimit');
const axios = require('axios');

// Import route modules
const registerRoutes = require('./src/routes/register');
const verifyRoutes = require('./src/routes/verify');
const badgeRoutes = require('./src/routes/badge');
const reputationRoutes = require('./src/routes/reputation');
const agentsRoutes = require('./src/routes/agents');
const attestationRoutes = require('./src/routes/attestations');
const widgetRoutes = require('./src/routes/widget');

const app = express();

// Security middleware
app.use(helmet());

// CORS middleware
app.use(cors({
  origin: config.corsOrigin,
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check route
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'agentid-api',
    timestamp: new Date().toISOString()
  });
});

// Rate limiting
app.use(defaultLimiter);

// API routes
app.use('/', registerRoutes);       // POST /register
app.use('/verify', verifyRoutes);   // POST /verify/challenge, /verify/response
app.use('/', badgeRoutes);          // GET /badge/:pubkey, /badge/:pubkey/svg
app.use('/', reputationRoutes);     // GET /reputation/:pubkey
app.use('/', agentsRoutes);         // GET /agents, /agents/:pubkey, /discover
app.use('/', attestationRoutes);    // POST /agents/:pubkey/attest, /flag etc.
app.use('/', widgetRoutes);         // GET /widget/:pubkey

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Global error handler (must be last)
app.use(errorHandler);

// Start server
if (require.main === module) {
  app.listen(config.port, () => {
    console.log(`🚀 AgentID API server running on port ${config.port}`);
    console.log(`📊 Environment: ${config.nodeEnv}`);
    console.log(`🏥 Health check: http://localhost:${config.port}/health`);

    // Non-blocking SAID Gateway connectivity check
    axios.get(`${config.saidGatewayUrl}/health`, { timeout: 5000 })
      .then(() => console.log('SAID Gateway: connected'))
      .catch(() => console.warn('SAID Gateway: unreachable (non-critical — SAID features will degrade gracefully)'));
  });
}

module.exports = app;
