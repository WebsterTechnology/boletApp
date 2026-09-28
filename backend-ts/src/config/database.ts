import { Sequelize } from "sequelize";
import { env } from "./env";

export const sequelize = new Sequelize(env.databaseUrl, {
  dialect: "postgres",
  logging: false,
  dialectOptions: env.dbSsl
    ? { ssl: { require: true, rejectUnauthorized: false } }
    : {},
  pool: {
    max: 2, // keep low for hosted Postgres connection limits
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});
