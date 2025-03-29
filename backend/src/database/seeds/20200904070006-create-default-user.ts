import { QueryInterface } from "sequelize";
import { hash } from "bcryptjs";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    return queryInterface.sequelize.transaction(async t => {
      const userExists = await queryInterface.rawSelect('Users', {
        where: {
          id: 1,
        },
      }, ['id']);

      if (!userExists) {
        const passwordHash = await hash("123456", 8);
        return queryInterface.bulkInsert('Users', [{
          name: "Admin",
          email: "admin@admin.com",
          profile: "admin",
          passwordHash,
          companyId: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          super: true
        }], { transaction: t });
      }
    });
  },

  down: async (queryInterface: QueryInterface) => {
    return queryInterface.bulkDelete("Users", { id: 1 });
  }
};
