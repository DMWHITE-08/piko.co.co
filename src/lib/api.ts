import { Category, Order, Product } from '../types';
import { INITIAL_CATEGORIES, INITIAL_PRODUCTS } from '../data/initialData';

/**
 * Fetch categories from Express API (/api/categories)
 * Falls back to INITIAL_CATEGORIES if network error occurs.
 */
export async function fetchCategories(): Promise<Category[]> {
  try {
    const res = await fetch('/api/categories');
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
 * Falls back to INITIAL_PRODUCTS if network error occurs.
 */
export async function fetchProducts(): Promise<Product[]> {
  try {
    const res = await fetch('/api/products');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    }
  } catch (err) {
    console.warn('[API] Error fetching products from /api/products:', err);
  }
  return INITIAL_PRODUCTS;
}

/**
 * Fetch single product by slug from Express API (/api/products/:slug)
 * Falls back to INITIAL_PRODUCTS if network error occurs.
 */
export async function fetchProductBySlug(slug: string): Promise<Product | null> {
  try {
    const res = await fetch(`/api/products/${encodeURIComponent(slug)}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.id) {
        return data;
      }
    }
  } catch (err) {
    console.warn(`[API] Error fetching product ${slug} from /api/products/:slug:`, err);
  }
  const fallback = INITIAL_PRODUCTS.find((p) => p.slug === slug || p.id === slug);
  return fallback || null;
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
  try {
    const res = await fetch('/api/admin/products', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('[API] Error fetching admin products:', err);
  }
  return [];
}

/**
 * Save / Upsert Product via Express API (/api/admin/products)
 */
export async function saveAdminProductApi(product: Product, token: string): Promise<Product | null> {
  try {
    const res = await fetch('/api/admin/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(product),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('[API] Error saving admin product:', err);
  }
  return null;
}

/**
 * Delete Product via Express API (/api/admin/products/:id)
 */
export async function deleteAdminProductApi(productId: string, token: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/admin/products/${encodeURIComponent(productId)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      return true;
    }
  } catch (err) {
    console.warn('[API] Error deleting product:', err);
  }
  return false;
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
 * Update Order Status via Express API (/api/admin/orders/:id/status)
 */
export async function updateAdminOrderStatusApi(
  orderId: string,
  status: Order['order_status'],
  token: string,
  notes?: string
): Promise<Order | null> {
  try {
    const res = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status, notes }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('[API] Error updating order status:', err);
  }
  return null;
}

