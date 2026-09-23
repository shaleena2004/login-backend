process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_access_secret_12345';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_12345';
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';

// 1. Explicitly mock the database layer so no MySQL connections or sockets are opened during tests
jest.mock('../config/db', () => ({
  pool: {
    execute: jest.fn(),
    getConnection: jest.fn(),
    end: jest.fn().mockResolvedValue(true),
  },
  getPool: jest.fn(),
  testConnection: jest.fn().mockResolvedValue(true),
  closePool: jest.fn().mockResolvedValue(true),
}));

// 2. Mock userRepository methods to create an isolated in-memory repository layer
jest.mock('../repository/userRepository', () => ({
  checkUserExists: jest.fn(),
  findUserByEmail: jest.fn(),
  findUserById: jest.fn(),
  createUser: jest.fn(),
  updateUser: jest.fn(),
}));

const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = require('../app');
const userRepository = require('../repository/userRepository');
const { closePool } = require('../config/db');

describe('Login Backend API Test Suite', () => {
  let mockUsers = [];
  let nextUserId = 1;

  beforeEach(() => {
    // Reset mock in-memory database before each test
    mockUsers = [];
    nextUserId = 1;

    userRepository.checkUserExists.mockImplementation(async (email) => {
      return mockUsers.some((u) => u.email.toLowerCase() === email.toLowerCase());
    });

    userRepository.findUserByEmail.mockImplementation(async (email) => {
      const user = mockUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
      return user ? { ...user } : null;
    });

    userRepository.findUserById.mockImplementation(async (id) => {
      const user = mockUsers.find((u) => u.id === Number(id));
      return user ? { ...user } : null;
    });

    userRepository.createUser.mockImplementation(async (userData) => {
      const newUser = {
        id: nextUserId++,
        name: userData.name,
        email: userData.email,
        password_hash: userData.passwordHash,
        role: userData.role || 'user',
        is_active: userData.isActive !== undefined ? userData.isActive : true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      mockUsers.push(newUser);
      return {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        is_active: newUser.is_active,
      };
    });
  });

  afterAll(async () => {
    await closePool();
  });

  // ==========================================
  // 1. Health Check
  // ==========================================
  describe('GET /api/health', () => {
    it('should return 200 OK with system status UP', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        status: 'UP',
        service: 'login-backend',
      });
    });
  });

  // ==========================================
  // 2. User Registration
  // ==========================================
  describe('POST /api/auth/register', () => {
    it('should register a new user successfully with HTTP 201', async () => {
      const payload = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'Password123',
      };

      const res = await request(app).post('/api/auth/register').send(payload);

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('User registered successfully');
      expect(res.body.user).toBeDefined();
      expect(res.body.user.id).toBe(1);
      expect(res.body.user.name).toBe('Test User');
      expect(res.body.user.email).toBe('test@example.com');
      expect(res.body.user.role).toBe('user');
      expect(res.body.user.password_hash).toBeUndefined();
      expect(res.body.user.password).toBeUndefined();
    });

    it('should reject registration if email is already taken with HTTP 409', async () => {
      mockUsers.push({
        id: 1,
        name: 'Existing User',
        email: 'test@example.com',
        password_hash: 'hash',
        role: 'user',
        is_active: true,
      });

      const res = await request(app).post('/api/auth/register').send({
        name: 'New User',
        email: 'test@example.com',
        password: 'Password123',
      });

      expect(res.status).toBe(409);
      expect(res.body.error).toBeDefined();
      expect(res.body.message).toContain('already registered');
    });

    it('should reject registration with invalid email format', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Invalid Email',
        email: 'not-an-email',
        password: 'Password123',
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation Error');
      expect(res.body.message).toBe('Please provide a valid email address');
    });

    it('should reject registration if password is shorter than 8 characters', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Short Password',
        email: 'short@example.com',
        password: '123',
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation Error');
      expect(res.body.message).toContain('at least 8 characters');
    });

    it('should reject registration if name is missing', async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: 'noname@example.com',
        password: 'Password123',
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation Error');
      expect(res.body.message).toBe('Name is required');
    });
  });

  let testPasswordHash;

  beforeAll(async () => {
    testPasswordHash = await bcrypt.hash('Password123', 4);
  });

  // ==========================================
  // 3. User Login
  // ==========================================
  describe('POST /api/auth/login', () => {
    beforeEach(() => {
      mockUsers.push({
        id: 1,
        name: 'Active User',
        email: 'active@example.com',
        password_hash: testPasswordHash,
        role: 'user',
        is_active: true,
      });
      mockUsers.push({
        id: 2,
        name: 'Inactive User',
        email: 'inactive@example.com',
        password_hash: testPasswordHash,
        role: 'user',
        is_active: false,
      });
      mockUsers.push({
        id: 3,
        name: 'Admin User',
        email: 'admin@example.com',
        password_hash: testPasswordHash,
        role: 'admin',
        is_active: true,
      });
    });

    it('should log in successfully and return access and refresh tokens', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'active@example.com',
        password: 'Password123',
      });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Login successful');
      expect(res.body.token).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      expect(res.body.user).toEqual({
        id: 1,
        name: 'Active User',
        email: 'active@example.com',
        role: 'user',
      });

      // Verify access token contents
      const decodedAccess = jwt.verify(res.body.token, process.env.JWT_SECRET);
      expect(decodedAccess.id).toBe(1);
      expect(decodedAccess.email).toBe('active@example.com');
      expect(decodedAccess.role).toBe('user');
    });

    it('should reject login with wrong password with HTTP 401', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'active@example.com',
        password: 'WrongPassword',
      });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid email or password');
    });

    it('should reject login for non-existent email with HTTP 401', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'nobody@example.com',
        password: 'Password123',
      });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid email or password');
    });

    it('should reject login for inactive user with HTTP 403', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'inactive@example.com',
        password: 'Password123',
      });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Account is inactive');
    });

    it('should reject login with invalid email syntax', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'bad-email',
        password: 'Password123',
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation Error');
    });
  });

  // ==========================================
  // 4. Refresh Token
  // ==========================================
  describe('POST /api/auth/refresh', () => {
    beforeEach(() => {
      mockUsers.push({
        id: 1,
        name: 'Active User',
        email: 'active@example.com',
        password_hash: 'hash',
        role: 'user',
        is_active: true,
      });
    });

    it('should return a new access token when a valid refresh token is supplied', async () => {
      const validRefreshToken = jwt.sign(
        { id: 1, email: 'active@example.com' },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
      );

      const res = await request(app).post('/api/auth/refresh').send({
        refreshToken: validRefreshToken,
      });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();

      const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
      expect(decoded.id).toBe(1);
      expect(decoded.email).toBe('active@example.com');
      expect(decoded.role).toBe('user');
    });

    it('should reject an invalid refresh token with HTTP 401', async () => {
      const res = await request(app).post('/api/auth/refresh').send({
        refreshToken: 'completely.invalid.token',
      });

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Invalid refresh token');
    });

    it('should reject an expired refresh token with HTTP 401', async () => {
      const expiredRefreshToken = jwt.sign(
        { id: 1, email: 'active@example.com' },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '-1s' }
      );

      const res = await request(app).post('/api/auth/refresh').send({
        refreshToken: expiredRefreshToken,
      });

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('expired');
    });

    it('should reject request missing refreshToken field', async () => {
      const res = await request(app).post('/api/auth/refresh').send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation Error');
    });
  });

  // ==========================================
  // 5. Protected Profile
  // ==========================================
  describe('GET /api/auth/profile', () => {
    beforeEach(() => {
      mockUsers.push({
        id: 1,
        name: 'Profile User',
        email: 'profile@example.com',
        password_hash: 'secret_hash',
        role: 'user',
        is_active: true,
      });
    });

    it('should return profile when valid access token is provided', async () => {
      const accessToken = jwt.sign(
        { id: 1, email: 'profile@example.com', role: 'user' },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
      );

      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.user).toEqual({
        id: 1,
        name: 'Profile User',
        email: 'profile@example.com',
        role: 'user',
      });
      expect(res.body.user.password_hash).toBeUndefined();
    });

    it('should return 401 when Authorization header is missing', async () => {
      const res = await request(app).get('/api/auth/profile');
      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Access token is missing');
    });

    it('should return 401 when token is invalid', async () => {
      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid.token.value');

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Invalid access token');
    });

    it('should return 401 when token is expired', async () => {
      const expiredToken = jwt.sign(
        { id: 1, email: 'profile@example.com', role: 'user' },
        process.env.JWT_SECRET,
        { expiresIn: '-1s' }
      );

      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('expired');
    });
  });

  // ==========================================
  // 6. Admin Only Endpoint & RBAC
  // ==========================================
  describe('GET /api/auth/admin-only', () => {
    it('should allow admin role access with HTTP 200', async () => {
      const adminToken = jwt.sign(
        { id: 99, email: 'admin@example.com', role: 'admin' },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
      );

      const res = await request(app)
        .get('/api/auth/admin-only')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Admin access granted');
    });

    it('should forbid normal user role with HTTP 403', async () => {
      const userToken = jwt.sign(
        { id: 1, email: 'user@example.com', role: 'user' },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
      );

      const res = await request(app)
        .get('/api/auth/admin-only')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Forbidden');
      expect(res.body.message).toContain('privileges');
    });
  });

  // ==========================================
  // 7. Logout Endpoint
  // ==========================================
  describe('POST /api/auth/logout', () => {
    it('should return 200 OK with logout message', async () => {
      const res = await request(app).post('/api/auth/logout');
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Logout successful');
    });
  });
});

