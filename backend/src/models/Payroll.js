const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Payroll = sequelize.define('Payroll', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    employeeId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    employeeName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      validate: {
        isEmail: true
      }
    },
    department: {
      type: DataTypes.STRING
    },
    position: {
      type: DataTypes.STRING
    },
    payPeriod: {
      type: DataTypes.ENUM('weekly', 'bi-weekly', 'monthly'),
      allowNull: false
    },
    basicSalary: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false
    },
    overtimeHours: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0
    },
    overtimeRate: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0
    },
    bonus: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    deductions: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    taxRate: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 20
    },
    grossSalary: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false
    },
    taxAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false
    },
    netPay: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false
    },
    paymentDate: {
      type: DataTypes.DATE
    },
    status: {
      type: DataTypes.ENUM('pending', 'processed', 'paid', 'failed'),
      defaultValue: 'pending'
    },
    notes: {
      type: DataTypes.TEXT
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
    tableName: 'payrolls'
  });

  return Payroll;
};
