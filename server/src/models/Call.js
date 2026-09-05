const { DataTypes } = require('sequelize');
const sequelize = require('../db/connection');

const Call = sequelize.define('Call', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  campaign_id: { type: DataTypes.UUID, allowNull: true },
  phone_number_id: { type: DataTypes.UUID, allowNull: true },
  phone_encrypted: { type: DataTypes.STRING(500), allowNull: false },
  language: { type: DataTypes.STRING(50), defaultValue: 'English' },
  status: {
    type: DataTypes.ENUM('in_progress', 'completed', 'failed', 'no_answer', 'busy', 'voicemail'),
    defaultValue: 'in_progress',
  },
  started_at: { type: DataTypes.DATE, allowNull: true },
  ended_at: { type: DataTypes.DATE, allowNull: true },
  duration_seconds: { type: DataTypes.INTEGER, allowNull: true },
  recording_url: { type: DataTypes.STRING(1000), allowNull: true },
  transcript_encrypted: { type: DataTypes.TEXT, allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
}, { tableName: 'calls' });

module.exports = Call;
