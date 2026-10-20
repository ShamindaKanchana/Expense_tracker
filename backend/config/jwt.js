/**
 * AUTH-01: separate signing secrets for user vs admin tokens.
 *
 * JWT_ADMIN_SECRET is preferred for admin tokens; JWT_USER_SECRET (or the
 * legacy JWT_SECRET) for user tokens. Falling back to JWT_SECRET keeps the
 * app bootable during the env migration — set both new vars on Render, then
 * remove the fallback in a later release.
 *
 * Rotation plan: bump the new secret, deploy (old tokens fail with 401,
 * clients re-login). Admin rotates independently of users.
 */

const userJwtSecret = () =>
  process.env.JWT_USER_SECRET || process.env.JWT_SECRET || '';

const adminJwtSecret = () =>
  process.env.JWT_ADMIN_SECRET || process.env.JWT_SECRET || '';

const missingSecretMessage =
  'Neither JWT_USER_SECRET nor JWT_SECRET is defined.';

const missingAdminSecretMessage =
  'Neither JWT_ADMIN_SECRET nor JWT_SECRET is defined.';

module.exports = {
  userJwtSecret,
  adminJwtSecret,
  missingSecretMessage,
  missingAdminSecretMessage
};
