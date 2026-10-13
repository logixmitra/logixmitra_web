// src/services/syncService.js
const axios = require('axios');
const { Order, OrderItem } = require('../models');
const { resolveUniqueReferenceId } = require('../utils/orderReference');

class SyncService {
  async testConnection(platform, credentials) {
    try {
      switch (platform) {
        case 'Amazon':
          return await this.testAmazonConnection(credentials);
        case 'Shopify':
          return await this.testShopifyConnection(credentials);
        case 'WooCommerce':
          return await this.testWooCommerceConnection(credentials);
        case 'Custom':
          return await this.testCustomConnection(credentials);
        default:
          return false;
      }
    } catch (error) {
      console.error('Test connection error:', error);
      return false;
    }
  }

  async testAmazonConnection(credentials) {
    try {
      // Implement Amazon SP-API test
      // This is a mock implementation
      return true;
    } catch (error) {
      return false;
    }
  }

  async testShopifyConnection(credentials) {
    try {
      const response = await axios.get(`${credentials.storeUrl}/admin/api/2023-04/shop.json`, {
        headers: {
          'X-Shopify-Access-Token': credentials.accessToken
        }
      });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  async testWooCommerceConnection(credentials) {
    try {
      const response = await axios.get(`${credentials.storeUrl}/wp-json/wc/v3/system_status`, {
        auth: {
          username: credentials.apiKey,
          password: credentials.apiSecret
        }
      });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  async testCustomConnection(credentials) {
    try {
      const response = await axios.get(credentials.storeUrl, {
        headers: {
          'Authorization': `Bearer ${credentials.apiKey}`
        }
      });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  async syncPlatform(platform, credentials, startDate, endDate) {
    try {
      let orders = [];

      switch (platform) {
        case 'Amazon':
          orders = await this.fetchAmazonOrders(credentials, startDate, endDate);
          break;
        case 'Shopify':
          orders = await this.fetchShopifyOrders(credentials, startDate, endDate);
          break;
        case 'WooCommerce':
          orders = await this.fetchWooCommerceOrders(credentials, startDate, endDate);
          break;
        case 'Custom':
          orders = await this.fetchCustomOrders(credentials, startDate, endDate);
          break;
      }

      // Save orders to database
      const savedOrders = await this.saveOrders(orders, platform);

      return {
        platform,
        success: true,
        ordersSynced: savedOrders.length
      };
    } catch (error) {
      console.error(`Sync error for ${platform}:`, error);
      return {
        platform,
        success: false,
        ordersSynced: 0,
        errors: [error.message]
      };
    }
  }

  async syncAllPlatforms(integrations) {
    const results = [];
    
    for (const integration of integrations) {
      const result = await this.syncPlatform(
        integration.type,
        integration.credentials,
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        new Date()
      );
      results.push(result);
    }

    return results;
  }

  async fetchShopifyOrders(credentials, startDate, endDate) {
    try {
      const response = await axios.get(
        `${credentials.storeUrl}/admin/api/2023-04/orders.json`,
        {
          headers: {
            'X-Shopify-Access-Token': credentials.accessToken
          },
          params: {
            created_at_min: startDate.toISOString(),
            created_at_max: endDate.toISOString(),
            status: 'any'
          }
        }
      );

      return response.data.orders.map(order => this.transformShopifyOrder(order));
    } catch (error) {
      console.error('Fetch Shopify orders error:', error);
      throw error;
    }
  }

  async fetchWooCommerceOrders(credentials, startDate, endDate) {
    try {
      const response = await axios.get(
        `${credentials.storeUrl}/wp-json/wc/v3/orders`,
        {
          auth: {
            username: credentials.apiKey,
            password: credentials.apiSecret
          },
          params: {
            after: startDate.toISOString(),
            before: endDate.toISOString(),
            per_page: 100
          }
        }
      );

      return response.data.map(order => this.transformWooCommerceOrder(order));
    } catch (error) {
      console.error('Fetch WooCommerce orders error:', error);
      throw error;
    }
  }

  async fetchAmazonOrders(credentials, startDate, endDate) {
    // Implement Amazon SP-API order fetching
    // This is a placeholder
    return [];
  }

  async fetchCustomOrders(credentials, startDate, endDate) {
    try {
      const response = await axios.get(credentials.storeUrl, {
        headers: {
          'Authorization': `Bearer ${credentials.apiKey}`
        },
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        }
      });

      return response.data.map(order => this.transformCustomOrder(order));
    } catch (error) {
      console.error('Fetch custom orders error:', error);
      throw error;
    }
  }

  transformShopifyOrder(shopifyOrder) {
    // Calculate volumetric weight (mock calculation)
    const volumetricWeight = 0; // You'd need to get dimensions from Shopify if available
    
    return {
      id: `SHOPIFY-${shopifyOrder.order_number}`,
      customer: `${shopifyOrder.customer.first_name} ${shopifyOrder.customer.last_name}`,
      email: shopifyOrder.customer.email,
      phone: shopifyOrder.customer.phone || shopifyOrder.shipping_address?.phone || '',
      seller: 'Shopify Store',
      courier: shopifyOrder.shipping_lines?.[0]?.title || '-',
      status: this.mapShopifyStatus(shopifyOrder.financial_status),
      amount: shopifyOrder.total_price,
      date: shopifyOrder.created_at.split('T')[0],
      awb: shopifyOrder.fulfillments?.[0]?.tracking_number || '-',
      platform: 'Shopify',
      pincode: shopifyOrder.shipping_address?.zip || '',
      city: shopifyOrder.shipping_address?.city || '',
      state: shopifyOrder.shipping_address?.province || '',
      address: `${shopifyOrder.shipping_address?.address1 || ''} ${shopifyOrder.shipping_address?.address2 || ''}`.trim(),
      country: shopifyOrder.shipping_address?.country || 'India',
      height: 0,
      width: 0,
      length: 0,
      deadWeight: 0,
      volumetricWeight,
      items: shopifyOrder.line_items.map(item => {
        const taxLines = Array.isArray(item.tax_lines) ? item.tax_lines : [];
        const gstRate = taxLines.reduce((sum, tax) => {
          const raw = parseFloat(tax?.rate);
          if (!Number.isFinite(raw) || raw <= 0) return sum;
          return sum + (raw > 1 ? raw : raw * 100);
        }, 0);

        return {
          name: item.title,
          unitPrice: parseFloat(item.price),
          quantity: item.quantity,
          gstRate: gstRate || 0,
          totalPrice: parseFloat(item.price) * item.quantity,
          sku: item.sku || item.variant_sku || item.barcode || ''
        };
      }),
      externalId: shopifyOrder.id.toString(),
      syncStatus: 'synced',
      lastSyncAt: new Date()
    };
  }

  transformWooCommerceOrder(wooOrder) {
    const volumetricWeight = 0;
    
    return {
      id: `WOO-${wooOrder.id}`,
      customer: wooOrder.billing.first_name + ' ' + wooOrder.billing.last_name,
      email: wooOrder.billing.email,
      phone: wooOrder.billing.phone,
      seller: 'WooCommerce Store',
      courier: wooOrder.shipping_lines?.[0]?.method_title || '-',
      status: this.mapWooCommerceStatus(wooOrder.status),
      amount: wooOrder.total,
      date: wooOrder.date_created.split('T')[0],
      awb: wooOrder.meta_data?.find(m => m.key === '_tracking_number')?.value || '-',
      platform: 'WooCommerce',
      pincode: wooOrder.shipping?.postcode || '',
      city: wooOrder.shipping?.city || '',
      state: wooOrder.shipping?.state || '',
      address: `${wooOrder.shipping?.address_1 || ''} ${wooOrder.shipping?.address_2 || ''}`.trim(),
      country: wooOrder.shipping?.country || 'India',
      height: 0,
      width: 0,
      length: 0,
      deadWeight: 0,
      volumetricWeight,
      items: wooOrder.line_items.map(item => ({
        name: item.name,
        unitPrice: parseFloat(item.price),
        quantity: item.quantity,
        gstRate: 18,
        totalPrice: parseFloat(item.total),
        sku: item.sku
      })),
      externalId: wooOrder.id.toString(),
      syncStatus: 'synced',
      lastSyncAt: new Date()
    };
  }

  transformCustomOrder(customOrder) {
    // Implement based on your custom API format
    return customOrder;
  }

  mapShopifyStatus(status) {
    const statusMap = {
      'pending': 'Pending',
      'paid': 'Shipped',
      'completed': 'Delivered',
      'refunded': 'RTO',
      'cancelled': 'Cancelled'
    };
    return statusMap[status] || 'Pending';
  }

  mapWooCommerceStatus(status) {
    const statusMap = {
      'pending': 'Pending',
      'processing': 'Shipped',
      'completed': 'Delivered',
      'refunded': 'RTO',
      'cancelled': 'Cancelled'
    };
    return statusMap[status] || 'Pending';
  }

  async saveOrders(orders, platform) {
    const savedOrders = [];

    for (const orderData of orders) {
      try {
        // Check if order already exists
        const existingOrder = await Order.findOne({
          where: { externalId: orderData.externalId }
        });

        if (existingOrder) {
          // Update existing order
          await existingOrder.update(orderData);
          
          // Update items
          await OrderItem.destroy({ where: { orderId: existingOrder.id } });
          await Promise.all(orderData.items.map(item => 
            OrderItem.create({ ...item, orderId: existingOrder.id })
          ));
          
          savedOrders.push(existingOrder);
        } else {
          // Create new order
          const referenceId = await resolveUniqueReferenceId(orderData.referenceId);
          const order = await Order.create({ ...orderData, referenceId });
          
          await Promise.all(orderData.items.map(item => 
            OrderItem.create({ ...item, orderId: order.id })
          ));
          
          savedOrders.push(order);
        }
      } catch (error) {
        console.error(`Error saving order ${orderData.id}:`, error);
      }
    }

    return savedOrders;
  }
}

module.exports = new SyncService();
