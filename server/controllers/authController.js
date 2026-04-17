const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { ok, fail } = require('../utils/response');

// 🔐 Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// 🟢 SIGNUP
exports.signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const normalizedEmail = String(email).trim().toLowerCase();

    // 1. Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return fail(res, 400, 'User already exists');
    }

    // 2. Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 3. Create user
    const user = await User.create({
      name,
      email: normalizedEmail,
      password: hashedPassword
    });

    // 4. Generate token
    const token = generateToken(user._id);

    // 5. Send response
    return ok(res, {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    }, 201);

  } catch (error) {
    return fail(res, 500, error.message || 'Signup failed');
  }
};

// 🔵 LOGIN
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = String(email).trim().toLowerCase();

    console.log('🔐 Login attempt for:', normalizedEmail);

    // 1. Check user exists
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      console.log('❌ User not found:', normalizedEmail);
      return fail(res, 400, 'Invalid credentials');
    }

    // 2. Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('❌ Password mismatch for:', normalizedEmail);
      return fail(res, 400, 'Invalid credentials');
    }

    // 3. Generate token
    const token = generateToken(user._id);
    console.log('✅ Token generated for user:', user._id);

    // 4. Send response
    const responseData = {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    };
    console.log('📤 Sending login response:', JSON.stringify(responseData, null, 2));
    
    return ok(res, responseData);

  } catch (error) {
    console.log('❌ Login error:', error.message);
    return fail(res, 500, error.message || 'Login failed');
  }
};

// 🟡 GET CURRENT USER
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');

    return ok(res, user);
  } catch (error) {
    return fail(res, 500, error.message || 'Failed to load user');
  }
};