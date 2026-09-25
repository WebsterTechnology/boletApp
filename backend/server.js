const http = require("http");
const { Server } = require("socket.io");
const app = require("./app");
const sequelize = require("./config/database");

const PORT = process.env.PORT || 8000;
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.set("io", io);

io.on("connection", (socket) => {
  console.log("🔔 Notification client connected:", socket.id);
  socket.on("disconnect", () => {
    console.log("🔕 Notification client disconnected:", socket.id);
  });
});

sequelize
  .authenticate()
  .then(() => {
    console.log("📦 Database connected successfully!");
    return sequelize.sync();
  })
  .then(() => {
    console.log("🛠️ Database synchronized");
    server.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      if (process.env.KOYEB_APP_ID) console.log("🌍 Running on Koyeb");
      else console.log(`🌍 Local API: http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ Database connection or sync failed:", err);
  });
