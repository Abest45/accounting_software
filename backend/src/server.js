require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const http = require('http');
const socketIO = require('socket.io');
const cookieParser = require('cookie-parser');

const db = require('./models');
const Logger = require('./utils/logger');
const { errorHandler, asyncHandler } = require('./middleware/errorHandler');
const { authMiddleware, authorizeRole } = require('./middleware/auth');
const auditLog = require('./middleware/auditLog');
const { processEmailQueue } = require('./services/notifications');

// Import routes
const authRoutes = require('./routes/auth');
const invoiceRoutes = require('./routes/invoices');
const receiptRoutes = require('./routes/receipts');
const inventoryRoutes = require('./routes/inventory');
const purchaseRoutes = require('./routes/purchases');
const expenseRoutes = require('./routes/expenses');
const payrollRoutes = require('./routes/payroll');
const dashboardRoutes = require('./routes/dashboard');
const twoFactorAuthRoutes = require('./routes/twoFactorAuth');
const reportsRoutes = require('./routes/reports');
const adminRoutes = require('./routes/admin');

const app = express();
const server = http.createServer(app);

// Socket.IO setup
const io = socketIO(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST']
  },
  transports: ['websocket', 'polling']
});

// ==================== SECURITY MIDDLEWARE ====================

// Set security HTTP headers
app.use(helmet({
  contentSecurityPolicy: false
}));

// Apply stricter CSP for frontend assets and API
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net", "https://cdn.socket.io"],
    styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
    fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
    imgSrc: ["'self'", 'data:'],
    connectSrc: ["'self'", "http://localhost:5000", "https://localhost:5000"],
    objectSrc: ["'none'"],
    frameAncestors: ["'none'"],
    upgradeInsecureRequests: []
  }
}));

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
}));

// Enforce HSTS in production
if (process.env.NODE_ENV === 'production') {
  app.use(helmet.hsts({
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', limiter);

// ==================== BODY PARSER & COMPRESSION ====================

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
// Cookie parser (for refresh token cookie)
app.use(cookieParser());

// Data sanitization against NoSQL injection attacks
app.use(mongoSanitize());

// Prevent parameter pollution
app.use(hpp());

// Compression middleware
app.use(compression());

// ==================== LOGGING ====================

// Morgan HTTP request logger
app.use(morgan('combined', {
  stream: {
    write: (message) => Logger.info(message.trim())
  }
}));

// Audit logging middleware
app.use(auditLog);

// ==================== SOCKET.IO REAL-TIME SETUP ====================

io.on('connection', (socket) => {
  Logger.info(`Client connected: ${socket.id}`);

  socket.on('subscribe_dashboard', (data) => {
    socket.join(`dashboard_${data.userId}`);
    socket.emit('subscribed', { success: true });
  });

  socket.on('disconnect', () => {
    Logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Store io instance in app for use in controllers
app.set('io', io);

// ==================== ROUTES ====================

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Auth routes (no auth required)
app.use('/api/auth', authRoutes);

// Protected routes (auth required)
app.use('/api/invoices', authMiddleware, invoiceRoutes);
app.use('/api/receipts', authMiddleware, receiptRoutes);
app.use('/api/inventory', authMiddleware, inventoryRoutes);
app.use('/api/purchases', authMiddleware, purchaseRoutes);
app.use('/api/expenses', authMiddleware, expenseRoutes);
app.use('/api/payroll', authMiddleware, payrollRoutes);
app.use('/api/dashboard', authMiddleware, dashboardRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/2fa', twoFactorAuthRoutes);

// Admin routes
app.use('/api/admin', authMiddleware, authorizeRole('super-admin'), adminRoutes);

// ==================== ERROR HANDLING ====================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Global error handler
app.use(errorHandler);

// ==================== EMAIL QUEUE SETUP ====================

// Process email notifications (run in background)
processEmailQueue();

// ==================== SERVER STARTUP ====================

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  Logger.info(`
    ╔════════════════════════════════════════╗
    ║   FinAnalytics Backend Server Started   ║
    ║   Environment: ${process.env.NODE_ENV || 'development'.padEnd(21)}║
    ║   Port: ${PORT.toString().padEnd(32)}║
    ║   Database: ${(process.env.DB_NAME || 'finanalytics_db').padEnd(29)}║
    ╚════════════════════════════════════════╝
  `);
});

// Handle uncaught exceptions
process.on('unhandledRejection', (err) => {
  Logger.error('Unhandled Rejection:', err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  Logger.error('Uncaught Exception:', err);
  process.exit(1);
});

module.exports = { app, server, io };
