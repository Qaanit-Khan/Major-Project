const { DataTypes } = require('sequelize');
const sequelize = require('../db/connection');

const Question = sequelize.define('Question', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  questionnaire_id: { type: DataTypes.UUID, allowNull: false },
  text: { type: DataTypes.TEXT, allowNull: false },
  question_type: { type: DataTypes.ENUM('open_ended', 'yes_no', 'multiple_choice'), defaultValue: 'open_ended' },
  expected_answers: { type: DataTypes.JSON, allowNull: true },
  order_index: { type: DataTypes.INTEGER, defaultValue: 0 },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'questions' });

module.exports = Question;
