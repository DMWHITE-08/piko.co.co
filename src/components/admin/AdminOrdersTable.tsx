import React, { useState, useMemo } from 'react';
import { Search, Filter, Eye, Truck, CheckCircle2, Clock, XCircle, ArrowUpDown, FileText, X } from 'lucide-react';
import { Order, OrderStatus } from '../../types';
import { formatDate, formatINR } from '../../lib/utils';

interface AdminOrdersTableProps {
  orders: Order[];
  onUpdateStatus: (orderId: string, status: OrderStatus, notes?: string) => void;
  onClearAllOrders?: () => void;
}

export const AdminOrdersTable: React.FC<AdminOrdersTableProps> = ({
  orders,
  onUpdateStatus,
  onClearAllOrders,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<Order | null>(null);

  const filteredOrders = useMemo(() => {
    return orders.filter((ord) => {
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

  return (
    <div className="space-y-6 piko-fade-up">
      {/* Header & Search / Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Order Management</h2>
          <p className="text-xs text-muted-foreground">
            View, filter, update statuses, and print customer invoices ({filteredOrders.length} orders found).
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
        {['all', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`rounded-full px-4 py-2 text-xs font-semibold capitalize transition-all whitespace-nowrap ${
              statusFilter === st
                ? 'bg-rose text-rose-foreground shadow-sm'
                : 'bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground'
            }`}
          >
            {st === 'all' ? 'All Orders' : st.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* Desktop & Mobile Responsive Table */}
      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-secondary/50 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-4">Order ID & Date</th>
                <th className="p-4">Customer Details</th>
                <th className="p-4">Items & Qty</th>
                <th className="p-4">Total & Payment</th>
                <th className="p-4">Fulfillment Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredOrders.length > 0 ? (
                filteredOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-secondary/20 transition-colors">
                    {/* Order ID & Date */}
                    <td className="p-4">
                      <p className="font-display font-bold text-foreground">{ord.order_number}</p>
                      <p className="text-[10px] text-muted-foreground">{formatDate(ord.created_at)}</p>
                    </td>

                    {/* Customer */}
                    <td className="p-4">
                      <p className="font-bold text-foreground">{ord.customer_name}</p>
                      <p className="text-[10px] text-muted-foreground">{ord.customer_phone}</p>
                      <p className="text-[10px] text-muted-foreground line-clamp-1">
                        {ord.shipping_address.city}, {ord.shipping_address.pincode}
                      </p>
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

                    {/* Total */}
                    <td className="p-4">
                      <p className="font-extrabold text-foreground">{formatINR(ord.total_amount)}</p>
                      <span className="inline-block rounded bg-secondary px-1.5 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
                        {ord.payment_method} • {ord.payment_status}
                      </span>
                    </td>

                    {/* Status Dropdown */}
                    <td className="p-4">
                      <select
                        value={ord.order_status}
                        onChange={(e) => onUpdateStatus(ord.id, e.target.value as OrderStatus)}
                        className={`rounded-xl border px-2.5 py-1.5 text-xs font-bold outline-none cursor-pointer transition-all ${
                          ord.order_status === 'delivered'
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : ord.order_status === 'shipped'
                            ? 'border-amber-500/30 bg-amber-500/10 text-amber-600'
                            : ord.order_status === 'out_for_delivery'
                            ? 'border-blue-500/30 bg-blue-500/10 text-blue-600'
                            : ord.order_status === 'cancelled'
                            ? 'border-destructive/30 bg-destructive/10 text-destructive'
                            : 'border-rose/30 bg-rose/10 text-rose'
                        }`}
                      >
                        <option value="processing">Processing</option>
                        <option value="shipped">Shipped</option>
                        <option value="out_for_delivery">Out for Delivery</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-right">
                      <button
                        onClick={() => setSelectedInvoiceOrder(ord)}
                        className="inline-flex items-center gap-1 rounded-xl bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-rose hover:text-rose-foreground transition-all"
                      >
                        <FileText className="size-3.5" />
                        <span>Invoice</span>
                      </button>
                    </td>
                  </tr>
                ))
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

      {/* Invoice Detail Modal */}
      {selectedInvoiceOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm piko-fade-up">
          <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <button
              onClick={() => setSelectedInvoiceOrder(null)}
              className="absolute right-4 top-4 grid size-8 place-items-center rounded-full bg-secondary text-foreground hover:bg-rose/10 hover:text-rose"
            >
              <X className="size-4" />
            </button>

            <div className="border-b border-border pb-4">
              <span className="rounded-full bg-rose/10 px-3 py-0.5 text-xs font-bold text-rose">
                Official Tax Invoice
              </span>
              <h3 className="mt-1 font-display text-xl font-bold text-foreground">
                Order {selectedInvoiceOrder.order_number}
              </h3>
              <p className="text-xs text-muted-foreground">
                Placed on {formatDate(selectedInvoiceOrder.created_at)}
              </p>
            </div>

            {/* Customer & Address */}
            <div className="grid gap-4 sm:grid-cols-2 text-xs">
              <div className="rounded-2xl bg-secondary/50 p-3 space-y-1">
                <p className="font-bold text-foreground">Customer Details:</p>
                <p className="text-muted-foreground">{selectedInvoiceOrder.customer_name}</p>
                <p className="text-muted-foreground">{selectedInvoiceOrder.customer_phone}</p>
                <p className="text-muted-foreground">{selectedInvoiceOrder.customer_email}</p>
              </div>

              <div className="rounded-2xl bg-secondary/50 p-3 space-y-1">
                <p className="font-bold text-foreground">Shipping Address:</p>
                <p className="text-muted-foreground">{selectedInvoiceOrder.shipping_address.address}</p>
                <p className="text-muted-foreground">
                  {selectedInvoiceOrder.shipping_address.city}, {selectedInvoiceOrder.shipping_address.state} - {selectedInvoiceOrder.shipping_address.pincode}
                </p>
              </div>
            </div>

            {/* Itemized Table */}
            <div className="rounded-2xl border border-border overflow-hidden text-xs">
              <div className="bg-secondary/60 p-2.5 font-bold flex justify-between text-foreground">
                <span>Product</span>
                <span>Amount</span>
              </div>
              <div className="divide-y divide-border/60">
                {selectedInvoiceOrder.items.map((it, idx) => (
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
            <div className="space-y-1.5 text-xs text-right">
              <p className="text-muted-foreground">Subtotal: {formatINR(selectedInvoiceOrder.subtotal)}</p>
              {selectedInvoiceOrder.discount_amount > 0 && (
                <p className="text-emerald-600 font-semibold">Discount: -{formatINR(selectedInvoiceOrder.discount_amount)}</p>
              )}
              <p className="text-muted-foreground">Shipping: {selectedInvoiceOrder.shipping_fee === 0 ? 'FREE' : formatINR(selectedInvoiceOrder.shipping_fee)}</p>
              <p className="font-display text-lg font-extrabold text-rose">
                Grand Total: {formatINR(selectedInvoiceOrder.total_amount)}
              </p>
            </div>

            <button
              onClick={() => window.print()}
              className="w-full rounded-2xl bg-primary py-3 text-xs font-bold text-primary-foreground hover:bg-primary/90"
            >
              Print Invoice
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
