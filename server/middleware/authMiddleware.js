const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { fail } = require('../utils/response');

const protect = async (req, res, next) => {
  try {
    let token;

    // 1. Get token from header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    // 2. If no token
    if (!token) {
      return fail(res, 401, 'Not authorized, no token');
    }

    // 3. Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 4. Get user from DB
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return fail(res, 401, 'User not found');
    }

    // 5. Attach user to request
    req.user = user;

    next(); // move to next controller

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return fail(res, 401, 'Token expired');
    }
    return fail(res, 401, 'Not authorized, token failed');
  }
};

module.exports = { protect };