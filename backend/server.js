const app = require("./app");
const sequelize = require("./config/database"); // still correct


const PORT = process.env.PORT || 3001;

sequelize.authenticate()
  .then(() => {
    console.log("📦 DB Connected");

    return sequelize.sync({ alter: true }); // ✅ THIS creates the tables
  })
  .then(() => {
    console.log("✅ Database synced");
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ DB Connection or Sync Error:", err);
  });
