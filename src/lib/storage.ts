import { CartItem, Category, Order, Product } from '../types';
import { INITIAL_CATEGORIES, INITIAL_ORDERS, INITIAL_PRODUCTS } from '../data/initialData';

const STORAGE_KEYS = {
  PRODUCTS: 'piko_products_v1',
  CATEGORIES: 'piko_categories_v1',
  ORDERS: 'piko_orders_v1',
  CART: 'piko_cart_v1',
  ADMIN_AUTH: 'piko_admin_authenticated_v1',
};

// Initialize Storage
export function initStorage() {
  if (typeof window === 'undefined') return;

  // Clear stale products and categories from localStorage
  localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
  localStorage.removeItem(STORAGE_KEYS.CATEGORIES);

  if (!localStorage.getItem(STORAGE_KEYS.ORDERS)) {
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(INITIAL_ORDERS));
  }
}

// Products (Supabase is single source of truth)
export function getStoredProducts(): Product[] {
  return [];
}

export function saveProducts(_products: Product[]) {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
}

// Categories
export function getStoredCategories(): Category[] {
  return INITIAL_CATEGORIES;
}

export function saveCategories(_categories: Category[]) {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEYS.CATEGORIES);
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
