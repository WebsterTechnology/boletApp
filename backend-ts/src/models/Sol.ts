import { CreationOptional, DataTypes, ForeignKey, InferAttributes, InferCreationAttributes, Model, Sequelize } from "sequelize";
import type { User } from "./User";

export const SOL_MONTHLY_AMOUNTS_CENTS = [10000, 20000, 50000, 100000] as const;
export class SolPackage extends Model<InferAttributes<SolPackage>, InferCreationAttributes<SolPackage>> {
  declare id: CreationOptional<number>;
  declare userId: ForeignKey<User["id"]>;
  declare monthlyAmountCents: number;
  declare dueDay: number;
  declare status: CreationOptional<string>;
  declare paidMonths: CreationOptional<number>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}
export class SolContribution extends Model<InferAttributes<SolContribution>, InferCreationAttributes<SolContribution>> {
  declare id: CreationOptional<number>;
  declare packageId: ForeignKey<SolPackage["id"]>;
  declare installmentNumber: number;
  declare amountCents: number;
  declare status: CreationOptional<string>;
  declare paymentReference: CreationOptional<string | null>;
  declare paidAt: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}
export function initSol(sequelize: Sequelize) {
  SolPackage.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    monthlyAmountCents: { type: DataTypes.INTEGER, allowNull: false },
    dueDay: { type: DataTypes.INTEGER, allowNull: false },
    status: { type: DataTypes.STRING(24), allowNull: false, defaultValue: "draft" },
    paidMonths: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    createdAt: DataTypes.DATE, updatedAt: DataTypes.DATE,
  }, { sequelize, modelName: "SolPackage", tableName: "sol_packages", timestamps: true });
  SolContribution.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    packageId: { type: DataTypes.INTEGER, allowNull: false },
    installmentNumber: { type: DataTypes.INTEGER, allowNull: false },
    amountCents: { type: DataTypes.INTEGER, allowNull: false },
    status: { type: DataTypes.STRING(24), allowNull: false, defaultValue: "pending" },
    paymentReference: { type: DataTypes.STRING(255), allowNull: true },
    paidAt: { type: DataTypes.DATE, allowNull: true },
    createdAt: DataTypes.DATE, updatedAt: DataTypes.DATE,
  }, { sequelize, modelName: "SolContribution", tableName: "sol_contributions", timestamps: true });
  SolPackage.hasMany(SolContribution, { foreignKey: "packageId", as: "contributions" });
  SolContribution.belongsTo(SolPackage, { foreignKey: "packageId" });
}
