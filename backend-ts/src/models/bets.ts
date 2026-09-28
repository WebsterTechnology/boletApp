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

export const BET_STATUSES = ["pending", "won", "lost", "paid", "void", "cancelled"] as const;
export type BetStatus = (typeof BET_STATUSES)[number];

export const LOCATIONS = ["New York", "Florida", "Georgia"] as const;

const statusColumn = () => ({
  type: DataTypes.ENUM(...BET_STATUSES),
  allowNull: false,
  defaultValue: "pending" as const,
});

/** Columns shared by every single-number game (yonchif, dechif, twachif, katchif). */
abstract class NumberBet<M extends NumberBet<M>> extends Model<
  InferAttributes<M>,
  InferCreationAttributes<M>
> {
  declare id: CreationOptional<number>;
  declare number: string;
  declare pwen: number;
  declare location: string;
  declare userId: ForeignKey<User["id"]>;
  declare receiptId: string;
  declare status: CreationOptional<BetStatus>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare User?: NonAttribute<User>;
}

export class YonChif extends NumberBet<YonChif> {}
export class DeChif extends NumberBet<DeChif> {}
export class TwaChif extends NumberBet<TwaChif> {}
export class Katchif extends NumberBet<Katchif> {}

export class Maryaj extends Model<InferAttributes<Maryaj>, InferCreationAttributes<Maryaj>> {
  declare id: CreationOptional<number>;
  declare part1: string;
  declare part2: string;
  declare pwen: number;
  declare location: string;
  declare userId: ForeignKey<User["id"]>;
  declare receiptId: string;
  declare status: CreationOptional<BetStatus>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare User?: NonAttribute<User>;
}

const common = () => ({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  pwen: { type: DataTypes.INTEGER, allowNull: false },
  userId: { type: DataTypes.INTEGER, allowNull: false },
  // Groups bets into one receipt
  receiptId: { type: DataTypes.STRING, allowNull: false },
  status: statusColumn(),
  createdAt: DataTypes.DATE,
  updatedAt: DataTypes.DATE,
});

export function initBets(sequelize: Sequelize) {
  YonChif.init(
    {
      ...common(),
      number: { type: DataTypes.STRING, allowNull: false },
      location: { type: DataTypes.STRING, allowNull: false },
    },
    {
      sequelize,
      modelName: "YonChif",
      tableName: "yon_chif",
      timestamps: true,
      indexes: [{ fields: ["userId"] }, { fields: ["receiptId"] }, { fields: ["status"] }],
    }
  );

  DeChif.init(
    {
      ...common(),
      number: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          isTwoDigits(value: string) {
            if (!/^\d{2}$/.test(value)) {
              throw new Error("DeChif number must be exactly 2 digits (00–99)");
            }
          },
        },
      },
      location: { type: DataTypes.STRING, allowNull: false },
    },
    {
      sequelize,
      modelName: "DeChif",
      tableName: "de_chif",
      timestamps: true,
      indexes: [
        { fields: ["userId"] },
        { fields: ["receiptId"] },
        { fields: ["status"] },
        { fields: ["number"] },
      ],
    }
  );

  TwaChif.init(
    {
      ...common(),
      number: { type: DataTypes.STRING, allowNull: false, validate: { is: /^\d{3}$/ } },
      location: { type: DataTypes.ENUM(...LOCATIONS), allowNull: false },
    },
    {
      sequelize,
      modelName: "TwaChif",
      tableName: "twa_chif",
      timestamps: true,
      indexes: [{ fields: ["userId"] }, { fields: ["receiptId"] }, { fields: ["status"] }],
    }
  );

  Katchif.init(
    {
      ...common(),
      number: { type: DataTypes.STRING, allowNull: false, validate: { is: /^\d{4}$/ } },
      location: { type: DataTypes.ENUM(...LOCATIONS), allowNull: false },
    },
    {
      sequelize,
      modelName: "Katchif",
      tableName: "katchif",
      timestamps: true,
      indexes: [{ fields: ["userId"] }, { fields: ["receiptId"] }, { fields: ["status"] }],
    }
  );

  Maryaj.init(
    {
      ...common(),
      part1: { type: DataTypes.STRING, allowNull: false, validate: { is: /^\d{2}$/ } },
      part2: { type: DataTypes.STRING, allowNull: false, validate: { is: /^\d{2}$/ } },
      location: { type: DataTypes.ENUM(...LOCATIONS), allowNull: false },
    },
    {
      sequelize,
      modelName: "Maryaj",
      tableName: "maryaj",
      timestamps: true,
      indexes: [{ fields: ["userId"] }, { fields: ["receiptId"] }, { fields: ["status"] }],
    }
  );
}

export type NumberBetModel = typeof YonChif | typeof DeChif | typeof TwaChif | typeof Katchif;
export type AnyBetModel = NumberBetModel | typeof Maryaj;
export type AnyBet = YonChif | DeChif | TwaChif | Katchif | Maryaj;
