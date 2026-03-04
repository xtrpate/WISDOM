const jwt = require('jsonwebtoken');
require('dotenv').config();

const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

const requireStaffOrAdmin = (req, res, next) => {
  if (!['staff', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Staff or Admin access required' });
  }
  next();
};

module.exports = { authenticate, requireStaffOrAdmin };
