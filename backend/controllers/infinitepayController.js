const axios = require("axios");
const { User, PixPayment, PixPaymentRequest, sequelize } = require("../models");

const INFINITEPAY_LINKS_URL = "https://api.checkout.infinitepay.io/links";
const HANDLE = process.env.INFINITEPAY_HANDLE || "laurius-debrune";

exports.test = async (req, res) => {
    res.json({
        success: true,
        message: "InfinitePay controller is working!",
    });
};

exports.createPayment = async (req, res) => {
    try {
        console.log("========= INFINITEPAY /create-payment =========");
        console.log("📥 Body received:", req.body);

        const { userId, amountBRL, description, name, email, phone } = req.body;

        if (!userId) {
            return res.status(400).json({ error: "userId is required" });
        }

        const amount = Number(amountBRL);

        if (!amount || amount <= 0) {
            return res.status(400).json({ error: "amountBRL must be > 0" });
        }

        const user = await User.findByPk(userId);

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const orderNsu = `${user.id}-${Date.now()}`;

        const payload = {
            handle: HANDLE,
            items: [
                {
                    quantity: 1,
                    price: Math.round(amount * 100),
                    description: description || "Lotto Credits",
                },
            ],
            order_nsu: orderNsu,
            redirect_url: "https://ht-lotodigital.com/",
            webhook_url:
                "https://boletapp-production.up.railway.app/api/infinitepay/webhook",
        };

        if (name || email || phone || user.phone) {
            payload.customer = {
                name: name || `User ${user.id}`,
                email: email || `user${user.id}@example.com`,
                phone_number: phone || user.phone || "",
            };
        }

        console.log("📤 Sending to InfinitePay:");
        console.log(JSON.stringify(payload, null, 2));

        const { data } = await axios.post(INFINITEPAY_LINKS_URL, payload);

        console.log("✅ InfinitePay response:");
        console.log(data);

        const checkoutUrl =
            data.url ||
            data.checkout_url ||
            data.checkoutUrl ||
            data.link ||
            data.payment_url ||
            null;

        if (!checkoutUrl) {
            return res.status(500).json({
                error: "InfinitePay did not return checkout URL",
                providerResponse: data,
            });
        }

        const expiresAt = new Date();
        expiresAt.setHours(23, 59, 0, 0);

        const local = await PixPayment.create({
            userId: user.id,
            providerRef: orderNsu,
            amountBRL: amount,
            points: Math.floor(amount),
            status: "pending",
            expiresAt,
            rawPayload: {
                provider: "infinitepay",
                request: payload,
                response: data,
                checkoutUrl,
            },
        });

        await PixPaymentRequest.create({
            userId: user.id,
            phoneNumber: user.phone || phone || "",
            amount,
            isPaid: false,
        });

        return res.status(200).json({
            success: true,
            paymentId: local.id,
            providerPaymentId: orderNsu,
            checkoutUrl,
            url: checkoutUrl,
            status: "pending",
            userId: user.id,
        });
    } catch (err) {
        console.error("========== FULL ERROR ==========");
        console.error("Status:", err.response?.status);
        console.error("Headers:", err.response?.headers);
        console.error(
            "Data:",
            JSON.stringify(err.response?.data, null, 2)
        );
        console.error("Message:", err.message);

        return res.status(500).json({
            error: err.response?.data || err.message,
        });
    }
};

exports.webhook = async (req, res) => {
    console.log("========= INFINITEPAY WEBHOOK =========");
    console.log(JSON.stringify(req.body, null, 2));

    const t = await sequelize.transaction();

    try {
        const body = req.body || {};

        const orderNsu = body.order_nsu;
        const transactionNsu = body.transaction_nsu;
        const invoiceSlug = body.invoice_slug;
        const paidAmount = body.paid_amount;
        const amount = body.amount;
        const receiptUrl = body.receipt_url;

        if (!orderNsu) {
            console.log("❌ No order_nsu received");
            await t.rollback();
            return res.sendStatus(200);
        }

        const pay = await PixPayment.findOne({
            where: { providerRef: orderNsu },
            transaction: t,
            lock: t.LOCK.UPDATE,
        });

        if (!pay) {
            console.log("❌ Payment not found:", orderNsu);
            await t.rollback();
            return res.sendStatus(200);
        }

        if (pay.status === "credited") {
            console.log("⚠️ Already credited");
            await t.commit();
            return res.sendStatus(200);
        }

        const user = await User.findByPk(pay.userId, {
            transaction: t,
            lock: t.LOCK.UPDATE,
        });

        if (!user) {
            console.log("❌ User not found:", pay.userId);
            await t.rollback();
            return res.sendStatus(200);
        }

        const points = Number(pay.points || pay.amountBRL || 0);

        user.points = Number(user.points || 0) + points;
        await user.save({ transaction: t });

        pay.status = "credited";
        pay.rawPayload = {
            ...(pay.rawPayload || {}),
            webhook: body,
            transactionNsu,
            invoiceSlug,
            receiptUrl,
        };

        if (amount && paidAmount) {
            const gross = Number(amount) / 100;
            const paid = Number(paidAmount) / 100;

            pay.netValueBRL = paid;
            pay.feeBRL = Math.max(0, gross - paid);
        }

        await pay.save({ transaction: t });

        await PixPaymentRequest.update(
            { isPaid: true },
            {
                where: {
                    userId: user.id,
                    amount: pay.amountBRL,
                    isPaid: false,
                },
                transaction: t,
            }
        );

        await t.commit();

        console.log("✅ InfinitePay payment credited:", {
            userId: user.id,
            pointsAdded: points,
            newBalance: user.points,
            orderNsu,
        });

        return res.sendStatus(200);
    } catch (err) {
        await t.rollback();

        console.error("🔥 INFINITEPAY WEBHOOK ERROR:");
        console.error(err.message);

        return res.sendStatus(200);
    }
};

exports.manualCredit = async (req, res) => {
    try {
        const { paymentId } = req.body;

        if (!paymentId) {
            return res.status(400).json({ error: "paymentId is required" });
        }

        const payment = await PixPayment.findByPk(paymentId);

        if (!payment) {
            return res.status(404).json({ error: "Payment not found" });
        }

        if (payment.status === "credited") {
            return res.status(400).json({ error: "Already credited" });
        }

        const user = await User.findByPk(payment.userId);

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const points = Number(payment.points || payment.amountBRL || 0);

        user.points = Number(user.points || 0) + points;
        await user.save();

        payment.status = "credited";
        await payment.save();

        await PixPaymentRequest.update(
            { isPaid: true },
            {
                where: {
                    userId: user.id,
                    amount: payment.amountBRL,
                    isPaid: false,
                },
            }
        );

        return res.status(200).json({
            message: "Manually credited",
            userId: user.id,
            phone: user.phone,
            pointsAdded: points,
            newBalance: user.points,
        });
    } catch (err) {
        console.error("🔥 INFINITEPAY MANUAL CREDIT ERROR:", err);
        return res.status(500).json({ error: err.message });
    }
};