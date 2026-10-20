const { z } = require('zod');

/**
 * AUTH-05: one validation pattern for every JSON body, following the voice
 * route's zod schema approach. Each route file exports/defines its schemas;
 * this middleware runs safeParse and returns a uniform 400 (message only —
 * no zod internals, stack, or SQL to the client).
 */

const validateBody = (schema) => (req, res, next) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: 'Invalid request body.',
      code: 'REQUEST_INVALID'
    });
  }
  req.body = parsed.data;
  next();
};

// Shared primitives (keep in sync with docs: username rules, amount bounds)
const usernameSchema = z
  .string()
  .trim()
  .regex(/^[a-zA-Z0-9_.]{3,30}$/, 'Invalid username format');

const passwordSchema = z
  .string()
  .min(10, 'Your password needs at least 10 characters.')
  .max(128);

const emailSchema = z
  .string()
  .trim()
  .email()
  .max(254)
  .nullable()
  .optional();

module.exports = { validateBody, usernameSchema, passwordSchema, emailSchema };
