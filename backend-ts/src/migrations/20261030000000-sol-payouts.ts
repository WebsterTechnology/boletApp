import { DataTypes } from "sequelize";
import { columnsOf, type Migration } from "./types";

const migration: Migration = {
  async up({ context: qi }) {
    if (await columnsOf(qi, "sol_payouts")) return;
    await qi.createTable("sol_payouts", {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      packageId: { type: DataTypes.INTEGER, allowNull: false, unique: true, references: { model: "sol_packages", key: "id" }, onDelete: "RESTRICT" },
      userId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "users", key: "id" }, onDelete: "RESTRICT" },
      kind: { type: DataTypes.STRING(24), allowNull: false },
      grossCents: { type: DataTypes.INTEGER, allowNull: false },
      penaltyCents: { type: DataTypes.INTEGER, allowNull: false },
      netCents: { type: DataTypes.INTEGER, allowNull: false },
      withdrawableBefore: { type: DataTypes.INTEGER, allowNull: false },
      withdrawableAfter: { type: DataTypes.INTEGER, allowNull: false },
      createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    });
    await qi.addIndex("sol_payouts", ["userId", "createdAt"]);
  },
  async down({ context: qi }) {
    if (await columnsOf(qi, "sol_payouts")) await qi.dropTable("sol_payouts");
  },
};
export default migration;
