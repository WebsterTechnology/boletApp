const http = require("http");
const { Server } = require("socket.io");
const app = require("./app");
const sequelize = require("./config/database");
const jwt = require("jsonwebtoken");

const PORT = process.env.PORT || 8000;
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.set("io", io);

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Authentication required"));
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id || decoded.userId;
    if (!userId) return next(new Error("Invalid token"));
    socket.userId = userId;
    next();
  } catch (_err) {
    next(new Error("Invalid token"));
  }
});

io.on("connection", (socket) => {
  socket.join(`user:${socket.userId}`);
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
