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

export const PIX_STATUSES = ["created", "pending", "paid", "credited", "failed", "expired"] as const;
export type PixStatus = (typeof PIX_STATUSES)[number];

export class PixPayment extends Model<
  InferAttributes<PixPayment>,
  InferCreationAttributes<PixPayment>
> {
  declare id: CreationOptional<number>;
  declare userId: ForeignKey<User["id"]>;
  /** Provider payment id (Asaas payment id or InfinitePay order_nsu). */
  declare providerRef: string;
  /** Gross amount charged. Postgres DECIMAL comes back as a string. */
  declare amountBRL: number | string;
  /** Net amount credited by the provider (gross - fees). Filled by webhook. */
  declare netValueBRL: CreationOptional<number | string | null>;
  declare feeBRL: CreationOptional<number | string | null>;
  declare points: number;
  declare status: CreationOptional<PixStatus>;
  declare expiresAt: CreationOptional<Date | null>;
  declare rawPayload: CreationOptional<Record<string, unknown> | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  /** Aliased association (`as: "user"`). */
  declare user?: NonAttribute<User>;
  /** Un-aliased association, used by admin payment listings. */
  declare User?: NonAttribute<User>;
}

export class PixPaymentRequest extends Model<
  InferAttributes<PixPaymentRequest>,
  InferCreationAttributes<PixPaymentRequest>
> {
  declare id: CreationOptional<number>;
  declare userId: ForeignKey<User["id"]>;
  declare phoneNumber: string;
  declare amount: number;
  declare isPaid: CreationOptional<boolean>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class Pwen extends Model<InferAttributes<Pwen>, InferCreationAttributes<Pwen>> {
  declare id: CreationOptional<number>;
  declare amount: number;
  declare stripePaymentId: CreationOptional<string | null>;
  declare userId: ForeignKey<User["id"]>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export function initPayments(sequelize: Sequelize) {
  PixPayment.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      providerRef: { type: DataTypes.STRING, allowNull: false, unique: true },
      amountBRL: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      netValueBRL: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      feeBRL: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      points: { type: DataTypes.INTEGER, allowNull: false },
      status: {
        type: DataTypes.ENUM(...PIX_STATUSES),
        defaultValue: "pending",
      },
      expiresAt: { type: DataTypes.DATE, allowNull: true },
      rawPayload: { type: DataTypes.JSON, allowNull: true },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
    },
    { sequelize, modelName: "PixPayment", tableName: "pix_payments", timestamps: true }
  );

  PixPaymentRequest.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      phoneNumber: { type: DataTypes.STRING, allowNull: false },
      amount: { type: DataTypes.FLOAT, allowNull: false },
      isPaid: { type: DataTypes.BOOLEAN, defaultValue: false },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
    },
    // No tableName in ../backend, so Sequelize pluralised it to "PixPaymentRequests".
    { sequelize, modelName: "PixPaymentRequest" }
  );

  Pwen.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      amount: { type: DataTypes.INTEGER, allowNull: false },
      stripePaymentId: { type: DataTypes.STRING },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
    },
    // Table name "Pwens" comes from Sequelize's default pluralisation, as in ../backend.
    { sequelize, modelName: "Pwen", timestamps: true }
  );
}
