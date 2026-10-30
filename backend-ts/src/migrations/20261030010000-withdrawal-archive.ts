import { DataTypes } from "sequelize";
import { columnsOf, type Migration } from "./types";

const migration: Migration = {
  async up({ context: qi }) {
    const columns = await columnsOf(qi, "withdrawal_requests");
    if (columns && !columns.archivedAt) {
      await qi.addColumn("withdrawal_requests", "archivedAt", { type: DataTypes.DATE, allowNull: true });
    }
  },
  async down({ context: qi }) {
    const columns = await columnsOf(qi, "withdrawal_requests");
    if (columns?.archivedAt) await qi.removeColumn("withdrawal_requests", "archivedAt");
  },
};
export default migration;
