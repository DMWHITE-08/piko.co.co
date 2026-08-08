import 'dotenv/config';
import express from 'express';
import path from 'path';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { createServer as createViteServer } from 'vite';
import {
  seedInitialDataIfNeeded,
  getCategoriesFromDb,
  getProductsFromDb,
  getProductBySlugFromDb,
  saveProductToDb,
  deleteProductFromDb,
  createOrderInDb,
  getOrdersFromDb,
  getOrderByIdOrNumberFromDb,
  updateOrderStatusInDb,
  updateOrderPaymentStatusInDb,
} from './src/lib/supabaseServer';
import { Order } from './src/types';
import {
  sendWhatsAppOrderNotification,
  sendWhatsAppTestNotification,
} from './src/lib/whatsappServer';


function getRazorpayInstance(): Razorpay | null {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (keyId && keySecret) {
    return new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }
  return null;
}

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
   * Razorpay Payment Integration Endpoints
   */

  // 1. Create Razorpay Order (Server-Side)
  app.post('/api/payments/create-razorpay-order', async (req, res) => {
    try {
      const { amount, currency = 'INR', receipt, notes } = req.body;
      if (!amount || Number(amount) <= 0) {
        return res.status(400).json({ error: 'Valid payment amount is required' });
      }

      const amountInPaise = Math.round(Number(amount) * 100);
      const razorpay = getRazorpayInstance();

      if (razorpay) {
        const razorpayOrder = await razorpay.orders.create({
          amount: amountInPaise,
          currency: currency || 'INR',
          receipt: receipt || `ord_${Date.now()}`,
          notes: notes || {},
        });
        return res.json({
          success: true,
          razorpay_order_id: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          key_id: process.env.RAZORPAY_KEY_ID,
        });
      } else {
        // Test Mode Fallback if RAZORPAY_KEY_ID / SECRET are not configured yet
        const mockOrderId = `order_test_${Date.now()}`;
        return res.json({
          success: true,
          razorpay_order_id: mockOrderId,
          amount: amountInPaise,
          currency: currency || 'INR',
          key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_piko_demo',
          is_mock: true,
        });
      }
    } catch (err: any) {
      console.error('[Razorpay] Order creation error:', err);
      res.status(500).json({ error: 'Failed to create Razorpay order', details: err?.message });
    }
  });

  // 2. Verify Razorpay Payment Signature (Server-Side)
  app.post('/api/payments/verify-razorpay-signature', async (req, res) => {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, order } = req.body;

      if (!razorpay_order_id || !razorpay_payment_id || !order) {
        return res.status(400).json({ error: 'Missing payment or order parameters' });
      }

      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      let isSignatureValid = false;

      if (keySecret) {
        const body = `${razorpay_order_id}|${razorpay_payment_id}`;
        const expectedSignature = crypto
          .createHmac('sha256', keySecret)
          .update(body.toString())
          .digest('hex');

        isSignatureValid = expectedSignature === razorpay_signature;
      } else {
        // In Test Mode without key secret set, accept test transactions safely
        isSignatureValid = true;
      }

      if (!isSignatureValid) {
        console.warn('[Razorpay] Invalid signature verification attempt for order:', razorpay_order_id);
        return res.status(400).json({ error: 'Invalid payment signature. Verification failed.' });
      }

      // COD strictly disabled check
      if (order.payment_method === 'cod') {
        return res.status(400).json({ error: 'Cash on Delivery (COD) is disabled.' });
      }

      // Prepare complete order marked as PAID
      const now = new Date().toISOString();
      const orderToSave: Order = {
        ...order,
        payment_method: order.payment_method || 'razorpay',
        payment_status: 'paid',
        order_status: 'processing',
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature: razorpay_signature || 'verified_test_sig',
        created_at: order.created_at || now,
        updated_at: now,
      };

      // Save/Upsert order in Supabase
      const savedOrder = await createOrderInDb(orderToSave);

      // Explicitly update payment status to paid with razorpay details
      const confirmedOrder = await updateOrderPaymentStatusInDb(savedOrder.id, 'paid', {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature: razorpay_signature || 'verified_test_sig',
      });

      const finalOrder = confirmedOrder || savedOrder;

      // Trigger WhatsApp notification asynchronously (will log if credentials missing, never rolls back order)
      sendWhatsAppOrderNotification(finalOrder).catch((waErr) => {
        console.error('[WhatsApp] Verification notification error:', waErr);
      });

      res.json({
        success: true,
        message: 'Payment verified successfully and order marked as paid.',
        order: finalOrder,
      });
    } catch (err: any) {
      console.error('[Razorpay] Signature verification error:', err);
      res.status(500).json({ error: 'Failed to verify payment', details: err?.message });
    }
  });

  // 3. Razorpay Webhook Endpoint
  app.post('/api/payments/razorpay-webhook', async (req: any, res) => {
    try {
      const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
      const signature = req.headers['x-razorpay-signature'];

      if (webhookSecret) {
        if (!signature) {
          return res.status(400).json({ error: 'Missing x-razorpay-signature header' });
        }
        const rawBody = req.rawBody || JSON.stringify(req.body);
        const expectedSignature = crypto
          .createHmac('sha256', webhookSecret)
          .update(rawBody)
          .digest('hex');

        if (expectedSignature !== signature) {
          console.warn('[Razorpay Webhook] Invalid webhook signature');
          return res.status(400).json({ error: 'Invalid webhook signature' });
        }
      }

      const event = req.body?.event;
      const payload = req.body?.payload;

      console.log(`[Razorpay Webhook] Received webhook event: ${event}`);

      if (event === 'order.paid' || event === 'payment.captured') {
        const paymentEntity = payload?.payment?.entity;
        const orderEntity = payload?.order?.entity;

        const razorpayOrderId = paymentEntity?.order_id || orderEntity?.id;
        const razorpayPaymentId = paymentEntity?.id;
        const receipt = orderEntity?.receipt || paymentEntity?.notes?.receipt || paymentEntity?.notes?.order_number;

        if (razorpayOrderId || receipt) {
          const identifier = receipt || razorpayOrderId;
          const updated = await updateOrderPaymentStatusInDb(identifier, 'paid', {
            razorpay_order_id: razorpayOrderId,
            razorpay_payment_id: razorpayPaymentId,
          });

          if (updated) {
            console.log(`[Razorpay Webhook] Order ${updated.order_number} (${updated.id}) marked as PAID`);
            // Trigger WhatsApp notification on webhook processing
            sendWhatsAppOrderNotification(updated).catch((waErr) => {
              console.error('[WhatsApp Webhook] Notification error:', waErr);
            });
          }
        }
      }

      res.json({ status: 'ok', received: true });
    } catch (err: any) {
      console.error('[Razorpay Webhook] Error processing webhook:', err);
      res.status(500).json({ error: 'Webhook handler error', details: err?.message });
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
      if (!newOrder || !newOrder.items || !newOrder.customer_email) {
        return res.status(400).json({ error: 'Invalid order data' });
      }
      if (newOrder.payment_method === 'cod') {
        return res.status(400).json({ error: 'Cash on Delivery (COD) is currently disabled.' });
      }
      const saved = await createOrderInDb(newOrder);
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
      const { status, notes } = req.body;
      const updated = await updateOrderStatusInDb(id, status, notes);
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
