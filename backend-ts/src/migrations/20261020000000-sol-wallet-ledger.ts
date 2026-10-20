import { DataTypes } from "sequelize";
import { columnsOf, type Migration } from "./types";

/** Immutable audit record of each Sòl wallet deduction; one per payment attempt. */
const migration: Migration = {
  async up({ context: qi }) {
    if (await columnsOf(qi, "sol_wallet_ledger")) return;
    await qi.createTable("sol_wallet_ledger", {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      userId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "users", key: "id" }, onDelete: "RESTRICT" },
      packageId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "sol_packages", key: "id" }, onDelete: "RESTRICT" },
      contributionId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "sol_contributions", key: "id" }, onDelete: "RESTRICT" },
      attemptId: { type: DataTypes.INTEGER, allowNull: false, unique: true, references: { model: "sol_payment_attempts", key: "id" }, onDelete: "RESTRICT" },
      pointsDebited: { type: DataTypes.INTEGER, allowNull: false },
      playDebited: { type: DataTypes.INTEGER, allowNull: false },
      withdrawDebited: { type: DataTypes.INTEGER, allowNull: false },
      playBefore: { type: DataTypes.INTEGER, allowNull: false },
      withdrawBefore: { type: DataTypes.INTEGER, allowNull: false },
      playAfter: { type: DataTypes.INTEGER, allowNull: false },
      withdrawAfter: { type: DataTypes.INTEGER, allowNull: false },
      createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    });
    await qi.addIndex("sol_wallet_ledger", ["userId", "createdAt"]);
  },
  async down({ context: qi }) {
    if (await columnsOf(qi, "sol_wallet_ledger")) await qi.dropTable("sol_wallet_ledger");
  },
};
export default migration;
