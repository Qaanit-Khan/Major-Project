const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const { User } = require('../models');
const { logAudit } = require('../utils/auditLogger');

const router = express.Router();

// Rate limit: 5 attempts per 15 min per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many requests from this IP, try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/auth/login
router.post(
  '/login',
  loginLimiter,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 1 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;

    try {
      const user = await User.findOne({ where: { email } });

      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Check account lock
      if (user.locked_until && new Date() < new Date(user.locked_until)) {
        const minutesLeft = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
        return res.status(423).json({ error: `Account locked. Try again in ${minutesLeft} minute(s).` });
      }

      const passwordMatch = await bcrypt.compare(password, user.password_hash);

      if (!passwordMatch) {
        const newAttempts = user.failed_attempts + 1;
        const updates = { failed_attempts: newAttempts };
        if (newAttempts >= 5) {
          updates.locked_until = new Date(Date.now() + 15 * 60 * 1000);
          updates.failed_attempts = 0;
        }
        await user.update(updates);
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      if (!user.is_active) {
        return res.status(403).json({ error: 'Account is disabled. Contact admin.' });
      }

      // Reset failed attempts on success
      await user.update({ failed_attempts: 0, locked_until: null, last_login: new Date() });

      const token = jwt.sign(
        { id: user.id, role: user.role, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '30m' }
      );

      await logAudit({
        userId: user.id,
        userEmail: user.email,
        action: 'LOGIN',
        entity: 'User',
        entityId: user.id,
        ipAddress: req.ip,
      });

      res.json({
        token,
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      // Always return success to avoid email enumeration
      return res.json({ message: 'If that email exists, a reset link has been sent.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await user.update({ password_reset_token: token, password_reset_expires: expires });

    // Stub: log reset link (replace with real SMTP)
    const resetUrl = `${process.env.FRONTEND_URL}/admin/reset-password?token=${token}`;
    console.log(`[STUB] Password reset link for ${email}: ${resetUrl}`);

    res.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Token and password required' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

  try {
    const user = await User.findOne({ where: { password_reset_token: token } });
    if (!user || !user.password_reset_expires || new Date() > new Date(user.password_reset_expires)) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const hash = await bcrypt.hash(password, 12);
    await user.update({ password_hash: hash, password_reset_token: null, password_reset_expires: null });

    res.json({ message: 'Password reset successfully. Please log in.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/me
router.get('/me', require('../middleware/auth').authMiddleware, async (req, res) => {
  res.json({ id: req.user.id, name: req.user.name, email: req.user.email, role: req.user.role });
});

module.exports = router;
