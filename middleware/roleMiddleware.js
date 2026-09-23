/**
 * Role-Based Access Control (RBAC) Middleware Factory
 * Checks whether the authenticated user has the required role.
 *
 * @param  {...string} allowedRoles - Single role or list of allowed roles (e.g. 'admin')
 * @returns {Function} Express middleware
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required before checking permissions.',
      });
    }

    const userRole = req.user.role;

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Access denied: requires ${allowedRoles.join(' or ')} privileges.`,
      });
    }

    next();
  };
};

module.exports = {
  requireRole,
};
