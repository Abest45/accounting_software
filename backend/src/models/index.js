const { Sequelize } = require('sequelize');
const path = require('path');
const config = require('../config/database');
const Logger = require('../utils/logger');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

const sequelize = new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, {
  host: dbConfig.host,
  port: dbConfig.port,
  dialect: dbConfig.dialect,
  logging: dbConfig.logging,
  pool: dbConfig.pool,
  ssl: dbConfig.ssl,
  dialectOptions: dbConfig.dialectOptions
});

const db = {};

// Import models
const User = require('./User')(sequelize);
const Invoice = require('./Invoice')(sequelize);
const Receipt = require('./Receipt')(sequelize);
const Inventory = require('./Inventory')(sequelize);
const Purchase = require('./Purchase')(sequelize);
const Expense = require('./Expense')(sequelize);
const Payroll = require('./Payroll')(sequelize);
const AuditLog = require('./AuditLog')(sequelize);

// Add models to db object
db.User = User;
db.Invoice = Invoice;
db.Receipt = Receipt;
db.Inventory = Inventory;
db.Purchase = Purchase;
db.Expense = Expense;
db.Payroll = Payroll;
db.AuditLog = AuditLog;

// Define associations
db.User.hasMany(db.Invoice, { foreignKey: 'userId', onDelete: 'CASCADE' });
db.Invoice.belongsTo(db.User);

db.User.hasMany(db.Receipt, { foreignKey: 'userId', onDelete: 'CASCADE' });
db.Receipt.belongsTo(db.User);

db.User.hasMany(db.Purchase, { foreignKey: 'userId', onDelete: 'CASCADE' });
db.Purchase.belongsTo(db.User);

db.User.hasMany(db.Expense, { foreignKey: 'userId', onDelete: 'CASCADE' });
db.Expense.belongsTo(db.User);

db.User.hasMany(db.AuditLog, { foreignKey: 'userId', onDelete: 'CASCADE' });
db.AuditLog.belongsTo(db.User);

// Test connection and sync
sequelize.authenticate()
  .then(async () => {
    Logger.info('Database connection established successfully');
    
    if (env === 'development') {
      await sequelize.sync({ alter: true });
      Logger.info('Database synchronized');
    }
  })
  .catch(err => {
    Logger.error('Database connection failed:', err);
    process.exit(1);
  });

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
