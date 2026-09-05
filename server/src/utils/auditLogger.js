const { AuditLog } = require('../models');

async function logAudit({ userId, userEmail, action, entity, entityId, oldValue, newValue, ipAddress }) {
  try {
    await AuditLog.create({
      user_id: userId || null,
      user_email: userEmail || null,
      action,
      entity,
      entity_id: entityId ? String(entityId) : null,
      old_value: oldValue || null,
      new_value: newValue || null,
      ip_address: ipAddress || null,
    });
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
}

module.exports = { logAudit };
