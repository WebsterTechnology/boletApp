import "dotenv/config";
import request from "supertest";
import app from "../src/app";
import { PixPayment, sequelize, User } from "../src/models";

const TEST_PHONE = "6135550001";
const POINTS = 10;

function assertLocalDatabase() {
  const url = process.env.DATABASE_URL || "";
  if (!url) throw new Error("DATABASE_URL is missing");
  if (/railway|render|koyeb|neon|supabase/i.test(url)) {
    throw new Error("REFUSING TO RUN: this script is for the local PostgreSQL database only.");
  }
}

async function main() {
  assertLocalDatabase();
  const secret = process.env.ASAAS_WEBHOOK_TOKEN;
  if (!secret) throw new Error("ASAAS_WEBHOOK_TOKEN is missing");

  await sequelize.authenticate();
  const user = await User.findOne({ where: { phone: TEST_PHONE } });
  if (!user) throw new Error(`Local test user ${TEST_PHONE} not found`);

  const originalBalance = Number(user.points || 0);
  const providerRef = `LOCAL-CONCURRENCY-${Date.now()}`;
  const payment = await PixPayment.create({
    userId: user.id,
    providerRef,
    amountBRL: POINTS,
    points: POINTS,
    status: "pending",
  });

  try {
    const payload = {
      event: "PAYMENT_CONFIRMED",
      payment: { id: providerRef, status: "CONFIRMED" },
    };

    const [a, b] = await Promise.all([
      request(app).post("/api/pix/webhook").set("asaas-access-token", secret).send(payload),
      request(app).post("/api/pix/webhook").set("asaas-access-token", secret).send(payload),
    ]);

    await user.reload();
    await payment.reload();

    const increase = Number(user.points) - originalBalance;
    console.log(`Webhook responses: ${a.status}, ${b.status}`);
    console.log(`Balance increase: ${increase}`);
    console.log(`Payment status: ${payment.status}`);

    if (a.status !== 200 || b.status !== 200 || increase !== POINTS || payment.status !== "credited") {
      throw new Error("PIX WEBHOOK CONCURRENCY FAILED");
    }

    console.log("PASS: simultaneous webhook deliveries credited the payment exactly once.");
  } finally {
    await user.reload();
    user.points = originalBalance;
    await user.save();
    await PixPayment.destroy({ where: { id: payment.id } });
    await sequelize.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
