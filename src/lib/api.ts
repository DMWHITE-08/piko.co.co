import { Category, Order, OrderStatus, PaymentStatus, Product, StoreSettings } from '../types';
import { INITIAL_CATEGORIES, INITIAL_PRODUCTS } from '../data/initialData';

export const DEFAULT_SETTINGS: StoreSettings = {
  upi_id: 'piko@upi',
  upi_qr_url: '',
  store_name: "PIKO's Little Treasures",
  shipping_fee: 49,
  free_shipping_threshold: 499,
};

/**
 * Fetch Store Settings from Express API (/api/settings)
 */
export async function fetchStoreSettings(): Promise<StoreSettings> {
  try {
    const res = await fetch('/api/settings');
    if (res.ok) {
      const data = await res.json();
      if (data && data.upi_id) {
        return data;
      }
    }
  } catch (err) {
    console.warn('[API] Error fetching store settings:', err);
  }
  return DEFAULT_SETTINGS;
}

/**
 * Update Store Settings via Express API (/api/admin/settings)
 */
export async function updateStoreSettingsApi(settings: Partial<StoreSettings>, token: string): Promise<StoreSettings> {
  try {
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(settings),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('[API] Error updating store settings:', err);
  }
  return DEFAULT_SETTINGS;
}

/**
 * Fetch categories from Express API (/api/categories)
 */
export async function fetchCategories(): Promise<Category[]> {
  try {
    const res = await fetch('/api/categories?_t=' + Date.now(), { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    }
  } catch (err) {
    console.warn('[API] Error fetching categories from /api/categories:', err);
  }
  return INITIAL_CATEGORIES;
}

/**
 * Fetch products from Express API (/api/products)
 * Never contains source_price or supplier info (Rule 9).
 * Returns real database state (including [] when all products are deleted).
 */
export async function fetchProducts(): Promise<Product[]> {
  try {
    const res = await fetch('/api/products?_t=' + Date.now(), { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        return data;
      }
    }
  } catch (err) {
    console.warn('[API] Error fetching products from /api/products:', err);
  }
  return [];
}

/**
 * Fetch single product by slug from Express API (/api/products/:slug)
 */
export async function fetchProductBySlug(slug: string): Promise<Product | null> {
  try {
    const res = await fetch(`/api/products/${encodeURIComponent(slug)}?_t=` + Date.now(), { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data && data.id) {
        return data;
      }
    }
  } catch (err) {
    console.warn(`[API] Error fetching product ${slug} from /api/products/:slug:`, err);
  }
  return null;
}

/**
 * Submit Order via Express API (/api/orders)
 */
export async function createOrderApi(order: Order): Promise<Order> {
  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order),
    });
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (err) {
    console.warn('[API] Error creating order via API:', err);
  }
  return order;
}

/**
 * Track Order via Express API (/api/orders/:idOrNumber)
 */
export async function trackOrderApi(idOrNumber: string): Promise<Order | null> {
  try {
    const res = await fetch(`/api/orders/${encodeURIComponent(idOrNumber)}`);
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (err) {
    console.warn(`[API] Error tracking order ${idOrNumber}:`, err);
  }
  return null;
}

/**
 * Fetch Admin Products via Express API (/api/admin/products)
 */
export async function fetchAdminProductsApi(token: string): Promise<Product[]> {
  const res = await fetch('/api/admin/products?_t=' + Date.now(), {
    cache: 'no-store',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.details || errData.error || `Failed to fetch admin products (HTTP ${res.status})`);
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Clear All Admin Products via Express API (/api/admin/products)
 */
export async function clearAdminProductsApi(token: string): Promise<boolean> {
  const res = await fetch('/api/admin/products', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.details || errData.error || `Failed to clear catalog (HTTP ${res.status})`);
  }
  return true;
}

/**
 * Restore Sample Products via Express API (/api/admin/products/restore)
 */
export async function restoreAdminProductsApi(token: string): Promise<Product[]> {
  const res = await fetch('/api/admin/products/restore', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.details || errData.error || `Failed to restore sample products (HTTP ${res.status})`);
  }
  return await res.json();
}

/**
 * Save / Upsert Product via Express API (/api/admin/products)
 */
export async function saveAdminProductApi(product: Product, token: string): Promise<Product> {
  const res = await fetch('/api/admin/products', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(product),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.details || errData.error || `Failed to save product (HTTP ${res.status})`);
  }
  return await res.json();
}

/**
 * Delete Product via Express API (/api/admin/products/:id)
 */
export async function deleteAdminProductApi(productId: string, token: string): Promise<boolean> {
  const res = await fetch(`/api/admin/products/${encodeURIComponent(productId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.details || errData.error || `Failed to delete product (HTTP ${res.status})`);
  }
  return true;
}

/**
 * Fetch Admin Orders via Express API (/api/admin/orders)
 */
export async function fetchAdminOrdersApi(token: string): Promise<Order[]> {
  try {
    const res = await fetch('/api/admin/orders', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('[API] Error fetching admin orders:', err);
  }
  return [];
}

/**
 * Update Order Details (status, payment_status, courier, tracking) via Express API (/api/admin/orders/:id/status)
 */
export async function updateAdminOrderStatusApi(
  orderId: string,
  details: {
    status?: OrderStatus;
    payment_status?: PaymentStatus;
    courier_name?: string;
    tracking_number?: string;
    notes?: string;
  },
  token: string
): Promise<Order | null> {
  try {
    const res = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(details),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('[API] Error updating order status:', err);
  }
  return null;
}

