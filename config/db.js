const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

let poolInstance = null;

const getPool = () => {
  if (!poolInstance) {
    poolInstance = mysql.createPool({
      host: process.env.DB_HOST || 'mysql',
      port: parseInt(process.env.DB_PORT, 10) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'root',
      database: process.env.DB_NAME || 'login_backend',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }
  return poolInstance;
};


const pool = new Proxy(
  {},
  {
    get(target, prop) {
      const activePool = getPool();
      const value = activePool[prop];
      if (typeof value === 'function') {
        return value.bind(activePool);
      }
      return value;
    },
  }
);


const testConnection = async (retries = 5, delayMs = 2000) => {
  const activePool = getPool();
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const connection = await activePool.getConnection();
      console.log(' Connected to MySQL database successfully.');
      connection.release();
      return true;
    } catch (error) {
      console.warn(` Database connection attempt ${attempt}/${retries} failed: ${error.message}`);
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } else {
        console.error(' Could not establish database connection after maximum retries.');
        throw error;
      }
    }
  }
};


const closePool = async () => {
  if (poolInstance) {
    await poolInstance.end();
    poolInstance = null;
  }
};

module.exports = {
  pool,
  getPool,
  testConnection,
  closePool,
};
