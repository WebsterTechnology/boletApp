import { DataTypes, type ModelAttributeColumnOptions } from "sequelize";
import { columnsOf, type Migration } from "./types";

// Replaces ensureUserProfileColumns() from ../backend/server.js. Idempotent, so it is safe on
// databases where the JS server already added some or all of these columns.
const PROFILE_COLUMNS: Record<string, ModelAttributeColumnOptions> = {
  fullName: { type: DataTypes.STRING, allowNull: true },
  cpf: { type: DataTypes.STRING(11), allowNull: true, unique: true },
  birthDate: { type: DataTypes.DATEONLY, allowNull: true },
  email: { type: DataTypes.STRING, allowNull: true },
  address: { type: DataTypes.STRING, allowNull: true },
  city: { type: DataTypes.STRING, allowNull: true },
  state: { type: DataTypes.STRING(2), allowNull: true },
  cep: { type: DataTypes.STRING(8), allowNull: true },
  profileOnboardingDone: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
};

const migration: Migration = {
  async up({ context: qi }) {
    const columns = await columnsOf(qi, "users");
    if (!columns) return; // fresh database: sync() creates the table with these columns
    for (const [name, definition] of Object.entries(PROFILE_COLUMNS)) {
      if (!columns.has(name)) await qi.addColumn("users", name, definition);
    }
  },

  async down({ context: qi }) {
    const columns = await columnsOf(qi, "users");
    if (!columns) return;
    for (const name of Object.keys(PROFILE_COLUMNS)) {
      if (columns.has(name)) await qi.removeColumn("users", name);
    }
  },
};

export default migration;
