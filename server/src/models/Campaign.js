const { DataTypes } = require('sequelize');
const sequelize = require('../db/connection');

const Campaign = sequelize.define('Campaign', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING(200), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  status: { type: DataTypes.ENUM('draft', 'active', 'paused', 'completed'), defaultValue: 'draft' },
  language: { type: DataTypes.STRING(50), defaultValue: 'English' },
  created_by: { type: DataTypes.UUID, allowNull: false },
  total_numbers: { type: DataTypes.INTEGER, defaultValue: 0 },
  dialed_count: { type: DataTypes.INTEGER, defaultValue: 0 },
}, { tableName: 'campaigns' });

module.exports = Campaign;
