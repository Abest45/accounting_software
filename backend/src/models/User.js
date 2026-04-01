const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        len: [3, 50]
      }
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [8, 255]
      }
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    role: {
      type: DataTypes.ENUM('super-admin', 'admin', 'pending_admin', 'manager', 'analyst', 'viewer'),
      defaultValue: 'viewer'
    },
    department: {
      type: DataTypes.STRING,
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    isApproved: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'User must be approved by super admin before allowing access'
    },
    approvalToken: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Admin approval token for super admin to approve new admin registrations'
    },
    approvalTokenExpires: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Approval token expiration date'
    },
    lastLogin: {
      type: DataTypes.DATE,
      allowNull: true
    },
    loginAttempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    lockUntil: {
      type: DataTypes.DATE,
      allowNull: true
    },
    resetToken: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Hashed password reset token'
    },
    resetTokenExpires: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Password reset token expiration time'
    },
    refreshTokenHash: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Hashed refresh token for issuing new access tokens'
    },
    refreshTokenExpires: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Refresh token expiration time'
    },
    isLocked: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Account locked due to too many failed login attempts'
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        len: [10, 20]
      }
    },
    twoFactorEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    twoFactorSecret: {
      type: DataTypes.STRING,
      allowNull: true
    },
    backupCodes: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'Backup codes for 2FA recovery'
    },
    emailVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    emailVerificationToken: {
      type: DataTypes.STRING,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Additional user metadata (company, etc.)'
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    timestamps: true,
    tableName: 'users'
  });

  return User;
};
