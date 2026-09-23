const { pool } = require('../config/db');

/**
 * User Repository
 * Handles all direct database queries for the users table using parameterized queries.
 */
class UserRepository {
  constructor(dbPool = pool) {
    this.db = dbPool;
  }

  /**
   * Find a user by email address (case-insensitive)
   * @param {string} email
   * @returns {Promise<object|null>}
   */
  async findUserByEmail(email) {
    const query = `
      SELECT id, name, email, password_hash, role, is_active, created_at, updated_at
      FROM users
      WHERE LOWER(email) = LOWER(?)
      LIMIT 1
    `;
    const [rows] = await this.db.execute(query, [email.trim()]);
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Find a user by primary key ID
   * @param {number} id
   * @returns {Promise<object|null>}
   */
  async findUserById(id) {
    const query = `
      SELECT id, name, email, password_hash, role, is_active, created_at, updated_at
      FROM users
      WHERE id = ?
      LIMIT 1
    `;
    const [rows] = await this.db.execute(query, [id]);
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Check whether a user with the given email already exists
   * @param {string} email
   * @returns {Promise<boolean>}
   */
  async checkUserExists(email) {
    const query = `
      SELECT 1 FROM users
      WHERE LOWER(email) = LOWER(?)
      LIMIT 1
    `;
    const [rows] = await this.db.execute(query, [email.trim()]);
    return rows.length > 0;
  }

  /**
   * Insert a new user into the database
   * @param {object} userData
   * @param {string} userData.name
   * @param {string} userData.email
   * @param {string} userData.passwordHash
   * @param {string} [userData.role='user']
   * @param {boolean} [userData.isActive=true]
   * @returns {Promise<object>} Created user record without password_hash
   */
  async createUser({ name, email, passwordHash, role = 'user', isActive = true }) {
    const query = `
      INSERT INTO users (name, email, password_hash, role, is_active)
      VALUES (?, ?, ?, ?, ?)
    `;
    const [result] = await this.db.execute(query, [
      name.trim(),
      email.trim().toLowerCase(),
      passwordHash,
      role,
      isActive ? 1 : 0,
    ]);

    return {
      id: result.insertId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role,
      is_active: Boolean(isActive),
    };
  }

  /**
   * Update an existing user's details
   * @param {number} id
   * @param {object} updates
   * @returns {Promise<object|null>}
   */
  async updateUser(id, updates) {
    const fields = [];
    const values = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name.trim());
    }
    if (updates.passwordHash !== undefined) {
      fields.push('password_hash = ?');
      values.push(updates.passwordHash);
    }
    if (updates.role !== undefined) {
      fields.push('role = ?');
      values.push(updates.role);
    }
    if (updates.isActive !== undefined) {
      fields.push('is_active = ?');
      values.push(updates.isActive ? 1 : 0);
    }

    if (fields.length === 0) {
      return this.findUserById(id);
    }

    values.push(id);
    const query = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
    await this.db.execute(query, values);

    return this.findUserById(id);
  }
}

module.exports = new UserRepository();
module.exports.UserRepository = UserRepository;
