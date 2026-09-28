import type { Request, Response } from "express";
import { PixPayment, PixPaymentRequest, Pwen, User } from "../models";
import { errorMessage } from "../utils/errors";

/**
 * BUY / CREDIT PWEN.
 * With `pixPaymentId`: credits a PIX payment that is in status "paid".
 * Without it: credits `amount` to `userId` (or to the caller).
 */
export async function buyPwen(req: Request, res: Response) {
  try {
    const { amount, pixPaymentId, userId } = req.body ?? {};

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    let targetUser: User | null | undefined;
    let sourceType: "manual" | "pix" = "manual";

    if (pixPaymentId) {
      const pixPayment = await PixPayment.findByPk(pixPaymentId, {
        include: [{ model: User, as: "user" }],
      });

      if (!pixPayment) {
        return res.status(404).json({ message: "PIX payment not found" });
      }
      if (pixPayment.status === "credited") {
        return res.status(400).json({ message: "PIX already credited" });
      }
      if (pixPayment.status !== "paid") {
        return res.status(400).json({
          message: "PIX payment not confirmed yet",
          status: pixPayment.status,
        });
      }

      targetUser = pixPayment.user;
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      sourceType = "pix";

      pixPayment.status = "credited";
      await pixPayment.save();

      await PixPaymentRequest.update(
        { isPaid: true },
        { where: { userId: targetUser.id, amount: Number(pixPayment.amountBRL), isPaid: false } }
      );
    } else {
      const targetUserId = userId || req.user?.id;
      if (!targetUserId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      targetUser = await User.findByPk(targetUserId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }
    }

    const pointsToAdd = Number(amount);
    targetUser.points = Number(targetUser.points || 0) + pointsToAdd;
    await targetUser.save();

    await Pwen.create({
      amount: pointsToAdd,
      userId: targetUser.id,
      stripePaymentId: sourceType === "pix" ? `pix-${pixPaymentId}` : "manual",
    });

    console.log(`💰 Credited ${pointsToAdd} points to user ${targetUser.id} (${sourceType})`);

    return res.status(200).json({
      message: "Pwen added successfully",
      balance: targetUser.points,
      userId: targetUser.id,
      phone: targetUser.phone,
      source: sourceType,
      pointsAdded: pointsToAdd,
    });
  } catch (err) {
    console.error("🔥 buyPwen error:", err);
    return res.status(500).json({ message: "Server error", error: errorMessage(err) });
  }
}

/** Credit the owner of a PIX payment (not wired to a route, kept for webhook use). */
export async function creditUserFromPix(pixPaymentId: number) {
  const pixPayment = await PixPayment.findByPk(pixPaymentId, {
    include: [{ model: User, as: "user" }],
  });

  if (!pixPayment) throw new Error(`PixPayment ${pixPaymentId} not found`);
  if (pixPayment.status === "credited") return { alreadyCredited: true as const };

  const user = pixPayment.user;
  if (!user) throw new Error(`User not found for PixPayment ${pixPaymentId}`);

  const pointsToAdd = pixPayment.points || Math.floor(Number(pixPayment.amountBRL));

  user.points = Number(user.points || 0) + pointsToAdd;
  await user.save();

  await Pwen.create({ amount: pointsToAdd, userId: user.id, stripePaymentId: `pix-${pixPaymentId}` });

  pixPayment.status = "credited";
  await pixPayment.save();

  return {
    success: true as const,
    userId: user.id,
    phone: user.phone,
    pointsAdded: pointsToAdd,
    newBalance: user.points,
  };
}
