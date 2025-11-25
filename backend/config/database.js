// const { Sequelize } = require("sequelize");
// require("dotenv").config();

// const sequelize = new Sequelize(
//   process.env.DB_NAME,
//   process.env.DB_USER,
//   process.env.DB_PASSWORD,
//   {
//     host: process.env.DB_HOST,
//     port: process.env.DB_PORT,
//     dialect: "postgres",
//     logging: false,
//   }
// );

// module.exports = sequelize;
// const { Sequelize } = require("sequelize");
// require("dotenv").config();

// console.log("Loaded DATABASE_URL:", process.env.DATABASE_URL);
// console.log("Loaded JWT_SECRET:", process.env.JWT_SECRET);

// const sequelize = new Sequelize(process.env.DATABASE_URL, {
//   dialect: "postgres",
//   logging: false,
//   dialectOptions: {
//     ssl: {
//       require: true,
//       rejectUnauthorized: false,
//       // Render-specific TLS settings
//       minVersion: "TLSv1.2"
//     }
//   }
// });

// module.exports = sequelize;
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
      rejectUnauthorized: false
    }
  }
});

module.exports = sequelize;
