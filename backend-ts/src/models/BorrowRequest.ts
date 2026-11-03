import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model, Sequelize } from "sequelize";

export type BorrowRequestStatus = "pending" | "approved" | "rejected";

export class BorrowRequest extends Model<InferAttributes<BorrowRequest>, InferCreationAttributes<BorrowRequest>> {
  declare id: CreationOptional<number>;
  declare userId: number;
  declare amount: number;
  declare reason: string;
  declare status: CreationOptional<BorrowRequestStatus>;
  declare reviewedBy: CreationOptional<number | null>;
  declare reviewedAt: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
}
export function initBorrowRequest(sequelize: Sequelize): typeof BorrowRequest {
  BorrowRequest.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    amount: { type: DataTypes.INTEGER, allowNull: false },
    reason: { type: DataTypes.STRING(120), allowNull: false },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "pending" },
    reviewedBy: { type: DataTypes.INTEGER, allowNull: true },
    reviewedAt: { type: DataTypes.DATE, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  }, { sequelize, tableName: "borrow_requests", modelName: "BorrowRequest", timestamps: false });
  return BorrowRequest;
}
