import {
  CreationOptional,
  DataTypes,
  ForeignKey,
  InferAttributes,
  InferCreationAttributes,
  Model,
  NonAttribute,
  Sequelize,
} from "sequelize";
import type { User } from "./User";

export const CLAIM_BET_TYPES = ["yonchif", "maryaj", "twachif"] as const;
export type ClaimBetType = (typeof CLAIM_BET_TYPES)[number];

export class WinClaim extends Model<InferAttributes<WinClaim>, InferCreationAttributes<WinClaim>> {
  declare id: CreationOptional<number>;
  declare userId: ForeignKey<User["id"]>;
  declare betType: ClaimBetType;
  declare betId: number;
  declare method: "points" | "pix";
  declare pixKey: CreationOptional<string | null>;
  /** Prize points. */
  declare pwen: number;
  declare status: CreationOptional<"pending" | "approved" | "rejected" | "paid">;
  declare notes: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare User?: NonAttribute<User>;
}

export function initWinClaim(sequelize: Sequelize) {
  WinClaim.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      betType: { type: DataTypes.ENUM(...CLAIM_BET_TYPES), allowNull: false },
      betId: { type: DataTypes.INTEGER, allowNull: false },
      method: { type: DataTypes.ENUM("points", "pix"), allowNull: false },
      pixKey: { type: DataTypes.STRING, allowNull: true },
      pwen: { type: DataTypes.INTEGER, allowNull: false },
      status: {
        type: DataTypes.ENUM("pending", "approved", "rejected", "paid"),
        defaultValue: "pending",
      },
      notes: { type: DataTypes.STRING },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: "WinClaim",
      // avoid duplicate claims
      indexes: [{ unique: true, fields: ["betType", "betId"] }],
    }
  );
}
