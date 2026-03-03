'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add Georgia to ENUM type (PostgreSQL)
    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_twa_chif_location" ADD VALUE 'Georgia';`
    );
  },

  async down(queryInterface, Sequelize) {
    // ⚠️ PostgreSQL does NOT support removing ENUM values easily
    console.log('Down migration not supported for removing ENUM values.');
  }
};