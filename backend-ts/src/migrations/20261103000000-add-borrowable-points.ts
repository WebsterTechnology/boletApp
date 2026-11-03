import { DataTypes } from "sequelize";
import { columnsOf, type Migration } from "./types";

const migration: Migration = {
  async up({ context: qi }) {
    const columns = await columnsOf(qi, "users");
    if (!columns) throw new Error("users table is missing");
    if (!columns.has("borrowablePoints")) {
      await qi.addColumn("users", "borrowablePoints", {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      });
    }
  },
  async down({ context: qi }) {
    const columns = await columnsOf(qi, "users");
    if (columns?.has("borrowablePoints")) {
      await qi.removeColumn("users", "borrowablePoints");
    }
  },
};
export default migration;
