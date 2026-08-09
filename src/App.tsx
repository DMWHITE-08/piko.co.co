import React, { useState, useEffect } from 'react';
import {
  initStorage,
  getStoredProducts,
  saveProducts,
  getStoredCategories,
  getStoredOrders,
  saveOrders,
  addOrder,
  updateOrderStatus,
  getStoredCart,
  saveCart,
  isAdminAuthenticated,
  setAdminAuth,
} from './lib/storage';
import {
  fetchProducts,
  fetchCategories,
  createOrderApi,
  saveAdminProductApi,
  deleteAdminProductApi,
  clearAdminProductsApi,
  restoreAdminProductsApi,
  updateAdminOrderStatusApi,
} from './lib/api';
import { CartItem, Category, Order, OrderStatus, PaymentStatus, Product } from './types';
import { INITIAL_PRODUCTS } from './data/initialData';
import { SiteHeader } from './components/SiteHeader';
import { SiteFooter } from './components/SiteFooter';
import { HeroBanner } from './components/HeroBanner';
import { ProductsBrowser } from './components/ProductsBrowser';
import { ProductDetailModal } from './components/ProductDetailModal';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { TrackOrderView } from './components/TrackOrderView';
import { InfoModal } from './components/InfoPages';
import { AdminLoginModal } from './components/admin/AdminLoginModal';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { generateId, generateOrderNumber } from './lib/utils';
import { CheckCircle2, Sparkles } from 'lucide-react';

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  // State
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  // View state
  const [activeView, setActiveView] = useState<'shop' | 'track' | 'admin'>('shop');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals / Drawers
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [infoModalType, setInfoModalType] = useState<'about' | 'faq' | 'shipping' | 'terms' | null>(null);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [appliedDiscount, setAppliedDiscount] = useState<number>(0);
  const [appliedPromoCode, setAppliedPromoCode] = useState<string>('');
  const [trackInitialOrder, setTrackInitialOrder] = useState<string>('');

  const triggerAdminAccess = () => {
    const authStatus = isAdminAuthenticated();
    if (authStatus) {
      setActiveView('admin');
      showToast('Admin Dashboard opened');
    } else {
      setIsAdminLoginOpen(true);
      showToast('Secret Admin Login opened');
    }
  };

  // Initial load & secret admin triggers
  useEffect(() => {
    initStorage();
    setOrders(getStoredOrders());
    setCart(getStoredCart());
    const authStatus = isAdminAuthenticated();
    setIsAdmin(authStatus);

    // Load products and categories directly from Express API / Supabase
    const refreshCatalog = () => {
      fetchProducts().then((prods) => {
        if (prods && Array.isArray(prods)) {
          setProducts(prods);
        }
      });
      fetchCategories().then((cats) => {
        if (cats && Array.isArray(cats)) {
          setCategories(cats);
        }
      });
    };

    refreshCatalog();

    // Auto-poll catalog every 6 seconds so clients receive admin updates live
    const pollInterval = setInterval(refreshCatalog, 6000);

    // Refetch on window focus
    const handleFocus = () => refreshCatalog();
    window.addEventListener('focus', handleFocus);

    // Secret URL check: ?admin=1 or #admin
    if (typeof window !== 'undefined') {
      const search = window.location.search;
      const hash = window.location.hash;
      if (search.includes('admin=') || hash.includes('admin')) {
        if (authStatus) {
          setActiveView('admin');
        } else {
          setIsAdminLoginOpen(true);
        }
      }
    }

    // Global keyboard listener (Ctrl+Shift+A or Alt+A)
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a') || (e.altKey && e.key.toLowerCase() === 'a')) {
        e.preventDefault();
        triggerAdminAccess();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleToggleDarkMode = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return next;
    });
  };

  // Cart operations
  const handleAddToCart = (product: Product, quantity = 1) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      let updated: CartItem[];
      if (existing) {
        updated = prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + quantity } : item
        );
      } else {
        updated = [...prev, { product, quantity }];
      }
      saveCart(updated);
      return updated;
    });
    showToast(`Added ${product.name} to bag!`);
  };

  const handleUpdateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveCartItem(productId);
      return;
    }
    setCart((prev) => {
      const updated = prev.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      );
      saveCart(updated);
      return updated;
    });
  };

  const handleRemoveCartItem = (productId: string) => {
    setCart((prev) => {
      const updated = prev.filter((item) => item.product.id !== productId);
      saveCart(updated);
      return updated;
    });
  };

  const handleBuyNow = (product: Product, quantity = 1) => {
    handleAddToCart(product, quantity);
    setIsCartOpen(true);
  };

  const handleOpenCheckout = (discount: number, promo: string) => {
    setAppliedDiscount(discount);
    setAppliedPromoCode(promo);
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  const handleOrderPlaced = async (newOrder: Order) => {
    // Save to local storage fallback
    const updated = addOrder(newOrder);
    setOrders(updated);
    setCart([]);
    saveCart([]);
    setIsCheckoutOpen(false);

    // Save to backend database via API
    await createOrderApi(newOrder);

    showToast(`Order ${newOrder.order_number} placed successfully!`);
    setTrackInitialOrder(newOrder.order_number);
    setActiveView('track');
  };

  // Admin Actions
  const handleAdminLoginSuccess = () => {
    setAdminAuth(true);
    setIsAdmin(true);
    setIsAdminLoginOpen(false);
    setActiveView('admin');
    showToast('Admin access granted!');
  };

  const handleLogoutAdmin = () => {
    setAdminAuth(false);
    setIsAdmin(false);
    setActiveView('shop');
    showToast('Logged out of Admin');
  };

  const handleUpdateOrderStatus = async (
    orderId: string,
    detailsOrStatus: OrderStatus | {
      status?: OrderStatus;
      payment_status?: PaymentStatus;
      courier_name?: string;
      tracking_number?: string;
      notes?: string;
    },
    legacyNotes?: string
  ) => {
    let status: OrderStatus | undefined;
    let payment_status: PaymentStatus | undefined;
    let courier_name: string | undefined;
    let tracking_number: string | undefined;
    let notes: string | undefined;

    if (typeof detailsOrStatus === 'string') {
      status = detailsOrStatus;
      notes = legacyNotes;
    } else {
      status = detailsOrStatus.status;
      payment_status = detailsOrStatus.payment_status;
      courier_name = detailsOrStatus.courier_name;
      tracking_number = detailsOrStatus.tracking_number;
      notes = detailsOrStatus.notes;
    }

    // Local state update
    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id !== orderId) return ord;
        return {
          ...ord,
          ...(status ? { order_status: status } : {}),
          ...(payment_status ? { payment_status } : {}),
          ...(courier_name !== undefined ? { courier_name } : {}),
          ...(tracking_number !== undefined ? { tracking_number } : {}),
          updated_at: new Date().toISOString(),
        };
      })
    );

    // Call API
    await updateAdminOrderStatusApi(
      orderId,
      { status, payment_status, courier_name, tracking_number, notes },
      'piko_admin_session_valid'
    );

    showToast('Order details updated');
  };

  const handleAddProduct = async (newProd: Product) => {
    setProducts((prev) => [newProd, ...prev.filter((p) => p.id !== newProd.id)]);
    showToast(`Added ${newProd.name} to store!`);

    await saveAdminProductApi(newProd, 'piko_admin_session_valid');
    const fresh = await fetchProducts();
    if (fresh && fresh.length > 0) {
      setProducts(fresh);
    }
  };

  const handleUpdateProduct = async (updatedProd: Product) => {
    setProducts((prev) => prev.map((p) => (p.id === updatedProd.id ? updatedProd : p)));
    showToast(`Updated ${updatedProd.name}`);

    await saveAdminProductApi(updatedProd, 'piko_admin_session_valid');
    const fresh = await fetchProducts();
    if (fresh && fresh.length > 0) {
      setProducts(fresh);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== productId));
    showToast('Product removed');

    await deleteAdminProductApi(productId, 'piko_admin_session_valid');
    const fresh = await fetchProducts();
    setProducts(fresh);
  };

  const handleClearAllProducts = async () => {
    setProducts([]);
    await clearAdminProductsApi('piko_admin_session_valid');
    showToast('Catalog cleared from database!');
  };

  const handleRestoreSampleProducts = async () => {
    setProducts(INITIAL_PRODUCTS);
    showToast('Loading demo products...');

    const restored = await restoreAdminProductsApi('piko_admin_session_valid');
    if (restored && restored.length > 0) {
      setProducts(restored);
    } else {
      const fresh = await fetchProducts();
      if (fresh && fresh.length > 0) {
        setProducts(fresh);
      }
    }
    showToast('Restored default demo products!');
  };

  const handleClearAllOrders = () => {
    setOrders([]);
    saveOrders([]);
    showToast('All order history cleared!');
  };

  const handleGenerateDemoOrder = () => {
    if (products.length === 0) return;
    const randomProduct = products[Math.floor(Math.random() * products.length)];
    const orderNum = generateOrderNumber();
    const now = new Date().toISOString();

    const names = ['Ananya Sharma', 'Rahul Verma', 'Sneha Kapoor', 'Vikas Gupta', 'Meera Nair'];
    const randomName = names[Math.floor(Math.random() * names.length)];

    const demoOrder: Order = {
      id: generateId(),
      order_number: orderNum,
      customer_name: randomName,
      customer_email: `${randomName.toLowerCase().replace(' ', '.')}@example.com`,
      customer_phone: '+91 98765 ' + Math.floor(10000 + Math.random() * 90000),
      shipping_address: {
        address: '42 Lotus Garden, Indiranagar',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560038',
      },
      items: [
        {
          product_id: randomProduct.id,
          product_name: randomProduct.name,
          product_slug: randomProduct.slug,
          product_image: randomProduct.images[0],
          quantity: 1,
          selling_price: randomProduct.selling_price,
        },
      ],
      subtotal: randomProduct.selling_price,
      discount_amount: 0,
      shipping_fee: 0,
      total_amount: randomProduct.selling_price,
      payment_method: 'upi',
      payment_status: 'paid',
      order_status: 'processing',
      tracking_events: [
        {
          status: 'processing',
          description: 'Simulated demo order created',
          occurred_at: now,
        },
      ],
      created_at: now,
      updated_at: now,
    };

    const updated = addOrder(demoOrder);
    setOrders(updated);
    showToast(`Simulated Order ${orderNum} added!`);
  };

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors flex flex-col justify-between">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 rounded-2xl bg-foreground text-background px-4 py-3 text-xs font-bold shadow-2xl piko-fade-up">
          <Sparkles className="size-4 text-rose animate-spin" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main App Navigation or Admin Mode */}
      {activeView !== 'admin' && (
        <SiteHeader
          cartCount={cart.reduce((s, i) => s + i.quantity, 0)}
          onOpenCart={() => setIsCartOpen(true)}
          onOpenAdmin={triggerAdminAccess}
          isAdmin={isAdmin}
          onSelectCategory={(slug) => {
            setActiveCategory(slug);
            setActiveView('shop');
          }}
          activeCategory={activeCategory}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onNavigateHome={() => setActiveView('shop')}
          onNavigateTrack={() => setActiveView('track')}
          activeView={activeView}
          isDarkMode={isDarkMode}
          onToggleDarkMode={handleToggleDarkMode}
        />
      )}

      {/* View Routing */}
      <main className="flex-1">
        {activeView === 'admin' && isAdmin ? (
          <AdminDashboard
            orders={orders}
            products={products}
            categories={categories}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            onDeleteProduct={handleDeleteProduct}
            onClearAllProducts={handleClearAllProducts}
            onRestoreSampleProducts={handleRestoreSampleProducts}
            onClearAllOrders={handleClearAllOrders}
            onGenerateDemoOrder={handleGenerateDemoOrder}
            onLogoutAdmin={handleLogoutAdmin}
            onBackToShop={() => setActiveView('shop')}
            onShowToast={showToast}
          />
        ) : activeView === 'track' ? (
          <TrackOrderView
            orders={orders}
            initialOrderNumber={trackInitialOrder}
            onBackToShop={() => setActiveView('shop')}
          />
        ) : (
          <>
            {/* Hero Banner only when no search and on all products */}
            {!searchQuery && activeCategory === 'all' && (
              <HeroBanner
                onSelectCategory={(slug) => setActiveCategory(slug)}
                onExploreAll={() => setActiveCategory('all')}
              />
            )}

            {/* Products Browser */}
            <ProductsBrowser
              products={products}
              categories={categories}
              activeCategory={activeCategory}
              onSelectCategory={setActiveCategory}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onQuickView={(p) => setSelectedProduct(p)}
              onAddToCart={(p, e) => {
                e.stopPropagation();
                handleAddToCart(p, 1);
              }}
            />
          </>
        )}
      </main>

      {/* Footer */}
      {activeView !== 'admin' && (
        <SiteFooter
          onOpenAdmin={triggerAdminAccess}
          onNavigateTrack={() => setActiveView('track')}
          onOpenInfoModal={(type) => setInfoModalType(type)}
        />
      )}

      {/* Modals & Overlays */}
      <ProductDetailModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={(p, q) => handleAddToCart(p, q)}
        onBuyNow={(p, q) => handleBuyNow(p, q)}
      />

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onCheckout={handleOpenCheckout}
      />

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        cart={cart}
        appliedDiscount={appliedDiscount}
        promoCode={appliedPromoCode}
        onOrderPlaced={handleOrderPlaced}
      />

      <AdminLoginModal
        isOpen={isAdminLoginOpen}
        onClose={() => setIsAdminLoginOpen(false)}
        onLoginSuccess={handleAdminLoginSuccess}
      />

      <InfoModal type={infoModalType} onClose={() => setInfoModalType(null)} />
    </div>
  );
}
