const { DataTypes } = require('sequelize');
const sequelize = require('../db/connection');

const AuditLog = sequelize.define('AuditLog', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  user_id: { type: DataTypes.UUID, allowNull: true },
  user_email: { type: DataTypes.STRING(150), allowNull: true },
  action: { type: DataTypes.STRING(100), allowNull: false },
  entity: { type: DataTypes.STRING(100), allowNull: false },
  entity_id: { type: DataTypes.STRING(100), allowNull: true },
  old_value: { type: DataTypes.JSON, allowNull: true },
  new_value: { type: DataTypes.JSON, allowNull: true },
  ip_address: { type: DataTypes.STRING(50), allowNull: true },
}, { tableName: 'audit_logs', updatedAt: false });

module.exports = AuditLog;
