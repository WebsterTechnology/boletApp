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

        const userId = req.user.id;
        const { amountBRL, description, name, email, phone } = req.body;

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
                    description: description || "Credits",
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

    const body = req.body || {};
    const orderNsu = body.order_nsu;
    const transactionNsu = body.transaction_nsu;
    const invoiceSlug = body.invoice_slug;

    if (!orderNsu || !transactionNsu || !invoiceSlug) {
        console.warn("❌ InfinitePay webhook missing verification fields");
        return res.status(400).json({
            success: false,
            message: "Missing payment verification fields",
        });
    }

    try {
        // Never trust the webhook body alone for a balance-changing operation.
        // Confirm the transaction directly with InfinitePay before crediting points.
        const { data: verification } = await axios.post(
            "https://api.checkout.infinitepay.io/payment_check",
            {
                handle: HANDLE,
                order_nsu: orderNsu,
                transaction_nsu: transactionNsu,
                slug: invoiceSlug,
            },
            {
                headers: { "Content-Type": "application/json" },
                timeout: 5000,
            }
        );

        if (verification?.success !== true || verification?.paid !== true) {
            console.warn("❌ InfinitePay did not confirm payment:", orderNsu);
            return res.status(400).json({
                success: false,
                message: "Payment not confirmed",
            });
        }

        const t = await sequelize.transaction();

        try {
            const pay = await PixPayment.findOne({
                where: { providerRef: orderNsu },
                transaction: t,
                lock: t.LOCK.UPDATE,
            });

            if (!pay) {
                await t.rollback();
                console.warn("❌ Payment not found:", orderNsu);
                return res.status(400).json({
                    success: false,
                    message: "Order not found",
                });
            }

            const expectedAmountCents = Math.round(Number(pay.amountBRL) * 100);
            const verifiedAmountCents = Number(verification.amount);

            if (
                !Number.isFinite(verifiedAmountCents) ||
                verifiedAmountCents !== expectedAmountCents
            ) {
                await t.rollback();
                console.warn("❌ InfinitePay amount mismatch:", {
                    orderNsu,
                    expectedAmountCents,
                    verifiedAmountCents,
                });
                return res.status(400).json({
                    success: false,
                    message: "Payment amount mismatch",
                });
            }

            if (pay.status === "credited") {
                await t.commit();
                console.log("⚠️ Already credited:", orderNsu);
                return res.status(200).json({ success: true, message: null });
            }

            const user = await User.findByPk(pay.userId, {
                transaction: t,
                lock: t.LOCK.UPDATE,
            });

            if (!user) {
                await t.rollback();
                console.warn("❌ User not found:", pay.userId);
                return res.status(400).json({
                    success: false,
                    message: "User not found",
                });
            }

            const points = Number(pay.points || pay.amountBRL || 0);
            user.points = Number(user.points || 0) + points;
            await user.save({ transaction: t });

            pay.status = "credited";
            pay.rawPayload = {
                ...(pay.rawPayload || {}),
                webhook: body,
                verification,
                transactionNsu,
                invoiceSlug,
                receiptUrl: body.receipt_url,
            };

            const paidAmountCents = Number(verification.paid_amount);
            if (Number.isFinite(paidAmountCents)) {
                pay.netValueBRL = paidAmountCents / 100;
                pay.feeBRL = Math.max(
                    0,
                    paidAmountCents / 100 - expectedAmountCents / 100
                );
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

            console.log("✅ InfinitePay payment verified and credited:", {
                userId: user.id,
                pointsAdded: points,
                newBalance: user.points,
                orderNsu,
                transactionNsu,
            });

            return res.status(200).json({ success: true, message: null });
        } catch (err) {
            await t.rollback();
            throw err;
        }
    } catch (err) {
        console.error(
            "🔥 INFINITEPAY WEBHOOK VERIFICATION ERROR:",
            err.response?.data || err.message
        );

        // InfinitePay retries webhook deliveries when we return 400.
        return res.status(400).json({
            success: false,
            message: "Payment verification failed",
        });
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