import { DataTypes } from "sequelize";
import { columnsOf, type Migration } from "./types";

const BET_TABLES = ["yon_chif", "de_chif", "maryaj", "twa_chif", "katchif"];

// Ported from ../backend/migrations. Idempotent: skips missing tables and existing columns.
const migration: Migration = {
  async up({ context: qi }) {
    for (const table of BET_TABLES) {
      const columns = await columnsOf(qi, table);
      if (columns && !columns.has("receiptId")) {
        await qi.addColumn(table, "receiptId", { type: DataTypes.STRING, allowNull: true });
      }
    }
  },

  async down({ context: qi }) {
    for (const table of BET_TABLES) {
      const columns = await columnsOf(qi, table);
      if (columns?.has("receiptId")) await qi.removeColumn(table, "receiptId");
    }
  },
};

export default migration;
