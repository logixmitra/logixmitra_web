const sellerService = require('../services/sellerService');
const { validationResult } = require('express-validator');
const { User } = require('../models');

class SellerController {
  // Create seller
  


async createSeller(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

 const {
      name,
      email,
      password,
      roleId,
      mobile,
      company,
      phone,
      gst,
      address,
      status,
      kycStatus,
      riskCategory,
      subscription
    } = req.body;

      //const seller = await sellerService.createSeller(req.body);
       const existing = await User.findOne({ where: { email } });

    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Seller with this email already exists'
      });
    }

    // 2. Create seller (User model)
    const seller = await User.create({
      name,
      email,
      password, // ✅ auto hashed via hook
      roleId,
      mobile,
      company,
      phone,
      gst,
      address,
      status: status || 'active',
      kycStatus: kycStatus || 'pending',
      riskCategory: riskCategory || 'low',
      subscription: subscription || 'Trial'
    });

res.status(201).json({
        success: true,
        data: seller
      });
    } catch (error) {
      console.error('Create seller error:', error);
      
      if (error.message === 'Seller with this email already exists') {
        return res.status(409).json({
          success: false,
          error: error.message
        });
      }

      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }







  async getAllSellers(req, res) {
    try {
      const filters = {
        status: req.query.status,
        kycStatus: req.query.kycStatus,
        riskCategory: req.query.riskCategory,
        search: req.query.search,
        minPerformance: req.query.minPerformance ? parseFloat(req.query.minPerformance) : undefined,
        maxRtoRate: req.query.maxRtoRate ? parseFloat(req.query.maxRtoRate) : undefined
      };

      const sellers = await sellerService.getAllSellers(filters);
      
      res.json({
        success: true,
        count: sellers.length,
        data: sellers
      });
    } catch (error) {
      console.error('Get sellers error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }










  // Get seller by ID
  async getSellerById(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      if (!req.user?.id) {
        return res.status(401).json({
          success: false,
          error: 'Not authorized',
        });
      }

      const roleName = String(req.user?.role?.name || req.user?.role || '').toLowerCase();
      const isAdmin = roleName === 'admin' || roleName === 'super admin';
      const requestedId = String(req.params.id || '');
      const selfId = String(req.user.id);

      if (!isAdmin && selfId !== requestedId) {
        return res.status(403).json({
          success: false,
          error: 'You can only view your own seller profile',
        });
      }

      const seller = await sellerService.getSellerById(req.params.id);
      
      res.json({
        success: true,
        data: seller
      });
    } catch (error) {
      console.error('Get seller error:', error);
      
      if (error.message === 'Seller not found') {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }

      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Update seller
  async updateSeller(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const seller = await sellerService.updateSeller(req.params.id, req.body);
      
      res.json({
        success: true,
        data: seller
      });
    } catch (error) {
      console.error('Update seller error:', error);
      
      if (error.message === 'Seller not found') {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }

      if (error.message === 'Seller with this email already exists') {
        return res.status(409).json({
          success: false,
          error: error.message
        });
      }

      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Delete seller
  async deleteSeller(req, res) {
    try {
      const result = await sellerService.deleteSeller(req.params.id);
      
      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      console.error('Delete seller error:', error);
      
      if (error.message === 'Seller not found') {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }

      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Update seller status
  async updateStatus(req, res) {
    try {
      const { status } = req.body;
      const seller = await sellerService.updateStatus(req.params.id, status);
      
      res.json({
        success: true,
        data: seller
      });
    } catch (error) {
      console.error('Update status error:', error);
      
      if (error.message === 'Seller not found') {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }

      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Update KYC status
  async updateKycStatus(req, res) {
    try {
      const { kycStatus } = req.body;
      const seller = await sellerService.updateKycStatus(req.params.id, kycStatus);
      
      res.json({
        success: true,
        data: seller
      });
    } catch (error) {
      console.error('Update KYC error:', error);
      
      if (error.message === 'Seller not found') {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }

      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Approve seller
  async approveSeller(req, res) {
    try {
      const seller = await sellerService.approveSeller(req.params.id);
      
      res.json({
        success: true,
        data: seller
      });
    } catch (error) {
      console.error('Approve seller error:', error);
      
      if (error.message === 'Seller not found') {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }

      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Update wallet
  async updateWallet(req, res) {
    try {
      const { amount, type } = req.body;
      const seller = await sellerService.updateWallet(req.params.id, amount, type);
      
      res.json({
        success: true,
        data: seller
      });
    } catch (error) {
      console.error('Update wallet error:', error);
      
      if (error.message === 'Seller not found') {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }

      if (error.message === 'Insufficient wallet balance') {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }

      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Update performance metrics
  async updatePerformanceMetrics(req, res) {
    try {
      const seller = await sellerService.updatePerformanceMetrics(req.params.id, req.body);
      
      res.json({
        success: true,
        data: seller
      });
    } catch (error) {
      console.error('Update performance error:', error);
      
      if (error.message === 'Seller not found') {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }

      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Get seller statistics
  async getSellerStats(req, res) {
    try {
      const stats = await sellerService.getSellerStats();
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Get stats error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Bulk import sellers
  async bulkImport(req, res) {
    try {
      const { sellers } = req.body;
      
      if (!Array.isArray(sellers) || sellers.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Please provide an array of sellers'
        });
      }

      const results = await sellerService.bulkImport(sellers);
      
      res.json({
        success: true,
        data: results
      });
    } catch (error) {
      console.error('Bulk import error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new SellerController();
