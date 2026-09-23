const authService = require('../services/authService');

/**
 * Authentication Middleware
 * Reads and verifies the Bearer JWT token from the Authorization header.
 * Attaches the authenticated user payload to req.user.
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Access token is missing. Please provide a Bearer token.',
    });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid authorization format. Format must be "Bearer <token>".',
    });
  }

  const token = parts[1];

  try {
    const decoded = authService.verifyAccessToken(token);
    req.user = decoded; // { id, email, role, iat, exp }
    next();
  } catch (error) {
    return res.status(401).json({
      error: 'Unauthorized',
      message:
        error.name === 'TokenExpiredError'
          ? 'Access token has expired. Please refresh your token.'
          : 'Invalid access token.',
    });
  }
};

module.exports = authenticateToken;
