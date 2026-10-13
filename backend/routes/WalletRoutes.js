const express = require("express");
const router = express.Router();
const Wallet = require("../models/Wallet");
const User = require("../models/User");
const Role = require("../models/Role");
const { Op } = require("sequelize");
const {
  isConfigured,
  getMode,
  createOrder,
  getSuccessfulPayment,
  verifyWebhookSignature,
  cashfreeErrorMessage
} = require("../services/cashfreeService");

// Admin: sum of all non-admin seller wallet balances
router.get("/sellers-total", async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ["id", "name", "email", "walletBalance", "roleId"],
      include: [
        {
          model: Role,
          as: "role",
          attributes: ["id", "name"],
          required: false,
        },
      ],
    });

    const sellers = users.filter((u) => {
      const roleName = String(u.role?.name || "").toLowerCase();
      return roleName !== "admin" && roleName !== "super admin";
    });

    const total = sellers.reduce(
      (sum, u) => sum + (Number(u.walletBalance) || 0),
      0
    );

    res.json({
      success: true,
      total: Number(total.toFixed(2)),
      count: sellers.length,
      sellers: sellers.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        walletBalance: Number(u.walletBalance) || 0,
      })),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create Wallet Entry (manual UPI / legacy)
router.post("/create", async (req, res) => {
  try {
    const { user_id, transid, amount } = req.body;

    // Minimum wallet top-up rule: ₹100 (no maximum).
    if (!amount || !Number.isFinite(Number(amount)) || Number(amount) < 100) {
      return res.status(400).json({
        success: false,
        error: "Minimum amount to add is ₹100"
      });
    }

    const data = await Wallet.create({
      user_id,
      transid,
      amount
    });

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function approveCashfreePayment(walletEntry, { paymentId, orderId }) {
  const [updatedCount] = await Wallet.update(
    {
      status: "Approved",
      transid: String(paymentId),
      description: `Cashfree payment ${paymentId} (order ${orderId})`
    },
    {
      where: {
        id: walletEntry.id,
        status: { [Op.ne]: "Approved" }
      }
    }
  );

  const fresh = await Wallet.findByPk(walletEntry.id);
  if (!updatedCount) {
    return { already: true, walletEntry: fresh };
  }

  const user = await User.findByPk(walletEntry.user_id);
  if (!user) {
    await walletEntry.update({
      status: walletEntry.status,
      transid: walletEntry.transid,
      description: walletEntry.description
    });
    throw new Error("User not found");
  }

  const creditAmount = Number(walletEntry.amount) || 0;
  const newBalance = (Number(user.walletBalance) || 0) + creditAmount;
  try {
    await user.update({ walletBalance: newBalance });
  } catch (creditErr) {
    await walletEntry.update({
      status: walletEntry.status,
      transid: walletEntry.transid,
      description: walletEntry.description
    });
    throw creditErr;
  }

  return { already: false, walletEntry: fresh, walletBalance: newBalance };
}

async function findPendingCashfreeEntry({ orderId, walletId }) {
  if (walletId) {
    const byId = await Wallet.findByPk(walletId);
    if (byId) return byId;
  }
  if (!orderId) return null;
  return Wallet.findOne({
    where: {
      [Op.or]: [{ referenceId: orderId }, { transid: orderId }]
    }
  });
}

// --- Cashfree return/notify URL helpers ----------------------------------
// The API runs behind a TLS-terminating reverse proxy (nginx), so req.protocol
// can report "http" and req.get("host") the internal upstream. Prefer the
// standard forwarded headers, then fall back to Express' own values.
function requestOrigin(req) {
  const host =
    String(req.headers["x-forwarded-host"] || "").split(",")[0].trim() ||
    req.get("host") ||
    "";
  if (!host) return "";
  const isLocal = /^(localhost|127\.|0\.0\.0\.0)/i.test(host);
  let proto =
    String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim() ||
    req.protocol ||
    "";
  // Cashfree only accepts https notify_url in production — the public API is
  // https behind the proxy, so upgrade anything non-local to https.
  if (!isLocal && proto !== "https") proto = "https";
  if (!proto) proto = isLocal ? "http" : "https";
  return `${proto}://${host}`;
}

// Only absolute http(s) URLs are accepted for payment redirects.
function safeHttpUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

// Where Cashfree sends the payer back to AFTER payment. The frontend posts its
// own origin (correct for whichever env it runs on) — trust that first so UAT
// users are never bounced to a hardcoded production domain they cannot reach.
function resolveReturnUrl(req) {
  const fromBody = safeHttpUrl(req.body && req.body.return_url);
  if (fromBody) return fromBody;
  const fromEnv = safeHttpUrl(process.env.CASHFREE_RETURN_URL);
  if (fromEnv) return fromEnv;
  const referer = safeHttpUrl(req.get("referer"));
  if (referer) {
    return `${new URL(referer).origin}/dashboard/wallet-recharge?order_id={order_id}`;
  }
  return undefined;
}

/**
 * Cashfree: create order for wallet recharge
 * Body: { user_id, amount }
 */
router.post("/cashfree/create-order", async (req, res) => {
  try {
    const { user_id, amount } = req.body;

    if (!user_id || !amount || !Number.isFinite(Number(amount)) || Number(amount) < 100) {
      return res.status(400).json({
        success: false,
        message: "Minimum amount to add is ₹100"
      });
    }

    const user = await User.findByPk(user_id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (!isConfigured()) {
      return res.status(500).json({
        success: false,
        message: "Cashfree is not configured on the server"
      });
    }

    const orderId = `wallet_${user_id}_${Date.now()}`;
    // Return the payer to THEIR OWN app origin (frontend-supplied), not a
    // hardcoded production URL the running environment cannot reach.
    const returnUrl = resolveReturnUrl(req);
    // Webhook must hit THIS server / THIS database (UAT vs prod), so derive it
    // from the incoming request instead of a hardcoded production endpoint.
    const origin = requestOrigin(req);
    const notifyUrl =
      safeHttpUrl(process.env.CASHFREE_NOTIFY_URL) ||
      (origin ? `${origin}/api/wallets/cashfree/webhook` : undefined);

    const order = await createOrder({
      orderId,
      amount,
      customer: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || user.mobile
      },
      returnUrl,
      notifyUrl
    });

    if (!order?.payment_session_id) {
      return res.status(500).json({
        success: false,
        message: "Cashfree did not return a payment session"
      });
    }

    const walletEntry = await Wallet.create({
      user_id,
      amount: Number(amount),
      transid: order.order_id || orderId,
      referenceId: order.order_id || orderId,
      status: "pending_payment",
      description: `Cashfree order ${order.order_id || orderId}`
    });

    return res.json({
      success: true,
      orderId: order.order_id || orderId,
      paymentSessionId: order.payment_session_id,
      mode: getMode(),
      amount: Number(amount),
      currency: "INR",
      walletId: walletEntry.id
    });
  } catch (err) {
    console.error("Cashfree create-order error:", err?.response?.data || err);
    return res.status(500).json({
      success: false,
      message: cashfreeErrorMessage(err, "Failed to create Cashfree order")
    });
  }
});

/**
 * Cashfree: confirm payment with Cashfree and credit wallet
 * Body: { order_id, walletId?, user_id? }
 */
router.post("/cashfree/verify", async (req, res) => {
  try {
    const { order_id, walletId, user_id } = req.body;

    if (!order_id && !walletId) {
      return res.status(400).json({
        success: false,
        message: "order_id is required"
      });
    }

    const walletEntry = await findPendingCashfreeEntry({ orderId: order_id, walletId });
    if (!walletEntry) {
      return res.status(404).json({
        success: false,
        message: "Wallet recharge entry not found"
      });
    }

    if (user_id && Number(walletEntry.user_id) !== Number(user_id)) {
      return res.status(403).json({
        success: false,
        message: "This payment does not belong to the current user"
      });
    }

    if (walletEntry.status === "Approved") {
      return res.json({
        success: true,
        message: "Payment already verified",
        data: walletEntry
      });
    }

    const cashfreeOrderId = walletEntry.referenceId || order_id || walletEntry.transid;
    const payment = await getSuccessfulPayment(cashfreeOrderId);
    if (!payment) {
      return res.status(400).json({
        success: false,
        message: "Payment is not completed yet"
      });
    }

    const paidAmount = Number(payment.payment_amount);
    const expectedAmount = Number(walletEntry.amount);
    if (!Number.isFinite(paidAmount) || Math.abs(paidAmount - expectedAmount) > 0.01) {
      return res.status(400).json({
        success: false,
        message: "Paid amount does not match the recharge amount"
      });
    }

    const result = await approveCashfreePayment(walletEntry, {
      paymentId: payment.cf_payment_id,
      orderId: cashfreeOrderId
    });

    return res.json({
      success: true,
      message: result.already ? "Payment already verified" : "Wallet recharged successfully",
      data: result.walletEntry,
      walletBalance: result.walletBalance
    });
  } catch (err) {
    console.error("Cashfree verify error:", err?.response?.data || err);
    return res.status(500).json({
      success: false,
      message: cashfreeErrorMessage(err, "Payment verification failed")
    });
  }
});

/**
 * Cashfree webhook (set this URL in the Cashfree dashboard)
 */
router.post("/cashfree/webhook", async (req, res) => {
  try {
    const timestamp = req.headers["x-webhook-timestamp"];
    const signature = req.headers["x-webhook-signature"];
    const valid = verifyWebhookSignature(req.rawBody, timestamp, signature);

    if (!valid) {
      return res.status(401).json({ success: false, message: "Invalid webhook signature" });
    }

    const eventType = req.body?.type;
    const orderId = req.body?.data?.order?.order_id;
    const paymentStatus = req.body?.data?.payment?.payment_status;

    if (eventType === "PAYMENT_SUCCESS_WEBHOOK" && orderId && paymentStatus === "SUCCESS") {
      const walletEntry = await findPendingCashfreeEntry({ orderId });
      if (walletEntry && walletEntry.status !== "Approved") {
        const payment = await getSuccessfulPayment(orderId);
        if (payment) {
          const paidAmount = Number(payment.payment_amount);
          const expectedAmount = Number(walletEntry.amount);
          if (Number.isFinite(paidAmount) && Math.abs(paidAmount - expectedAmount) <= 0.01) {
            await approveCashfreePayment(walletEntry, {
              paymentId: payment.cf_payment_id,
              orderId
            });
          }
        }
      }
    }

    return res.json({ status: "ok" });
  } catch (err) {
    console.error("Cashfree webhook error:", err?.response?.data || err);
    return res.status(500).json({ status: "error" });
  }
});

// Get All
router.get("/", async (req, res) => {
  try {
    const data = await Wallet.findAll({
      include: [
        {
          model: require("../models/User"),
          as: "user",
          attributes: ["id", "name", "email"]
        }
      ],
      order: [["id", "DESC"]]
    });

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get By User ID
router.get("/users/:id", async (req, res) => {
  try {
    const data = await Wallet.findAll({
      include: [
        {
          model: require("../models/User"),
          as: "user",
          attributes: ["id", "name", "email"]
        }
      ],
      where: { user_id: req.params.id },
      order: [["id", "DESC"]]
    });

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Status (admin approve/reject for manual UPI)
router.put("/status/:id", async (req, res) => {
  try {
    const { status } = req.body;

    await Wallet.update({ status }, { where: { id: req.params.id } });

    if (status === "Approved") {
      const walletEntry = await Wallet.findByPk(req.params.id);
      const user = await User.findByPk(walletEntry.user_id);
      const newBalance = user.walletBalance + walletEntry.amount;
      await User.update(
        { walletBalance: newBalance },
        { where: { id: walletEntry.user_id } }
      );
    }

    res.json({ success: true, message: "Status updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete
router.delete("/:id", async (req, res) => {
  try {
    await Wallet.destroy({ where: { id: req.params.id } });
    res.json({ success: true, message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
