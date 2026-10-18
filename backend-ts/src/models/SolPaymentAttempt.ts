import { CreationOptional, DataTypes, ForeignKey, InferAttributes, InferCreationAttributes, Model, Sequelize } from "sequelize";
import type { User } from "./User";
import type { SolPackage, SolContribution } from "./Sol";

export class SolPaymentAttempt extends Model<InferAttributes<SolPaymentAttempt>, InferCreationAttributes<SolPaymentAttempt>> {
  declare id: CreationOptional<number>;
  declare userId: ForeignKey<User["id"]>;
  declare packageId: ForeignKey<SolPackage["id"]>;
  declare contributionId: ForeignKey<SolContribution["id"]>;
  declare amountCents: number;
  declare currency: CreationOptional<string>;
  declare method: string;
  declare status: CreationOptional<string>;
  declare idempotencyKey: string;
  declare providerReference: CreationOptional<string | null>;
  declare confirmedAt: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}
export function initSolPaymentAttempt(sequelize: Sequelize) {
  SolPaymentAttempt.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    packageId: { type: DataTypes.INTEGER, allowNull: false },
    contributionId: { type: DataTypes.INTEGER, allowNull: false },
    amountCents: { type: DataTypes.INTEGER, allowNull: false },
    currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: "BRL" },
    method: { type: DataTypes.STRING(16), allowNull: false },
    status: { type: DataTypes.STRING(24), allowNull: false, defaultValue: "created" },
    idempotencyKey: { type: DataTypes.STRING(128), allowNull: false },
    providerReference: { type: DataTypes.STRING(255), allowNull: true },
    confirmedAt: { type: DataTypes.DATE, allowNull: true },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  }, { sequelize, modelName: "SolPaymentAttempt", tableName: "sol_payment_attempts", timestamps: true });
}
