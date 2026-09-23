const dotenv = require('dotenv');
dotenv.config();

const app = require('./app');
const { testConnection } = require('./config/db');

const PORT = parseInt(process.env.PORT, 10) || 5000;

// Start server and check database connectivity
const startServer = async () => {
  try {
    if (process.env.NODE_ENV !== 'test') {
      try {
        await testConnection(5, 2000);
      } catch (err) {
        console.warn('Database not ready yet, starting server anyway...');
      }
    }

    const server = app.listen(PORT, () => {
      console.log(`Login Backend running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
    });

    // Graceful shutdown
    const handleShutdown = (signal) => {
      console.log(`\n${signal} received. Closing HTTP server...`);
      server.close(() => {
        console.log('HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();
