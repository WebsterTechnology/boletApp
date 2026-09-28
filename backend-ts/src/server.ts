import http from "node:http";
import { Server } from "socket.io";
import app from "./app";
import { corsOrigin, env } from "./config/env";
import { userIdFromToken } from "./middleware/authenticate";
import { migrator } from "./migrations";
import { sequelize } from "./models";

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: corsOrigin, methods: ["GET", "POST"] },
});

app.set("io", io);

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Authentication required"));
    const userId = userIdFromToken(token);
    if (!userId) return next(new Error("Invalid token"));
    socket.data.userId = userId;
    next();
  } catch {
    next(new Error("Invalid token"));
  }
});

io.on("connection", (socket) => {
  socket.join(`user:${socket.data.userId}`);
});

async function start() {
  await sequelize.authenticate();
  console.log("📦 Database connected successfully!");

  // Migrations first: they patch existing tables and skip tables that don't exist yet.
  // sync() then creates any missing tables (and indexes) from the models.
  await migrator.up();
  await sequelize.sync();
  console.log("🛠️ Database synchronized");

  server.listen(env.port, () => {
    console.log(`🚀 Server is running on port ${env.port}`);
    if (env.koyebAppId) console.log("🌍 Running on Koyeb");
    else console.log(`🌍 Local API: http://localhost:${env.port}`);
  });
}

let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received, shutting down...`);

  const force = setTimeout(() => process.exit(1), 10_000);
  force.unref();

  try {
    await io.close(); // also closes the HTTP server
    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error("Error during shutdown:", err);
    process.exit(1);
  }
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

start().catch(async (err) => {
  console.error("❌ Startup failed:", err);
  await sequelize.close().catch(() => {});
  process.exit(1);
});
