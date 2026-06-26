const app = require("./app");
const sequelize = require("./config/database");

const PORT = process.env.PORT || 8000;

sequelize
  .authenticate()
  .then(() => {
    console.log("📦 Database connected successfully!");

    // ❌ Don't alter production tables automatically
    return sequelize.sync();
  })
  .then(() => {
    console.log("🛠️ Database synchronized");

    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);

      if (process.env.KOYEB_APP_ID) {
        console.log("🌍 Running on Koyeb");
      } else {
        console.log(`🌍 Local API: http://localhost:${PORT}`);
      }
    });
  })
  .catch((err) => {
    console.error("❌ Database connection or sync failed:", err);
  });