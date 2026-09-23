const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userRepository = require('../repository/userRepository');

/**
 * Service Layer handling Authentication and Authorization business logic.
 */
class AuthService {
  constructor(repo = userRepository) {
    this.userRepository = repo;
  }

  /**
   * Helper to retrieve JWT Secret from environment variables
   */
  getAccessSecret() {
    return process.env.JWT_SECRET || 'change_this_access_secret';
  }

  /**
   * Helper to retrieve JWT Refresh Secret from environment variables
   */
  getRefreshSecret() {
    return process.env.JWT_REFRESH_SECRET || 'change_this_refresh_secret';
  }

  /**
   * Generate an Access Token (default expiration 15m)
   * @param {object} payload
   * @returns {string}
   */
  generateAccessToken(payload) {
    return jwt.sign(
      {
        id: payload.id,
        email: payload.email,
        role: payload.role,
      },
      this.getAccessSecret(),
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '15m',
      }
    );
  }

  /**
   * Generate a Refresh Token (default expiration 7d)
   * @param {object} payload
   * @returns {string}
   */
  generateRefreshToken(payload) {
    return jwt.sign(
      {
        id: payload.id,
        email: payload.email,
      },
      this.getRefreshSecret(),
      {
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
      }
    );
  }

  /**
   * Verify an Access Token
   * @param {string} token
   * @returns {object} Decoded payload
   */
  verifyAccessToken(token) {
    return jwt.verify(token, this.getAccessSecret());
  }

  /**
   * Verify a Refresh Token
   * @param {string} token
   * @returns {object} Decoded payload
   */
  verifyRefreshToken(token) {
    return jwt.verify(token, this.getRefreshSecret());
  }

  /**
   * Register a new user
   * @param {object} param0
   * @param {string} param0.name
   * @param {string} param0.email
   * @param {string} param0.password
   */
  async register({ name, email, password }) {
    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const emailExists = await this.userRepository.checkUserExists(normalizedEmail);
    if (emailExists) {
      const error = new Error('Email is already registered');
      error.statusCode = 409;
      error.code = 'EMAIL_EXISTS';
      throw error;
    }

    // Hash the password with bcrypt (salt rounds = 1 in test for speed, 10 in production)
    const saltRounds = process.env.NODE_ENV === 'test' ? 1 : 10;
    const salt = await bcrypt.genSalt(saltRounds);
    const passwordHash = await bcrypt.hash(password, salt);

    // Persist new user with default role and active status
    const createdUser = await this.userRepository.createUser({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: 'user',
      isActive: true,
    });

    return {
      message: 'User registered successfully',
      user: {
        id: createdUser.id,
        name: createdUser.name,
        email: createdUser.email,
        role: createdUser.role,
      },
    };
  }

  /**
   * Authenticate a user and issue access and refresh tokens
   * @param {object} param0
   * @param {string} param0.email
   * @param {string} param0.password
   */
  async login({ email, password }) {
    const normalizedEmail = email.trim().toLowerCase();

    const user = await this.userRepository.findUserByEmail(normalizedEmail);
    if (!user) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      error.code = 'INVALID_CREDENTIALS';
      throw error;
    }

    // Verify account active status
    if (!user.is_active) {
      const error = new Error('Account is inactive. Please contact support.');
      error.statusCode = 403;
      error.code = 'ACCOUNT_INACTIVE';
      throw error;
    }

    // Compare bcrypt password hash
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      error.code = 'INVALID_CREDENTIALS';
      throw error;
    }

    // Generate tokens
    const token = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    return {
      message: 'Login successful',
      token,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  /**
   * Issue a new access token using a valid refresh token
   * @param {string} refreshToken
   */
  async refreshToken(refreshToken) {
    let decoded;
    try {
      decoded = this.verifyRefreshToken(refreshToken);
    } catch (err) {
      const error = new Error(
        err.name === 'TokenExpiredError'
          ? 'Refresh token has expired. Please log in again.'
          : 'Invalid refresh token.'
      );
      error.statusCode = 401;
      error.code = 'INVALID_REFRESH_TOKEN';
      throw error;
    }

    // Check that user still exists in the database
    const user = await this.userRepository.findUserById(decoded.id);
    if (!user) {
      const error = new Error('User associated with token no longer exists');
      error.statusCode = 401;
      error.code = 'USER_NOT_FOUND';
      throw error;
    }

    // Check that user is active
    if (!user.is_active) {
      const error = new Error('Account is inactive');
      error.statusCode = 403;
      error.code = 'ACCOUNT_INACTIVE';
      throw error;
    }

    // Generate new access token
    const newAccessToken = this.generateAccessToken(user);
    return {
      token: newAccessToken,
    };
  }

  /**
   * Retrieve user profile by user ID
   * @param {number} userId
   */
  async getProfile(userId) {
    const user = await this.userRepository.findUserById(userId);
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      error.code = 'USER_NOT_FOUND';
      throw error;
    }

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }
}

module.exports = new AuthService();
module.exports.AuthService = AuthService;
