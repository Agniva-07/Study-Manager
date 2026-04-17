const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { fail } = require('../utils/response');

const protect = async (req, res, next) => {
  try {
    let token;

    // 🔍 DEBUG: Log incoming headers
    console.log('🔑 Auth Header:', req.headers.authorization ? 'Present' : 'Missing');

    // 1. Get token from header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1]?.trim();
      console.log('🔑 Token extracted:', token ? 'Yes (length: ' + token.length + ')' : 'No');
    }

    // 2. If no token
    if (!token) {
      console.log('❌ Auth failed: No token provided');
      return fail(res, 401, 'Not authorized, no token');
    }

    // 3. Verify token
    console.log('✅ Verifying token...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ Token verified for user:', decoded.id);

    // 4. Get user from DB
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      console.log('❌ User not found in DB');
      return fail(res, 401, 'User not found');
    }

    // 5. Attach user to request
    req.user = user;
    console.log('✅ Auth successful for user:', user.email);

    next(); // move to next controller

  } catch (error) {
    console.log('❌ Auth error:', error.name, error.message);
    if (error.name === 'TokenExpiredError') {
      return fail(res, 401, 'Token expired');
    }
    return fail(res, 401, 'Not authorized, token failed');
  }
};

module.exports = { protect };