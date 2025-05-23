// middleware/optionalAuth.js
const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const { prisma } = require('../config/db');
const config = require('../config');

exports.optionalAuth = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer')) {
    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, config.jwtSecret);

      const user = await prisma.user.findUnique({
        where: { id: decoded.id }
      });

      req.user = user;
    } catch (err) {
      req.user = null;
    }
  } else {
    req.user = null;
  }

  next();
});
