import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.addColumn('FlowBuilders', 'variables', {
      type: DataTypes.JSON,
      allowNull: true
    });
  },

  down: (queryInterface: QueryInterface) => {
    return queryInterface.removeColumn('FlowBuilders', 'variables');
  }
};
