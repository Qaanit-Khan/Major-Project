const { DataTypes } = require('sequelize');
const sequelize = require('../db/connection');

const Followup = sequelize.define('Followup', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  lead_id: { type: DataTypes.UUID, allowNull: true },
  call_id: { type: DataTypes.UUID, allowNull: true },
  campaign_id: { type: DataTypes.UUID, allowNull: true },
  scheduled_at: { type: DataTypes.DATE, allowNull: false },
  notes: { type: DataTypes.TEXT, allowNull: true },
  status: { type: DataTypes.ENUM('pending', 'done', 'cancelled'), defaultValue: 'pending' },
  created_by: { type: DataTypes.UUID, allowNull: true },
  created_by_type: { type: DataTypes.ENUM('user', 'ai_model'), defaultValue: 'user' },
}, { tableName: 'followups' });

module.exports = Followup;
