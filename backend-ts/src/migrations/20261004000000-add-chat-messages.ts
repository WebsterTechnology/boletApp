import { DataTypes } from "sequelize";
import { columnsOf, type Migration } from "./types";

const migration: Migration = {
  async up({ context: qi }) {
    const existing = await columnsOf(qi, "chat_messages");
    if (existing) return;
    await qi.createTable("chat_messages", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      userId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "users", key: "id" }, onDelete: "CASCADE" },
      sender: { type: DataTypes.ENUM("user", "admin"), allowNull: false },
      text: { type: DataTypes.TEXT, allowNull: false },
      readByAdmin: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    });
    await qi.addIndex("chat_messages", ["userId", "createdAt"]);
  },
  async down({ context: qi }) {
    if (await columnsOf(qi, "chat_messages")) await qi.dropTable("chat_messages");
  },
};
export default migration;
