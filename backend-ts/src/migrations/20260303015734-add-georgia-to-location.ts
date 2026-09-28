import type { Migration } from "./types";

// Ported from ../backend/migrations. Idempotent: skips when the enum type does not exist
// (fresh database; sync() creates it with Georgia) and when the value is already there.
const migration: Migration = {
  async up({ context: qi }) {
    const [rows] = await qi.sequelize.query(
      `SELECT 1 FROM pg_type WHERE typname = 'enum_twa_chif_location'`
    );
    if (!rows.length) return;
    await qi.sequelize.query(
      `ALTER TYPE "enum_twa_chif_location" ADD VALUE IF NOT EXISTS 'Georgia';`
    );
  },

  async down() {
    // PostgreSQL cannot drop a value from an ENUM type.
    console.log("Down migration not supported for removing ENUM values.");
  },
};

export default migration;
