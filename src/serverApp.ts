import 'dotenv/config';
import express from 'express';
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
  clearAllOrdersInDb,
  getOrderByIdOrNumberFromDb,
  updateOrderAdminDetailsInDb,
  getStoreSettingsFromDb,
  updateStoreSettingsInDb,
} from './lib/supabaseServer';
import { Order } from './types';
import {
  sendWhatsAppOrderNotification,
  sendWhatsAppTestNotification,
} from './lib/whatsappServer';

export const app = express();

app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

// Global CORS & Cache control headers
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Password');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Attempt to seed initial data to Supabase if connected
seedInitialDataIfNeeded().catch((err) => console.warn('Data seeding notice:', err));

// Default admin password: arlinalbin
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

const apiRouter = express.Router();

// Admin Login
apiRouter.post('/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    return res.json({ success: true, token: 'piko_admin_session_valid' });
  } else {
    return res.status(401).json({ success: false, error: 'Incorrect admin password' });
  }
});

// Health check
apiRouter.get('/health', (req, res) => {
  res.json({ status: 'ok', store: "Piko's Little Treasures" });
});

// Settings
apiRouter.get('/settings', async (req, res) => {
  try {
    const settings = await getStoreSettingsFromDb();
    res.json(settings);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch store settings', details: err?.message });
  }
});

const handleUpdateSettings = async (req: express.Request, res: express.Response) => {
  try {
    const updated = await updateStoreSettingsInDb(req.body);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update store settings', details: err?.message });
  }
};

apiRouter.put('/admin/settings', requireAdmin, handleUpdateSettings);
apiRouter.post('/admin/settings', requireAdmin, handleUpdateSettings);

// WhatsApp Test Notification
apiRouter.post('/admin/test-whatsapp', requireAdmin, async (req, res) => {
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

// Categories
apiRouter.get('/categories', async (req, res) => {
  try {
    const categories = await getCategoriesFromDb();
    res.json(categories);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch categories', details: err?.message });
  }
});

// Products
apiRouter.get('/products', async (req, res) => {
  try {
    const products = await getProductsFromDb(true); // publicOnly = true
    res.json(products);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch products', details: err?.message });
  }
});

apiRouter.get('/products/:slug', async (req, res) => {
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

// Orders
apiRouter.post('/orders', async (req, res) => {
  try {
    const newOrder = req.body;
    if (!newOrder || !newOrder.items || (!newOrder.customer_phone && !newOrder.customer_email)) {
      return res.status(400).json({ error: 'Invalid order data' });
    }
    if (newOrder.payment_method === 'cod') {
      return res.status(400).json({ error: 'Cash on Delivery (COD) is disabled.' });
    }

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

    sendWhatsAppOrderNotification(saved).catch((waErr) => {
      console.warn('[WhatsApp] Order notification notice:', waErr);
    });

    res.status(201).json(saved);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create order', details: err?.message });
  }
});

apiRouter.get('/orders/:idOrNumber', async (req, res) => {
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

// Admin Products
apiRouter.get('/admin/products', requireAdmin, async (req, res) => {
  try {
    const products = await getProductsFromDb(false);
    res.json(products);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch admin products', details: err?.message });
  }
});

apiRouter.post('/admin/products', requireAdmin, async (req, res) => {
  try {
    const productData = req.body;
    const saved = await saveProductToDb(productData);
    res.json(saved);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to save product', details: err?.message });
  }
});

apiRouter.delete('/admin/products/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await deleteProductFromDb(id);
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete product', details: err?.message });
  }
});

apiRouter.delete('/admin/products', requireAdmin, async (req, res) => {
  try {
    await clearAllProductsInDb();
    res.json({ success: true, message: 'All products cleared from catalog' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to clear products catalog', details: err?.message });
  }
});

apiRouter.post('/admin/restore-products', requireAdmin, async (req, res) => {
  try {
    const restored = await restoreSampleProductsInDb();
    res.json(restored);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to restore sample products', details: err?.message });
  }
});

// Admin Orders
apiRouter.get('/admin/orders', requireAdmin, async (req, res) => {
  try {
    const orders = await getOrdersFromDb();
    res.json(orders);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch admin orders', details: err?.message });
  }
});

apiRouter.delete('/admin/orders', requireAdmin, async (req, res) => {
  try {
    await clearAllOrdersInDb();
    res.json({ success: true, message: 'All orders cleared from store history' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to clear orders', details: err?.message });
  }
});

apiRouter.patch('/admin/orders/:id/status', requireAdmin, async (req, res) => {
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

// Mount the router on both /api and / so it works regardless of Vercel path rewriting
app.use('/api', apiRouter);
app.use('/', apiRouter);

export default app;
