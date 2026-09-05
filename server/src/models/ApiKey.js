const { DataTypes } = require('sequelize');
const sequelize = require('../db/connection');

const ApiKey = sequelize.define('ApiKey', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING(200), allowNull: false },
  key_prefix: { type: DataTypes.STRING(10), allowNull: false },
  key_hash: { type: DataTypes.STRING(255), allowNull: false },
  created_by: { type: DataTypes.UUID, allowNull: false },
  last_used_at: { type: DataTypes.DATE, allowNull: true },
  revoked_at: { type: DataTypes.DATE, allowNull: true },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'api_keys' });

module.exports = ApiKey;
