import { DataTypes } from "sequelize";
import { columnsOf, type Migration } from "./types";

const migration: Migration = {
  async up({ context: qi }) {
    const columns = await columnsOf(qi, "borrow_requests");
    if (!columns) throw new Error("borrow_requests table missing");
    if (!columns.has("repaidPoints")) {
      await qi.addColumn("borrow_requests", "repaidPoints", {
        type: DataTypes.INTEGER, allowNull: false, defaultValue: 0
      });
    }
    if (!(await columnsOf(qi, "borrow_repayments"))) {
      await qi.createTable("borrow_repayments", {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        borrowRequestId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "borrow_requests", key: "id" }, onDelete: "RESTRICT" },
        userId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "users", key: "id" }, onDelete: "RESTRICT" },
        amount: { type: DataTypes.INTEGER, allowNull: false },
        playDebited: { type: DataTypes.INTEGER, allowNull: false },
        withdrawDebited: { type: DataTypes.INTEGER, allowNull: false },
        method: { type: DataTypes.STRING(12), allowNull: false },
        idempotencyKey: { type: DataTypes.STRING(128), allowNull: false, unique: true },
        createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
      });
      await qi.addIndex("borrow_repayments", ["borrowRequestId", "createdAt"]);
    }
  },
  async down({ context: qi }) {
    if (await columnsOf(qi, "borrow_repayments")) await qi.dropTable("borrow_repayments");
    const columns = await columnsOf(qi, "borrow_requests");
    if (columns?.has("repaidPoints")) await qi.removeColumn("borrow_requests", "repaidPoints");
  }
};
export default migration;
