require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize, User } = require('../models');

async function seed() {
  try {
    await sequelize.sync({ alter: true });
    const existing = await User.findOne({ where: { email: 'admin@arbsoftech.com' } });
    if (!existing) {
      const hash = await bcrypt.hash('Admin@1234', 12);
      await User.create({
        name: 'ARB Admin',
        email: 'admin@arbsoftech.com',
        password_hash: hash,
        role: 'admin',
      });
      console.log('✅ Seed admin user created: admin@arbsoftech.com / Admin@1234');
    } else {
      console.log('ℹ️  Admin user already exists, skipping seed.');
    }
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  }
}

seed();
