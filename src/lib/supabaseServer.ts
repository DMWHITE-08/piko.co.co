import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { INITIAL_CATEGORIES, INITIAL_PRODUCTS, INITIAL_ORDERS } from '../data/initialData';
import { Category, Product, Order, PaymentStatus, StoreSettings } from '../types';

export let inMemoryStoreSettings: StoreSettings = {
  upi_id: 'piko@upi',
  upi_qr_url: '',
  store_name: "PIKO's Little Treasures",
  shipping_fee: 49,
  free_shipping_threshold: 499,
};

/**
 * Get Store Settings from DB or memory
 */
export async function getStoreSettingsFromDb(): Promise<StoreSettings> {
  if (supabase) {
    try {
      // 1. Try store_settings table first
      const { data, error } = await supabase.from('store_settings').select('*').limit(1).single();
      if (!error && data) {
        return {
          upi_id: data.upi_id || inMemoryStoreSettings.upi_id,
          upi_qr_url: data.upi_qr_url || inMemoryStoreSettings.upi_qr_url,
          store_name: data.store_name || inMemoryStoreSettings.store_name,
          shipping_fee: typeof data.shipping_fee === 'number' ? data.shipping_fee : inMemoryStoreSettings.shipping_fee,
          free_shipping_threshold: typeof data.free_shipping_threshold === 'number' ? data.free_shipping_threshold : inMemoryStoreSettings.free_shipping_threshold,
        };
      }

      // 2. Fallback to _sys_store_settings in categories table
      const { data: sysData, error: sysErr } = await supabase.from('categories').select('*').eq('id', '_sys_store_settings').single();
      if (!sysErr && sysData && sysData.description) {
        try {
          const parsed = JSON.parse(sysData.description);
          if (parsed && typeof parsed === 'object') {
            inMemoryStoreSettings = {
              upi_id: parsed.upi_id || inMemoryStoreSettings.upi_id,
              upi_qr_url: parsed.upi_qr_url || inMemoryStoreSettings.upi_qr_url,
              store_name: parsed.store_name || inMemoryStoreSettings.store_name,
              shipping_fee: typeof parsed.shipping_fee === 'number' ? parsed.shipping_fee : inMemoryStoreSettings.shipping_fee,
              free_shipping_threshold: typeof parsed.free_shipping_threshold === 'number' ? parsed.free_shipping_threshold : inMemoryStoreSettings.free_shipping_threshold,
            };
            return inMemoryStoreSettings;
          }
        } catch (e) {
          // ignore parse error
        }
      }
    } catch (err) {
      console.warn('[Supabase] Error fetching store settings:', err);
    }
  }
  return inMemoryStoreSettings;
}

/**
 * Update Store Settings in DB and memory
 */
export async function updateStoreSettingsInDb(settings: Partial<StoreSettings>): Promise<StoreSettings> {
  inMemoryStoreSettings = {
    ...inMemoryStoreSettings,
    ...settings,
  };

  if (supabase) {
    try {
      // Upsert to store_settings table if present
      await supabase.from('store_settings').upsert({ id: 'main_settings', ...inMemoryStoreSettings }, { onConflict: 'id' });
    } catch (err) {
      // ignore
    }

    try {
      // Always persist to categories table as system settings backup
      await supabase.from('categories').upsert(
        {
          id: '_sys_store_settings',
          name: 'System Store Settings',
          slug: '_sys_store_settings',
          description: JSON.stringify(inMemoryStoreSettings),
        },
        { onConflict: 'id' }
      );
    } catch (err) {
      console.warn('[Supabase] Error persisting store settings backup:', err);
    }
  }

  return inMemoryStoreSettings;
}

function getEffectiveSupabaseUrl(): string | undefined {
  let url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

  if ((!url || url.includes('your-project-ref') || url.trim() === '') && key && key.includes('.')) {
    try {
      const parts = key.split('.');
      if (parts.length >= 2) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
        if (payload.ref) {
          return `https://${payload.ref}.supabase.co`;
        }
      }
    } catch (err) {
      // ignore
    }
  }
  return url;
}

const supabaseUrl = getEffectiveSupabaseUrl();
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

export let supabase: SupabaseClient | null = null;

if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log(`[Supabase] Client initialized successfully for URL: ${supabaseUrl}`);
  } catch (err) {
    console.warn('[Supabase] Failed to initialize client, using fallback:', err);
  }
} else {
  console.log('[Supabase] Credentials not found in environment. Running with local fallback data.');
}

let inMemoryCategories = [...INITIAL_CATEGORIES];
let inMemoryProducts = [...INITIAL_PRODUCTS];
let inMemoryOrders = [...INITIAL_ORDERS];

/**
 * Sanitize product to strip sensitive internal supplier/cost data (Rule 9).
 * Never expose source_price, profit, supplier information to customers.
 */
export function sanitizePublicProduct(product: any): Omit<Product, 'source_price'> {
  if (!product) return product;
  const { source_price, profit, supplier, supplier_info, ...publicProduct } = product;
  return publicProduct as Omit<Product, 'source_price'>;
}

/**
 * Seed initial data to Supabase by upserting initialData
 */
export async function seedInitialDataIfNeeded() {
  if (!supabase) return;

  try {
    console.log('[Supabase] Upserting INITIAL_CATEGORIES...');
    const { error: catErr } = await supabase.from('categories').upsert(INITIAL_CATEGORIES, { onConflict: 'id' });
    if (catErr) console.warn('[Supabase] Categories seed warning:', catErr.message);

    console.log('[Supabase] Upserting INITIAL_PRODUCTS...');
    const { error: prodErr } = await supabase.from('products').upsert(INITIAL_PRODUCTS, { onConflict: 'id' });
    if (prodErr) console.warn('[Supabase] Products seed warning:', prodErr.message);

    console.log('[Supabase] Upserting INITIAL_ORDERS...');
    for (const ord of INITIAL_ORDERS) {
      const { items, ...orderHeader } = ord;
      const { error: ordErr } = await supabase.from('orders').upsert(orderHeader, { onConflict: 'id' });
      if (ordErr) console.warn('[Supabase] Order header seed warning:', ordErr.message);

      if (items && items.length > 0) {
        const formattedItems = items.map((item, idx) => ({
          id: `${ord.id}-item-${idx}`,
          order_id: ord.id,
          ...item,
        }));
        const { error: itemErr } = await supabase.from('order_items').upsert(formattedItems, { onConflict: 'id' });
        if (itemErr) console.warn('[Supabase] Order items seed warning:', itemErr.message);
      }
    }
    console.log('[Supabase] Initial data seeding complete.');
  } catch (err) {
    console.warn('[Supabase] Seeding error:', err);
  }
}

/**
 * Get Categories from Supabase or Fallback
 */
export async function getCategoriesFromDb(): Promise<Category[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase.from('categories').select('*').order('name', { ascending: true });
      if (!error && data && data.length > 0) {
        return (data as Category[]).filter((cat) => !cat.id.startsWith('_sys_'));
      }
    } catch (err) {
      console.warn('[Supabase] Error fetching categories:', err);
    }
  }
  return inMemoryCategories.filter((cat) => !cat.id.startsWith('_sys_'));
}

/**
 * Get Products from Supabase or Fallback (returns raw or sanitized)
 */
export async function getProductsFromDb(publicOnly: boolean = true): Promise<any[]> {
  let products: Product[] = inMemoryProducts;

  if (supabase) {
    try {
      const tableName = publicOnly ? 'public_products' : 'products';
      const { data, error } = await supabase.from(tableName).select('*').order('created_at', { ascending: false });
      if (!error && data && data.length > 0) {
        products = data as Product[];
      }
    } catch (err) {
      console.warn('[Supabase] Error fetching products:', err);
    }
  }

  if (publicOnly) {
    return products.map(sanitizePublicProduct);
  }

  return products;
}

/**
 * Get Product by Slug (or ID) from Supabase or Fallback
 */
export async function getProductBySlugFromDb(slugOrId: string, publicOnly: boolean = true): Promise<any | null> {
  if (supabase) {
    try {
      const tableName = publicOnly ? 'public_products' : 'products';
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .or(`slug.eq.${slugOrId},id.eq.${slugOrId}`)
        .single();

      if (!error && data) {
        return publicOnly ? sanitizePublicProduct(data) : data;
      }
    } catch (err) {
      console.warn(`[Supabase] Error fetching product ${slugOrId}:`, err);
    }
  }

  const found = inMemoryProducts.find((p) => p.slug === slugOrId || p.id === slugOrId);
  if (!found) return null;

  return publicOnly ? sanitizePublicProduct(found) : found;
}

/**
 * Save / Upsert Product in Supabase
 */
export async function saveProductToDb(product: Product): Promise<Product> {
  const existingIdx = inMemoryProducts.findIndex((p) => p.id === product.id);
  if (existingIdx >= 0) {
    inMemoryProducts[existingIdx] = product;
  } else {
    inMemoryProducts.unshift(product);
  }

  if (supabase) {
    try {
      const { data, error } = await supabase.from('products').upsert(product, { onConflict: 'id' }).select().single();
      if (!error && data) {
        return data as Product;
      }
    } catch (err) {
      console.warn('[Supabase] Error saving product:', err);
    }
  }
  return product;
}

/**
 * Delete Product in Supabase
 */
export async function deleteProductFromDb(productId: string): Promise<boolean> {
  inMemoryProducts = inMemoryProducts.filter((p) => p.id !== productId);

  if (supabase) {
    try {
      const { error } = await supabase.from('products').delete().eq('id', productId);
      if (!error) return true;
    } catch (err) {
      console.warn('[Supabase] Error deleting product:', err);
    }
  }
  return true;
}

/**
 * Create or Upsert Order in Supabase
 */
export async function createOrderInDb(order: Order): Promise<Order> {
  const existingIdx = inMemoryOrders.findIndex((o) => o.id === order.id);
  if (existingIdx >= 0) {
    inMemoryOrders[existingIdx] = order;
  } else {
    inMemoryOrders.unshift(order);
  }

  if (supabase) {
    try {
      const { items, ...orderHeader } = order;
      const { error: ordErr } = await supabase.from('orders').upsert(orderHeader, { onConflict: 'id' });
      if (!ordErr && items && items.length > 0) {
        const orderItems = items.map((item, idx) => ({
          id: `${order.id}-item-${idx}`,
          order_id: order.id,
          ...item,
        }));
        await supabase.from('order_items').upsert(orderItems, { onConflict: 'id' });
      }
    } catch (err) {
      console.warn('[Supabase] Error creating/upserting order:', err);
    }
  }
  return order;
}

/**
 * Update Order Payment Status in Supabase
 */
export async function updateOrderPaymentStatusInDb(
  orderIdOrNumber: string,
  paymentStatus: PaymentStatus,
  razorpayDetails?: {
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    razorpay_signature?: string;
  }
): Promise<Order | null> {
  const current = await getOrderByIdOrNumberFromDb(orderIdOrNumber);
  if (!current) return null;

  // Idempotency: prevent duplicate processing if already paid with same payment_id
  if (
    current.payment_status === 'paid' &&
    razorpayDetails?.razorpay_payment_id &&
    current.razorpay_payment_id === razorpayDetails.razorpay_payment_id
  ) {
    console.log(`[Supabase] Order ${orderIdOrNumber} is already marked paid with payment_id ${razorpayDetails.razorpay_payment_id}`);
    return current;
  }

  const now = new Date().toISOString();
  const updatedObj: Order = {
    ...current,
    payment_status: paymentStatus,
    order_status: paymentStatus === 'paid' ? 'processing' : current.order_status,
    razorpay_order_id: razorpayDetails?.razorpay_order_id || current.razorpay_order_id,
    razorpay_payment_id: razorpayDetails?.razorpay_payment_id || current.razorpay_payment_id,
    razorpay_signature: razorpayDetails?.razorpay_signature || current.razorpay_signature,
    updated_at: now,
  };

  const memIdx = inMemoryOrders.findIndex((o) => o.id === current.id);
  if (memIdx >= 0) {
    inMemoryOrders[memIdx] = updatedObj;
  }

  if (supabase) {
    try {
      const updateData: any = {
        payment_status: paymentStatus,
        order_status: paymentStatus === 'paid' ? 'processing' : current.order_status,
        updated_at: now,
      };
      if (razorpayDetails?.razorpay_order_id) updateData.razorpay_order_id = razorpayDetails.razorpay_order_id;
      if (razorpayDetails?.razorpay_payment_id) updateData.razorpay_payment_id = razorpayDetails.razorpay_payment_id;
      if (razorpayDetails?.razorpay_signature) updateData.razorpay_signature = razorpayDetails.razorpay_signature;

      const { data, error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', current.id)
        .select()
        .single();

      if (!error && data) {
        return { ...data, items: current.items } as Order;
      }
    } catch (err) {
      console.warn('[Supabase] Error updating order payment status:', err);
    }
  }

  return updatedObj;
}


/**
 * Get Orders from Supabase or Fallback
 */
export async function getOrdersFromDb(): Promise<Order[]> {
  if (supabase) {
    try {
      const { data: orders, error: ordErr } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (!ordErr && orders) {
        const { data: items } = await supabase.from('order_items').select('*');
        const formatted = orders.map((ord: any) => {
          const ordItems = items ? items.filter((it: any) => it.order_id === ord.id) : [];
          return {
            ...ord,
            items: ordItems,
          } as Order;
        });
        return formatted;
      }
    } catch (err) {
      console.warn('[Supabase] Error fetching orders:', err);
    }
  }
  return inMemoryOrders;
}

/**
 * Get Single Order by Order Number or ID
 */
export async function getOrderByIdOrNumberFromDb(idOrNumber: string): Promise<Order | null> {
  if (supabase) {
    try {
      const { data: ord, error } = await supabase
        .from('orders')
        .select('*')
        .or(`id.eq.${idOrNumber},order_number.eq.${idOrNumber}`)
        .single();
      if (!error && ord) {
        const { data: items } = await supabase.from('order_items').select('*').eq('order_id', ord.id);
        return {
          ...ord,
          items: items || [],
        } as Order;
      }
    } catch (err) {
      console.warn(`[Supabase] Error fetching order ${idOrNumber}:`, err);
    }
  }

  const found = inMemoryOrders.find((o) => o.id === idOrNumber || o.order_number === idOrNumber);
  return found || null;
}

/**
 * Update Order Admin Details (status, payment_status, courier, tracking_number)
 */
export async function updateOrderAdminDetailsInDb(
  orderId: string,
  details: {
    order_status?: Order['order_status'];
    payment_status?: PaymentStatus;
    courier_name?: string;
    tracking_number?: string;
    notes?: string;
  }
): Promise<Order | null> {
  const current = await getOrderByIdOrNumberFromDb(orderId);
  if (!current) return null;

  const now = new Date().toISOString();
  let updatedTracking = current.tracking_events || [];

  if (details.order_status && details.order_status !== current.order_status) {
    const newEvent = {
      status: details.order_status,
      description: details.notes || `Order status updated to ${details.order_status.replace(/_/g, ' ')}`,
      occurred_at: now,
    };
    updatedTracking = [newEvent, ...updatedTracking];
  } else if (details.payment_status && details.payment_status !== current.payment_status) {
    const newEvent = {
      status: current.order_status,
      description: `Payment status updated to ${details.payment_status.replace(/_/g, ' ')}`,
      occurred_at: now,
    };
    updatedTracking = [newEvent, ...updatedTracking];
  } else if (details.tracking_number && details.tracking_number !== current.tracking_number) {
    const newEvent = {
      status: current.order_status,
      description: `Shipped via ${details.courier_name || current.courier_name || 'Courier'} (Tracking: ${details.tracking_number})`,
      occurred_at: now,
    };
    updatedTracking = [newEvent, ...updatedTracking];
  }

  const updatedObj: Order = {
    ...current,
    order_status: details.order_status || current.order_status,
    payment_status: details.payment_status || current.payment_status,
    courier_name: details.courier_name !== undefined ? details.courier_name : current.courier_name,
    tracking_number: details.tracking_number !== undefined ? details.tracking_number : current.tracking_number,
    tracking_events: updatedTracking,
    updated_at: now,
  };

  const memIdx = inMemoryOrders.findIndex((o) => o.id === current.id);
  if (memIdx >= 0) {
    inMemoryOrders[memIdx] = updatedObj;
  }

  if (supabase) {
    try {
      const updateData: any = {
        updated_at: now,
        tracking_events: updatedTracking,
      };
      if (details.order_status) updateData.order_status = details.order_status;
      if (details.payment_status) updateData.payment_status = details.payment_status;
      if (details.courier_name !== undefined) updateData.courier_name = details.courier_name;
      if (details.tracking_number !== undefined) updateData.tracking_number = details.tracking_number;

      const { data, error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', current.id)
        .select()
        .single();

      if (!error && data) {
        return { ...data, items: current.items } as Order;
      }
    } catch (err) {
      console.warn('[Supabase] Error updating order details:', err);
    }
  }

  return updatedObj;
}

/**
 * Update Order Status in Supabase
 */
export async function updateOrderStatusInDb(orderId: string, status: Order['order_status'], notes?: string): Promise<Order | null> {
  const current = await getOrderByIdOrNumberFromDb(orderId);
  if (!current) return null;

  const now = new Date().toISOString();
  const newEvent = {
    status,
    description: notes || `Order status updated to ${status.replace(/_/g, ' ')}`,
    occurred_at: now,
  };

  const updatedTracking = [newEvent, ...(current.tracking_events || [])];
  const updatedObj: Order = {
    ...current,
    order_status: status,
    tracking_events: updatedTracking,
    updated_at: now,
  };

  const memIdx = inMemoryOrders.findIndex((o) => o.id === current.id);
  if (memIdx >= 0) {
    inMemoryOrders[memIdx] = updatedObj;
  }

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .update({
          order_status: status,
          tracking_events: updatedTracking,
          updated_at: now,
        })
        .eq('id', current.id)
        .select()
        .single();

      if (!error && data) {
        return { ...data, items: current.items } as Order;
      }
    } catch (err) {
      console.warn('[Supabase] Error updating order status:', err);
    }
  }

  return updatedObj;
}

