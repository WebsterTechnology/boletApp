import { DataTypes } from "sequelize";
import type { Migration } from "./types";

/** Persist only the provider-validated checkout URL for safe customer recovery. */
const migration: Migration = {
  async up({ context: qi }) {
    await qi.addColumn("sol_payment_attempts", "checkoutUrl", {
      type: DataTypes.TEXT, allowNull: true,
    });
  },
  async down({ context: qi }) {
    await qi.removeColumn("sol_payment_attempts", "checkoutUrl");
  },
};
export default migration;
