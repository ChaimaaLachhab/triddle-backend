const ErrorResponse = require('../utils/errorResponse');

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log to console for dev
  console.error(err);

  // Prisma Client errors
  if (err.code) {
    // Unique constraint violation
    if (err.code === 'P2002') {
      const message = `Duplicate field value: ${err.meta?.target?.join(', ')}`;
      error = new ErrorResponse(message, 400);
    }
    
    // Record not found
    if (err.code === 'P2001' || err.code === 'P2025') {
      const message = 'Resource not found';
      error = new ErrorResponse(message, 404);
    }
    
    // Foreign key constraint failure
    if (err.code === 'P2003') {
      const message = 'Related resource not found';
      error = new ErrorResponse(message, 400);
    }
    
    // Input validation error
    if (err.code === 'P2007') {
      const message = 'Validation error in Prisma client';
      error = new ErrorResponse(message, 400);
    }
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = new ErrorResponse(message, 401);
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = new ErrorResponse(message, 401);
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || 'Server Error'
  });
};

module.exports = errorHandler;