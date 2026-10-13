






const { Integration } = require('../models');
const { validationResult } = require('express-validator');
const axios = require('axios');

class IntegrationController {
  constructor() {
    // Explicitly bind 'this' for every method used as a route
    this.testConnection = this.testConnection.bind(this);
    this.create = this.create.bind(this);
    this.update = this.update.bind(this);
    this.getAll = this.getAll.bind(this);
  }

  // 🔹 Helper: Validate credentials
  validateCredentials(platform, credentials) {
    if (!credentials) return false;

    switch (platform) {
      case 'Amazon':
        return !!(credentials.sellerId && credentials.accessToken);

      case 'Shopify': {
        // Client ID + Client Secret + store URL (client_credentials grant)
        const clientId = credentials.clientid || credentials.clientId;
        const clientSecret = credentials.accessToken || credentials.clientSecret;
        return !!(credentials.storeUrl && clientId && clientSecret);
      }

      case 'WooCommerce':
        return !!(
          credentials.storeUrl &&
          credentials.apiKey &&
          credentials.apiSecret
        );

      case 'Custom':
        return !!credentials.storeUrl;

      default:
        return false;
    }
  }

  // 🔹 Get all integrations
  async getAll(req, res) {
    try {
      const integrations = await Integration.findAll({
        order: [['createdAt', 'DESC']]
      });

      res.json({
        success: true,
        data: integrations
      });
    } catch (error) {
      console.error('Error fetching integrations:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch integrations',
        error: error.message
      });
    }
  }

  // 🔹 Get by ID
  async getById(req, res) {
    try {
      const { id } = req.params;

      const integration = await Integration.findByPk(id);

      if (!integration) {
        return res.status(404).json({
          success: false,
          message: 'Integration not found'
        });
      }

      res.json({
        success: true,
        data: integration
      });
    } catch (error) {
      console.error('Error fetching integration:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch integration',
        error: error.message
      });
    }
  }

  // 🔹 Create
 


 async create(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const {user_id, type, name, credentials, settings, isActive } = req.body;

      console.log('Incoming Body:', req.body);

      const isValid = this.validateCredentials(type, credentials);

      if (!isValid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid credentials for the selected platform'
        });
      }

      const integration = await Integration.create({
        user_id,       
        type,
        name,
        credentials,
        settings: settings || {},
        isActive: isActive === true || isActive === 'true',
      });

      res.status(201).json({
        success: true,
        data: integration
      });

    } catch (error) {
      console.error('Error creating integration:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create integration',
        error: error.message
      });
    }
  }

  // 🔹 Update
 /* async update(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const integration = await Integration.findByPk(id);

      if (!integration) {
        return res.status(404).json({
          success: false,
          message: 'Integration not found'
        });
      }

      if (updates.credentials) {
        const type = updates.type || integration.type;
        const isValid = this.validateCredentials(type, updates.credentials);

        if (!isValid) {
          return res.status(400).json({
            success: false,
            message: 'Invalid credentials for the selected platform'
          });
        }
      }

      await integration.update(updates);

      res.json({
        success: true,
        data: integration
      });

    } catch (error) {
      console.error('Error updating integration:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update integration',
        error: error.message 
      });
    }
  }
*/

async update(req, res) {
  try {
    const { id } = req.params;
    let updates = { ...req.body };

    const integration = await Integration.findByPk(id);

    if (!integration) {
      return res.status(404).json({
        success: false,
        message: 'Integration not found'
      });
    }

    if (updates.lastSync) {
      const date = new Date(updates.lastSync);

      if (isNaN(date.getTime())) {
        updates.lastSync = null;
      } else {
        updates.lastSync = date;
      }
    }

    if (updates.credentials) {
      const type = updates.type || integration.type;
      const isValid = this.validateCredentials(type, updates.credentials);

      if (!isValid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid credentials for the selected platform'
        });
      }
    }

    Object.keys(updates).forEach(key => {
      if (updates[key] === undefined) {
        delete updates[key];
      }
    });

    await integration.update(updates);

    res.json({
      success: true,
      data: integration
    });

  } catch (error) {
    console.error('Error updating integration:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to update integration',
      error: error.message
    });
  }
}


  // 🔹 Delete
  async delete(req, res) {
    try {
      const { id } = req.params;

      const integration = await Integration.findByPk(id);

      if (!integration) {
        return res.status(404).json({
          success: false,
          message: 'Integration not found'
        });
      }

      await integration.destroy();

      res.json({
        success: true,
        message: 'Integration deleted successfully'
      });

    } catch (error) {
      console.error('Error deleting integration:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete integration',
        error: error.message
      });
    }
  }




  
  // 🔹 Test Connection
  async testConnection(req, res) {
    try {
      const { platform, credentials } = req.body;
console.log(req.body)
      const isValid = this.validateCredentials(platform, credentials);

      if (!isValid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid credentials format'
        });
      }

      let connected = false;

      switch (platform) {
        case 'Amazon':
          connected = await this.testAmazonConnection(credentials);
          break;
        case 'Shopify':
          connected = await this.testShopifyConnection(credentials);
          break;
        case 'WooCommerce':
          connected = await this.testWooCommerceConnection(credentials);
          break;
        case 'Custom':
          connected = await this.testCustomConnection(credentials);
          break;
        default:
          return res.status(400).json({
            success: false,
            message: 'Unsupported platform'
          });
      }

      res.json({
        success: connected,
        message: connected ? 'Connection successful' : 'Connection failed'
      });

    } catch (error) {
      console.error('Error testing connection:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to test connection',
        error: error.message
      });
    }
  }

  // 🔹 Amazon
  async testAmazonConnection(credentials) {
    try {
      console.log('Testing Amazon connection with:', credentials.sellerId);
      return true;
    } catch (error) {
      console.error('Amazon connection test failed:', error.message);
      return false;
    }
  }

  async testShopifyConnection(credentials) {
    try {
      const shop = String(credentials.storeUrl || '')
        .trim()
        .replace(/^https?:\/\//i, '')
        .replace(/\/+$/, '')
        .replace(/\.myshopify\.com.*/i, '')
        .split('/')[0]
        .replace(/\s+/g, '');

      const clientId = credentials.clientid || credentials.clientId;
      const clientSecret = credentials.accessToken || credentials.clientSecret;

      if (!shop || !clientId || !clientSecret) {
        throw new Error('Missing store URL, Client ID, or Client Secret');
      }

      const tokenResponse = await fetch(
        `https://${shop}.myshopify.com/admin/oauth/access_token`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: clientId,
            client_secret: clientSecret,
          }),
        }
      );

      const tokenPayload = await tokenResponse.json().catch(() => ({}));
      if (!tokenResponse.ok || !tokenPayload.access_token) {
        const detail = tokenPayload.error_description || tokenPayload.error || tokenResponse.statusText;
        throw new Error(`Token request failed: ${detail}`);
      }

      // Verify token can reach Admin API
      const shopResponse = await fetch(
        `https://${shop}.myshopify.com/admin/api/2026-01/shop.json`,
        {
          headers: {
            'X-Shopify-Access-Token': tokenPayload.access_token,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!shopResponse.ok) {
        throw new Error(`Shop API check failed: ${shopResponse.status}`);
      }

      return true;
    } catch (error) {
      console.error('Shopify connection test failed:', error.message);
      return false;
    }
  }

  async testWooCommerceConnection(credentials) {
    try {
      const storeUrl = credentials.storeUrl.replace(/\/$/, '');
      const auth = Buffer.from(
        `${credentials.apiKey}:${credentials.apiSecret}`
      ).toString('base64');

      const response = await axios.get(
        `${storeUrl}/wp-json/wc/v3/system_status`,
        {
          headers: {
            Authorization: `Basic ${auth}`
          },
          timeout: 10000
        }
      );

      return response.status === 200;
    } catch (error) {
      console.error('WooCommerce connection test failed:', error.message);
      return false;
    }
  }

  // 🔹 Custom API
  async testCustomConnection(credentials) {
    try {
      const response = await axios.get(credentials.storeUrl, {
        headers: {
          'X-API-Key': credentials.apiKey || '',
          'X-API-Secret': credentials.apiSecret || ''
        },
        timeout: 10000
      });

      return response.status === 200;
    } catch (error) {
      console.error('Custom API connection test failed:', error.message);
      return false;
    }
  }

  // 🔹 Sync Shopify Orders
  async syncShopifyOrders(req, res) {
    try {
      const { startDate, endDate } = req.query;
      
      const integration = await Integration.findOne({
        where: {
          type: 'Shopify',
          isActive: true
        }
      });

      if (!integration) {
        return res.status(400).json({
          success: false,
          message: 'Shopify integration is not configured or inactive'
        });
      }

      const orders = await this.fetchShopifyOrders(
        integration.credentials,
        startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        endDate ? new Date(endDate) : new Date()
      );

      // Update last sync time
      await integration.update({ lastSync: new Date() });

      res.json({
        success: true,
        data: orders,
        count: orders.length
      });
    } catch (error) {
      console.error('Sync Shopify orders error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to sync Shopify orders',
        error: error.message
      });
    }
  }

  // 🔹 Fetch Shopify Orders
  async fetchShopifyOrders(credentials, dateFrom, dateTo) {
    try {
      let storeUrl = credentials.storeUrl.replace(/\/$/, '');
      if (!storeUrl.startsWith('http://') && !storeUrl.startsWith('https://')) {
        storeUrl = 'https://' + storeUrl;
      }

      // Format dates for Shopify API
      const createdAtMin = dateFrom.toISOString();
      const createdAtMax = dateTo.toISOString();

      let allOrders = [];
      let pageInfo = null;
      let hasNextPage = true;

      while (hasNextPage) {
        let url = `${storeUrl}/admin/api/2024-01/orders.json?status=any&created_at_min=${createdAtMin}&created_at_max=${createdAtMax}&limit=250`;
        
        if (pageInfo) {
          url += `&page_info=${pageInfo}`;
        }

        const response = await axios.get(url, {
          headers: {
            'X-Shopify-Access-Token': credentials.accessToken
          }
        });

        const orders = response.data.orders;
        allOrders = allOrders.concat(orders);

        // Check for next page
        const linkHeader = response.headers.link;
        if (linkHeader && linkHeader.includes('rel="next"')) {
          const nextMatch = linkHeader.match(/<[^>]*page_info=([^>]*)>; rel="next"/);
          pageInfo = nextMatch ? nextMatch[1] : null;
          hasNextPage = !!pageInfo;
        } else {
          hasNextPage = false;
        }
      }

      // Transform orders to our format
      const transformedOrders = allOrders.map(order => this.transformShopifyOrder(order));
      
      console.log(`Fetched ${transformedOrders.length} Shopify orders`);
      return transformedOrders;
    } catch (error) {
      console.error('Error fetching Shopify orders:', error.message);
      if (error.response) {
        console.error('Shopify API error:', error.response.status, error.response.data);
      }
      throw new Error(`Failed to fetch Shopify orders: ${error.message}`);
    }
  }

  // 🔹 Transform Shopify Order to our format
  transformShopifyOrder(order) {
    const shippingAddress = order.shipping_address || {};
    const customer = order.customer || {};
    
    // Calculate total items count
    const totalItems = order.line_items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
    
    // Transform line items
    const maxWeight = (order.line_items || []).reduce((max, item) => {
      const w = item.grams ? Number(item.grams) / 1000 : 0;
      return w > max ? w : max;
    }, 0);

    const items = order.line_items?.map(item => {
      const taxLines = Array.isArray(item.tax_lines) ? item.tax_lines : [];
      const gstRate = taxLines.reduce((sum, tax) => {
        const raw = parseFloat(tax?.rate);
        if (!Number.isFinite(raw) || raw <= 0) return sum;
        return sum + (raw > 1 ? raw : raw * 100);
      }, 0);

      return {
        name: item.title || item.name || '',
        sku: item.sku || item.variant_sku || item.barcode || '',
        unitPrice: parseFloat(item.price) || 0,
        quantity: item.quantity || 1,
        gstRate: gstRate || 0,
        discount: parseFloat(item.total_discount) || 0,
        totalPrice: parseFloat(item.price) * (item.quantity || 1),
        height: 10,
        width: 10,
        length: 10,
        deadWeight: maxWeight || (item.grams ? item.grams / 1000 : null),
        volumetricWeight: null
      };
    }) || [];

    // Get order status
    let status = 'Pending';
    if (order.fulfillment_status === 'fulfilled') {
      status = 'Shipped';
    } else if (order.cancelled_at) {
      status = 'Cancelled';
    } else if (order.fulfillment_status === 'partial') {
      status = 'Shipped';
    }

    return {
      orderNumber: order.name || order.order_number?.toString() || order.id.toString(),
      customerName: shippingAddress.name || customer.first_name + ' ' + customer.last_name || customer.email || 'Unknown',
      customerPhone: shippingAddress.phone || '',
      customerEmail: customer.email || order.email || '',
      seller: 'Shopify Store',
      courier: order.shipping_lines?.[0]?.title || '-',
      status: status,
      amount: `₹${parseFloat(order.total_price).toFixed(2)}`,
      orderDate: order.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
      awb: order.tracking_number || '-',
      platform: 'Shopify',
      pincode: shippingAddress.zip || '',
      city: shippingAddress.city || '',
      state: shippingAddress.province || '',
      addressLine1: shippingAddress.address1 || '',
      addressLine2: shippingAddress.address2 || '',
      landmark: '',
      totalItems: totalItems,
      items: items
    };
  }
}

module.exports = new IntegrationController();
