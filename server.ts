import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  seedInitialDataIfNeeded,
  getCategoriesFromDb,
  getProductsFromDb,
  getProductBySlugFromDb,
  saveProductToDb,
  deleteProductFromDb,
  clearAllProductsInDb,
  restoreSampleProductsInDb,
  createOrderInDb,
  getOrdersFromDb,
  getOrderByIdOrNumberFromDb,
  updateOrderStatusInDb,
  updateOrderAdminDetailsInDb,
  getStoreSettingsFromDb,
  updateStoreSettingsInDb,
} from './src/lib/supabaseServer';
import { Order } from './src/types';
import {
  sendWhatsAppOrderNotification,
  sendWhatsAppTestNotification,
} from './src/lib/whatsappServer';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(
    express.json({
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    })
  );

  // Disable caching for dynamic API responses
  app.use('/api', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
  });

  // Attempt to seed initial data to Supabase if connected
  seedInitialDataIfNeeded().catch((err) => console.warn('Data seeding notice:', err));

  // Default admin password as requested: arlinalbin
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'arlinalbin';

  // Admin Authentication Middleware
  const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    const adminPassHeader = req.headers['x-admin-password'];
    if (
      authHeader === 'Bearer piko_admin_session_valid' ||
      adminPassHeader === ADMIN_PASSWORD
    ) {
      next();
    } else {
      res.status(401).json({ error: 'Unauthorized admin access' });
    }
  };

  // API Routes
  app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
      return res.json({ success: true, token: 'piko_admin_session_valid' });
    } else {
      return res.status(401).json({ success: false, error: 'Incorrect admin password' });
    }
  });

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', store: "Piko's Little Treasures" });
  });

  /**
   * Store Settings Endpoints
   */
  app.get('/api/settings', async (req, res) => {
    try {
      const settings = await getStoreSettingsFromDb();
      res.json(settings);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch store settings', details: err?.message });
    }
  });

  app.put('/api/admin/settings', requireAdmin, async (req, res) => {
    try {
      const updated = await updateStoreSettingsInDb(req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to update store settings', details: err?.message });
    }
  });

  // 4. Admin WhatsApp Test Notification Endpoint
  app.post('/api/admin/test-whatsapp', requireAdmin, async (req, res) => {
    try {
      const { phone } = req.body || {};
      const result = await sendWhatsAppTestNotification(phone);
      if (result.success) {
        return res.json({
          success: true,
          message: 'WhatsApp test notification sent successfully!',
          messageId: result.messageId,
        });
      } else {
        return res.json({
          success: false,
          error: result.error || 'Failed to send WhatsApp test notification.',
          skipped: result.skipped,
        });
      }
    } catch (err: any) {
      console.warn('[Admin WhatsApp Test Notice]:', err?.message || err);
      res.json({ success: false, error: err?.message || 'Server error testing WhatsApp notification' });
    }
  });


  /**
   * Phase 1 Express APIs
   */

  // GET /api/settings (Public store settings including UPI details)
  app.get('/api/settings', async (req, res) => {
    try {
      const settings = await getStoreSettingsFromDb();
      res.json(settings);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch settings', details: err?.message });
    }
  });

  // PUT & POST /api/admin/settings (Protected admin update store settings)
  const handleUpdateSettings = async (req: express.Request, res: express.Response) => {
    try {
      const updated = await updateStoreSettingsInDb(req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to update store settings', details: err?.message });
    }
  };

  app.put('/api/admin/settings', requireAdmin, handleUpdateSettings);
  app.post('/api/admin/settings', requireAdmin, handleUpdateSettings);

  // GET /api/categories
  app.get('/api/categories', async (req, res) => {
    try {
      const categories = await getCategoriesFromDb();
      res.json(categories);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch categories', details: err?.message });
    }
  });

  // GET /api/products
  // Never exposes source_price or supplier info to public customers (Rule 9)
  app.get('/api/products', async (req, res) => {
    try {
      const products = await getProductsFromDb(true); // publicOnly = true
      res.json(products);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch products', details: err?.message });
    }
  });

  // GET /api/products/:slug
  // Never exposes source_price or supplier info to public customers (Rule 9)
  app.get('/api/products/:slug', async (req, res) => {
    try {
      const { slug } = req.params;
      const product = await getProductBySlugFromDb(slug, true); // publicOnly = true
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      res.json(product);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch product', details: err?.message });
    }
  });

  // POST /api/orders (Customer checkout submission)
  app.post('/api/orders', async (req, res) => {
    try {
      const newOrder = req.body;
      if (!newOrder || !newOrder.items || (!newOrder.customer_phone && !newOrder.customer_email)) {
        return res.status(400).json({ error: 'Invalid order data' });
      }
      if (newOrder.payment_method === 'cod') {
        return res.status(400).json({ error: 'Cash on Delivery (COD) is disabled.' });
      }

      // Enforce UPI payment & pending_verification status with generated order ID and number
      const now = new Date().toISOString();
      const orderToSave: Order = {
        id: newOrder.id || `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        order_number: newOrder.order_number || `PK-${Math.floor(100000 + Math.random() * 900000)}`,
        created_at: newOrder.created_at || now,
        updated_at: newOrder.updated_at || now,
        ...newOrder,
        payment_method: 'upi',
        payment_status: 'pending_verification',
        order_status: newOrder.order_status || 'pending_verification',
      };

      const saved = await createOrderInDb(orderToSave);

      // Trigger WhatsApp order notification asynchronously
      sendWhatsAppOrderNotification(saved).catch((waErr) => {
        console.warn('[WhatsApp] Order notification notice:', waErr);
      });

      res.status(201).json(saved);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to create order', details: err?.message });
    }
  });

  // GET /api/orders/:idOrNumber (Customer order tracking)
  app.get('/api/orders/:idOrNumber', async (req, res) => {
    try {
      const { idOrNumber } = req.params;
      const order = await getOrderByIdOrNumberFromDb(idOrNumber);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }
      res.json(order);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch order', details: err?.message });
    }
  });

  /**
   * Protected Admin Endpoints
   */
  app.get('/api/admin/products', requireAdmin, async (req, res) => {
    try {
      const products = await getProductsFromDb(false); // full product including source_price for admin
      res.json(products);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch admin products', details: err?.message });
    }
  });

  app.post('/api/admin/products', requireAdmin, async (req, res) => {
    try {
      const productData = req.body;
      const saved = await saveProductToDb(productData);
      res.json(saved);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to save product', details: err?.message });
    }
  });

  app.delete('/api/admin/products/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      await deleteProductFromDb(id);
      res.json({ success: true, id });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to delete product', details: err?.message });
    }
  });

  app.delete('/api/admin/products', requireAdmin, async (req, res) => {
    try {
      await clearAllProductsInDb();
      res.json({ success: true, message: 'All products cleared from catalog' });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to clear products catalog', details: err?.message });
    }
  });

  app.post('/api/admin/restore-products', requireAdmin, async (req, res) => {
    try {
      const restored = await restoreSampleProductsInDb();
      res.json(restored);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to restore sample products', details: err?.message });
    }
  });

  app.get('/api/admin/orders', requireAdmin, async (req, res) => {
    try {
      const orders = await getOrdersFromDb();
      res.json(orders);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch admin orders', details: err?.message });
    }
  });

  app.patch('/api/admin/orders/:id/status', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { status, payment_status, courier_name, tracking_number, notes } = req.body;

      const updated = await updateOrderAdminDetailsInDb(id, {
        order_status: status,
        payment_status,
        courier_name,
        tracking_number,
        notes,
      });

      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to update order status', details: err?.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Piko Store running on http://localhost:${PORT}`);
  });
}

startServer();
