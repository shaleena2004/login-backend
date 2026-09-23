const express = require('express');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const authenticateToken = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const {
  registerSchema,
  loginSchema,
  refreshSchema,
  validate,
} = require('../validation/authValidation');

const router = express.Router();

/**
 * Rate Limiter for Login Endpoint
 * Prevents brute-force attacks by limiting to 5 failed attempts per 15 minutes per IP.
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  skipSuccessfulRequests: true, // Only count failed attempts towards the limit
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Too many failed login attempts. Please try again after 15 minutes.',
    });
  },
});

// Authentication Endpoints
router.post('/register', validate(registerSchema), authController.register);
router.post('/login', loginLimiter, validate(loginSchema), authController.login);
router.post('/refresh', validate(refreshSchema), authController.refresh);
router.post('/logout', authController.logout);

// User Profile Endpoint
router.get('/profile', authenticateToken, authController.profile);

// Admin-Only Endpoint
router.get('/admin-only', authenticateToken, requireRole('admin'), authController.adminOnly);

module.exports = router;
