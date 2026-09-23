# Login Backend API

A production-grade, secure, and containerized **Authentication & User Management Backend Service** built with **Node.js**, **Express**, **MySQL 8**, and **JSON Web Tokens (JWT)**.

Developed as a backend internship engineering assignment, this project follows enterprise software architecture patterns including the **Repository Pattern**, **Service Layer**, centralized error handling, Role-Based Access Control (RBAC), and brute-force protection.

---

## Table of Contents

1. [Overview](#overview)
2. [Key Features](#key-features)
3. [Technology Stack](#technology-stack)
4. [Architecture & Design Principles](#architecture--design-principles)
5. [Folder Structure](#folder-structure)
6. [Prerequisites](#prerequisites)
7. [Environment Variables](#environment-variables)
8. [Database Schema & Setup](#database-schema--setup)
9. [Local Development Setup](#local-development-setup)
10. [Docker & Containerized Setup](#docker--containerized-setup)
11. [Docker Command Reference](#docker-command-reference)
12. [API Endpoints Reference](#api-endpoints-reference)
13. [Authentication & Token Lifecycle Flow](#authentication--token-lifecycle-flow)
14. [Security & Protection Measures](#security--protection-measures)
15. [Automated Testing](#automated-testing)
16. [Postman Collection Guide](#postman-collection-guide)
17. [Troubleshooting Guide](#troubleshooting-guide)
18. [Preparing for a New GitHub Repository](#preparing-for-a-new-github-repository)
19. [Future Roadmap](#future-roadmap)

---

## Overview

The **Login Backend** service provides a stateless, scalable foundation for web and mobile client authentication. It implements industry-standard dual-token authentication:
- **Short-lived Access Tokens (15 minutes)** for authorized API requests.
- **Long-lived Refresh Tokens (7 days)** for seamless session continuity without requiring constant credential re-entry.

All database queries are parameterized to prevent SQL Injection, passwords are encrypted using adaptive salt rounds with `bcryptjs`, incoming payloads are strictly validated against `Joi` schemas, and brute-force attacks on login are blocked via IP-level rate limiting.

---

## Key Features

- **Layered Architecture:** Clear division of responsibilities across Routes, Controllers, Services, and Repositories.
- **Secure Registration:** Email uniqueness enforcement, name validation, and salted password hashing.
- **Dual-Token JWT Authentication:** Distinct secrets and expiration policies for Access and Refresh tokens.
- **Role-Based Access Control (RBAC):** Extensible middleware ensuring granular authorization (e.g. `admin` vs `user`).
- **Brute-Force Login Defense:** `express-rate-limit` restricting consecutive failed login attempts to 5 per 15 minutes per IP.
- **Parameterized SQL Queries:** Clean `mysql2/promise` connection pool preventing SQL injection vulnerabilities.
- **Centralized Error Handling:** Standardized error responses hiding server internals in production environments.
- **Containerized Multi-Service Setup:** Complete Docker & Docker Compose setup orchestrated with automated MySQL readiness health checks.
- **Comprehensive Test Suite:** Automated unit and integration tests using Jest and Supertest without requiring external database dependencies.
- **Ready-to-Use Postman Suite:** Pre-configured collection with automatic token extraction and chaining scripts.

---

## Technology Stack

| Layer / Concern | Technology / Library | Description |
|---|---|---|
| **Runtime** | Node.js (LTS v20+) | High-performance asynchronous JavaScript engine |
| **Framework** | Express.js 4.x | Fast, unopinionated minimalist web framework |
| **Database** | MySQL 8.0 | Relational database engine using UTF8mb4 charset |
| **Database Driver** | `mysql2` (Promise Pool) | Connection pooling & parameterized query execution |
| **Security & Hashing**| `bcryptjs` | Salted password hashing with 10 salt rounds |
| **Token Handling** | `jsonwebtoken` (JWT) | Cryptographic signing & verification of stateless tokens |
| **Input Validation** | `Joi` | Declarative request payload validation and sanitization |
| **Rate Limiter** | `express-rate-limit` | Memory-based rate limiter targeted at login endpoints |
| **CORS** | `cors` | Configurable Cross-Origin Resource Sharing middleware |
| **Environment** | `dotenv` | Environment variable loader from `.env` files |
| **Containerization** | Docker & Docker Compose | Multi-container reproducible build and orchestration |
| **Automated Testing** | Jest & Supertest | Comprehensive integration and API testing |

---

## Architecture & Design Principles

The application adopts a **Clean Layered Architecture** to promote maintainability, separation of concerns, and ease of automated testing:

```
[ HTTP Request: Client / Postman ]
                │
                ▼
     ┌──────────────────────┐
     │      server.js       │  (Server Bootstrap & Graceful Shutdown)
     └──────────┬───────────┘
                │
                ▼
     ┌──────────────────────┐
     │        app.js        │  (Middleware, CORS, JSON, Health Endpoint)
     └──────────┬───────────┘
                │
                ▼
     ┌──────────────────────┐
     │    routes/authRoutes │  (Route Definitions, Validation, Rate Limiter)
     └──────────┬───────────┘
                │
                ▼
     ┌──────────────────────┐
     │    middleware/       │  (authMiddleware, roleMiddleware, errorMiddleware)
     └──────────┬───────────┘
                │
                ▼
     ┌──────────────────────┐
     │   controllers/       │  (HTTP Request / Response Formatting)
     └──────────┬───────────┘
                │
                ▼
     ┌──────────────────────┐
     │     services/        │  (Core Business Logic, Token Issuance, Hashing)
     └──────────┬───────────┘
                │
                ▼
     ┌──────────────────────┐
     │    repository/       │  (Parameterized MySQL Database Queries)
     └──────────┬───────────┘
                │
                ▼
     ┌──────────────────────┐
     │  MySQL 8 (login_db)  │  (Relational Storage)
     └──────────────────────┘
```

1. **Routes:** Defines URL paths, binds route-level validation schemas, and applies endpoint-specific middlewares (e.g. login rate limiter).
2. **Controllers (`controllers/authController.js`):** Lightweight controllers that extract parameters from `req`, call the appropriate service method, and format the HTTP response.
3. **Services (`services/authService.js`):** Encapsulates core business rules—verifying passwords, checking account status, issuing JWTs, and invoking repositories.
4. **Repositories (`repository/userRepository.js`):** Dedicated persistence layer executing parameterized SQL queries against MySQL connection pools.

---

## Folder Structure

```
login-backend/
├── config/
│   └── db.js                              # MySQL 8 connection pool & connection test helper
├── controllers/
│   └── authController.js                  # Request handlers for authentication endpoints
├── middleware/
│   ├── authMiddleware.js                  # Bearer token verification & user attachment
│   ├── roleMiddleware.js                  # Role-based authorization middleware (RBAC)
│   └── errorMiddleware.js                 # Centralized error handler and JSON formatter
├── repository/
│   └── userRepository.js                  # Parameterized MySQL database queries
├── routes/
│   └── authRoutes.js                      # Authentication & profile routes definition
├── services/
│   └── authService.js                     # Business logic, token generation, and hashing
├── validation/
│   └── authValidation.js                  # Joi request validation schemas & middleware
├── tests/
│   └── auth.test.js                       # Comprehensive automated integration test suite
├── postman/
│   └── Login-Backend.postman_collection.json # Exported Postman collection with test scripts
├── .dockerignore                          # Files excluded from Docker container builds
├── .env.example                           # Template environment configuration file
├── .gitignore                             # Git exclusion configuration for Node.js
├── database.sql                           # MySQL 8 database and table initialization script
├── Dockerfile                             # Multi-stage production Node.js Docker container
├── docker-compose.yml                     # Docker Compose file orchestrating App + MySQL
├── package.json                           # NPM dependencies and script definitions
├── package-lock.json                      # Locked dependency tree
├── server.js                              # Application entry point
├── app.js                                 # Express application configuration
└── README.md                              # Project documentation
```

---

## Prerequisites

Before running the project, ensure you have the following installed:
- **Node.js:** v18.0.0 or higher (v20+ recommended)
- **NPM:** v9.0.0 or higher
- **MySQL:** v8.0 or higher (if running locally without Docker)
- **Docker & Docker Compose:** Latest stable release (recommended)

---

## Environment Variables

The application relies on `dotenv` for configuration. Copy `.env.example` to create your local `.env`:

```bash
cp .env.example .env
```

| Variable | Description | Default (Local) | Docker Compose Value |
|---|---|---|---|
| `PORT` | Port number for Express server | `5000` | `5000` |
| `NODE_ENV` | Environment mode (`development` or `production`) | `development` | `production` |
| `DB_HOST` | MySQL hostname | `localhost` | `mysql` |
| `DB_PORT` | MySQL port | `3306` | `3306` |
| `DB_USER` | MySQL database user | `root` | `root` |
| `DB_PASSWORD` | MySQL database password | `root` | `root` |
| `DB_NAME` | MySQL database name | `login_backend` | `login_backend` |
| `JWT_SECRET` | Secret key used to sign Access Tokens | *Strong random string* | *Strong random string* |
| `JWT_REFRESH_SECRET`| Secret key used to sign Refresh Tokens | *Separate random string* | *Separate random string* |
| `JWT_EXPIRES_IN` | Access Token lifespan | `15m` | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh Token lifespan | `7d` | `7d` |
| `CORS_ORIGIN` | Allowed CORS origins (comma-separated or `*`) | `*` | `*` |

> [!WARNING]
> Never commit `.env` into version control. Ensure secrets used in production are cryptographically random and securely managed.

---

## Database Schema & Setup

The database schema is defined in `database.sql`. When using Docker Compose, this file is automatically executed during container startup.

### Schema Definition

```sql
CREATE DATABASE IF NOT EXISTS login_backend
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE login_backend;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## Local Development Setup

### 1. Clone & Install Dependencies

```bash
git clone <repository-url>
cd login-backend
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env and ensure DB_HOST=localhost and credentials match your local MySQL server
```

### 3. Initialize MySQL Database

Run the SQL script against your local MySQL instance:

```bash
mysql -u root -p < database.sql
```

### 4. Start the Application

```bash
# Production start
npm start

# Development mode with hot-reloading (nodemon)
npm run dev
```

The service will be accessible at `http://localhost:5000`.

---

## Docker & Containerized Setup

The project provides complete multi-container orchestration with Docker Compose. The setup starts:
1. A **MySQL 8.0** container initialized with `database.sql`.
2. An **Express Backend** container that automatically connects once MySQL completes its health check.

### Running with Docker Compose

Ensure Docker Desktop or the Docker daemon is running on your machine, then execute:

```bash
# Build and run containers in the foreground
docker compose up --build

# Run detached in the background
docker compose up --build -d
```

---

## Docker Command Reference

| Action | Command |
|---|---|
| **Build & start containers** | `docker compose up --build` |
| **Run in background (detached)** | `docker compose up --build -d` |
| **View real-time application logs** | `docker compose logs -f app` |
| **View real-time database logs** | `docker compose logs -f mysql` |
| **Stop running containers** | `docker compose down` |
| **Stop and wipe database volume** | `docker compose down -v` |
| **Check container status** | `docker compose ps` |
| **Execute bash shell in app container**| `docker compose exec app sh` |
| **Access MySQL CLI in container** | `docker compose exec mysql mysql -u root -proot login_backend` |

---

## API Endpoints Reference

### Base URL: `http://localhost:5000`

| Method | Endpoint | Access Level | Description |
|---|---|---|---|
| `GET` | `/api/health` | Public | System status and service health check |
| `POST` | `/api/auth/register` | Public | Register a new user |
| `POST` | `/api/auth/login` | Public (Rate Limited) | Authenticate user & receive tokens |
| `POST` | `/api/auth/refresh` | Public | Refresh expired access token |
| `GET` | `/api/auth/profile` | Authenticated (`Bearer`) | Retrieve current user profile |
| `GET` | `/api/auth/admin-only` | Admin Role (`Bearer`) | Access admin-restricted resource |
| `POST` | `/api/auth/logout` | Public | Client-side session termination |

---

### Detailed Request & Response Examples

#### 1. System Health Check
- **Endpoint:** `GET /api/health`
- **Response `200 OK`:**
```json
{
  "status": "UP",
  "service": "login-backend"
}
```

---

#### 2. User Registration
- **Endpoint:** `POST /api/auth/register`
- **Headers:** `Content-Type: application/json`
- **Request Body:**
```json
{
  "name": "Test User",
  "email": "test@example.com",
  "password": "Password123"
}
```
- **Response `201 Created`:**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "name": "Test User",
    "email": "test@example.com",
    "role": "user"
  }
}
```
- **Error Response `409 Conflict` (Duplicate Email):**
```json
{
  "error": "Error",
  "message": "Email is already registered"
}
```
- **Error Response `400 Bad Request` (Validation Failure):**
```json
{
  "error": "Validation Error",
  "message": "Password must be at least 8 characters long"
}
```

---

#### 3. User Login
- **Endpoint:** `POST /api/auth/login`
- **Headers:** `Content-Type: application/json`
- **Request Body:**
```json
{
  "email": "test@example.com",
  "password": "Password123"
}
```
- **Response `200 OK`:**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "Test User",
    "email": "test@example.com",
    "role": "user"
  }
}
```
- **Error Response `401 Unauthorized` (Invalid Credentials):**
```json
{
  "error": "Error",
  "message": "Invalid email or password"
}
```
- **Error Response `429 Too Many Requests` (Rate Limit Exceeded):**
```json
{
  "error": "Too Many Requests",
  "message": "Too many failed login attempts. Please try again after 15 minutes."
}
```

---

#### 4. Refresh Access Token
- **Endpoint:** `POST /api/auth/refresh`
- **Headers:** `Content-Type: application/json`
- **Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```
- **Response `200 OK`:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

#### 5. Get User Profile
- **Endpoint:** `GET /api/auth/profile`
- **Headers:** `Authorization: Bearer <ACCESS_TOKEN>`
- **Response `200 OK`:**
```json
{
  "user": {
    "id": 1,
    "name": "Test User",
    "email": "test@example.com",
    "role": "user"
  }
}
```
- **Error Response `401 Unauthorized` (Missing or Invalid Token):**
```json
{
  "error": "Unauthorized",
  "message": "Access token has expired. Please refresh your token."
}
```

---

#### 6. Admin Only Resource
- **Endpoint:** `GET /api/auth/admin-only`
- **Headers:** `Authorization: Bearer <ACCESS_TOKEN>`
- **Response `200 OK` (Admin user):**
```json
{
  "message": "Admin access granted"
}
```
- **Error Response `403 Forbidden` (Regular user):**
```json
{
  "error": "Forbidden",
  "message": "Access denied: requires admin privileges."
}
```

---

#### 7. User Logout
- **Endpoint:** `POST /api/auth/logout`
- **Response `200 OK`:**
```json
{
  "message": "Logout successful"
}
```
*Note: Since JWTs are stateless, the client application should immediately remove the access and refresh tokens from memory/storage.*

---

## Authentication & Token Lifecycle Flow

```
   Client App                   Login Backend                  MySQL Database
       │                              │                              │
       │ 1. POST /api/auth/login      │                              │
       ├─────────────────────────────>│                              │
       │    (email, password)         │ 2. Parameterized Query       │
       │                              ├─────────────────────────────>│
       │                              │<─────────────────────────────┤
       │                              │ 3. bcrypt.compare()          │
       │                              │ 4. Sign Access & Refresh JWT │
       │ 5. Return Tokens + User Info │                              │
       │<─────────────────────────────┤                              │
       │                              │                              │
       │ 6. GET /api/auth/profile     │                              │
       │    (Bearer Access Token)     │                              │
       ├─────────────────────────────>│                              │
       │                              │ 7. Verify JWT Signature      │
       │                              │ 8. Fetch user by ID          │
       │                              ├─────────────────────────────>│
       │                              │<─────────────────────────────┤
       │ 9. Return Profile (no hash)  │                              │
       │<─────────────────────────────┤                              │
       │                              │                              │
       │ 10. Access Token Expires!    │                              │
       │ 11. POST /api/auth/refresh   │                              │
       │    (refreshToken)            │                              │
       ├─────────────────────────────>│ 12. Verify Refresh JWT       │
       │                              │ 13. Verify user active in DB │
       │                              ├─────────────────────────────>│
       │                              │<─────────────────────────────┤
       │                              │ 14. Sign new Access Token    │
       │ 15. Return new Access Token  │                              │
       │<─────────────────────────────┤                              │
```

---

## Security & Protection Measures

1. **Password Hashing:** Passwords are never stored in plain text. They are hashed using `bcryptjs` with 10 salt rounds before persistence.
2. **Parameterized SQL Queries:** All SQL statements utilize placeholder syntax (`?`) executed through `mysql2/promise`, completely mitigating SQL injection risks.
3. **Dual Secret Isolation:** Access tokens and refresh tokens utilize distinct, separate cryptographic keys (`JWT_SECRET` vs `JWT_REFRESH_SECRET`).
4. **Brute Force Defense:** `express-rate-limit` monitors failed authentication attempts, returning HTTP 429 when an IP fails 5 times within a 15-minute window.
5. **No Password Hash Leakage:** Password hashes are strictly omitted from all controller responses, user profile outputs, and server logs.
6. **Error Sanitization:** Centralized error handling prevents stack trace disclosure to clients in production environments.
7. **Role-Based Authorization:** Endpoint access is strictly enforced via composable middleware, guaranteeing that regular users cannot access administrative endpoints.

---

## Automated Testing

The project includes an automated test suite implemented with **Jest** and **Supertest**. Tests run against an isolated repository mock layer, allowing tests to run rapidly and deterministically without requiring a live MySQL server.

### Run Tests:

```bash
npm test
```

### Coverage Areas:
- Health check availability (`GET /api/health`).
- User registration, duplicate email handling, and field validation.
- Login credential validation, password verification, and inactive user rejection.
- Refresh token issuance, invalid token rejection, and expiration handling.
- Profile authorization, token presence checks, and expiry verification.
- Role-based access control (RBAC) ensuring normal users receive `403 Forbidden` on admin routes.
- Logout confirmation.

---

## Postman Collection Guide

The pre-configured Postman collection is located in:
`postman/Login-Backend.postman_collection.json`

### Importing & Using in Postman:
1. Open **Postman** and click **Import**.
2. Drag and drop `postman/Login-Backend.postman_collection.json`.
3. The collection provides three collection variables:
   - `baseUrl`: Defaults to `http://localhost:5000`.
   - `token`: Automatically captured after running the **Login** request.
   - `refreshToken`: Automatically captured after running the **Login** request.
4. Execute requests in the following recommended sequence:
   - **Health Check** (Verify system is UP)
   - **Register User** (Create a new account)
   - **Login** (Tokens are automatically populated in collection variables)
   - **Get Profile** (Uses `{{token}}` in Authorization header)
   - **Refresh Token** (Uses `{{refreshToken}}` and updates `{{token}}`)
   - **Admin Only Endpoint** (Demonstrates RBAC)
   - **Logout** (Session cleanup)

---

## Troubleshooting Guide

### 1. Database Connection Refused (`ECONNREFUSED`)
- **Docker Compose:** Ensure the MySQL container is healthy (`docker compose ps`). The app container depends on `condition: service_healthy`.
- **Local Run:** Ensure local MySQL service is active on port 3306 and that credentials in `.env` match your local MySQL configuration (`DB_HOST=localhost`).

### 2. Rate Limit Exceeded (`HTTP 429 Too Many Requests`)
- The login endpoint enforces 5 failed attempts per 15 minutes per IP.
- Wait for the 15-minute cooldown window to expire, or restart the server in development to reset memory counters.

### 3. Invalid or Expired Token (`HTTP 401 Unauthorized`)
- Access tokens expire after 15 minutes. Call `POST /api/auth/refresh` with your valid `refreshToken` to receive a new access token.

---

## Preparing for a New GitHub Repository

To push this project to a clean, new GitHub repository named `login-backend`:

```bash
# 1. Initialize or reset git origin
git remote remove origin

# 2. Add your new GitHub repository remote
git remote add origin https://github.com/<your-username>/login-backend.git

# 3. Create a clean branch and commit files
git checkout -b main
git add .
git commit -m "feat: complete Node.js Express MySQL JWT login backend"

# 4. Push to your new repository
git push -u origin main
```

---

## Future Roadmap

- [ ] Email verification via SMTP token links upon registration.
- [ ] Redis-backed refresh token revocation list (blacklisting).
- [ ] Two-Factor Authentication (2FA / TOTP) support.
- [ ] User profile avatar uploads with AWS S3 / Cloudinary integration.
- [ ] Account password reset via secure one-time tokens.

---

## License

This project is licensed under the ISC License.
