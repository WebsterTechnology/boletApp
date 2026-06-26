"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("yon_chif", "receiptId", {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn("de_chif", "receiptId", {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn("maryaj", "receiptId", {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn("twa_chif", "receiptId", {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn("katchif", "receiptId", {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("yon_chif", "receiptId");

    await queryInterface.removeColumn("de_chif", "receiptId");

    await queryInterface.removeColumn("maryaj", "receiptId");

    await queryInterface.removeColumn("twa_chif", "receiptId");

    await queryInterface.removeColumn("katchif", "receiptId");
  },
};