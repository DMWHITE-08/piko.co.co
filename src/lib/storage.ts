import { CartItem, Category, Order, Product } from '../types';
import { INITIAL_CATEGORIES, INITIAL_ORDERS, INITIAL_PRODUCTS } from '../data/initialData';

const STORAGE_KEYS = {
  PRODUCTS: 'piko_products_v1',
  CATEGORIES: 'piko_categories_v1',
  ORDERS: 'piko_orders_v1',
  CART: 'piko_cart_v1',
  ADMIN_AUTH: 'piko_admin_authenticated_v1',
};

// Initialize Storage with sample data if empty
export function initStorage() {
  if (typeof window === 'undefined') return;

  if (!localStorage.getItem(STORAGE_KEYS.PRODUCTS)) {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.CATEGORIES)) {
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(INITIAL_CATEGORIES));
  }
  if (!localStorage.getItem(STORAGE_KEYS.ORDERS)) {
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(INITIAL_ORDERS));
  }
}

// Products
export function getStoredProducts(): Product[] {
  if (typeof window === 'undefined') return INITIAL_PRODUCTS;
  const raw = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
  if (!raw) {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
    return INITIAL_PRODUCTS;
  }
  try {
    const stored: Product[] = JSON.parse(raw);
    const existingIds = new Set(stored.map((p) => p.id));
    const missing = INITIAL_PRODUCTS.filter((p) => !existingIds.has(p.id));
    if (missing.length > 0) {
      const merged = [...stored, ...missing];
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(merged));
      return merged;
    }
    return stored;
  } catch {
    return INITIAL_PRODUCTS;
  }
}

export function saveProducts(products: Product[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
}

// Categories
export function getStoredCategories(): Category[] {
  if (typeof window === 'undefined') return INITIAL_CATEGORIES;
  const raw = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
  if (!raw) {
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(INITIAL_CATEGORIES));
    return INITIAL_CATEGORIES;
  }
  try {
    const stored: Category[] = JSON.parse(raw);
    const existingIds = new Set(stored.map((c) => c.id));
    const missing = INITIAL_CATEGORIES.filter((c) => !existingIds.has(c.id));
    if (missing.length > 0) {
      const merged = [...stored, ...missing];
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(merged));
      return merged;
    }
    return stored;
  } catch {
    return INITIAL_CATEGORIES;
  }
}

export function saveCategories(categories: Category[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
}

// Orders
export function getStoredOrders(): Order[] {
  if (typeof window === 'undefined') return INITIAL_ORDERS;
  const raw = localStorage.getItem(STORAGE_KEYS.ORDERS);
  if (!raw) {
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(INITIAL_ORDERS));
    return INITIAL_ORDERS;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return INITIAL_ORDERS;
  }
}

export function saveOrders(orders: Order[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
}

export function addOrder(newOrder: Order) {
  const currentOrders = getStoredOrders();
  const updated = [newOrder, ...currentOrders];
  saveOrders(updated);
  return updated;
}

export function updateOrderStatus(orderId: string, status: Order['order_status'], notes?: string) {
  const currentOrders = getStoredOrders();
  const updated = currentOrders.map((ord) => {
    if (ord.id === orderId || ord.order_number === orderId) {
      const now = new Date().toISOString();
      const newEvent = {
        status,
        description: notes || `Order status updated to ${status.replace(/_/g, ' ')}`,
        occurred_at: now,
      };
      return {
        ...ord,
        order_status: status,
        updated_at: now,
        tracking_events: [newEvent, ...ord.tracking_events],
      };
    }
    return ord;
  });
  saveOrders(updated);
  return updated;
}

// Cart
export function getStoredCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(STORAGE_KEYS.CART);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveCart(cart: CartItem[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart));
}

// Admin Auth
export function isAdminAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEYS.ADMIN_AUTH) === 'true';
}

export function setAdminAuth(auth: boolean) {
  if (typeof window === 'undefined') return;
  if (auth) {
    localStorage.setItem(STORAGE_KEYS.ADMIN_AUTH, 'true');
  } else {
    localStorage.removeItem(STORAGE_KEYS.ADMIN_AUTH);
  }
}
