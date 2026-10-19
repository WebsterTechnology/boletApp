import { DataTypes } from "sequelize";
import type { Migration } from "./types";

/** Retain financial bets while removing archived receipts from admin's active list. */
const migration: Migration = {
  async up({ context: qi }) {
    await qi.createTable("admin_archived_receipts", {
      receiptId: { type: DataTypes.STRING, primaryKey: true, allowNull: false },
      archivedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    });
  },
  async down({ context: qi }) {
    await qi.dropTable("admin_archived_receipts");
  },
};
export default migration;
