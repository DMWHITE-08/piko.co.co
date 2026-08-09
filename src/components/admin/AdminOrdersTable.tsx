import React, { useState, useMemo } from 'react';
import { Search, Filter, Eye, Truck, CheckCircle2, Clock, XCircle, ArrowUpDown, FileText, X, AlertTriangle, ShieldCheck, MessageCircle } from 'lucide-react';
import { Order, OrderStatus, PaymentStatus } from '../../types';
import { formatDate, formatINR } from '../../lib/utils';

interface AdminOrdersTableProps {
  orders: Order[];
  onUpdateStatus: (
    orderId: string,
    details: {
      status?: OrderStatus;
      payment_status?: PaymentStatus;
      courier_name?: string;
      tracking_number?: string;
      notes?: string;
    }
  ) => void;
  onClearAllOrders?: () => void;
}

export const AdminOrdersTable: React.FC<AdminOrdersTableProps> = ({
  orders,
  onUpdateStatus,
  onClearAllOrders,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<Order | null>(null);

  // Editable tracking state for selected order modal
  const [courierInput, setCourierInput] = useState('');
  const [trackingInput, setTrackingInput] = useState('');

  const unverifiedOrders = useMemo(() => {
    return orders.filter((o) => o.payment_status === 'pending_verification' || o.order_status === 'pending_verification');
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((ord) => {
      if (statusFilter === 'unverified') {
        return ord.payment_status === 'pending_verification' || ord.order_status === 'pending_verification';
      }
      if (statusFilter !== 'all' && ord.order_status !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          ord.order_number.toLowerCase().includes(q) ||
          ord.customer_name.toLowerCase().includes(q) ||
          ord.customer_phone.includes(q) ||
          ord.customer_email.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [orders, statusFilter, searchQuery]);

  const handleVerifyPayment = (orderId: string) => {
    onUpdateStatus(orderId, {
      payment_status: 'paid',
      status: 'payment_verified',
      notes: 'Payment verified manually by admin.',
    });
  };

  const handleOpenOrderModal = (ord: Order) => {
    setSelectedOrderDetails(ord);
    setCourierInput(ord.courier_name || '');
    setTrackingInput(ord.tracking_number || '');
  };

  const handleSaveShippingDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedOrderDetails) {
      onUpdateStatus(selectedOrderDetails.id, {
        courier_name: courierInput,
        tracking_number: trackingInput,
        status: trackingInput ? 'shipped' : selectedOrderDetails.order_status,
        notes: `Shipped via ${courierInput || 'Courier'} (Tracking: ${trackingInput})`,
      });
      setSelectedOrderDetails(null);
    }
  };

  return (
    <div className="space-y-6 piko-fade-up">
      {/* Alert banner for unverified UPI orders */}
      {unverifiedOrders.length > 0 && (
        <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-2xl bg-amber-500 text-white shrink-0">
              <AlertTriangle className="size-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-sm text-foreground">
                {unverifiedOrders.length} New Unverified UPI Order{unverifiedOrders.length > 1 ? 's' : ''}!
              </h3>
              <p className="text-xs text-muted-foreground">
                Customers submitted these orders via UPI. Please verify the payments in your bank app and approve them.
              </p>
            </div>
          </div>
          <button
            onClick={() => setStatusFilter('unverified')}
            className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-extrabold text-white hover:bg-amber-600 transition-all shrink-0"
          >
            Review Unverified Orders
          </button>
        </div>
      )}

      {/* Header & Search / Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Order Management</h2>
          <p className="text-xs text-muted-foreground">
            View orders, manually verify UPI payments, add courier tracking numbers, and manage fulfillment.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {orders.length > 0 && onClearAllOrders && (
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to clear all order history?')) {
                  onClearAllOrders();
                }
              }}
              className="rounded-2xl border border-destructive/20 bg-destructive/10 px-3.5 py-2 text-xs font-bold text-destructive hover:bg-destructive hover:text-white transition-all whitespace-nowrap"
            >
              Clear Order History
            </button>
          )}

          {/* Search */}
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Order ID, Name, Phone…"
              className="h-10 w-full rounded-2xl border border-border bg-card pl-9 pr-3 text-xs outline-none focus:ring-1 focus:ring-rose"
            />
          </div>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-2">
        {[
          { id: 'all', label: 'All Orders' },
          { id: 'unverified', label: `Unverified Payments (${unverifiedOrders.length})` },
          { id: 'payment_verified', label: 'Payment Verified' },
          { id: 'processing', label: 'Processing' },
          { id: 'shipped', label: 'Shipped' },
          { id: 'out_for_delivery', label: 'Out for Delivery' },
          { id: 'delivered', label: 'Delivered' },
          { id: 'cancelled', label: 'Cancelled' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setStatusFilter(t.id)}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition-all whitespace-nowrap ${
              statusFilter === t.id
                ? 'bg-rose text-rose-foreground shadow-sm'
                : t.id === 'unverified' && unverifiedOrders.length > 0
                ? 'bg-amber-500/10 text-amber-600 border border-amber-500/30'
                : 'bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Responsive Table */}
      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-secondary/50 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-4">Order ID & Date</th>
                <th className="p-4">Customer Details</th>
                <th className="p-4">Items</th>
                <th className="p-4">Total & Payment</th>
                <th className="p-4">Fulfillment Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredOrders.length > 0 ? (
                filteredOrders.map((ord) => {
                  const isUnverified = ord.payment_status === 'pending_verification' || ord.order_status === 'pending_verification';
                  const cleanPhone = ord.customer_phone.replace(/\D/g, '');
                  const waUrl = cleanPhone ? `https://wa.me/${cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone}` : null;

                  return (
                    <tr
                      key={ord.id}
                      className={`hover:bg-secondary/20 transition-colors ${
                        isUnverified ? 'bg-amber-500/5 dark:bg-amber-500/10' : ''
                      }`}
                    >
                      {/* Order ID & Date */}
                      <td className="p-4">
                        <p className="font-display font-bold text-foreground">{ord.order_number}</p>
                        <p className="text-[10px] text-muted-foreground">{formatDate(ord.created_at)}</p>
                      </td>

                      {/* Customer */}
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div>
                            <p className="font-bold text-foreground">{ord.customer_name}</p>
                            <p className="text-[10px] text-muted-foreground">{ord.customer_phone}</p>
                            <p className="text-[10px] text-muted-foreground line-clamp-1">
                              {ord.shipping_address.city}, {ord.shipping_address.pincode}
                            </p>
                          </div>
                          {waUrl && (
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-full bg-emerald-500/10 p-1.5 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all"
                              title="Chat on WhatsApp"
                            >
                              <MessageCircle className="size-3.5" />
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Items */}
                      <td className="p-4">
                        <p className="font-semibold text-foreground line-clamp-1">
                          {ord.items[0]?.product_name}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {ord.items.length > 1 ? `+${ord.items.length - 1} more items` : `Qty: ${ord.items[0]?.quantity}`}
                        </p>
                      </td>

                      {/* Total & Payment */}
                      <td className="p-4">
                        <p className="font-extrabold text-foreground">{formatINR(ord.total_amount)}</p>
                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                          {isUnverified ? (
                            <span className="rounded bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-600">
                              Unverified UPI
                            </span>
                          ) : (
                            <span className="rounded bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                              Paid (UPI)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Fulfillment Status Dropdown */}
                      <td className="p-4">
                        <select
                          value={ord.order_status}
                          onChange={(e) =>
                            onUpdateStatus(ord.id, {
                              status: e.target.value as OrderStatus,
                            })
                          }
                          className={`rounded-xl border px-2.5 py-1.5 text-xs font-bold outline-none cursor-pointer transition-all ${
                            ord.order_status === 'delivered'
                              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : ord.order_status === 'shipped'
                              ? 'border-blue-500/30 bg-blue-500/10 text-blue-600'
                              : ord.order_status === 'out_for_delivery'
                              ? 'border-purple-500/30 bg-purple-500/10 text-purple-600'
                              : ord.order_status === 'cancelled'
                              ? 'border-destructive/30 bg-destructive/10 text-destructive'
                              : ord.order_status === 'pending_verification'
                              ? 'border-amber-500/30 bg-amber-500/10 text-amber-600'
                              : 'border-rose/30 bg-rose/10 text-rose'
                          }`}
                        >
                          <option value="pending_verification">Pending Verification</option>
                          <option value="payment_verified">Payment Verified</option>
                          <option value="processing">Processing</option>
                          <option value="shipped">Shipped</option>
                          <option value="out_for_delivery">Out for Delivery</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right space-x-2 whitespace-nowrap">
                        {isUnverified && (
                          <button
                            onClick={() => handleVerifyPayment(ord.id)}
                            className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition-all"
                          >
                            <ShieldCheck className="size-3.5" />
                            <span>Verify Payment</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleOpenOrderModal(ord)}
                          className="inline-flex items-center gap-1 rounded-xl bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-rose hover:text-rose-foreground transition-all"
                        >
                          <Eye className="size-3.5" />
                          <span>Details</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    No matching orders found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for Order Details & Courier/Tracking Management */}
      {selectedOrderDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm piko-fade-up">
          <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <button
              onClick={() => setSelectedOrderDetails(null)}
              className="absolute right-4 top-4 grid size-8 place-items-center rounded-full bg-secondary text-foreground hover:bg-rose/10 hover:text-rose"
            >
              <X className="size-4" />
            </button>

            <div className="border-b border-border pb-3">
              <span className="rounded-full bg-rose/10 px-3 py-0.5 text-xs font-bold text-rose">
                Order & Fulfillment Details
              </span>
              <h3 className="mt-1 font-display text-xl font-bold text-foreground">
                Order #{selectedOrderDetails.order_number}
              </h3>
              <p className="text-xs text-muted-foreground">
                Placed on {formatDate(selectedOrderDetails.created_at)}
              </p>
            </div>

            {/* Manual Payment Verification Control */}
            <div className="rounded-2xl border border-border bg-secondary/30 p-3.5 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-foreground">Payment Status:</p>
                <p className={`text-xs font-extrabold capitalize ${selectedOrderDetails.payment_status === 'paid' ? 'text-emerald-600' : 'text-amber-500'}`}>
                  {selectedOrderDetails.payment_status.replace(/_/g, ' ')}
                </p>
              </div>

              {selectedOrderDetails.payment_status === 'pending_verification' ? (
                <button
                  onClick={() => {
                    handleVerifyPayment(selectedOrderDetails.id);
                    setSelectedOrderDetails({
                      ...selectedOrderDetails,
                      payment_status: 'paid',
                      order_status: 'payment_verified',
                    });
                  }}
                  className="rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition-all"
                >
                  Confirm & Mark Paid
                </button>
              ) : (
                <button
                  onClick={() => {
                    onUpdateStatus(selectedOrderDetails.id, { payment_status: 'pending_verification' });
                    setSelectedOrderDetails({
                      ...selectedOrderDetails,
                      payment_status: 'pending_verification',
                    });
                  }}
                  className="rounded-xl bg-secondary border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  Mark Unverified
                </button>
              )}
            </div>

            {/* Courier & Tracking Edit Form */}
            <form onSubmit={handleSaveShippingDetails} className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <h4 className="font-display text-xs font-bold text-foreground flex items-center gap-1.5">
                <Truck className="size-4 text-rose" />
                Shipping & Courier Information
              </h4>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-[11px] font-bold text-foreground">Courier Name</label>
                  <input
                    type="text"
                    value={courierInput}
                    onChange={(e) => setCourierInput(e.target.value)}
                    placeholder="e.g. Delhivery, Blue Dart, DTDC, India Post"
                    className="mt-1 h-9 w-full rounded-xl border border-border bg-secondary px-3 text-xs outline-none focus:ring-1 focus:ring-rose"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-foreground">Tracking Number</label>
                  <input
                    type="text"
                    value={trackingInput}
                    onChange={(e) => setTrackingInput(e.target.value)}
                    placeholder="e.g. DEL12345678"
                    className="mt-1 h-9 w-full rounded-xl border border-border bg-secondary px-3 text-xs outline-none focus:ring-1 focus:ring-rose"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-rose py-2.5 text-xs font-bold text-rose-foreground hover:bg-rose/90 transition-all"
              >
                Save Shipping Info & Update Tracking
              </button>
            </form>

            {/* Customer & Address */}
            <div className="grid gap-3 sm:grid-cols-2 text-xs">
              <div className="rounded-2xl bg-secondary/50 p-3 space-y-1">
                <p className="font-bold text-foreground">Customer Details:</p>
                <p className="text-muted-foreground">{selectedOrderDetails.customer_name}</p>
                <p className="text-muted-foreground">{selectedOrderDetails.customer_phone}</p>
                <p className="text-muted-foreground">{selectedOrderDetails.customer_email}</p>
              </div>

              <div className="rounded-2xl bg-secondary/50 p-3 space-y-1">
                <p className="font-bold text-foreground">Shipping Address:</p>
                <p className="text-muted-foreground">{selectedOrderDetails.shipping_address.address}</p>
                <p className="text-muted-foreground">
                  {selectedOrderDetails.shipping_address.city}, {selectedOrderDetails.shipping_address.state} - {selectedOrderDetails.shipping_address.pincode}
                </p>
              </div>
            </div>

            {/* Itemized Products */}
            <div className="rounded-2xl border border-border overflow-hidden text-xs">
              <div className="bg-secondary/60 p-2.5 font-bold flex justify-between text-foreground">
                <span>Product</span>
                <span>Amount</span>
              </div>
              <div className="divide-y divide-border/60">
                {selectedOrderDetails.items.map((it, idx) => (
                  <div key={idx} className="p-2.5 flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-foreground">{it.product_name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatINR(it.selling_price)} × {it.quantity}
                      </p>
                    </div>
                    <span className="font-bold text-foreground">
                      {formatINR(it.selling_price * it.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Total Breakdown */}
            <div className="space-y-1 text-xs text-right">
              <p className="text-muted-foreground">Subtotal: {formatINR(selectedOrderDetails.subtotal)}</p>
              <p className="text-muted-foreground">Shipping: {selectedOrderDetails.shipping_fee === 0 ? 'FREE' : formatINR(selectedOrderDetails.shipping_fee)}</p>
              <p className="font-display text-base font-extrabold text-rose">
                Grand Total: {formatINR(selectedOrderDetails.total_amount)}
              </p>
            </div>

            <button
              onClick={() => window.print()}
              className="w-full rounded-2xl bg-primary py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90"
            >
              Print Invoice
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
