const permissions = require("./permissions");

// Must be logged in
function requireAuth(user) {
  if (!user || !user.id || !user.tenantId) {
    throw new Error("Unauthorized");
  }
}

// Must have permission
function requirePermission(user, permission) {
  requireAuth(user);

  const userPermissions = permissions[user.role] || [];

  if (!userPermissions.includes(permission)) {
    throw new Error("Forbidden: insufficient permissions");
  }
}

module.exports = {
  requireAuth,
  requirePermission
};
