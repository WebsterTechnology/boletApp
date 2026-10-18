import { DataTypes } from "sequelize";
import { columnsOf, type Migration } from "./types";

/**
 * Records intent only. No financial movement or webhook processing is enabled.
 * A provider reference is unique to prevent one external payment being linked
 * to multiple attempts; client request keys are unique per customer.
 */
const migration: Migration = {
  async up({ context: qi }) {
    if (await columnsOf(qi, "sol_payment_attempts")) return;
    await qi.createTable("sol_payment_attempts", {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      userId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "users", key: "id" }, onDelete: "RESTRICT" },
      packageId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "sol_packages", key: "id" }, onDelete: "RESTRICT" },
      contributionId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "sol_contributions", key: "id" }, onDelete: "RESTRICT" },
      amountCents: { type: DataTypes.INTEGER, allowNull: false },
      currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: "BRL" },
      method: { type: DataTypes.STRING(16), allowNull: false },
      status: { type: DataTypes.STRING(24), allowNull: false, defaultValue: "created" },
      idempotencyKey: { type: DataTypes.STRING(128), allowNull: false },
      providerReference: { type: DataTypes.STRING(255), allowNull: true },
      confirmedAt: { type: DataTypes.DATE, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    });
    await qi.addIndex("sol_payment_attempts", ["userId", "idempotencyKey"], { unique: true, name: "sol_payment_attempts_idempotency_unique" });
    await qi.addIndex("sol_payment_attempts", ["providerReference"], { unique: true, name: "sol_payment_attempts_provider_unique" });
    await qi.addIndex("sol_payment_attempts", ["packageId", "contributionId"]);
  },
  async down({ context: qi }) {
    if (await columnsOf(qi, "sol_payment_attempts")) await qi.dropTable("sol_payment_attempts");
  },
};
export default migration;
