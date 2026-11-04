import { Router } from "express";
import { UniqueConstraintError, QueryTypes } from "sequelize";
import { authenticate, currentUser } from "../middleware/authenticate";
import { adminOnly } from "../middleware/adminOnly";
import { BorrowRequest, User, sequelize } from "../models";
import type { Transaction } from "sequelize";
import { createBorrowPixCheckout } from "../services/borrowPixCheckout";

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
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 1789569705 || !reason || reason.length > 120)
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
    if ("error" in result) return res.status(result.status ?? 400).json({ message: result.error });
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

// The request row and customer wallet row are locked in the same database transaction.
// A creditedAt audit marker on the locked request prevents a second credit on retries.
async function creditApprovedRequest(request: BorrowRequest, user: User, adminId: number, transaction: Transaction) {
  if (request.creditedAt) return { status: 409, message: "Prè sa a deja kredite." };
  const amount = Number(request.amount);
  const allowance = Number(user.borrowablePoints ?? 0);
  const withdrawable = Number(user.withdrawablePoints ?? 0);
  if (!Number.isSafeInteger(amount) || amount <= 0 || !Number.isSafeInteger(allowance) || allowance < amount)
    return { status: 409, message: "Limit prè kliyan an pa sifi pou demann sa a." };
  if (!Number.isSafeInteger(withdrawable) || withdrawable < 0 || !Number.isSafeInteger(withdrawable + amount) || withdrawable + amount > 2147483647)
    return { status: 409, message: "Balans retrè kliyan an pa ka resevwa kantite sa a." };

  user.borrowablePoints = allowance - amount;
  user.withdrawablePoints = withdrawable + amount;
  request.borrowableBefore = allowance;
  request.withdrawableBefore = withdrawable;
  request.creditedAt = new Date();
  request.creditedBy = adminId;
  await user.save({ transaction });
  await request.save({ transaction });
  return null;
}

// Approvals now atomically move the approved amount into withdrawable points.
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
      if (decision === "approved") {
        const error = await creditApprovedRequest(request, user, currentUser(req).id, transaction);
        if (error) return error;
      }
      request.status = decision;
      request.reviewedBy = currentUser(req).id;
      request.reviewedAt = new Date();
      await request.save({ transaction });
      return { request, wallet: {
        borrowablePoints: Number(user.borrowablePoints ?? 0),
        withdrawablePoints: Number(user.withdrawablePoints ?? 0),
      } };
    });
    if ("message" in result) return res.status(result.status ?? 400).json({ message: result.message });
    return res.json(result.request);
  } catch (error) {
    console.error("borrow decision failed", error instanceof Error ? error.name : "unknown");
    return res.status(500).json({ message: "Pa kapab anrejistre desizyon an." });
  }
});
// Older approved requests predate wallet crediting. Require a separate explicit
// administrator click rather than silently crediting historical requests during deployment.
router.patch("/admin/:id/credit", adminOnly, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ message: "ID demann lan pa valid." });
  try {
    const result = await sequelize.transaction(async transaction => {
      const request = await BorrowRequest.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!request) return { status: 404, message: "Demann pa jwenn." };
      if (request.status !== "approved") return { status: 409, message: "Se sèlman prè apwouve ki ka kredite." };
      if (request.creditedAt) return { status: 409, message: "Prè sa a deja kredite." };
      const user = await User.findByPk(request.userId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!user) return { status: 404, message: "Kliyan pa jwenn." };
      const error = await creditApprovedRequest(request, user, currentUser(req).id, transaction);
      if (error) return error;
      return { request, wallet: {
        borrowablePoints: Number(user.borrowablePoints ?? 0),
        withdrawablePoints: Number(user.withdrawablePoints ?? 0),
      } };
    });
    if ("message" in result) return res.status(result.status ?? 400).json({ message: result.message });
    return res.json(result);
  } catch (error) {
    console.error("borrow credit failed", error instanceof Error ? error.name : "unknown");
    return res.status(500).json({ message: "Pa kapab kredite prè a." });
  }
});

const LOAN_TERM_MS = 30 * 86400000;
import { loanTotal, repaymentAllowed, allocateWalletRepayment, walletRepaymentReconciles, repaymentLedgerReconciles } from "../services/borrowRepayment";

// Loan repayments are feature-flagged until ledger and settlement tests pass.
// PIX settlement requires a separate, verified payment-provider integration.
router.post("/:id/wallet-repayments", async (req, res) => {
  if (process.env.BORROW_WALLET_REPAYMENTS_ENABLED !== "true")
    return res.status(503).json({ message: "Peman prè yo poko aktive." });
  const id = Number(req.params.id);
  const amount = req.body?.amount;
  const key = req.get("Idempotency-Key");
  if (!Number.isSafeInteger(id) || id < 1 || !Number.isSafeInteger(amount) || amount < 1 || amount > 2147483647 ||
      !key || !/^[A-Za-z0-9_-]{16,128}$/.test(key))
    return res.status(400).json({ message: "Kantite oswa referans peman an pa valid." });
  try {
    const result = await sequelize.transaction(async transaction => {
      // Match the approval path's lock order (user, then loan) to reduce deadlocks.
      // Recheck ownership on the locked row; the preliminary read is not trusted.
      const candidate = await BorrowRequest.findByPk(id, { transaction });
      if (!candidate || candidate.userId !== currentUser(req).id)
        return { code: 404, message: "Prè pa jwenn." };
      const user = await User.findByPk(currentUser(req).id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!user) return { code: 404, message: "Kont pa jwenn." };
      const loan = await BorrowRequest.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!loan || loan.userId !== user.id) return { code: 404, message: "Prè pa jwenn." };
      const previous = await sequelize.query<{ borrowRequestId: number; userId: number; amount: number }>(
        'SELECT "borrowRequestId", "userId", amount FROM borrow_repayments WHERE "idempotencyKey" = :key LIMIT 1',
        { replacements: { key }, type: QueryTypes.SELECT, transaction }
      );
      if (previous.length) {
        if (previous[0].borrowRequestId !== id || previous[0].userId !== loan.userId || previous[0].amount !== amount)
          return { code: 409, message: "Referans peman sa a deja sèvi pou yon lòt peman." };
        return { code: 200, remaining: Math.max(0, loanTotal(loan.amount) - Number(loan.repaidPoints)), duplicate: true };
      }
      if (loan.status !== "approved" || !loan.creditedAt)
        return { code: 409, message: "Prè sa a poko kredite." };
      // Never debit a wallet if the loan's aggregate ledger is already inconsistent.
      const ledgerAmounts = await sequelize.query<{amount:number}>(
        'SELECT amount FROM borrow_repayments WHERE "borrowRequestId"=:id',
        { replacements:{id}, type:QueryTypes.SELECT, transaction }
      );
      if (!repaymentLedgerReconciles(Number(loan.repaidPoints),ledgerAmounts.map(p=>Number(p.amount))))
        return { code:409, message:"Istwa peman prè a pa koresponn. Kontakte administratè a." };
      const walletRecords = await sequelize.query<{
        amount:number; playDebited:number; withdrawDebited:number;
        playBefore:number|null; withdrawBefore:number|null;
        playAfter:number|null; withdrawAfter:number|null;
      }>(
        'SELECT amount, "playDebited", "withdrawDebited", "playBefore", "withdrawBefore", "playAfter", "withdrawAfter" FROM borrow_repayments WHERE "borrowRequestId"=:id AND method=\'wallet\'',
        { replacements:{id}, type:QueryTypes.SELECT, transaction }
      );
      if (walletRecords.some(record=>!walletRepaymentReconciles(record)))
        return { code:409, message:"Gen yon diferans nan balans peman yo. Kontakte administratè a." };
      // A pending PIX checkout could settle later; prevent a wallet debit
      // from consuming its reserved repayment amount.
      const pendingPix = await sequelize.query<{points:number}>(
        'SELECT points FROM borrow_pix_attempts WHERE "borrowRequestId"=:id AND status IN (\'pending\',\'checkout_created\')',
        { replacements:{id}, type:QueryTypes.SELECT, transaction }
      );
      if (pendingPix.length)
        return { code:409, message:"Gen yon peman PIX ki poko fini. Verifye eta li anvan ou peye ak balans." };
      const total = loanTotal(Number(loan.amount));
      const remaining = total - Number(loan.repaidPoints);
      if (!Number.isSafeInteger(remaining) || remaining <= 0 || amount > remaining)
        return { code: 409, message: "Kantite a depase rès prè a oswa prè a fin peye." };
      const dueAt = new Date(loan.creditedAt).getTime() + LOAN_TERM_MS;
      if (!repaymentAllowed(amount, remaining, dueAt, Date.now()))
        return { code: 409, message: "Nan dènye jou a, ou dwe peye tout rès prè a." };
      const play = Number(user.points);
      const withdraw = Number(user.withdrawablePoints);
      const debit = allocateWalletRepayment(play, withdraw, amount);
      if (!debit) return { code: 409, message: "Balans Bolet ou pa sifi." };
      const { withdrawDebited, playDebited } = debit;
      user.withdrawablePoints = debit.withdrawAfter;
      user.points = debit.playAfter;
      loan.repaidPoints = Number(loan.repaidPoints) + amount;
      await user.save({ transaction });
      await loan.save({ transaction });
      await sequelize.query(
        'INSERT INTO borrow_repayments ("borrowRequestId","userId",amount,"playDebited","withdrawDebited","playBefore","withdrawBefore","playAfter","withdrawAfter",method,"idempotencyKey","createdAt") VALUES (:id,:userId,:amount,:playDebited,:withdrawDebited,:playBefore,:withdrawBefore,:playAfter,:withdrawAfter,\'wallet\',:key,NOW())',
        { replacements: { id, userId: user.id, amount, playDebited, withdrawDebited, playBefore: play, withdrawBefore: withdraw, playAfter: debit.playAfter, withdrawAfter: debit.withdrawAfter, key }, transaction }
      );
      return { code: 200, remaining: remaining - amount, paid: amount };
    });
    if ("message" in result) return res.status(result.code).json({ message: result.message });
    return res.status(result.code).json(result);
  } catch (error) {
    if (error instanceof UniqueConstraintError) return res.status(409).json({ message: "Peman sa a deja anrejistre." });
    console.error("borrow repayment failed", error instanceof Error ? error.name : "unknown");
    return res.status(500).json({ message: "Peman an pa pase." });
  }
});
/** Reserve exactly one outstanding PIX attempt before requesting a hosted checkout.
 * No repayment is recorded until independently verified settlement is implemented.
 */
router.post("/:id/pix-intents", async (req,res) => {
  if (process.env.BORROW_PIX_CHECKOUT_ENABLED !== "true" ||
      process.env.BORROW_PIX_WEBHOOK_ENABLED !== "true" ||
      process.env.BORROW_PIX_SETTLEMENT_READY !== "true")
    return res.status(503).json({message:"Peman PIX poko aktive."});
  if (process.env.BORROW_PIX_CUSTOMER_ACCESS_ENABLED !== "true" && !currentUser(req).isAdmin)
    return res.status(403).json({message:"PIX disponib sèlman pou tès administratè."});
  const id=Number(req.params.id), amount=req.body?.amount;
  const key=req.get("Idempotency-Key");
  if (!Number.isSafeInteger(id) || id<1 || !Number.isSafeInteger(amount) ||
      amount<1 || amount>21474836 || !key || !/^[A-Za-z0-9_-]{16,128}$/.test(key))
    return res.status(400).json({message:"Kantite oswa referans PIX pa valid."});
  const handle=process.env.INFINITEPAY_HANDLE;
  const redirectUrl=process.env.BORROW_PIX_REDIRECT_URL;
  const webhookUrl=process.env.BORROW_PIX_WEBHOOK_URL;
  if (!handle || !redirectUrl || !webhookUrl)
    return res.status(503).json({message:"Konfigirasyon PIX poko pare."});
  try {
    const reserved=await sequelize.transaction(async transaction=>{
      const candidate=await BorrowRequest.findByPk(id,{transaction});
      if (!candidate || (candidate.userId!==currentUser(req).id && !currentUser(req).isAdmin))
        return {code:404,message:"Prè pa jwenn."};
      const user=await User.findByPk(candidate.userId,{transaction,lock:transaction.LOCK.UPDATE});
      if (!user) return {code:404,message:"Kont pa jwenn."};
      const loan=await BorrowRequest.findByPk(id,{transaction,lock:transaction.LOCK.UPDATE});
      if (!loan || loan.userId!==user.id) return {code:404,message:"Prè pa jwenn."};
      const previous=await sequelize.query<{id:number;borrowRequestId:number;userId:number;points:number;status:string;checkoutUrl:string|null}>(
        'SELECT id,"borrowRequestId","userId",points,status,"checkoutUrl" FROM borrow_pix_attempts WHERE "idempotencyKey"=:key',
        {replacements:{key},type:QueryTypes.SELECT,transaction});
      if (previous.length) {
        const p=previous[0];
        if (p.borrowRequestId!==id || p.userId!==user.id || p.points!==amount)
          return {code:409,message:"Referans PIX deja itilize."};
        if (p.status==="checkout_created" && p.checkoutUrl)
          return {code:200,checkoutUrl:p.checkoutUrl,attemptId:p.id};
        return {code:409,message:"Peman PIX sa a deja ap trete."};
      }
      if (loan.status!=="approved" || !loan.creditedAt)
        return {code:409,message:"Prè sa a poko kredite."};
      const ledger=await sequelize.query<{amount:number}>(
        'SELECT amount FROM borrow_repayments WHERE "borrowRequestId"=:id',
        {replacements:{id},type:QueryTypes.SELECT,transaction});
      if (!repaymentLedgerReconciles(Number(loan.repaidPoints),ledger.map(p=>Number(p.amount))))
        return {code:409,message:"Istwa peman prè a pa koresponn."};
      const pending=await sequelize.query<{id:number}>(
        'SELECT id FROM borrow_pix_attempts WHERE "borrowRequestId"=:id AND status IN (\'pending\',\'checkout_created\') LIMIT 1',
        {replacements:{id},type:QueryTypes.SELECT,transaction});
      if (pending.length) return {code:409,message:"Gen yon peman PIX ki poko fini."};
      const remaining=loanTotal(Number(loan.amount))-Number(loan.repaidPoints);
      const dueAt=new Date(loan.creditedAt).getTime()+LOAN_TERM_MS;
      if (remaining<1 || amount>remaining || !repaymentAllowed(amount,remaining,dueAt,Date.now()))
        return {code:409,message:"Nan dènye jou a, ou dwe peye tout rès prè a."};
      const inserted=await sequelize.query<{id:number}>(
        'INSERT INTO borrow_pix_attempts ("borrowRequestId","userId",points,"amountCents",currency,status,"idempotencyKey","providerReference","createdAt","updatedAt") VALUES (:id,:userId,:amount,:cents,\'BRL\',\'pending\',:key,:reference,NOW(),NOW()) RETURNING id',
        {replacements:{id,userId:user.id,amount,cents:amount*100,key,reference:key},type:QueryTypes.SELECT,transaction});
      return {code:201,attemptId:inserted[0].id};
    });
    if ("message" in reserved) return res.status(reserved.code).json({message:reserved.message});
    if (reserved.code===200) return res.json({attemptId:reserved.attemptId,checkoutUrl:reserved.checkoutUrl,paymentConfirmed:false});
    // Provider network request must not hold database locks.
    const checkout=await createBorrowPixCheckout({
      handle,orderNsu:key,points:amount,redirectUrl,webhookUrl,
      apiKey:process.env.INFINITEPAY_API_KEY
    });
    await sequelize.query(
      'UPDATE borrow_pix_attempts SET status=\'checkout_created\',"checkoutUrl"=:url,"updatedAt"=NOW() WHERE id=:attemptId AND status=\'pending\'',
      {replacements:{url:checkout.checkoutUrl,attemptId:reserved.attemptId}}
    );
    return res.status(201).json({attemptId:reserved.attemptId,checkoutUrl:checkout.checkoutUrl,paymentConfirmed:false});
  } catch (error) {
    // An ambiguous provider timeout cannot safely be retried with a new key.
    console.error("borrow PIX checkout failed",error instanceof Error?error.name:"unknown");
    if (error instanceof UniqueConstraintError)
      return res.status(409).json({message:"Referans PIX deja itilize."});
    return res.status(503).json({message:"Verifye eta peman PIX la anvan ou eseye ankò."});
  }
});

/** Read-only checkout status. Pending PIX attempts never count as repayments. */
router.get("/:id/pix-attempts", async (req,res) => {
  const id=Number(req.params.id);
  if (!Number.isSafeInteger(id) || id<1)
    return res.status(400).json({message:"ID pa valid."});
  try {
    const loan=await BorrowRequest.findByPk(id);
    if (!loan || (loan.userId!==currentUser(req).id && !currentUser(req).isAdmin))
      return res.status(404).json({message:"Prè pa jwenn."});
    const attempts=await sequelize.query<{
      id:number;points:number;amountCents:number;currency:string;status:string;
      createdAt:Date;confirmedAt:Date|null;
    }>(
      'SELECT id,points,"amountCents",currency,status,"createdAt","confirmedAt" FROM borrow_pix_attempts WHERE "borrowRequestId"=:id ORDER BY "createdAt" DESC LIMIT 50',
      {replacements:{id},type:QueryTypes.SELECT}
    );
    return res.json({attempts});
  } catch {
    return res.status(500).json({message:"Pa kapab chaje eta peman PIX yo."});
  }
});

/** Authoritative 30-day countdown for customer and administrator dashboards. */
router.get("/:id/repayment-status", async (req,res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1)
    return res.status(400).json({message:"ID pa valid."});
  try {
    const loan = await BorrowRequest.findByPk(id);
    if (!loan || (loan.userId !== currentUser(req).id && !currentUser(req).isAdmin))
      return res.status(404).json({message:"Prè pa jwenn."});
    if (loan.status !== "approved" || !loan.creditedAt)
      return res.status(409).json({message:"Prè sa a poko kredite."});
    const total = loanTotal(Number(loan.amount));
    const repaid = Number(loan.repaidPoints);
    const remaining = total - repaid;
    if (!Number.isSafeInteger(repaid) || repaid < 0 || remaining < 0)
      return res.status(409).json({message:"Balans prè a bezwen verifikasyon."});
    const ledger = await sequelize.query<{amount:number}>(
      'SELECT amount FROM borrow_repayments WHERE "borrowRequestId"=:id',
      {replacements:{id},type:QueryTypes.SELECT}
    );
    if (!repaymentLedgerReconciles(repaid,ledger.map(p=>Number(p.amount))))
      return res.status(409).json({message:"Istwa peman prè a pa koresponn."});
    const dueAtMs = new Date(loan.creditedAt).getTime() + LOAN_TERM_MS;
    if (!Number.isFinite(dueAtMs))
      return res.status(409).json({message:"Dat limit prè a pa valid."});
    const now = Date.now();
    const millisecondsLeft = Math.max(0,dueAtMs-now);
    const pendingPix = await sequelize.query<{id:number}>(
      'SELECT id FROM borrow_pix_attempts WHERE "borrowRequestId"=:id AND status IN (\'pending\',\'checkout_created\') LIMIT 1',
      {replacements:{id},type:QueryTypes.SELECT}
    );
    return res.json({
      loanId:id,total,repaid,remaining,
      dueAt:new Date(dueAtMs).toISOString(),
      millisecondsLeft,
      daysLeft:Math.ceil(millisecondsLeft/86400000),
      overdue:remaining>0 && now>dueAtMs,
      finalDay:remaining>0 && now>=dueAtMs-86400000,
      partialPaymentAllowed:remaining>0 && now<dueAtMs-86400000 && pendingPix.length===0,
      fullPaymentAllowed:remaining>0 && pendingPix.length===0,
      pendingPix:pendingPix.length>0,
      walletPaymentsEnabled:process.env.BORROW_WALLET_REPAYMENTS_ENABLED==="true",
      pixPaymentsEnabled:process.env.BORROW_PIX_CHECKOUT_ENABLED==="true" && process.env.BORROW_PIX_WEBHOOK_ENABLED==="true" && process.env.BORROW_PIX_SETTLEMENT_READY==="true" && (process.env.BORROW_PIX_CUSTOMER_ACCESS_ENABLED==="true" || currentUser(req).isAdmin),
    });
  } catch {
    return res.status(500).json({message:"Pa kapab chaje kontè prè a."});
  }
});

router.get("/:id/repayments", async (req,res) => {
  const id=Number(req.params.id);
  if(!Number.isSafeInteger(id)||id<1) return res.status(400).json({message:"ID pa valid."});
  try {
    const loan=await BorrowRequest.findByPk(id);
    if(!loan || (loan.userId!==currentUser(req).id && !currentUser(req).isAdmin))
      return res.status(404).json({message:"Prè pa jwenn."});
    const payments=await sequelize.query<{
      id:number; amount:number; method:string; playDebited:number; withdrawDebited:number;
      playBefore:number|null; withdrawBefore:number|null; playAfter:number|null;
      withdrawAfter:number|null; createdAt:Date;
    }>(
      'SELECT id, amount, method, "playDebited", "withdrawDebited", "playBefore", "withdrawBefore", "playAfter", "withdrawAfter", "createdAt" FROM borrow_repayments WHERE "borrowRequestId"=:id ORDER BY "createdAt" DESC',
      {replacements:{id},type:QueryTypes.SELECT}
    );
    const auditedPayments=payments.map(payment=>({
      ...payment, balancesReconcile:payment.method==="wallet" ? walletRepaymentReconciles(payment) : null
    }));
    const ledgerReconciles=repaymentLedgerReconciles(Number(loan.repaidPoints),payments.map(p=>Number(p.amount)));
    return res.json({total:loanTotal(Number(loan.amount)),repaid:Number(loan.repaidPoints),remaining:Math.max(0,loanTotal(Number(loan.amount))-Number(loan.repaidPoints)),payments:auditedPayments,ledgerReconciles});
  } catch {return res.status(500).json({message:"Pa kapab chaje peman yo."});}
});

export default router;
