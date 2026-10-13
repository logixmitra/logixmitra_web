const axios = require("axios");
const crypto = require("crypto");
require("dotenv").config();

const API_VERSION = "2025-01-01";

function getConfig() {
  const clientId = process.env.CASHFREE_CLIENT_ID;
  const clientSecret = process.env.CASHFREE_CLIENT_SECRET;
  const env = String(process.env.CASHFREE_ENV || "sandbox").toLowerCase();
  const mode = env === "production" ? "production" : "sandbox";
  const baseUrl =
    mode === "production"
      ? "https://api.cashfree.com/pg"
      : "https://sandbox.cashfree.com/pg";

  return { clientId, clientSecret, mode, baseUrl };
}

function assertConfigured() {
  const { clientId, clientSecret } = getConfig();
  if (!clientId || !clientSecret) {
    throw new Error(
      "Cashfree keys not configured. Set CASHFREE_CLIENT_ID and CASHFREE_CLIENT_SECRET in .env"
    );
  }
}

function headers() {
  const { clientId, clientSecret } = getConfig();
  return {
    "Content-Type": "application/json",
    "x-api-version": API_VERSION,
    "x-client-id": clientId,
    "x-client-secret": clientSecret
  };
}

function isConfigured() {
  const { clientId, clientSecret } = getConfig();
  return Boolean(clientId && clientSecret);
}

function getMode() {
  return getConfig().mode;
}

function normalizePhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length < 10) return "";
  return digits.slice(-10);
}

async function createOrder({
  orderId,
  amount,
  customer,
  returnUrl,
  notifyUrl
}) {
  assertConfigured();

  const orderAmount = Math.round(Number(amount) * 100) / 100;
  if (!orderAmount || orderAmount < 100) {
    throw new Error("Minimum recharge amount is ₹100");
  }

  const phone = normalizePhone(customer?.phone);
  if (!phone) {
    throw new Error(
      "A valid 10-digit mobile number is required on the user profile for Cashfree"
    );
  }

  const payload = {
    order_id: orderId,
    order_amount: orderAmount,
    order_currency: "INR",
    customer_details: {
      customer_id: String(customer.id),
      customer_name: customer.name || "Customer",
      ...(customer.email ? { customer_email: customer.email } : {}),
      customer_phone: phone
    },
    order_meta: {
      return_url: returnUrl,
      notify_url: notifyUrl || undefined
    },
    order_note: "Wallet recharge"
  };

  const { baseUrl } = getConfig();
  const response = await axios.post(`${baseUrl}/orders`, payload, { headers: headers() });
  return response.data;
}

async function getOrderPayments(orderId) {
  assertConfigured();
  const { baseUrl } = getConfig();
  const response = await axios.get(`${baseUrl}/orders/${encodeURIComponent(orderId)}/payments`, {
    headers: headers()
  });
  return Array.isArray(response.data) ? response.data : [];
}

async function getSuccessfulPayment(orderId) {
  const payments = await getOrderPayments(orderId);
  return (
    payments.find((payment) => String(payment.payment_status).toUpperCase() === "SUCCESS") ||
    null
  );
}

function verifyWebhookSignature(rawBody, timestamp, signature) {
  const { clientSecret } = getConfig();
  if (!clientSecret || !rawBody || !timestamp || !signature) {
    return false;
  }

  const body = Buffer.isBuffer(rawBody) ? rawBody.toString("utf8") : String(rawBody);
  const expected = crypto
    .createHmac("sha256", clientSecret)
    .update(`${timestamp}${body}`)
    .digest("base64");

  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(String(signature));
  if (expectedBuf.length !== actualBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

function cashfreeErrorMessage(err, fallback) {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.error?.message ||
    err?.message ||
    fallback
  );
}

module.exports = {
  isConfigured,
  getMode,
  normalizePhone,
  createOrder,
  getSuccessfulPayment,
  verifyWebhookSignature,
  cashfreeErrorMessage
};
