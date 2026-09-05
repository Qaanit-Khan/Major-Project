const { DataTypes } = require('sequelize');
const sequelize = require('../db/connection');

const Questionnaire = sequelize.define('Questionnaire', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  campaign_id: { type: DataTypes.UUID, allowNull: true },
  name: { type: DataTypes.STRING(300), allowNull: false },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: false },
  version: { type: DataTypes.INTEGER, defaultValue: 1 },
  published_at: { type: DataTypes.DATE, allowNull: true },
}, { tableName: 'questionnaires' });

module.exports = Questionnaire;
