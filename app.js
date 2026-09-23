const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const errorHandler = require('./middleware/errorMiddleware');

const app = express();

// CORS configuration
const corsOrigin = process.env.CORS_ORIGIN || '*';
const corsOptions = {
  origin: corsOrigin === '*' ? '*' : corsOrigin.split(',').map((origin) => origin.trim()),
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};
app.use(cors(corsOptions));

// JSON Request Body Parsing
app.use(express.json());

// Health Check Endpoint (public, no authentication)
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'login-backend',
  });
});

// Mount Authentication & User Routes
app.use('/api/auth', authRoutes);

// 404 Route Handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

// Centralized Error Handling Middleware
app.use(errorHandler);

module.exports = app;
