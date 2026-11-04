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
  declare creditedAt: CreationOptional<Date | null>;
  declare creditedBy: CreationOptional<number | null>;
  declare borrowableBefore: CreationOptional<number | null>;
  declare withdrawableBefore: CreationOptional<number | null>;
  declare repaidPoints: CreationOptional<number>;
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
    creditedAt: { type: DataTypes.DATE, allowNull: true },
    creditedBy: { type: DataTypes.INTEGER, allowNull: true },
    borrowableBefore: { type: DataTypes.INTEGER, allowNull: true },
    withdrawableBefore: { type: DataTypes.INTEGER, allowNull: true },
    repaidPoints: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  }, { sequelize, tableName: "borrow_requests", modelName: "BorrowRequest", timestamps: false });
  return BorrowRequest;
}
