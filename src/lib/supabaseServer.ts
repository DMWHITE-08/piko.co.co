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

  if (!url || url.includes('your-project-ref') || url.includes('placeholder') || url.trim() === '') {
    if (key && key.includes('.')) {
      try {
        const parts = key.split('.');
        if (parts.length >= 2) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
          if (payload && payload.ref) {
            return `https://${payload.ref}.supabase.co`;
          }
        }
      } catch (err) {
        // ignore
      }
    }
    return undefined;
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
  console.log('[Supabase] Credentials not found or placeholder URL used. Running with local fallback store.');
}

let inMemoryCategories = [...INITIAL_CATEGORIES];
let inMemoryProducts: Product[] = supabase ? [] : [...INITIAL_PRODUCTS];
let inMemoryOrders = [...INITIAL_ORDERS];

/**
 * Normalize product object to match exact Supabase products table schema
 */
export function normalizeProductForDb(raw: any): Product {
  const name = String(raw.name || 'Untitled Product').trim();
  const computedSlug = raw.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') || `prod-${Date.now()}`;

  return {
    id: String(raw.id || `prod-${Date.now()}`),
    name,
    slug: String(computedSlug),
    short_description: String(raw.short_description || name),
    description: String(raw.description || raw.short_description || name),
    specifications: raw.specifications && typeof raw.specifications === 'object' ? raw.specifications : {},
    images: Array.isArray(raw.images) && raw.images.length > 0 ? raw.images : ['https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=800&auto=format&fit=crop&q=80'],
    category_id: String(raw.category_id || `cat-${raw.category_slug || 'gifts'}`),
    category_slug: String(raw.category_slug || 'gifts'),
    source_price: typeof raw.source_price === 'number' ? raw.source_price : Math.round((Number(raw.selling_price) || 0) * 0.5),
    selling_price: Number(raw.selling_price) || 0,
    compare_at_price: raw.compare_at_price ? Number(raw.compare_at_price) : null,
    stock_count: typeof raw.stock_count === 'number' ? raw.stock_count : (typeof raw.stock === 'number' ? raw.stock : 25),
    in_stock: typeof raw.in_stock === 'boolean' ? raw.in_stock : true,
    is_featured: typeof raw.is_featured === 'boolean' ? raw.is_featured : true,
    rating: typeof raw.rating === 'number' ? raw.rating : 4.8,
    rating_count: typeof raw.rating_count === 'number' ? raw.rating_count : (typeof raw.reviews_count === 'number' ? raw.reviews_count : 12),
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    created_at: raw.created_at || new Date().toISOString(),
  };
}

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
 * Seed initial data to Supabase ONLY when database is genuinely empty / first time setup.
 * Uses system init marker '_sys_init_seeded' so intentional admin deletions are NEVER lost.
 */
export async function seedInitialDataIfNeeded() {
  if (!supabase) return;

  try {
    // 1. Check if database was already initialized before
    const { data: marker } = await supabase
      .from('categories')
      .select('id')
      .eq('id', '_sys_init_seeded')
      .maybeSingle();

    if (marker) {
      console.log('[Supabase] Database already initialized (_sys_init_seeded found). Skipping auto-seed.');
      return;
    }

    // 2. Check if products table already has records
    const { count, error: countErr } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });

    if (!countErr && count !== null && count > 0) {
      console.log(`[Supabase] Database already contains ${count} products. Marking system as initialized.`);
      await supabase.from('categories').upsert(
        { id: '_sys_init_seeded', name: 'System Init Marker', slug: '_sys_init_seeded', description: 'true' },
        { onConflict: 'id' }
      );
      return;
    }

    // 3. Database is genuinely empty first-time setup: seed initial data
    console.log('[Supabase] Genuinely empty database detected. Seeding INITIAL_CATEGORIES, INITIAL_PRODUCTS, INITIAL_ORDERS...');

    const { error: catErr } = await supabase.from('categories').upsert(INITIAL_CATEGORIES, { onConflict: 'id' });
    if (catErr) console.warn('[Supabase] Categories seed warning:', catErr.message);

    const normalizedProds = INITIAL_PRODUCTS.map(normalizeProductForDb);
    const { error: prodErr } = await supabase.from('products').upsert(normalizedProds, { onConflict: 'id' });
    if (prodErr) console.warn('[Supabase] Products seed warning:', prodErr.message);

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

    // Mark as initialized so subsequent restarts never re-seed
    await supabase.from('categories').upsert(
      { id: '_sys_init_seeded', name: 'System Init Marker', slug: '_sys_init_seeded', description: 'true' },
      { onConflict: 'id' }
    );

    console.log('[Supabase] First-time initial data seeding complete.');
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
      if (!error && Array.isArray(data)) {
        inMemoryCategories = data as Category[];
        return inMemoryCategories.filter((cat) => !cat.id.startsWith('_sys_'));
      }
    } catch (err) {
      console.warn('[Supabase] Error fetching categories:', err);
    }
  }
  return inMemoryCategories.filter((cat) => !cat.id.startsWith('_sys_'));
}

/**
 * Get Products from Supabase or Fallback
 * Customer: queries public_products view (returns public fields)
 * Admin: queries products table (returns full fields including source_price)
 */
export async function getProductsFromDb(publicOnly: boolean = true): Promise<any[]> {
  if (supabase) {
    try {
      const table = publicOnly ? 'public_products' : 'products';
      const { data, error } = await supabase.from(table).select('*').order('created_at', { ascending: false });
      if (!error && Array.isArray(data)) {
        inMemoryProducts = data as Product[];
        return publicOnly ? inMemoryProducts.map(sanitizePublicProduct) : inMemoryProducts;
      }
      if (error) {
        console.warn(`[Supabase] Error querying ${table} table:`, error.message);
      }
    } catch (err: any) {
      console.warn(`[Supabase] Exception fetching products from ${publicOnly ? 'public_products' : 'products'}:`, err?.message || err);
    }
  }

  return publicOnly ? inMemoryProducts.map(sanitizePublicProduct) : inMemoryProducts;
}

/**
 * Get Product by Slug (or ID) from Supabase or Fallback
 */
export async function getProductBySlugFromDb(slugOrId: string, publicOnly: boolean = true): Promise<any | null> {
  if (supabase) {
    try {
      const table = publicOnly ? 'public_products' : 'products';
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .or(`slug.eq.${slugOrId},id.eq.${slugOrId}`)
        .maybeSingle();

      if (!error && data) {
        return publicOnly ? sanitizePublicProduct(data) : data;
      }
    } catch (err: any) {
      console.warn(`[Supabase] Error fetching product ${slugOrId}:`, err?.message || err);
    }
  }

  const found = inMemoryProducts.find((p) => p.slug === slugOrId || p.id === slugOrId);
  if (!found) return null;

  return publicOnly ? sanitizePublicProduct(found) : found;
}

/**
 * Save / Upsert Product in Supabase
 */
export async function saveProductToDb(rawProduct: Product): Promise<Product> {
  const product = normalizeProductForDb(rawProduct);

  if (supabase) {
    const { data, error } = await supabase.from('products').upsert(product, { onConflict: 'id' }).select().single();
    if (error) {
      console.error('[Supabase] Error saving product to DB:', error.message);
      throw new Error(`Database error saving product: ${error.message}`);
    }
    if (data) {
      const saved = data as Product;
      const idx = inMemoryProducts.findIndex((p) => p.id === saved.id);
      if (idx >= 0) inMemoryProducts[idx] = saved;
      else inMemoryProducts.unshift(saved);
      return saved;
    }
  } else {
    throw new Error('Supabase configuration is missing in the production environment. Please ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.');
  }

  const existingIdx = inMemoryProducts.findIndex((p) => p.id === product.id);
  if (existingIdx >= 0) {
    inMemoryProducts[existingIdx] = product;
  } else {
    inMemoryProducts.unshift(product);
  }
  return product;
}

/**
 * Delete Product in Supabase
 */
export async function deleteProductFromDb(productId: string): Promise<boolean> {
  if (supabase) {
    const { error } = await supabase.from('products').delete().eq('id', productId);
    if (error) {
      console.error('[Supabase] Error deleting product from DB:', error.message);
      throw new Error(`Database error deleting product: ${error.message}`);
    }
  } else {
    throw new Error('Supabase configuration is missing in the production environment. Please ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.');
  }
  inMemoryProducts = inMemoryProducts.filter((p) => p.id !== productId);
  return true;
}

/**
 * Clear All Products from Supabase
 */
export async function clearAllProductsInDb(): Promise<boolean> {
  if (supabase) {
    const { error } = await supabase.from('products').delete().neq('id', '___non_existent___');
    if (error) {
      console.error('[Supabase] Error clearing products from DB:', error.message);
      throw new Error(`Database error clearing products: ${error.message}`);
    }
  } else {
    throw new Error('Supabase configuration is missing in the production environment. Please ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.');
  }
  inMemoryProducts = [];
  return true;
}

/**
 * Restore Default Sample Products to Supabase
 */
export async function restoreSampleProductsInDb(): Promise<Product[]> {
  const normalizedSamples = INITIAL_PRODUCTS.map(normalizeProductForDb);

  if (supabase) {
    const { error } = await supabase.from('products').upsert(normalizedSamples, { onConflict: 'id' });
    if (error) {
      console.error('[Supabase] Error restoring sample products to DB:', error.message);
      throw new Error(`Database error restoring sample products: ${error.message}`);
    }
    const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    if (data) {
      inMemoryProducts = data as Product[];
    }
  } else {
    throw new Error('Supabase configuration is missing in the production environment. Please ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.');
  }
  return inMemoryProducts;
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

/**
 * Clear All Orders from Supabase or Fallback
 */
export async function clearAllOrdersInDb(): Promise<boolean> {
  inMemoryOrders = [];
  if (supabase) {
    try {
      await supabase.from('order_items').delete().neq('id', '0');
      await supabase.from('orders').delete().neq('id', '0');
    } catch (err) {
      console.warn('[Supabase] Error clearing orders:', err);
    }
  }
  return true;
}

