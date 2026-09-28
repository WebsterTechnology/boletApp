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

export const NOTIFICATION_PRIORITIES = ["info", "warning", "critical"] as const;
export type NotificationPriority = (typeof NOTIFICATION_PRIORITIES)[number];

export class Notification extends Model<
  InferAttributes<Notification>,
  InferCreationAttributes<Notification>
> {
  declare id: CreationOptional<number>;
  declare title: string;
  declare message: string;
  declare priority: CreationOptional<NotificationPriority>;
  declare imageUrl: CreationOptional<string | null>;
  declare linkUrl: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare NotificationReads?: NonAttribute<NotificationRead[]>;
  declare target?: NonAttribute<NotificationTarget | null>;
}

export class NotificationRead extends Model<
  InferAttributes<NotificationRead>,
  InferCreationAttributes<NotificationRead>
> {
  declare id: CreationOptional<number>;
  declare notificationId: ForeignKey<Notification["id"]>;
  declare userId: ForeignKey<User["id"]>;
  declare readAt: CreationOptional<Date>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class NotificationTarget extends Model<
  InferAttributes<NotificationTarget>,
  InferCreationAttributes<NotificationTarget>
> {
  declare id: CreationOptional<number>;
  declare notificationId: ForeignKey<Notification["id"]>;
  declare userId: ForeignKey<User["id"]>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare user?: NonAttribute<User>;
}

export function initNotifications(sequelize: Sequelize) {
  Notification.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      title: { type: DataTypes.STRING(160), allowNull: false },
      message: { type: DataTypes.TEXT, allowNull: false },
      priority: {
        type: DataTypes.ENUM(...NOTIFICATION_PRIORITIES),
        allowNull: false,
        defaultValue: "info",
      },
      imageUrl: { type: DataTypes.TEXT, allowNull: true },
      linkUrl: { type: DataTypes.TEXT, allowNull: true },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
    },
    { sequelize, modelName: "Notification", tableName: "notifications" }
  );

  NotificationRead.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      notificationId: { type: DataTypes.INTEGER, allowNull: false },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      readAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: "NotificationRead",
      tableName: "notification_reads",
      indexes: [{ unique: true, fields: ["notificationId", "userId"] }],
    }
  );

  NotificationTarget.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      notificationId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: "NotificationTarget",
      tableName: "notification_targets",
      timestamps: true,
      indexes: [{ fields: ["userId"] }],
    }
  );
}
