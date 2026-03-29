'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add refreshTokenHash and refreshTokenExpires columns to users table
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        'users',
        'refreshTokenHash',
        {
          type: Sequelize.STRING,
          allowNull: true,
          comment: 'Hashed refresh token for issuing new access tokens'
        },
        { transaction }
      );

      await queryInterface.addColumn(
        'users',
        'refreshTokenExpires',
        {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'Refresh token expiration time'
        },
        { transaction }
      );
    });
  },

  down: async (queryInterface) => {
    // Rollback migration
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeColumn('users', 'refreshTokenHash', { transaction });
      await queryInterface.removeColumn('users', 'refreshTokenExpires', { transaction });
    });
  }
};
