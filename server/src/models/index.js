const sequelize = require('../db/connection');
const User = require('./User');
const Campaign = require('./Campaign');
const PhoneNumber = require('./PhoneNumber');
const Call = require('./Call');
const CallClassification = require('./CallClassification');
const Lead = require('./Lead');
const Questionnaire = require('./Questionnaire');
const Question = require('./Question');
const Followup = require('./Followup');
const AuditLog = require('./AuditLog');
const ApiKey = require('./ApiKey');

// Associations
Campaign.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
Campaign.hasMany(PhoneNumber, { foreignKey: 'campaign_id', as: 'phoneNumbers' });
Campaign.hasMany(Call, { foreignKey: 'campaign_id', as: 'calls' });
Campaign.hasMany(Lead, { foreignKey: 'campaign_id', as: 'leads' });
Campaign.hasMany(Questionnaire, { foreignKey: 'campaign_id', as: 'questionnaires' });

PhoneNumber.belongsTo(Campaign, { foreignKey: 'campaign_id' });

Call.belongsTo(Campaign, { foreignKey: 'campaign_id' });
Call.belongsTo(PhoneNumber, { foreignKey: 'phone_number_id' });
Call.hasOne(CallClassification, { foreignKey: 'call_id', as: 'classification' });
Call.hasOne(Lead, { foreignKey: 'call_id', as: 'lead' });
Call.hasMany(Followup, { foreignKey: 'call_id', as: 'followups' });

CallClassification.belongsTo(Call, { foreignKey: 'call_id' });

Lead.belongsTo(Call, { foreignKey: 'call_id' });
Lead.belongsTo(Campaign, { foreignKey: 'campaign_id' });
Lead.hasMany(Followup, { foreignKey: 'lead_id', as: 'followups' });

Questionnaire.belongsTo(Campaign, { foreignKey: 'campaign_id' });
Questionnaire.hasMany(Question, { foreignKey: 'questionnaire_id', as: 'questions' });

Question.belongsTo(Questionnaire, { foreignKey: 'questionnaire_id' });

Followup.belongsTo(Lead, { foreignKey: 'lead_id' });
Followup.belongsTo(Call, { foreignKey: 'call_id' });

module.exports = {
  sequelize,
  User,
  Campaign,
  PhoneNumber,
  Call,
  CallClassification,
  Lead,
  Questionnaire,
  Question,
  Followup,
  AuditLog,
  ApiKey,
};
