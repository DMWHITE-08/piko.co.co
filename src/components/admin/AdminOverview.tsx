import React from 'react';
import { IndianRupee, ShoppingCart, TrendingUp, AlertCircle, Sparkles, Clock, CheckCircle2, PackageCheck } from 'lucide-react';
import { Order } from '../../types';
import { formatINR } from '../../lib/utils';

interface AdminOverviewProps {
  orders: Order[];
  productsCount: number;
  onGenerateDemoOrder: () => void;
  onClearAllOrders: () => void;
  onClearAllProducts: () => void;
  onRestoreSampleProducts: () => void;
  onNavigateTab: (tab: 'orders' | 'products' | 'analytics') => void;
}

export const AdminOverview: React.FC<AdminOverviewProps> = ({
  orders,
  productsCount,
  onGenerateDemoOrder,
  onClearAllOrders,
  onClearAllProducts,
  onRestoreSampleProducts,
  onNavigateTab,
}) => {
  const totalRevenue = orders.reduce((sum, o) => sum + (o.payment_status === 'paid' ? o.total_amount : 0), 0);
  const totalOrders = orders.length;
  const averageOrderValue = totalOrders > 0 ? Math.round(totalRevenue / (orders.filter(o => o.payment_status === 'paid').length || 1)) : 0;
  const pendingOrders = orders.filter((o) => o.order_status === 'processing' || o.order_status === 'shipped');

  // Today sales
  const today = new Date().toISOString().split('T')[0];
  const todayOrders = orders.filter((o) => o.created_at.startsWith(today));
  const todaySales = todayOrders.reduce((sum, o) => sum + o.total_amount, 0);

  return (
    <div className="space-y-6 piko-fade-up">
      {/* Top Banner with Quick Actions */}
      <div className="flex flex-col gap-4 rounded-3xl border border-rose/30 bg-gradient-to-r from-rose/10 via-background to-secondary p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <span className="rounded-full bg-rose px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-rose-foreground">
            Store Performance
          </span>
          <h2 className="mt-2 font-display text-2xl font-bold text-foreground">
            Order Dashboard & Revenue Overview
          </h2>
          <p className="text-xs text-muted-foreground">
            Real-time tracking of customer sales, order fulfillment status, and inventory.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {productsCount > 0 ? (
            <button
              onClick={() => {
                if (window.confirm('Clear all products to start with a clean store catalog?')) {
                  onClearAllProducts();
                }
              }}
              className="flex items-center gap-1.5 rounded-2xl bg-destructive/10 border border-destructive/20 px-3.5 py-2.5 text-xs font-bold text-destructive hover:bg-destructive hover:text-white transition-all"
            >
              <span>Clear Products Catalog</span>
            </button>
          ) : (
            <button
              onClick={onRestoreSampleProducts}
              className="flex items-center gap-1.5 rounded-2xl bg-secondary border border-border px-3.5 py-2.5 text-xs font-bold text-foreground hover:bg-rose/10 hover:text-rose transition-all"
            >
              <Sparkles className="size-3.5 text-rose" />
              <span>Load Sample Products</span>
            </button>
          )}

          {orders.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm('Clear all order history?')) {
                  onClearAllOrders();
                }
              }}
              className="flex items-center gap-1.5 rounded-2xl bg-secondary border border-border px-3.5 py-2.5 text-xs font-bold text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
            >
              <span>Wipe Orders History</span>
            </button>
          )}

          <button
            onClick={onGenerateDemoOrder}
            className="flex items-center gap-2 rounded-2xl bg-rose px-4 py-2.5 text-xs font-bold text-rose-foreground shadow-md hover:bg-rose/90 transition-all active:scale-95"
          >
            <Sparkles className="size-4" />
            <span>Simulate Test Order</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Metric 1 */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Total Revenue
            </span>
            <div className="grid size-9 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <IndianRupee className="size-4" />
            </div>
          </div>
          <p className="mt-3 font-display text-2xl font-extrabold text-foreground">
            {formatINR(totalRevenue)}
          </p>
          <p className="mt-1 text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
            <TrendingUp className="size-3" /> Paid customer orders
          </p>
        </div>

        {/* Metric 2 */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Total Orders
            </span>
            <div className="grid size-9 place-items-center rounded-xl bg-rose/10 text-rose">
              <ShoppingCart className="size-4" />
            </div>
          </div>
          <p className="mt-3 font-display text-2xl font-extrabold text-foreground">
            {totalOrders}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {todayOrders.length} orders received today
          </p>
        </div>

        {/* Metric 3 */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Avg Order Value
            </span>
            <div className="grid size-9 place-items-center rounded-xl bg-amber-500/10 text-amber-600">
              <TrendingUp className="size-4" />
            </div>
          </div>
          <p className="mt-3 font-display text-2xl font-extrabold text-foreground">
            {formatINR(averageOrderValue)}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">Per completed checkout</p>
        </div>

        {/* Metric 4 */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Pending Fulfillment
            </span>
            <div className="grid size-9 place-items-center rounded-xl bg-rose/10 text-rose">
              <Clock className="size-4" />
            </div>
          </div>
          <p className="mt-3 font-display text-2xl font-extrabold text-rose">
            {pendingOrders.length}
          </p>
          <p className="mt-1 text-[11px] text-rose font-semibold">
            Requires packing or shipping
          </p>
        </div>
      </div>

      {/* Recent Orders Feed */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-soft space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg font-bold text-foreground">Recent Customer Orders</h3>
            <p className="text-xs text-muted-foreground">Latest transactions placed in your store</p>
          </div>
          <button
            onClick={() => onNavigateTab('orders')}
            className="rounded-full bg-secondary px-4 py-1.5 text-xs font-bold text-foreground hover:bg-rose hover:text-rose-foreground transition-all"
          >
            Manage All Orders
          </button>
        </div>

        <div className="grid gap-3">
          {orders.slice(0, 4).map((ord) => (
            <div
              key={ord.id}
              onClick={() => onNavigateTab('orders')}
              className="flex items-center justify-between rounded-2xl border border-border/80 bg-secondary/30 p-3 hover:bg-secondary/80 transition-colors cursor-pointer text-xs"
            >
              <div className="flex items-center gap-3">
                <div className="grid size-9 place-items-center rounded-xl bg-rose/10 text-rose font-bold">
                  <PackageCheck className="size-4" />
                </div>
                <div>
                  <p className="font-bold text-foreground">{ord.order_number} • {ord.customer_name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {ord.items.length} items • {ord.payment_method.toUpperCase()}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <p className="font-extrabold text-foreground">{formatINR(ord.total_amount)}</p>
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${
                    ord.order_status === 'delivered'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : ord.order_status === 'shipped'
                      ? 'bg-amber-500/10 text-amber-600'
                      : 'bg-rose/10 text-rose'
                  }`}
                >
                  {ord.order_status.replace(/_/g, ' ')}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
