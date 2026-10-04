import { DataTypes } from "sequelize";
import { columnsOf, type Migration } from "./types";
const migration: Migration = {
  async up({ context: qi }) {
    const columns = await columnsOf(qi, "users");
    if (columns && !columns.has("withdrawablePoints")) await qi.addColumn("users", "withdrawablePoints", { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 });
  },
  async down({ context: qi }) {
    const columns = await columnsOf(qi, "users");
    if (columns?.has("withdrawablePoints")) await qi.removeColumn("users", "withdrawablePoints");
  },
};
export default migration;
