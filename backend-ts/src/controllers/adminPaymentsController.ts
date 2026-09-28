import type { Request, Response } from "express";
import type { WhereOptions } from "sequelize";
import { PixPayment, User } from "../models";
import { queryString } from "../utils/http";

/**
 * GET PIX PAYMENTS.
 * ?status=credited (default) | pending | all. Any other value returns everything.
 */
export async function getPaidPixPayments(req: Request, res: Response) {
  try {
    const status = queryString(req.query.status);

    let where: WhereOptions<PixPayment> = {};
    if (!status || status === "credited") where = { status: "credited" };
    else if (status === "pending") where = { status: "pending" };

    const payments = await PixPayment.findAll({
      where,
      order: [["createdAt", "DESC"]],
      include: [{ model: User, attributes: ["id", "phone"] }],
    });

    return res.json(payments);
  } catch (err) {
    console.error("❌ Error fetching PIX payments:", err);
    return res.status(500).json({ message: "Failed to fetch PIX payments" });
  }
}

/** CREDIT PIX (mostly redundant: the webhook already credits). */
export async function creditPixPayment(req: Request, res: Response) {
  try {
    const payment = await PixPayment.findByPk(String(req.params.id));
    if (!payment) return res.status(404).json({ message: "Payment not found" });

    if (payment.status !== "credited") {
      return res.status(400).json({ message: "PIX not credited yet" });
    }

    const user = await User.findByPk(payment.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    return res.json({ message: "PIX already credited via webhook" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to process PIX" });
  }
}
