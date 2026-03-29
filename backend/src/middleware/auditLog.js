const db = require('../models');
const Logger = require('../utils/logger');

const auditLog = async (req, res, next) => {
  try {
    // Capture response data
    const originalSend = res.send;
    
    res.send = function(data) {
      if (req.user && req.method !== 'GET') {
        // Log non-GET requests
        const logData = {
          userId: req.user.userId,
          action: `${req.method} ${req.path}`,
          entity: req.path.split('/')[2],
          entityId: req.body?.id,
          oldValues: req.body?.oldValues,
          newValues: req.body,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          status: res.statusCode < 400 ? 'success' : 'failure',
          errorMessage: res.statusCode < 400 ? null : data
        };

        db.AuditLog.create(logData).catch(err => {
          Logger.error('Audit log creation failed:', err);
        });
      }

      originalSend.call(this, data);
    };

    next();
  } catch (error) {
    Logger.error('Audit middleware error:', error);
    next();
  }
};

module.exports = auditLog;
