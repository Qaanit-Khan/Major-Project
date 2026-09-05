const { DataTypes } = require('sequelize');
const sequelize = require('../db/connection');

const Lead = sequelize.define('Lead', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  call_id: { type: DataTypes.UUID, allowNull: true },
  campaign_id: { type: DataTypes.UUID, allowNull: true },
  name: { type: DataTypes.STRING(200), allowNull: true },
  phone_encrypted: { type: DataTypes.STRING(500), allowNull: false },
  lead_status: { type: DataTypes.ENUM('Hot', 'Warm', 'Cold', 'Unqualified'), defaultValue: 'Warm' },
  lead_score: { type: DataTypes.FLOAT, allowNull: true },
  interested_status: {
    type: DataTypes.ENUM('interested', 'not_interested', 'neutral', 'pending'),
    defaultValue: 'pending',
  },
  shortlisted: { type: DataTypes.BOOLEAN, defaultValue: false },
  shortlisted_at: { type: DataTypes.DATE, allowNull: true },
  shortlisted_by: { type: DataTypes.UUID, allowNull: true },
  follow_up_date: { type: DataTypes.DATE, allowNull: true },
  language: { type: DataTypes.STRING(50), defaultValue: 'English' },
  last_call_date: { type: DataTypes.DATE, allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
  status_override_by: { type: DataTypes.UUID, allowNull: true },
  status_override_source: { type: DataTypes.ENUM('ai', 'manual'), defaultValue: 'ai' },
}, { tableName: 'leads' });

module.exports = Lead;
