const { DataTypes } = require('sequelize');
const sequelize = require('../db/connection');

const PhoneNumber = sequelize.define('PhoneNumber', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  campaign_id: { type: DataTypes.UUID, allowNull: false },
  phone_encrypted: { type: DataTypes.STRING(500), allowNull: false },
  language: { type: DataTypes.STRING(50), defaultValue: 'English' },
  status: { type: DataTypes.ENUM('pending', 'dialing', 'done', 'failed', 'skipped'), defaultValue: 'pending' },
}, { tableName: 'phone_numbers' });

module.exports = PhoneNumber;
