import { DataTypes } from "sequelize";
import { columnsOf, type Migration } from "./types";

/** A PIX checkout is only an intent; this table never credits a loan repayment. */
const migration: Migration = {
  async up({ context: qi }) {
    if (await columnsOf(qi, "borrow_pix_attempts")) return;
    await qi.createTable("borrow_pix_attempts", {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      borrowRequestId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "borrow_requests", key: "id" }, onDelete: "RESTRICT" },
      userId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "users", key: "id" }, onDelete: "RESTRICT" },
      points: { type: DataTypes.INTEGER, allowNull: false },
      amountCents: { type: DataTypes.INTEGER, allowNull: false },
      currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: "BRL" },
      status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "pending" },
      idempotencyKey: { type: DataTypes.STRING(128), allowNull: false, unique: true },
      providerReference: { type: DataTypes.STRING(255), allowNull: true, unique: true },
      checkoutUrl: { type: DataTypes.TEXT, allowNull: true },
      confirmedAt: { type: DataTypes.DATE, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
    });
    await qi.addIndex("borrow_pix_attempts", ["borrowRequestId", "status"]);
  },
  async down({ context: qi }) {
    if (await columnsOf(qi, "borrow_pix_attempts")) await qi.dropTable("borrow_pix_attempts");
  }
};
export default migration;
