
const { Sequelize } = require("sequelize");
require("dotenv").config();

console.log("Loaded DATABASE_URL:", process.env.DATABASE_URL);
console.log("Loaded JWT_SECRET:", process.env.JWT_SECRET);

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  logging: false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
  pool: {
    max: 2,        // 🔥 VERY IMPORTANT for Render
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});


module.exports = sequelize;
