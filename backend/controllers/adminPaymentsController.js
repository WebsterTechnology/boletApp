const { PixPayment, User } = require("../models");

/**
 * GET PIX PAYMENTS (with query parameter support)
 * Accepts: ?status=credited (default) OR ?status=pending OR ?status=all
 * Your frontend sends: ?status=credited
 */
exports.getPaidPixPayments = async (req, res) => {
  try {
    const { status } = req.query; // ✅ Get the query parameter
    
    // Build where clause based on query
    let where = {};
    
    // Default behavior: if no query or status=credited, show credited
    if (!status || status === 'credited') {
      where.status = 'credited';
    } else if (status === 'pending') {
      where.status = 'pending';
    } else if (status === 'all') {
      // Show all - empty where clause
      where = {};
    }
    // Any other status value will use empty where (shows all)

    console.log("📊 Fetching PIX payments with filter:", { 
      query: status, 
      where: where 
    });

    const payments = await PixPayment.findAll({
      where: where,
      order: [["createdAt", "DESC"]], // Changed to DESC for newest first
      include: [{ 
        model: User, 
        attributes: ['id', 'phone'] 
      }]
    });

    console.log(`✅ Found ${payments.length} payments with status: ${status || 'credited'}`);
    
    res.json(payments);
  } catch (err) {
    console.error("❌ Error fetching PIX payments:", err);
    res.status(500).json({ message: "Failed to fetch PIX payments" });
  }
};

/**
 * CREDIT PIX
 * (optional – mostly redundant since webhook already credits)
 */
exports.creditPixPayment = async (req, res) => {
  try {
    const { id } = req.params;

    const payment = await PixPayment.findByPk(id);
    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    if (payment.status !== "credited") {
      return res.status(400).json({
        message: "PIX not credited yet",
      });
    }

    const user = await User.findByPk(payment.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({
      message: "PIX already credited via webhook",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to process PIX" });
  }
};