
const errorHandler = (err, req, res, next) => {
  // If headers have already been sent, delegate to Express default error handler
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.statusCode || (res.statusCode >= 400 ? res.statusCode : 500);
  const errorName = err.name || (statusCode === 500 ? 'Internal Server Error' : 'Error');
  const message = err.message || 'An unexpected error occurred';

  // Log error details for server diagnostics (excluding secrets/passwords)
  if (statusCode >= 500) {
    console.error(`[Server Error ${statusCode}] ${req.method} ${req.originalUrl}:`, err);
  }

  const response = {
    error: errorName,
    message: statusCode >= 500 && process.env.NODE_ENV === 'production'
      ? 'An unexpected internal error occurred on the server'
      : message,
  };

  // Only include stack trace in non-production environments when debug is helpful
  if (process.env.NODE_ENV !== 'production' && statusCode >= 500) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

module.exports = errorHandler;
