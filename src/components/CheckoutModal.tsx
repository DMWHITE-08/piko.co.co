import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, QrCode, Copy, Check, ExternalLink, ShieldCheck, ArrowRight, ArrowLeft } from 'lucide-react';
import { CartItem, Order, StoreSettings } from '../types';
import { formatINR, generateOrderNumber, generateId } from '../lib/utils';
import { fetchStoreSettings, DEFAULT_SETTINGS, createOrderApi } from '../lib/api';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  appliedDiscount: number;
  promoCode?: string;
  onOrderPlaced: (order: Order) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  cart,
  appliedDiscount,
  promoCode,
  onOrderPlaced,
}) => {
  if (!isOpen) return null;

  const [step, setStep] = useState<'details' | 'upi_payment' | 'success'>('details');
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);

  // Customer form inputs
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('Kerala');
  const [pincode, setPincode] = useState('');
  const [landmark, setLandmark] = useState('');

  // Status & states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [currentOrderNum] = useState(() => generateOrderNumber());

  const subtotal = cart.reduce((sum, item) => sum + item.product.selling_price * item.quantity, 0);
  const shippingFee = subtotal >= settings.free_shipping_threshold ? 0 : settings.shipping_fee;
  const totalAmount = Math.max(0, subtotal - appliedDiscount + shippingFee);

  useEffect(() => {
    fetchStoreSettings().then((s) => {
      if (s) setSettings(s);
    });
  }, []);

  const upiId = settings.upi_id || 'piko@upi';
  const storeName = settings.store_name || "PIKO's Little Treasures";
  const upiPayUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(storeName)}&am=${totalAmount}&cu=INR&tn=${encodeURIComponent(`Order-${currentOrderNum}`)}`;

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2500);
  };

  const handleProceedToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !address.trim() || !city.trim() || !pincode.trim()) {
      setErrorMsg('Please fill in all required shipping fields.');
      return;
    }
    setErrorMsg('');
    setStep('upi_payment');
  };

  const handleConfirmPaid = async () => {
    setIsSubmitting(true);
    setErrorMsg('');

    const now = new Date().toISOString();
    const newOrder: Order = {
      id: generateId(),
      order_number: currentOrderNum,
      customer_name: name.trim(),
      customer_email: email.trim() || `${phone.trim()}@piko.co`,
      customer_phone: phone.trim(),
      shipping_address: {
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        landmark: landmark.trim(),
      },
      items: cart.map((item) => ({
        product_id: item.product.id,
        product_name: item.product.name,
        product_slug: item.product.slug,
        product_image: item.product.images[0],
        quantity: item.quantity,
        selling_price: item.product.selling_price,
      })),
      subtotal,
      discount_amount: appliedDiscount,
      promo_code: promoCode,
      shipping_fee: shippingFee,
      total_amount: totalAmount,
      payment_method: 'upi',
      payment_status: 'pending_verification',
      order_status: 'pending_verification',
      tracking_events: [
        {
          status: 'pending_verification',
          description: `Order ${currentOrderNum} submitted via manual UPI. Awaiting payment verification by store admin.`,
          occurred_at: now,
        },
      ],
      created_at: now,
      updated_at: now,
    };

    try {
      const saved = await createOrderApi(newOrder);
      setIsSubmitting(false);
      setCreatedOrder(saved);
      setStep('success');
      onOrderPlaced(saved);
    } catch (err: any) {
      console.error('[Checkout] Error saving order:', err);
      setErrorMsg('Failed to save order. Please check your connection and try again.');
      setIsSubmitting(false);
    }
  };

  // Dynamic QR Code URL fallback if upi_qr_url is empty
  const qrCodeImageUrl =
    settings.upi_qr_url && settings.upi_qr_url.trim().length > 0
      ? settings.upi_qr_url
      : `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiPayUrl)}`;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm p-4 flex items-center justify-center piko-fade-up">
      <div className="relative w-full max-w-xl rounded-3xl border border-border bg-card p-6 shadow-2xl transition-all">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 grid size-9 place-items-center rounded-full bg-secondary text-foreground hover:bg-rose/10 hover:text-rose"
        >
          <X className="size-5" />
        </button>

        {step === 'details' && (
          <div>
            <div className="mb-5">
              <span className="rounded-full bg-rose/10 px-3 py-1 text-xs font-bold text-rose">
                Step 1 of 2: Shipping
              </span>
              <h2 className="mt-1 font-display text-2xl font-bold text-foreground">Delivery Details</h2>
              <p className="text-xs text-muted-foreground">
                Enter your shipping info to place your UPI order.
              </p>
            </div>

            {errorMsg && (
              <div className="mb-4 rounded-xl bg-destructive/10 p-3 text-xs text-destructive font-medium">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleProceedToPayment} className="space-y-3.5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-[11px] font-bold text-foreground">Full Name *</label>
                  <input
                    required
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Albin Paul"
                    className="mt-1 h-9 w-full rounded-xl border border-border bg-secondary px-3 text-xs outline-none focus:ring-1 focus:ring-rose"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-foreground">Phone Number (WhatsApp) *</label>
                  <input
                    required
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 8590918769"
                    className="mt-1 h-9 w-full rounded-xl border border-border bg-secondary px-3 text-xs outline-none focus:ring-1 focus:ring-rose"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-foreground">Email Address (Optional)</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="albin@example.com"
                  className="mt-1 h-9 w-full rounded-xl border border-border bg-secondary px-3 text-xs outline-none focus:ring-1 focus:ring-rose"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-foreground">Shipping Address *</label>
                <textarea
                  required
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="House/Flat No., Street, Area..."
                  className="mt-1 w-full rounded-xl border border-border bg-secondary p-2.5 text-xs outline-none focus:ring-1 focus:ring-rose"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="text-[11px] font-bold text-foreground">City *</label>
                  <input
                    required
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Kochi"
                    className="mt-1 h-9 w-full rounded-xl border border-border bg-secondary px-3 text-xs outline-none focus:ring-1 focus:ring-rose"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-foreground">State</label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="mt-1 h-9 w-full rounded-xl border border-border bg-secondary px-3 text-xs outline-none focus:ring-1 focus:ring-rose"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-foreground">Pincode *</label>
                  <input
                    required
                    type="text"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    placeholder="682001"
                    className="mt-1 h-9 w-full rounded-xl border border-border bg-secondary px-3 text-xs outline-none focus:ring-1 focus:ring-rose"
                  />
                </div>
              </div>

              {/* Summary box */}
              <div className="rounded-2xl bg-secondary/50 p-3.5 text-xs space-y-1">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal ({cart.length} items)</span>
                  <span>{formatINR(subtotal)}</span>
                </div>
                {appliedDiscount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Discount</span>
                    <span>-{formatINR(appliedDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-muted-foreground">
                  <span>Shipping</span>
                  <span>{shippingFee === 0 ? 'FREE' : formatINR(shippingFee)}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-1.5 font-bold text-foreground text-sm">
                  <span>Total Payable</span>
                  <span className="text-rose">{formatINR(totalAmount)}</span>
                </div>
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-rose py-3.5 text-sm font-bold text-rose-foreground shadow-lg hover:bg-rose/90 transition-all active:scale-98"
              >
                <span>Proceed to UPI Payment</span>
                <ArrowRight className="size-4" />
              </button>
            </form>
          </div>
        )}

        {step === 'upi_payment' && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <span className="rounded-full bg-rose/10 px-3 py-1 text-xs font-bold text-rose">
                  Step 2 of 2: UPI Transfer
                </span>
                <h2 className="mt-1 font-display text-xl font-bold text-foreground">Scan or Copy UPI ID</h2>
              </div>
              <button
                type="button"
                onClick={() => setStep('details')}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="size-3.5" />
                Back
              </button>
            </div>

            {errorMsg && (
              <div className="mb-3 rounded-xl bg-destructive/10 p-2.5 text-xs text-destructive font-medium">
                {errorMsg}
              </div>
            )}

            <div className="space-y-4">
              {/* Total display */}
              <div className="rounded-2xl bg-rose/5 border border-rose/20 p-3 text-center">
                <span className="text-xs text-muted-foreground">Amount to Pay:</span>
                <div className="font-display text-2xl font-extrabold text-rose">
                  {formatINR(totalAmount)}
                </div>
                <div className="text-[11px] text-muted-foreground">Order #{currentOrderNum}</div>
              </div>

              {/* UPI QR Code & Copy Box */}
              <div className="flex flex-col sm:flex-row items-center gap-4 rounded-2xl border border-border bg-secondary/30 p-4">
                <div className="relative grid size-40 place-items-center rounded-2xl bg-white p-2 shadow-inner border border-border shrink-0">
                  <img
                    src={qrCodeImageUrl}
                    alt="UPI Payment QR Code"
                    className="size-full object-contain"
                  />
                </div>

                <div className="flex-1 space-y-3 text-center sm:text-left">
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      UPI ID
                    </label>
                    <div className="mt-1 flex items-center justify-center sm:justify-start gap-2">
                      <code className="rounded-lg bg-card border border-border px-3 py-1.5 font-mono text-sm font-bold text-foreground">
                        {upiId}
                      </code>
                      <button
                        type="button"
                        onClick={handleCopyUpi}
                        className="flex items-center gap-1 rounded-lg bg-rose px-2.5 py-1.5 text-xs font-bold text-rose-foreground hover:bg-rose/90 transition-all"
                      >
                        {copiedUpi ? (
                          <>
                            <Check className="size-3.5" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="size-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Open Google Pay, PhonePe, Paytm or any UPI app. Scan the QR code or pay to <strong className="text-foreground">{upiId}</strong>.
                  </p>
                </div>
              </div>

              {/* App Deep Link Buttons */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-foreground">Pay via UPI App</label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <a
                    href={`phonepe://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(storeName)}&am=${totalAmount}&cu=INR&tn=${encodeURIComponent(`Order-${currentOrderNum}`)}`}
                    className="flex flex-col items-center justify-center rounded-xl border border-border bg-secondary/80 p-2 text-center text-xs font-semibold text-foreground hover:bg-rose/10 hover:border-rose transition-all"
                  >
                    <span>PhonePe</span>
                  </a>
                  <a
                    href={`gpay://upi/pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(storeName)}&am=${totalAmount}&cu=INR&tn=${encodeURIComponent(`Order-${currentOrderNum}`)}`}
                    className="flex flex-col items-center justify-center rounded-xl border border-border bg-secondary/80 p-2 text-center text-xs font-semibold text-foreground hover:bg-rose/10 hover:border-rose transition-all"
                  >
                    <span>Google Pay</span>
                  </a>
                  <a
                    href={`paytmmp://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(storeName)}&am=${totalAmount}&cu=INR&tn=${encodeURIComponent(`Order-${currentOrderNum}`)}`}
                    className="flex flex-col items-center justify-center rounded-xl border border-border bg-secondary/80 p-2 text-center text-xs font-semibold text-foreground hover:bg-rose/10 hover:border-rose transition-all"
                  >
                    <span>Paytm</span>
                  </a>
                  <a
                    href={upiPayUrl}
                    className="flex flex-col items-center justify-center rounded-xl border border-border bg-secondary/80 p-2 text-center text-xs font-semibold text-foreground hover:bg-rose/10 hover:border-rose transition-all"
                  >
                    <span>Any UPI App</span>
                  </a>
                </div>
              </div>

              <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-[11px] text-amber-600 dark:text-amber-400">
                <strong className="block font-bold">Important Notice:</strong>
                After completing the payment in your UPI app, click <strong>"I've Paid"</strong> below. Your payment will be manually verified by our team before dispatch.
              </div>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmPaid}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3.5 text-sm font-extrabold text-white shadow-xl hover:bg-emerald-700 transition-all active:scale-98"
              >
                {isSubmitting ? (
                  <span>Submitting Order…</span>
                ) : (
                  <>
                    <CheckCircle2 className="size-5" />
                    <span>I've Paid ({formatINR(totalAmount)})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {step === 'success' && createdOrder && (
          <div className="py-6 text-center space-y-4">
            <div className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 className="size-10" />
            </div>

            <div>
              <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-600">
                Pending Verification
              </span>
              <h2 className="mt-2 font-display text-2xl font-bold text-foreground">Order Submitted!</h2>
              <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
                Thank you, <strong className="text-foreground">{createdOrder.customer_name}</strong>! Your order <strong className="text-rose">#{createdOrder.order_number}</strong> is placed.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-secondary/40 p-4 text-left text-xs space-y-2 max-w-md mx-auto">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Order Number:</span>
                <span className="font-bold text-foreground">{createdOrder.order_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Paid:</span>
                <span className="font-bold text-rose">{formatINR(createdOrder.total_amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payment Status:</span>
                <span className="font-semibold text-amber-500">Pending Verification</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Deliver To:</span>
                <span className="font-medium text-foreground">{createdOrder.shipping_address.city}, {createdOrder.shipping_address.pincode}</span>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
              Our store admin will verify your UPI payment shortly and update your order status. You can track updates anytime using your order number.
            </p>

            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-2xl bg-rose py-3 text-xs font-bold text-rose-foreground shadow-md hover:bg-rose/90 transition-all"
            >
              Done & Return to Store
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
