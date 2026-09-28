import { Router, type Request } from "express";
import type { Server } from "socket.io";
import { col, fn, Op, type WhereOptions } from "sequelize";
import { adminOnly } from "../middleware/adminOnly";
import { authenticate, currentUser } from "../middleware/authenticate";
import { Notification, NotificationRead, NotificationTarget, User } from "../models";
import { NOTIFICATION_PRIORITIES, type NotificationPriority } from "../models/notifications";

const router = Router();

/**
 * Notifications the user may see: every broadcast (no target row) plus the ones
 * targeted at this user.
 */
async function audienceWhere(userId: number): Promise<WhereOptions<Notification> & { id?: any }> {
  const [allTargets, myTargets] = await Promise.all([
    NotificationTarget.findAll({ attributes: ["notificationId"] }),
    NotificationTarget.findAll({ where: { userId }, attributes: ["notificationId"] }),
  ]);
  const targetedIds = allTargets.map((r) => r.notificationId);
  const mine = myTargets.map((r) => r.notificationId);
  if (!targetedIds.length) return {};
  return {
    [Op.or]: [{ id: { [Op.notIn]: targetedIds } }, { id: { [Op.in]: mine.length ? mine : [-1] } }],
  };
}

const isPriority = (p: unknown): p is NotificationPriority =>
  (NOTIFICATION_PRIORITIES as readonly unknown[]).includes(p);

const trimmedOrNull = (v: unknown): string | null =>
  typeof v === "string" ? v.trim() || null : null;

const io = (req: Request) => req.app.get("io") as Server | undefined;

router.get("/", authenticate, async (req, res) => {
  try {
    const userId = currentUser(req).id;
    const rows = await Notification.findAll({
      where: await audienceWhere(userId),
      include: [
        { model: NotificationRead, required: false, where: { userId }, attributes: ["readAt"] },
      ],
      order: [["createdAt", "DESC"]],
      limit: 200,
    });
    return res.json(
      rows.map((row) => {
        const item = row.toJSON() as Notification["_attributes"] & { NotificationReads?: unknown[] };
        return {
          ...item,
          read: (item.NotificationReads?.length ?? 0) > 0,
          NotificationReads: undefined,
        };
      })
    );
  } catch (err) {
    console.error("GET /api/notifications", err);
    return res.status(500).json({ message: "Failed to fetch notifications" });
  }
});

router.get("/unread", authenticate, async (req, res) => {
  try {
    const userId = currentUser(req).id;
    const reads = await NotificationRead.findAll({ where: { userId }, attributes: ["notificationId"] });
    const readIds = reads.map((r) => r.notificationId);
    const where = await audienceWhere(userId);
    if (readIds.length) where.id = { ...(where.id || {}), [Op.notIn]: readIds };
    const rows = await Notification.findAll({ where, order: [["createdAt", "ASC"]] });
    return res.json(rows);
  } catch (err) {
    console.error("GET /api/notifications/unread", err);
    return res.status(500).json({ message: "Failed to fetch notifications" });
  }
});

router.post("/read-all", authenticate, async (req, res) => {
  try {
    const userId = currentUser(req).id;
    const rows = await Notification.findAll({ where: await audienceWhere(userId), attributes: ["id"] });
    await Promise.all(
      rows.map((n) =>
        NotificationRead.findOrCreate({
          where: { notificationId: n.id, userId },
          defaults: { notificationId: n.id, userId, readAt: new Date() },
        })
      )
    );
    return res.json({ ok: true });
  } catch (err) {
    console.error("POST /api/notifications/read-all", err);
    return res.status(500).json({ message: "Failed to mark all notifications as read" });
  }
});

router.post("/:id/read", authenticate, async (req, res) => {
  try {
    const userId = currentUser(req).id;
    const notification = await Notification.findOne({
      where: { id: req.params.id, ...(await audienceWhere(userId)) },
    });
    if (!notification) return res.status(404).json({ message: "Notification not found" });
    await NotificationRead.findOrCreate({
      where: { notificationId: notification.id, userId },
      defaults: { notificationId: notification.id, userId, readAt: new Date() },
    });
    return res.json({ ok: true });
  } catch (err) {
    console.error("POST /api/notifications/:id/read", err);
    return res.status(500).json({ message: "Failed to mark notification as read" });
  }
});

router.get("/history", authenticate, adminOnly, async (_req, res) => {
  try {
    const rows = await Notification.findAll({
      include: [
        {
          model: NotificationTarget,
          as: "target",
          required: false,
          include: [{ model: User, as: "user", attributes: ["id", "phone"] }],
        },
        { model: NotificationRead, attributes: [], required: false },
      ],
      attributes: { include: [[fn("COUNT", col("NotificationReads.id")), "readCount"]] },
      group: ["Notification.id", "target.id", "target->user.id"],
      order: [["createdAt", "DESC"]],
      limit: 200,
      subQuery: false,
    });
    return res.json(
      rows.map((row) => {
        const item = row.toJSON() as Record<string, any>;
        return {
          ...item,
          recipientType: item.target ? "user" : "all",
          recipientUserId: item.target?.userId || null,
          recipient: item.target?.user || null,
        };
      })
    );
  } catch (err) {
    console.error("GET /api/notifications/history", err);
    return res.status(500).json({ message: "Failed to fetch notification history" });
  }
});

router.post("/send", authenticate, adminOnly, async (req, res) => {
  try {
    const {
      title,
      message,
      priority = "info",
      imageUrl = null,
      linkUrl = null,
      recipientType = "all",
      recipientUserId = null,
    } = req.body || {};
    if (!title?.trim() || !message?.trim()) {
      return res.status(400).json({ message: "Title and message are required" });
    }
    if (!isPriority(priority)) return res.status(400).json({ message: "Invalid priority" });
    if (recipientType !== "all" && recipientType !== "user") {
      return res.status(400).json({ message: "Invalid recipient type" });
    }

    let targetUser: User | null = null;
    if (recipientType === "user") {
      targetUser = await User.findByPk(recipientUserId);
      if (!targetUser) return res.status(404).json({ message: "Recipient user not found" });
    }

    const row = await Notification.create({
      title: title.trim(),
      message: message.trim(),
      priority,
      imageUrl: trimmedOrNull(imageUrl),
      linkUrl: trimmedOrNull(linkUrl),
    });
    if (targetUser) await NotificationTarget.create({ notificationId: row.id, userId: targetUser.id });

    const payload = { ...row.toJSON(), recipientType, recipientUserId: targetUser?.id || null };
    const socket = io(req);
    if (socket) {
      if (targetUser) socket.to(`user:${targetUser.id}`).emit("notification", payload);
      else socket.emit("notification", payload);
    }
    return res.status(201).json(payload);
  } catch (err) {
    console.error("POST /api/notifications/send", err);
    return res.status(500).json({ message: "Failed to send notification" });
  }
});

router.post("/broadcast", authenticate, adminOnly, async (req, res) => {
  try {
    const { title, message, priority = "info", imageUrl = null, linkUrl = null } = req.body || {};
    if (!title?.trim() || !message?.trim()) {
      return res.status(400).json({ message: "Title and message are required" });
    }
    if (!isPriority(priority)) return res.status(400).json({ message: "Invalid priority" });

    const row = await Notification.create({
      title: title.trim(),
      message: message.trim(),
      priority,
      imageUrl: trimmedOrNull(imageUrl),
      linkUrl: trimmedOrNull(linkUrl),
    });
    const socket = io(req);
    if (socket) {
      socket.emit("notification", row.toJSON());
      socket.emit("broadcast-notification", row.toJSON());
    }
    return res.status(201).json(row);
  } catch (err) {
    console.error("POST /api/notifications/broadcast", err);
    return res.status(500).json({ message: "Failed to broadcast notification" });
  }
});

export default router;
