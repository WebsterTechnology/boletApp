import { DataTypes } from "sequelize";
import { columnsOf, type Migration } from "./types";

const migration: Migration = {
  async up({ context: qi }) {
    if (!(await columnsOf(qi, "site_maintenance"))) {
      await qi.createTable("site_maintenance", {
        id: { type: DataTypes.INTEGER, primaryKey: true },
        enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      });
    }
  },
  async down({ context: qi }) {
    if (await columnsOf(qi, "site_maintenance")) await qi.dropTable("site_maintenance");
  },
};
export default migration;
