// backend/middleware/auth.js
const jwt = require("jsonwebtoken");
const pool = require("../config/db");
require("dotenv").config();

/**
 * Universal JWT Verification
 * Attaches req.user = { id, email, role, name } to every authenticated request
 */
async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      return res
        .status(401)
        .json({ message: "Authentication required. No token provided." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Verify user exists and is active across the entire system
    const [[user]] = await pool.query(
      "SELECT id, name, email, role, is_active, is_verified FROM users WHERE id = ?",
      [decoded.id],
    );

    if (!user) {
      return res.status(401).json({ message: "Account not found." });
    }
    if (!user.is_active) {
      return res
        .status(403)
        .json({ message: "Account deactivated. Contact support." });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res
        .status(401)
        .json({ message: "Session expired. Please log in again." });
    }
    return res.status(401).json({ message: "Invalid token." });
  }
}

/**
 * Role-Based Access Control
 * Usage: authorize('admin', 'staff') or authorize('customer')
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ message: "Forbidden. You lack the required permissions." });
    }
    next();
  };
}

// Quick-access helpers
const requireStaffOrAdmin = authorize("admin", "staff");
const requireCustomer = authorize("customer");

module.exports = {
  authenticate,
  authorize,
  requireStaffOrAdmin,
  requireCustomer,
};
