import { Router, type Request } from "express";
import type { Server } from "socket.io";
import { adminOnly } from "../middleware/adminOnly";
import { authenticate, currentUser } from "../middleware/authenticate";
import { ChatMessage, User } from "../models";

const router = Router();
const io = (req: Request) => req.app.get("io") as Server | undefined;
const cleanText = (value: unknown) => typeof value === "string" ? value.trim().slice(0, 4000) : "";

router.get("/messages", authenticate, async (req, res) => {
  const userId = currentUser(req).id;
  const messages = await ChatMessage.findAll({ where: { userId }, order: [["createdAt", "ASC"]] });
  return res.json(messages);
});

router.post("/messages", authenticate, async (req, res) => {
  const user = currentUser(req);
  const text = cleanText(req.body?.text);
  if (!text) return res.status(400).json({ message: "Message is required" });
  const message = await ChatMessage.create({ userId: user.id, sender: "user", text, readByAdmin: false });
  io(req)?.to("admin").emit("chat-message", message.toJSON());
  io(req)?.to(`user:${user.id}`).emit("chat-message", message.toJSON());
  return res.status(201).json(message);
});

router.get("/admin/threads", authenticate, adminOnly, async (_req, res) => {
  const messages = await ChatMessage.findAll({ order: [["createdAt", "ASC"]] });
  const ids = [...new Set(messages.map((m) => m.userId))];
  const users = await User.findAll({ where: { id: ids }, attributes: ["id", "fullName", "phone", "email"] });
  const byUser = new Map(users.map((u) => [u.id, u]));
  const grouped = new Map<number, ChatMessage[]>();
  for (const message of messages) grouped.set(message.userId, [...(grouped.get(message.userId) || []), message]);
  const threads = [...grouped.entries()].map(([userId, list]) => {
    const last = list[list.length - 1];
    const user = byUser.get(userId);
    return {
      userId, name: user?.fullName || `User #${userId}`, phone: user?.phone || "", email: user?.email || null,
      lastMessage: last.text, lastMessageAt: last.createdAt,
      unreadCount: list.filter((m) => m.sender === "user" && !m.readByAdmin).length,
    };
  }).sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
  return res.json(threads);
});

router.get("/admin/threads/:userId/messages", authenticate, adminOnly, async (req, res) => {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId)) return res.status(400).json({ message: "Invalid user" });
  const messages = await ChatMessage.findAll({ where: { userId }, order: [["createdAt", "ASC"]] });
  await ChatMessage.update({ readByAdmin: true }, { where: { userId, sender: "user", readByAdmin: false } });
  return res.json(messages);
});

router.post("/admin/threads/:userId/messages", authenticate, adminOnly, async (req, res) => {
  const userId = Number(req.params.userId);
  const text = cleanText(req.body?.text);
  if (!Number.isInteger(userId) || !(await User.findByPk(userId))) return res.status(404).json({ message: "User not found" });
  if (!text) return res.status(400).json({ message: "Message is required" });
  const message = await ChatMessage.create({ userId, sender: "admin", text, readByAdmin: true });
  io(req)?.to(`user:${userId}`).emit("chat-message", message.toJSON());
  io(req)?.to("admin").emit("chat-message", message.toJSON());
  return res.status(201).json(message);
});

export default router;
