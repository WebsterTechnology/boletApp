import {
  CreationOptional, DataTypes, ForeignKey, InferAttributes, InferCreationAttributes, Model, Sequelize,
} from "sequelize";
import type { User } from "./User";

export type ChatSender = "user" | "admin";

export class ChatMessage extends Model<InferAttributes<ChatMessage>, InferCreationAttributes<ChatMessage>> {
  declare id: CreationOptional<number>;
  declare userId: ForeignKey<User["id"]>;
  declare sender: ChatSender;
  declare text: string;
  declare readByAdmin: CreationOptional<boolean>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export function initChatMessage(sequelize: Sequelize) {
  ChatMessage.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    sender: { type: DataTypes.ENUM("user", "admin"), allowNull: false },
    text: { type: DataTypes.TEXT, allowNull: false },
    readByAdmin: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  }, {
    sequelize, modelName: "ChatMessage", tableName: "chat_messages", timestamps: true,
    indexes: [{ fields: ["userId", "createdAt"] }],
  });
}
