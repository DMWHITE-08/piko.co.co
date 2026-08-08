import React, { useState } from 'react';
import { Search, PackageCheck, Truck, CheckCircle2, Clock, MapPin, ArrowLeft } from 'lucide-react';
import { Order, OrderStatus } from '../types';
import { formatDate, formatINR } from '../lib/utils';

interface TrackOrderViewProps {
  orders: Order[];
  initialOrderNumber?: string;
  onBackToShop: () => void;
}

const STATUS_STEPS: { status: OrderStatus; label: string }[] = [
  { status: 'processing', label: 'Confirmed & Packing' },
  { status: 'shipped', label: 'Shipped with Courier' },
  { status: 'out_for_delivery', label: 'Out for Delivery' },
  { status: 'delivered', label: 'Delivered' },
];

export const TrackOrderView: React.FC<TrackOrderViewProps> = ({
  orders,
  initialOrderNumber = '',
  onBackToShop,
}) => {
  const [searchInput, setSearchInput] = useState(initialOrderNumber);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(() => {
    if (initialOrderNumber) {
      return orders.find((o) => o.order_number.toLowerCase() === initialOrderNumber.toLowerCase()) || null;
    }
    return orders[0] || null;
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchInput.trim().toLowerCase();
    if (!query) return;

    const match = orders.find(
      (o) =>
        o.order_number.toLowerCase() === query ||
        o.customer_phone.replaceAll(' ', '').includes(query) ||
        o.customer_email.toLowerCase().includes(query)
    );
    setSelectedOrder(match || null);
  };

  const getStepState = (orderStatus: OrderStatus, stepStatus: OrderStatus) => {
    const orderIndex = STATUS_STEPS.findIndex((s) => s.status === orderStatus);
    const stepIndex = STATUS_STEPS.findIndex((s) => s.status === stepStatus);

    if (orderStatus === 'cancelled') return 'cancelled';
    if (stepIndex < orderIndex) return 'completed';
    if (stepIndex === orderIndex) return 'current';
    return 'upcoming';
  };

  return (
    <div className="py-10 piko-fade-up">
      <div className="piko-container max-w-4xl space-y-6">
        <button
          onClick={onBackToShop}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to Store
        </button>

        <div className="rounded-3xl border border-border bg-card p-6 shadow-lift">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <span className="rounded-full bg-rose/10 px-3 py-1 text-xs font-bold text-rose">
                Live Package Tracker
              </span>
              <h2 className="mt-2 font-display text-2xl font-bold text-foreground">
                Track Your PIKO Order
              </h2>
              <p className="text-xs text-muted-foreground">
                Enter your Order ID (e.g., PK-8291) or registered phone number.
              </p>
            </div>

            {/* Search Form */}
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Order ID / Phone..."
                  className="h-10 w-full rounded-2xl border border-border bg-secondary pl-9 pr-3 text-xs outline-none focus:ring-1 focus:ring-rose"
                />
              </div>
              <button
                type="submit"
                className="h-10 rounded-2xl bg-rose px-5 text-xs font-bold text-rose-foreground hover:bg-rose/90 shadow-sm"
              >
                Track
              </button>
            </form>
          </div>

          {selectedOrder ? (
            <div className="mt-8 space-y-8 border-t border-border pt-6">
              {/* Order Meta Header */}
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-secondary/50 p-4">
                <div>
                  <span className="text-xs font-semibold text-muted-foreground">Order Reference</span>
                  <p className="font-display text-xl font-bold text-foreground">{selectedOrder.order_number}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Placed on {formatDate(selectedOrder.created_at)}
                  </p>
                </div>

                <div>
                  <span className="text-xs font-semibold text-muted-foreground">Recipient</span>
                  <p className="text-sm font-bold text-foreground">{selectedOrder.customer_name}</p>
                  <p className="text-xs text-muted-foreground">{selectedOrder.customer_phone}</p>
                </div>

                <div>
                  <span className="text-xs font-semibold text-muted-foreground">Order Status</span>
                  <div className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-rose/10 px-3 py-1 text-xs font-bold text-rose capitalize">
                    <PackageCheck className="size-3.5" />
                    {selectedOrder.order_status.replace(/_/g, ' ')}
                  </div>
                </div>
              </div>

              {/* Visual Tracker Timeline */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Delivery Timeline
                </h3>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {STATUS_STEPS.map((step) => {
                    const state = getStepState(selectedOrder.order_status, step.status);
                    return (
                      <div
                        key={step.status}
                        className={`flex flex-col items-center justify-center rounded-2xl border p-4 text-center transition-all ${
                          state === 'completed'
                            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : state === 'current'
                            ? 'border-rose bg-rose/10 text-rose font-bold shadow-md'
                            : 'border-border/60 bg-secondary/30 text-muted-foreground opacity-60'
                        }`}
                      >
                        {state === 'completed' ? (
                          <CheckCircle2 className="size-6 text-emerald-500 mb-1" />
                        ) : state === 'current' ? (
                          <Truck className="size-6 text-rose mb-1 animate-bounce" />
                        ) : (
                          <Clock className="size-6 mb-1" />
                        )}
                        <span className="text-xs font-semibold">{step.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Courier info if available */}
              {selectedOrder.tracking_number && (
                <div className="flex items-center gap-3 rounded-2xl border border-rose/30 bg-rose/5 p-4 text-xs">
                  <Truck className="size-5 text-rose shrink-0" />
                  <div>
                    <span className="font-bold text-foreground">
                      Courier Partner: {selectedOrder.courier_name || 'Express Courier'}
                    </span>
                    <p className="text-muted-foreground">
                      Airway Bill (AWB) / Tracking No: <strong className="text-rose">{selectedOrder.tracking_number}</strong>
                    </p>
                  </div>
                </div>
              )}

              {/* Address & Item breakdown */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* Address */}
                <div className="rounded-2xl border border-border p-4 space-y-2 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-foreground">
                    <MapPin className="size-4 text-rose" /> Shipping Address
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    {selectedOrder.shipping_address.address}, {selectedOrder.shipping_address.city},{' '}
                    {selectedOrder.shipping_address.state} - {selectedOrder.shipping_address.pincode}
                  </p>
                </div>

                {/* Items */}
                <div className="rounded-2xl border border-border p-4 space-y-3 text-xs">
                  <div className="font-bold text-foreground">Itemized Order Summary</div>
                  <div className="space-y-2">
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between border-b border-border/40 pb-2">
                        <div className="flex items-center gap-2">
                          <img
                            src={item.product_image}
                            alt=""
                            className="size-9 rounded-lg object-cover"
                          />
                          <div>
                            <p className="font-bold text-foreground line-clamp-1">{item.product_name}</p>
                            <p className="text-[10px] text-muted-foreground">Qty: {item.quantity}</p>
                          </div>
                        </div>
                        <span className="font-bold text-foreground">
                          {formatINR(item.selling_price * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between font-extrabold text-sm pt-1 text-foreground">
                    <span>Total Paid:</span>
                    <span className="text-rose">{formatINR(selectedOrder.total_amount)}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              <PackageCheck className="size-12 mx-auto text-muted-foreground/40 mb-2" />
              <p className="font-display text-base font-bold text-foreground">No order found</p>
              <p className="text-xs">
                Check your Order ID in your confirmation SMS or enter your phone number above.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
