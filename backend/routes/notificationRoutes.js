const express = require("express");
const { Op } = require("sequelize");
const authenticate = require("../middleware/authenticate");
const adminOnly = require("../middleware/adminOnly");
const { Notification, NotificationRead } = require("../models");

const router = express.Router();

router.get("/unread", authenticate, async (req, res) => {
  try {
    const reads = await NotificationRead.findAll({
      where: { userId: req.user.id },
      attributes: ["notificationId"],
    });
    const readIds = reads.map((r) => r.notificationId);
    const where = readIds.length ? { id: { [Op.notIn]: readIds } } : {};
    const rows = await Notification.findAll({
      where,
      order: [["createdAt", "ASC"]],
    });
    res.json(rows);
  } catch (err) {
    console.error("GET /api/notifications/unread", err);
    res.status(500).json({ message: "Failed to fetch notifications" });
  }
});

router.post("/:id/read", authenticate, async (req, res) => {
  try {
    const notification = await Notification.findByPk(req.params.id);
    if (!notification) return res.status(404).json({ message: "Notification not found" });
    await NotificationRead.findOrCreate({
      where: { notificationId: notification.id, userId: req.user.id },
      defaults: { readAt: new Date() },
    });
    res.json({ ok: true });
  } catch (err) {
    console.error("POST /api/notifications/:id/read", err);
    res.status(500).json({ message: "Failed to mark notification as read" });
  }
});

router.get("/history", authenticate, adminOnly, async (_req, res) => {
  try {
    const rows = await Notification.findAll({ order: [["createdAt", "DESC"]], limit: 200 });
    res.json(rows);
  } catch (err) {
    console.error("GET /api/notifications/history", err);
    res.status(500).json({ message: "Failed to fetch notification history" });
  }
});

router.post("/broadcast", authenticate, adminOnly, async (req, res) => {
  try {
    const { title, message, priority = "info", imageUrl = null, linkUrl = null } = req.body || {};
    if (!title?.trim() || !message?.trim()) {
      return res.status(400).json({ message: "Title and message are required" });
    }
    if (!["info", "warning", "critical"].includes(priority)) {
      return res.status(400).json({ message: "Invalid priority" });
    }

    const row = await Notification.create({
      title: title.trim(),
      message: message.trim(),
      priority,
      imageUrl: imageUrl?.trim() || null,
      linkUrl: linkUrl?.trim() || null,
    });

    const io = req.app.get("io");
    if (io) io.emit("broadcast-notification", row.toJSON());

    res.status(201).json(row);
  } catch (err) {
    console.error("POST /api/notifications/broadcast", err);
    res.status(500).json({ message: "Failed to broadcast notification" });
  }
});

module.exports = router;
