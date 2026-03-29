'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add backup codes column to users table
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        'users',
        'backupCodes',
        {
          type: Sequelize.JSON,
          defaultValue: [],
          comment: 'Backup codes for 2FA recovery'
        },
        { transaction }
      );
    });
  },

  down: async (queryInterface) => {
    // Rollback migration
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeColumn('users', 'backupCodes', { transaction });
    });
  }
};
