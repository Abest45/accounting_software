const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Inventory = sequelize.define('Inventory', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    productCode: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    productName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    category: {
      type: DataTypes.ENUM('electronics', 'office', 'furniture', 'software', 'other'),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT
    },
    openingStock: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    currentStock: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    reorderLevel: {
      type: DataTypes.INTEGER,
      defaultValue: 10
    },
    unitCost: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    sellingPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    supplier: {
      type: DataTypes.STRING
    },
    location: {
      type: DataTypes.STRING
    },
    lastRestockDate: {
      type: DataTypes.DATE
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
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
    tableName: 'inventories'
  });

  return Inventory;
};
