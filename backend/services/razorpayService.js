const Razorpay = require('razorpay');
const crypto = require('crypto');
require('dotenv').config();

let razorpayInstance = null;

function getRazorpay() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error('Razorpay keys not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env');
  }

  if (!razorpayInstance) {
    razorpayInstance = new Razorpay({
      key_id: keyId,
      key_secret: keySecret
    });
  }

  return razorpayInstance;
}

async function createOrder({ amount, receipt, notes = {} }) {
  const amountPaise = Math.round(Number(amount) * 100);

  if (!amountPaise || amountPaise < 100) {
    throw new Error('Minimum recharge amount is ₹1');
  }

  const order = await getRazorpay().orders.create({
    amount: amountPaise,
    currency: 'INR',
    receipt: receipt || `wallet_${Date.now()}`,
    notes,
    payment_capture: 1
  });

  return order;
}

function verifyPaymentSignature({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keySecret) {
    throw new Error('Razorpay secret not configured');
  }

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return false;
  }

  const body = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expected = crypto
    .createHmac('sha256', keySecret)
    .update(body)
    .digest('hex');

  return expected === razorpay_signature;
}

function getKeyId() {
  return process.env.RAZORPAY_KEY_ID || null;
}

module.exports = {
  createOrder,
  verifyPaymentSignature,
  getKeyId
};
