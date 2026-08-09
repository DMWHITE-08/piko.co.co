import React, { useState } from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  BarChart2,
  LogOut,
  Sparkles,
  ShieldCheck,
  ArrowLeft,
  Settings,
} from 'lucide-react';
import { Category, Order, OrderStatus, PaymentStatus, Product } from '../../types';
import { AdminOverview } from './AdminOverview';
import { AdminOrdersTable } from './AdminOrdersTable';
import { AdminProductsManager } from './AdminProductsManager';
import { AdminAnalytics } from './AdminAnalytics';
import { AdminSettingsTab } from './AdminSettingsTab';

interface AdminDashboardProps {
  orders: Order[];
  products: Product[];
  categories: Category[];
  onUpdateOrderStatus: (
    orderId: string,
    details: {
      status?: OrderStatus;
      payment_status?: PaymentStatus;
      courier_name?: string;
      tracking_number?: string;
      notes?: string;
    }
  ) => void;
  onAddProduct: (product: Product) => void;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onClearAllProducts: () => void;
  onRestoreSampleProducts: () => void;
  onClearAllOrders: () => void;
  onGenerateDemoOrder: () => void;
  onLogoutAdmin: () => void;
  onBackToShop: () => void;
  onShowToast?: (msg: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  orders,
  products,
  categories,
  onUpdateOrderStatus,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onClearAllProducts,
  onRestoreSampleProducts,
  onClearAllOrders,
  onGenerateDemoOrder,
  onLogoutAdmin,
  onBackToShop,
  onShowToast = () => {},
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'products' | 'analytics' | 'settings'>('overview');

  const unverifiedCount = orders.filter((o) => o.payment_status === 'pending_verification' || o.order_status === 'pending_verification').length;

  return (
    <div className="min-h-screen bg-background py-8 piko-fade-up">
      <div className="piko-container space-y-6">
        {/* Top Control Header */}
        <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToShop}
              className="grid size-9 place-items-center rounded-2xl bg-secondary text-foreground hover:bg-rose/10 hover:text-rose transition-colors"
              title="Return to Customer Shop"
            >
              <ArrowLeft className="size-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-2xl font-extrabold text-foreground">PIKO Admin</span>
                <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="size-3" /> Authenticated
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Store Order Management & Inventory Control</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onGenerateDemoOrder}
              className="flex items-center gap-1.5 rounded-2xl bg-rose/10 border border-rose/30 px-3.5 py-2 text-xs font-bold text-rose hover:bg-rose hover:text-rose-foreground transition-all"
            >
              <Sparkles className="size-3.5" />
              <span>Simulate Order</span>
            </button>

            <button
              onClick={onLogoutAdmin}
              className="flex items-center gap-1.5 rounded-2xl bg-secondary px-3.5 py-2 text-xs font-bold text-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <LogOut className="size-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-border/80 pb-2 overflow-x-auto no-scrollbar">
          {[
            { id: 'overview', label: 'Overview', icon: LayoutDashboard },
            { id: 'orders', label: `Orders (${orders.length})`, icon: ShoppingCart, badge: unverifiedCount },
            { id: 'products', label: `Products (${products.length})`, icon: Package },
            { id: 'analytics', label: 'Sales Charts', icon: BarChart2 },
            { id: 'settings', label: 'Store & UPI Settings', icon: Settings },
          ].map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`relative flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-rose text-rose-foreground shadow-md'
                    : 'bg-secondary text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="size-4" />
                <span>{t.label}</span>
                {t.badge && t.badge > 0 ? (
                  <span className="grid size-4.5 min-w-4.5 place-items-center rounded-full bg-amber-500 text-[10px] font-extrabold text-white">
                    {t.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Tab Contents */}
        {activeTab === 'overview' && (
          <AdminOverview
            orders={orders}
            productsCount={products.length}
            onGenerateDemoOrder={onGenerateDemoOrder}
            onClearAllOrders={onClearAllOrders}
            onClearAllProducts={onClearAllProducts}
            onRestoreSampleProducts={onRestoreSampleProducts}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'orders' && (
          <AdminOrdersTable
            orders={orders}
            onUpdateStatus={onUpdateOrderStatus}
            onClearAllOrders={onClearAllOrders}
          />
        )}

        {activeTab === 'products' && (
          <AdminProductsManager
            products={products}
            categories={categories}
            onAddProduct={onAddProduct}
            onUpdateProduct={onUpdateProduct}
            onDeleteProduct={onDeleteProduct}
            onClearAllProducts={onClearAllProducts}
            onRestoreSampleProducts={onRestoreSampleProducts}
          />
        )}

        {activeTab === 'analytics' && <AdminAnalytics orders={orders} />}

        {activeTab === 'settings' && <AdminSettingsTab onShowToast={onShowToast} />}
      </div>
    </div>
  );
};
