const { v4: uuidv4 } = require('uuid');
const { Order } = require('../models');

async function generateUniqueReferenceId(options = {}) {
  const { transaction } = options;
  for (let attempts = 0; attempts < 8; attempts += 1) {
    const stamp = Date.now().toString(36).toUpperCase().slice(-6);
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    const referenceId = `REF-${stamp}${rand}`;
    const existing = await Order.findOne({ where: { referenceId }, attributes: ['id'], transaction });
    if (!existing) return referenceId;
  }

  return `REF-${uuidv4().replace(/-/g, '').slice(0, 12).toUpperCase()}`;
}

/**
 * Returns the candidate reference if it is non-empty and not already used;
 * otherwise generates a fresh unique one. Never returns null/empty string.
 */
async function resolveUniqueReferenceId(candidate, options = {}) {
  const { transaction, excludeOrderId } = options;
  const trimmed = candidate == null ? '' : String(candidate).trim();

  if (trimmed) {
    const where = { referenceId: trimmed };
    const existing = await Order.findOne({ where, attributes: ['id'], transaction });
    if (!existing || (excludeOrderId && existing.id === excludeOrderId)) {
      return trimmed;
    }
  }

  return generateUniqueReferenceId({ transaction });
}

module.exports = {
  generateUniqueReferenceId,
  resolveUniqueReferenceId,
};
