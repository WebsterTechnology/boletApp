// const app = require("./app");
// const sequelize = require("./config/database"); // still correct


// const PORT = process.env.PORT || 3001;

// sequelize.authenticate()
//   .then(() => {
//     console.log("📦 DB Connected");

//     return sequelize.sync({ alter: true }); // ✅ THIS creates the tables
//   })
//   .then(() => {
//     console.log("✅ Database synced");
//     app.listen(PORT, () => {
//       console.log(`🚀 Server running on port ${PORT}`);
//     });
//   })
//   .catch((err) => {
//     console.error("❌ DB Connection or Sync Error:", err);
//   });
const app = require("./app");
const sequelize = require("./config/database");

// Koyeb injects PORT automatically.
// Fallback 8000 is required for local dev + Koyeb health checks.
const PORT = process.env.PORT || 8000;

sequelize.authenticate()
  .then(() => {
    console.log("📦 Database connected successfully!");

    // Sync Sequelize models
    return sequelize.sync({ alter: true });
  })
  .then(() => {
    console.log("🛠️ Database synchronized");

    // Start the server AFTER models sync
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);

      // Correct logging for both local + cloud environments
      if (process.env.KOYEB_APP_ID) {
        console.log("🌍 Running on Koyeb (public URL available in dashboard)");
      } else {
        console.log(`🌍 Local API: http://localhost:${PORT}`);
      }
    });
  })
  .catch((err) => {
    console.error("❌ Database connection or sync failed:", err);
  });
