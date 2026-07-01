const axios = require("axios");

const INFINITEPAY_URL = "https://api.checkout.infinitepay.io/links";

exports.test = async (req, res) => {
  return res.status(200).json({
    success: true,
    message: "InfinitePay controller is working!",
  });
};

exports.createPayment = async (req, res) => {
  try {
    const { userId, amountBRL, description } = req.body;

    if (!userId) {
      return res.status(400).json({
        error: "userId is required",
      });
    }

    if (!amountBRL || Number(amountBRL) <= 0) {
      return res.status(400).json({
        error: "Invalid amount",
      });
    }

    const payload = {
      handle: "laurius-debrune",
      items: [
        {
          quantity: 1,
          price: Math.round(Number(amountBRL) * 100),
          description: description || "Lotto Credits",
        },
      ],
      order_nsu: `${userId}-${Date.now()}`,
      redirect_url: "https://ht-lotodigital.com/",
      webhook_url:
        "https://boletapp-production.up.railway.app/api/infinitepay/webhook",
    };

    console.log("📤 Sending payload to InfinitePay:");
    console.log(JSON.stringify(payload, null, 2));

    const { data } = await axios.post(INFINITEPAY_URL, payload);

    console.log("✅ InfinitePay Response:");
    console.log(data);

    return res.status(200).json(data);
  } catch (err) {
    console.error("❌ InfinitePay Error:");
    console.error(err.response?.data || err.message);

    return res.status(500).json({
      error: err.response?.data || err.message,
    });
  }
};

exports.webhook = async (req, res) => {
  console.log("🔥 InfinitePay Webhook");
  console.log(JSON.stringify(req.body, null, 2));

  return res.sendStatus(200);
};