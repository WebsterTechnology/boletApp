const express = require("express");
const { Op, fn, col } = require("sequelize");
const authenticate = require("../middleware/authenticate");
const adminOnly = require("../middleware/adminOnly");
const { Notification, NotificationRead, User } = require("../models");

const router = express.Router();
const audienceFor = (userId) => ({
  [Op.or]: [
    { recipientType: "all" },
    { recipientType: "user", recipientUserId: userId },
  ],
});

router.get("/", authenticate, async (req, res) => {
  try {
    const rows = await Notification.findAll({
      where: audienceFor(req.user.id),
      include: [{
        model: NotificationRead,
        required: false,
        where: { userId: req.user.id },
        attributes: ["readAt"],
      }],
      order: [["createdAt", "DESC"]],
      limit: 200,
    });
    res.json(rows.map((row) => {
      const item = row.toJSON();
      return { ...item, read: Array.isArray(item.NotificationReads) && item.NotificationReads.length > 0, NotificationReads: undefined };
    }));
  } catch (err) {
    console.error("GET /api/notifications", err);
    res.status(500).json({ message: "Failed to fetch notifications" });
  }
});

router.get("/unread", authenticate, async (req, res) => {
  try {
    const reads = await NotificationRead.findAll({ where: { userId: req.user.id }, attributes: ["notificationId"] });
    const readIds = reads.map((r) => r.notificationId);
    const where = { ...audienceFor(req.user.id) };
    if (readIds.length) where.id = { [Op.notIn]: readIds };
    const rows = await Notification.findAll({ where, order: [["createdAt", "ASC"]] });
    res.json(rows);
  } catch (err) {
    console.error("GET /api/notifications/unread", err);
    res.status(500).json({ message: "Failed to fetch notifications" });
  }
});

router.post("/:id/read", authenticate, async (req, res) => {
  try {
    const notification = await Notification.findOne({ where: { id: req.params.id, ...audienceFor(req.user.id) } });
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

router.post("/read-all", authenticate, async (req, res) => {
  try {
    const rows = await Notification.findAll({ where: audienceFor(req.user.id), attributes: ["id"] });
    await Promise.all(rows.map((n) => NotificationRead.findOrCreate({
      where: { notificationId: n.id, userId: req.user.id },
      defaults: { readAt: new Date() },
    })));
    res.json({ ok: true });
  } catch (err) {
    console.error("POST /api/notifications/read-all", err);
    res.status(500).json({ message: "Failed to mark all notifications as read" });
  }
});

router.get("/history", authenticate, adminOnly, async (_req, res) => {
  try {
    const rows = await Notification.findAll({
      include: [
        { model: User, as: "recipient", attributes: ["id", "phone"], required: false },
        { model: NotificationRead, attributes: [], required: false },
      ],
      attributes: { include: [[fn("COUNT", col("NotificationReads.id")), "readCount"]] },
      group: ["Notification.id", "recipient.id"],
      order: [["createdAt", "DESC"]],
      limit: 200,
      subQuery: false,
    });
    res.json(rows);
  } catch (err) {
    console.error("GET /api/notifications/history", err);
    res.status(500).json({ message: "Failed to fetch notification history" });
  }
});

router.post("/send", authenticate, adminOnly, async (req, res) => {
  try {
    const { title, message, priority = "info", imageUrl = null, linkUrl = null, recipientType = "all", recipientUserId = null } = req.body || {};
    if (!title?.trim() || !message?.trim()) return res.status(400).json({ message: "Title and message are required" });
    if (!["info", "warning", "critical"].includes(priority)) return res.status(400).json({ message: "Invalid priority" });
    if (!["all", "user"].includes(recipientType)) return res.status(400).json({ message: "Invalid recipient type" });

    let targetUser = null;
    if (recipientType === "user") {
      targetUser = await User.findByPk(recipientUserId);
      if (!targetUser) return res.status(404).json({ message: "Recipient user not found" });
    }

    const row = await Notification.create({
      title: title.trim(), message: message.trim(), priority,
      imageUrl: imageUrl?.trim() || null, linkUrl: linkUrl?.trim() || null,
      recipientType, recipientUserId: targetUser?.id || null,
    });

    const payload = row.toJSON();
    const io = req.app.get("io");
    if (io) {
      if (recipientType === "all") io.emit("notification", payload);
      else io.to(`user:${targetUser.id}`).emit("notification", payload);
    }
    res.status(201).json(payload);
  } catch (err) {
    console.error("POST /api/notifications/send", err);
    res.status(500).json({ message: "Failed to send notification" });
  }
});

// Backward-compatible broadcast endpoint.
router.post("/broadcast", authenticate, adminOnly, async (req, res) => {
  req.body = { ...(req.body || {}), recipientType: "all", recipientUserId: null };
  try {
    const { title, message, priority = "info", imageUrl = null, linkUrl = null } = req.body;
    if (!title?.trim() || !message?.trim()) return res.status(400).json({ message: "Title and message are required" });
    if (!["info", "warning", "critical"].includes(priority)) return res.status(400).json({ message: "Invalid priority" });
    const row = await Notification.create({
      title: title.trim(), message: message.trim(), priority,
      imageUrl: imageUrl?.trim() || null, linkUrl: linkUrl?.trim() || null,
      recipientType: "all", recipientUserId: null,
    });
    const io = req.app.get("io");
    if (io) {
      io.emit("notification", row.toJSON());
      io.emit("broadcast-notification", row.toJSON());
    }
    res.status(201).json(row);
  } catch (err) {
    console.error("POST /api/notifications/broadcast", err);
    res.status(500).json({ message: "Failed to broadcast notification" });
  }
});

module.exports = router;
