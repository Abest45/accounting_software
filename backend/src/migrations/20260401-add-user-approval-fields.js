'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        'users',
        'isApproved',
        {
          type: Sequelize.BOOLEAN,
          defaultValue: false,
          allowNull: false,
          comment: 'User account approval state'
        },
        { transaction }
      );

      await queryInterface.addColumn(
        'users',
        'approvalToken',
        {
          type: Sequelize.STRING,
          allowNull: true,
          comment: 'Admin approval token for super admin approval link'
        },
        { transaction }
      );

      await queryInterface.addColumn(
        'users',
        'approvalTokenExpires',
        {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'Approval link expiration time'
        },
        { transaction }
      );
    });
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeColumn('users', 'isApproved', { transaction });
      await queryInterface.removeColumn('users', 'approvalToken', { transaction });
      await queryInterface.removeColumn('users', 'approvalTokenExpires', { transaction });
    });
  }
};