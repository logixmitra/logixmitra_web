const { Op } = require('sequelize');
const Seller = require('../models/Seller');
const { User, Wallet } = require('../models');
class SellerService {
  // Create new seller
  async createSeller(sellerData) {
    try {
      // Check if email already exists
      const existingSeller = await Seller.findOne({
        where: { email: sellerData.email }
      });

      if (existingSeller) {
        throw new Error('Seller with this email already exists');
      }

      const seller = await Seller.create({
        ...sellerData,
        joinedAt: new Date().toISOString().split('T')[0]
      });

      return seller;
    } catch (error) {
      throw error;
    }
  }

  // Get all sellers with filters
  async getAllSellers(filters = {}) {
    const where = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.kycStatus) {
      where.kycStatus = filters.kycStatus;
    }

    if (filters.riskCategory) {
      where.riskCategory = filters.riskCategory;
    }

    if (filters.search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${filters.search}%` } },
        { email: { [Op.iLike]: `%${filters.search}%` } },
        { company: { [Op.iLike]: `%${filters.search}%` } }
      ];
    }

    if (filters.minPerformance) {
      where.performanceScore = {
        [Op.gte]: filters.minPerformance
      };
    }

    if (filters.maxRtoRate) {
      where.rtoRate = {
        [Op.lte]: filters.maxRtoRate
      };
    }

    const sellers = await User.findAll({
      where,
      order: [['createdAt', 'DESC']]
    });

    return sellers;
  }



  // Get seller by ID
  async getSellerById(id) {
    const seller = await User.findByPk(id);
console.log(seller)
    if (!seller) {
      throw new Error('Seller not found');
    }

    return seller;
  }

  // Update seller
  async updateSeller(id, sellerData) {
    const seller = await this.getSellerById(id);

    // Check email uniqueness if email is being updated
    if (sellerData.email && sellerData.email !== seller.email) {
      const existingSeller = await User.findOne({
        where: { email: sellerData.email }
      });

      if (existingSeller) {
        throw new Error('Seller with this email already exists');
      }
    }

    await seller.update(sellerData);
    return seller;
  }

  // Delete seller
  async deleteSeller(id) {
    const seller = await this.getSellerById(id);
         await User.update(
    { status: 'blocked' },
    { where: { id } }   // ✅ MUST
  );

    return { message: 'Seller deleted successfully' };
  }

  // Update seller status
  async updateStatus(id, status) {
    const seller = await this.getSellerById(id);
    await User.update({ status });
    
    return seller;
  }

  // Update KYC status
  async updateKycStatus(id, kycStatus) {
    const seller = await this.getSellerById(id);
    await seller.update({ kycStatus });
    return seller;
  }

  // Approve seller (set status to active and KYC to verified)
  async approveSeller(id) {
    const seller = await this.getSellerById(id);
    await seller.update({
      status: 'active',
      kycStatus: 'verified'
    });
    return seller;
  }

  // Update wallet balance
  async updateWallet(id, amount, type) {
    const seller = await this.getSellerById(id);
    
    let newBalance;
    if (type === 'credit') {
      newBalance = seller.walletBalance + amount;
    } else if (type === 'debit') {
      if (seller.walletBalance < amount) {
        throw new Error('Insufficient wallet balance');
      }
      newBalance = seller.walletBalance - amount;
    } else {
      throw new Error('Invalid transaction type');
    }

    await seller.update({ walletBalance: newBalance });
    try {
      await Wallet.create({
        user_id: seller.id,
        transid: `TXN-${Date.now()}`,
        amount,
        status: type === 'credit' ? 'Credited' : 'Debited',
        description: type === 'credit' ? 'Balance Credit' : 'Balance Debit',
      });
    } catch (walletErr) {
      console.error('Failed to create wallet ledger entry:', walletErr.message);
    }
    return seller;
  }

  // Update performance metrics
  async updatePerformanceMetrics(id, metrics) {
    const seller = await this.getSellerById(id);
    
    const updates = {};
    
    if (metrics.totalOrders !== undefined) {
      updates.totalOrders = metrics.totalOrders;
    }
    
    if (metrics.revenue !== undefined) {
      updates.revenue = metrics.revenue;
    }
    
    if (metrics.performanceScore !== undefined) {
      updates.performanceScore = Math.min(100, Math.max(0, metrics.performanceScore));
    }
    
    if (metrics.rtoRate !== undefined) {
      updates.rtoRate = Math.min(100, Math.max(0, metrics.rtoRate));
    }

    // Auto-calculate risk category based on performance
    if (metrics.performanceScore !== undefined || metrics.rtoRate !== undefined) {
      const currentScore = metrics.performanceScore ?? seller.performanceScore;
      const currentRto = metrics.rtoRate ?? seller.rtoRate;
      
      if (currentScore >= 80 && currentRto <= 5) {
        updates.riskCategory = 'low';
      } else if (currentScore >= 50 && currentRto <= 10) {
        updates.riskCategory = 'medium';
      } else {
        updates.riskCategory = 'high';
      }
    }

    await seller.update(updates);
    return seller;
  }

  // Get seller statistics
  async getSellerStats() {
    const total = await Seller.count();
    
    const active = await Seller.count({
      where: { status: 'active' }
    });

    const blocked = await Seller.count({
      where: { status: 'blocked' }
    });

    const pending = await Seller.count({
      where: { status: 'pending' }
    });

    const kycVerified = await Seller.count({
      where: { kycStatus: 'verified' }
    });

    const kycPending = await Seller.count({
      where: { kycStatus: 'pending' }
    });

    const kycRejected = await Seller.count({
      where: { kycStatus: 'rejected' }
    });

    const lowRisk = await Seller.count({
      where: { riskCategory: 'low' }
    });

    const mediumRisk = await Seller.count({
      where: { riskCategory: 'medium' }
    });

    const highRisk = await Seller.count({
      where: { riskCategory: 'high' }
    });

    // Calculate total wallet balance
    const walletBalanceResult = await Seller.findAll({
      attributes: [
        [Seller.sequelize.fn('SUM', Seller.sequelize.col('walletBalance')), 'totalWalletBalance']
      ],
      raw: true
    });
    const totalWalletBalance = walletBalanceResult[0].totalWalletBalance || 0;

    // Get subscription breakdown
    const subscriptionStats = await Seller.findAll({
      attributes: [
        'subscription',
        [Seller.sequelize.fn('COUNT', Seller.sequelize.col('subscription')), 'count']
      ],
      group: ['subscription']
    });

    return {
      total,
      active,
      blocked,
      pending,
      kyc: {
        verified: kycVerified,
        pending: kycPending,
        rejected: kycRejected
      },
      risk: {
        low: lowRisk,
        medium: mediumRisk,
        high: highRisk
      },
      totalWalletBalance,
      subscriptions: subscriptionStats
    };
  }

  // Bulk import sellers
  async bulkImport(sellersData) {
    const results = {
      success: [],
      failed: []
    };

    for (const sellerData of sellersData) {
      try {
        // Check for existing email
        const existing = await Seller.findOne({
          where: { email: sellerData.email }
        });

        if (existing) {
          results.failed.push({
            data: sellerData,
            error: 'Email already exists'
          });
          continue;
        }

        const seller = await Seller.create({
          ...sellerData,
          joinedAt: new Date().toISOString().split('T')[0]
        });

        results.success.push(seller);
      } catch (error) {
        results.failed.push({
          data: sellerData,
          error: error.message
        });
      }
    }

    return results;
  }
}

module.exports = new SellerService();
