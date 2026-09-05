const { DataTypes } = require('sequelize');
const sequelize = require('../db/connection');

const CallClassification = sequelize.define('CallClassification', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  call_id: { type: DataTypes.UUID, allowNull: false, unique: true },
  talk_duration_seconds: { type: DataTypes.INTEGER, allowNull: true },
  detected_keywords: { type: DataTypes.JSON, allowNull: true },
  sentiment_score: { type: DataTypes.FLOAT, allowNull: true },
  lead_status: {
    type: DataTypes.ENUM('interested', 'not_interested', 'neutral', 'pending'),
    defaultValue: 'pending',
  },
  lead_score: { type: DataTypes.FLOAT, allowNull: true },
}, { tableName: 'call_classifications' });

module.exports = CallClassification;
