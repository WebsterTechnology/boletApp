import { DataTypes } from "sequelize";
import { columnsOf, type Migration } from "./types";

const migration: Migration = {
  async up({ context: qi }) {
    if (!(await columnsOf(qi, "sol_packages"))) {
      await qi.createTable("sol_packages", {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
        userId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "users", key: "id" }, onDelete: "RESTRICT" },
        monthlyAmountCents: { type: DataTypes.INTEGER, allowNull: false },
        dueDay: { type: DataTypes.INTEGER, allowNull: false },
        status: { type: DataTypes.STRING(24), allowNull: false, defaultValue: "draft" },
        paidMonths: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      });
      await qi.addIndex("sol_packages", ["userId"]);
    }
    if (!(await columnsOf(qi, "sol_contributions"))) {
      await qi.createTable("sol_contributions", {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
        packageId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "sol_packages", key: "id" }, onDelete: "RESTRICT" },
        installmentNumber: { type: DataTypes.INTEGER, allowNull: false },
        amountCents: { type: DataTypes.INTEGER, allowNull: false },
        status: { type: DataTypes.STRING(24), allowNull: false, defaultValue: "pending" },
        paymentReference: { type: DataTypes.STRING(255), allowNull: true },
        paidAt: { type: DataTypes.DATE, allowNull: true },
        createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      });
      await qi.addIndex("sol_contributions", ["packageId", "installmentNumber"], { unique: true, name: "sol_contributions_package_installment_unique" });
      await qi.addIndex("sol_contributions", ["paymentReference"], { unique: true, name: "sol_contributions_payment_reference_unique" });
    }
  },
  async down({ context: qi }) {
    if (await columnsOf(qi, "sol_contributions")) await qi.dropTable("sol_contributions");
    if (await columnsOf(qi, "sol_packages")) await qi.dropTable("sol_packages");
  },
};
export default migration;
