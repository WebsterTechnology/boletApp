import { Router } from "express";
import { UniqueConstraintError } from "sequelize";
import { authenticate, currentUser } from "../middleware/authenticate";
import { adminOnly } from "../middleware/adminOnly";
import { BorrowRequest, User, sequelize } from "../models";

const router = Router();
router.use(authenticate);

// Customer: current user's requests only.
router.get("/mine", async (req, res) => {
  try {
    const rows = await BorrowRequest.findAll({ where: { userId: currentUser(req).id }, order: [["createdAt","DESC"],["id","DESC"]], limit: 50 });
    return res.json(rows);
  } catch { return res.status(500).json({ message: "Pa kapab chaje demann prè yo." }); }
});

// Submission records a request. It never credits a wallet or disburses money.
router.post("/", async (req, res) => {
  const amount = req.body?.amount;
  const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
  if (!Number.isSafeInteger(amount) || amount <= 0 || !reason || reason.length > 120)
    return res.status(400).json({ message: "Antre yon kantite pwen valid ak yon rezon." });
  try {
    const result = await sequelize.transaction(async transaction => {
      const user = await User.findByPk(currentUser(req).id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!user) return { error: "Kont sa a pa egziste.", status: 404 };
      if (amount > Number(user.borrowablePoints ?? 0)) return { error: "Kantite a depase limit ou disponib.", status: 400 };
      const pending = await BorrowRequest.findOne({ where: { userId: user.id, status: "pending" }, transaction });
      if (pending) return { error: "Ou deja gen yon demann prè annatant.", status: 409 };
      const request = await BorrowRequest.create({ userId: user.id, amount, reason }, { transaction });
      return { request };
    });
    if ("error" in result) return res.status(result.status).json({ message: result.error });
    return res.status(201).json(result.request);
  } catch (error) {
    if (error instanceof UniqueConstraintError) return res.status(409).json({ message: "Ou deja gen yon demann prè annatant." });
    console.error("borrow request create failed", error instanceof Error ? error.name : "unknown");
    return res.status(500).json({ message: "Pa kapab voye demann prè a." });
  }
});

// Administrator: list with customer identification.
router.get("/admin", adminOnly, async (_req, res) => {
  try {
    const requests = await BorrowRequest.findAll({
      include: [{ model: User, as: "customer", attributes: ["id","fullName","phone","borrowablePoints"] }],
      order: [["createdAt","DESC"],["id","DESC"]], limit: 300,
    });
    return res.json(requests);
  } catch { return res.status(500).json({ message: "Pa kapab chaje demann prè yo." }); }
});

// Approval is review status ONLY; never move points or create a debt automatically.
router.patch("/admin/:id/decision", adminOnly, async (req, res) => {
  const id = Number(req.params.id);
  const decision = req.body?.decision;
  if (!Number.isSafeInteger(id) || id <= 0 || !["approved","rejected"].includes(decision))
    return res.status(400).json({ message: "Desizyon an pa valid." });
  try {
    const result = await sequelize.transaction(async transaction => {
      const request = await BorrowRequest.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!request) return { status: 404, message: "Demann pa jwenn." };
      if (request.status !== "pending") return { status: 409, message: "Demann sa a deja gen yon desizyon." };
      const user = await User.findByPk(request.userId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!user) return { status: 404, message: "Kliyan pa jwenn." };
      if (decision === "approved" && request.amount > Number(user.borrowablePoints ?? 0))
        return { status: 409, message: "Limit kliyan an chanje; demann nan depase limit aktyèl la." };
      request.status = decision;
      request.reviewedBy = currentUser(req).id;
      request.reviewedAt = new Date();
      await request.save({ transaction });
      return { request };
    });
    if ("message" in result) return res.status(result.status).json({ message: result.message });
    return res.json(result.request);
  } catch (error) {
    console.error("borrow decision failed", error instanceof Error ? error.name : "unknown");
    return res.status(500).json({ message: "Pa kapab anrejistre desizyon an." });
  }
});
export default router;
