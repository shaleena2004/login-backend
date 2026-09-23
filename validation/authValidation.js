const Joi = require('joi');

/**
 * Joi Schema for User Registration
 */
const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required().messages({
    'string.base': 'Name must be a string',
    'string.empty': 'Name cannot be empty',
    'string.min': 'Name must be at least {#limit} characters long',
    'string.max': 'Name must not exceed {#limit} characters',
    'any.required': 'Name is required',
  }),
  email: Joi.string().trim().email().required().messages({
    'string.base': 'Email must be a string',
    'string.empty': 'Email cannot be empty',
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),
  password: Joi.string().min(8).max(128).required().messages({
    'string.base': 'Password must be a string',
    'string.empty': 'Password cannot be empty',
    'string.min': 'Password must be at least {#limit} characters long',
    'string.max': 'Password must not exceed {#limit} characters',
    'any.required': 'Password is required',
  }),
});

/**
 * Joi Schema for User Login
 */
const loginSchema = Joi.object({
  email: Joi.string().trim().email().required().messages({
    'string.base': 'Email must be a string',
    'string.empty': 'Email cannot be empty',
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),
  password: Joi.string().required().messages({
    'string.base': 'Password must be a string',
    'string.empty': 'Password cannot be empty',
    'any.required': 'Password is required',
  }),
});

/**
 * Joi Schema for Refresh Token Request
 */
const refreshSchema = Joi.object({
  refreshToken: Joi.string().trim().required().messages({
    'string.base': 'Refresh token must be a string',
    'string.empty': 'Refresh token cannot be empty',
    'any.required': 'Refresh token is required',
  }),
});

/**
 * Middleware factory to validate request body using a Joi schema
 * @param {Joi.ObjectSchema} schema
 */
const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, {
    abortEarly: true,
    stripUnknown: true,
  });

  if (error) {
    return res.status(400).json({
      error: 'Validation Error',
      message: error.details[0].message,
    });
  }

  // Replace req.body with sanitized and validated value
  req.body = value;
  next();
};

module.exports = {
  registerSchema,
  loginSchema,
  refreshSchema,
  validate,
};
