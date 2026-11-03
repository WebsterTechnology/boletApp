import { DataTypes } from "sequelize";
import { columnsOf, type Migration } from "./types";

// Existing approvals remain uncredited until an admin explicitly releases them.
const migration: Migration = {
  async up({ context: qi }) {
    const columns = await columnsOf(qi, "borrow_requests");
    if (!columns) throw new Error("borrow_requests table is missing");
    if (!columns.has("creditedAt"))
      await qi.addColumn("borrow_requests", "creditedAt", { type: DataTypes.DATE, allowNull: true });
    if (!columns.has("creditedBy"))
      await qi.addColumn("borrow_requests", "creditedBy", { type: DataTypes.INTEGER, allowNull: true, references: { model: "users", key: "id" }, onDelete: "SET NULL" });
    if (!columns.has("borrowableBefore"))
      await qi.addColumn("borrow_requests", "borrowableBefore", { type: DataTypes.INTEGER, allowNull: true });
    if (!columns.has("withdrawableBefore"))
      await qi.addColumn("borrow_requests", "withdrawableBefore", { type: DataTypes.INTEGER, allowNull: true });
  },
  async down({ context: qi }) {
    const columns = await columnsOf(qi, "borrow_requests");
    if (!columns) return;
    for (const name of ["withdrawableBefore", "borrowableBefore", "creditedBy", "creditedAt"]) {
      if (columns.has(name)) await qi.removeColumn("borrow_requests", name);
    }
  },
};
export default migration;
