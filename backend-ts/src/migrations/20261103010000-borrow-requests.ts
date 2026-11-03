import { DataTypes } from "sequelize";
import { columnsOf, type Migration } from "./types";

const migration: Migration = {
  async up({ context: qi }) {
    if (await columnsOf(qi, "borrow_requests")) return;
    await qi.createTable("borrow_requests", {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      userId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "users", key: "id" }, onDelete: "RESTRICT" },
      amount: { type: DataTypes.INTEGER, allowNull: false },
      reason: { type: DataTypes.STRING(120), allowNull: false },
      status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "pending" },
      reviewedBy: { type: DataTypes.INTEGER, allowNull: true, references: { model: "users", key: "id" }, onDelete: "SET NULL" },
      reviewedAt: { type: DataTypes.DATE, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
    });
    await qi.addIndex("borrow_requests", ["userId", "createdAt"]);
    // One open request per user prevents duplicate submissions across concurrent tabs.
    await qi.sequelize.query('CREATE UNIQUE INDEX IF NOT EXISTS borrow_requests_one_pending_per_user ON borrow_requests ("userId") WHERE status = \'pending\'');
  },
  async down({ context: qi }) {
    if (await columnsOf(qi, "borrow_requests")) await qi.dropTable("borrow_requests");
  },
};
export default migration;
