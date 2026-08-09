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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/95 p-2 sm:p-4 md:p-6 flex items-start justify-center min-h-full py-4 sm:py-8 piko-fade-up">
      <div className="relative my-auto w-full max-w-xl rounded-3xl border-2 border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-slate-100 p-4 sm:p-7 shadow-2xl transition-all max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 grid size-9 place-items-center rounded-full bg-slate-200 dark:bg-zinc-800 text-foreground hover:bg-rose hover:text-white transition-colors"
        >
          <X className="size-5" />
        </button>

        {step === 'details' && (
          <div className="pb-4">
            <div className="mb-5">
              <span className="inline-block rounded-full bg-rose px-3 py-1 text-xs font-extrabold text-white shadow-sm">
                Step 1 of 2: Shipping Info
              </span>
              <h2 className="mt-2 font-display text-2xl font-bold text-foreground">Delivery Address</h2>
              <p className="text-xs font-medium text-muted-foreground">
                Please fill in your address details to complete your UPI order.
              </p>
            </div>

            {errorMsg && (
              <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive font-bold">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleProceedToPayment} className="space-y-4">
              <div className="grid gap-3.5 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    Full Name <span className="text-rose">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Albin Paul"
                    className="h-11 w-full rounded-xl border-2 border-slate-300 dark:border-zinc-700 bg-background px-3.5 text-sm font-semibold text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-rose focus:ring-2 focus:ring-rose/20 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    Phone Number (WhatsApp) <span className="text-rose">*</span>
                  </label>
                  <input
                    required
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 8590918769"
                    className="h-11 w-full rounded-xl border-2 border-slate-300 dark:border-zinc-700 bg-background px-3.5 text-sm font-semibold text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-rose focus:ring-2 focus:ring-rose/20 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Email Address (Optional)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="albin@example.com"
                  className="h-11 w-full rounded-xl border-2 border-slate-300 dark:border-zinc-700 bg-background px-3.5 text-sm font-semibold text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-rose focus:ring-2 focus:ring-rose/20 transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Full Shipping Address <span className="text-rose">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="House/Flat No., Street, Building, Area..."
                  className="w-full rounded-xl border-2 border-slate-300 dark:border-zinc-700 bg-background p-3 text-sm font-semibold text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-rose focus:ring-2 focus:ring-rose/20 transition-all resize-none"
                />
              </div>

              <div className="grid gap-3.5 sm:grid-cols-3">
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    City <span className="text-rose">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Kochi"
                    className="h-11 w-full rounded-xl border-2 border-slate-300 dark:border-zinc-700 bg-background px-3.5 text-sm font-semibold text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-rose focus:ring-2 focus:ring-rose/20 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">State</label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="h-11 w-full rounded-xl border-2 border-slate-300 dark:border-zinc-700 bg-background px-3.5 text-sm font-semibold text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-rose focus:ring-2 focus:ring-rose/20 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    Pincode <span className="text-rose">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    placeholder="682001"
                    className="h-11 w-full rounded-xl border-2 border-slate-300 dark:border-zinc-700 bg-background px-3.5 text-sm font-semibold text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-rose focus:ring-2 focus:ring-rose/20 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Landmark (Optional)</label>
                <input
                  type="text"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  placeholder="Near Post Office, Opposite Park..."
                  className="h-11 w-full rounded-xl border-2 border-slate-300 dark:border-zinc-700 bg-background px-3.5 text-sm font-semibold text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-rose focus:ring-2 focus:ring-rose/20 transition-all"
                />
              </div>

              {/* Order Summary box */}
              <div className="rounded-2xl border border-slate-200 dark:border-zinc-700 bg-slate-100 dark:bg-zinc-800/90 p-4 text-xs space-y-1.5 shadow-sm">
                <div className="flex justify-between font-semibold text-foreground/80">
                  <span>Subtotal ({cart.length} items)</span>
                  <span className="font-bold text-foreground">{formatINR(subtotal)}</span>
                </div>
                {appliedDiscount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <span>Coupon Discount</span>
                    <span>-{formatINR(appliedDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-foreground/80">
                  <span>Delivery Fee</span>
                  <span className="font-bold text-foreground">{shippingFee === 0 ? 'FREE' : formatINR(shippingFee)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-300 dark:border-zinc-600 pt-2 font-extrabold text-foreground text-base">
                  <span>Total Payable</span>
                  <span className="text-rose font-black">{formatINR(totalAmount)}</span>
                </div>
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-rose py-4 text-base font-extrabold text-white shadow-xl hover:bg-rose/90 transition-all active:scale-98"
              >
                <span>Proceed to UPI Payment</span>
                <ArrowRight className="size-5" />
              </button>
            </form>
          </div>
        )}

        {step === 'upi_payment' && (
          <div className="pb-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <span className="inline-block rounded-full bg-rose px-3 py-1 text-xs font-extrabold text-white shadow-sm">
                  Step 2 of 2: UPI Transfer
                </span>
                <h2 className="mt-1 font-display text-xl font-bold text-foreground">Scan or Copy UPI ID</h2>
              </div>
              <button
                type="button"
                onClick={() => setStep('details')}
                className="flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-zinc-800 px-3 py-1.5 text-xs font-bold text-foreground hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors"
              >
                <ArrowLeft className="size-3.5" />
                Back
              </button>
            </div>

            {errorMsg && (
              <div className="mb-3 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive font-bold">
                {errorMsg}
              </div>
            )}

            <div className="space-y-4">
              {/* Total display */}
              <div className="rounded-2xl border-2 border-rose/30 bg-rose/10 p-4 text-center">
                <span className="text-xs font-bold text-foreground/80">Amount to Pay:</span>
                <div className="font-display text-3xl font-black text-rose mt-0.5">
                  {formatINR(totalAmount)}
                </div>
                <div className="text-xs font-bold text-muted-foreground mt-1">Order #{currentOrderNum}</div>
              </div>

              {/* UPI QR Code & Copy Box */}
              <div className="flex flex-col sm:flex-row items-center gap-4 rounded-2xl border-2 border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900 p-4 shadow-sm">
                <div className="relative grid size-44 place-items-center rounded-2xl bg-white p-2 shadow-sm border border-slate-200 shrink-0">
                  <img
                    src={qrCodeImageUrl}
                    alt="UPI Payment QR Code"
                    className="size-full object-contain"
                  />
                </div>

                <div className="flex-1 space-y-3 text-center sm:text-left">
                  <div>
                    <label className="text-[11px] font-extrabold text-foreground uppercase tracking-wider block">
                      Store Official UPI ID
                    </label>
                    <div className="mt-1 flex items-center justify-center sm:justify-start gap-2">
                      <code className="rounded-xl bg-white dark:bg-zinc-800 border-2 border-slate-300 dark:border-zinc-700 px-3.5 py-2 font-mono text-base font-extrabold text-foreground shadow-sm">
                        {upiId}
                      </code>
                      <button
                        type="button"
                        onClick={handleCopyUpi}
                        className="flex items-center gap-1.5 rounded-xl bg-rose px-3 py-2 text-xs font-extrabold text-white hover:bg-rose/90 transition-all shadow-sm"
                      >
                        {copiedUpi ? (
                          <>
                            <Check className="size-4" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="size-4" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <p className="text-xs font-medium text-foreground/80 leading-relaxed">
                    Open Google Pay, PhonePe, Paytm or any UPI app. Scan the QR code above or send <strong className="text-rose font-bold">{formatINR(totalAmount)}</strong> to <strong className="text-foreground font-extrabold">{upiId}</strong>.
                  </p>
                </div>
              </div>

              {/* App Deep Link Buttons */}
              <div className="space-y-2">
                <label className="text-xs font-extrabold text-foreground block">Instant Pay via App</label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <a
                    href={`phonepe://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(storeName)}&am=${totalAmount}&cu=INR&tn=${encodeURIComponent(`Order-${currentOrderNum}`)}`}
                    className="flex flex-col items-center justify-center rounded-xl border-2 border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-2.5 text-center text-xs font-bold text-foreground hover:border-rose hover:text-rose transition-all shadow-sm"
                  >
                    <span>PhonePe</span>
                  </a>
                  <a
                    href={`gpay://upi/pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(storeName)}&am=${totalAmount}&cu=INR&tn=${encodeURIComponent(`Order-${currentOrderNum}`)}`}
                    className="flex flex-col items-center justify-center rounded-xl border-2 border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-2.5 text-center text-xs font-bold text-foreground hover:border-rose hover:text-rose transition-all shadow-sm"
                  >
                    <span>Google Pay</span>
                  </a>
                  <a
                    href={`paytmmp://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(storeName)}&am=${totalAmount}&cu=INR&tn=${encodeURIComponent(`Order-${currentOrderNum}`)}`}
                    className="flex flex-col items-center justify-center rounded-xl border-2 border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-2.5 text-center text-xs font-bold text-foreground hover:border-rose hover:text-rose transition-all shadow-sm"
                  >
                    <span>Paytm</span>
                  </a>
                  <a
                    href={upiPayUrl}
                    className="flex flex-col items-center justify-center rounded-xl border-2 border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-2.5 text-center text-xs font-bold text-foreground hover:border-rose hover:text-rose transition-all shadow-sm"
                  >
                    <span>Any UPI App</span>
                  </a>
                </div>
              </div>

              <div className="rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 p-3.5 text-xs text-amber-800 dark:text-amber-200 font-semibold">
                <strong className="block font-bold text-amber-900 dark:text-amber-100 mb-0.5">Important Notice:</strong>
                After completing the payment in your UPI app, click <strong>"I've Paid"</strong> below. Your payment will be verified by our store team before dispatch.
              </div>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmPaid}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-4 text-base font-extrabold text-white shadow-xl hover:bg-emerald-700 transition-all active:scale-98"
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
              <span className="inline-block rounded-full bg-amber-500/20 px-3.5 py-1 text-xs font-extrabold text-amber-700 dark:text-amber-300">
                Pending Verification
              </span>
              <h2 className="mt-2 font-display text-2xl font-bold text-foreground">Order Submitted!</h2>
              <p className="mt-1 text-xs font-medium text-muted-foreground max-w-sm mx-auto">
                Thank you, <strong className="text-foreground">{createdOrder.customer_name}</strong>! Your order <strong className="text-rose font-bold">#{createdOrder.order_number}</strong> is placed.
              </p>
            </div>

            <div className="rounded-2xl border-2 border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900 p-4 text-left text-xs space-y-2 max-w-md mx-auto shadow-sm">
              <div className="flex justify-between">
                <span className="font-semibold text-muted-foreground">Order Number:</span>
                <span className="font-bold text-foreground">{createdOrder.order_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-muted-foreground">Total Paid:</span>
                <span className="font-extrabold text-rose">{formatINR(createdOrder.total_amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-muted-foreground">Payment Status:</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">Pending Verification</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-muted-foreground">Deliver To:</span>
                <span className="font-bold text-foreground">{createdOrder.shipping_address.city}, {createdOrder.shipping_address.pincode}</span>
              </div>
            </div>

            <p className="text-xs font-medium text-muted-foreground max-w-sm mx-auto">
              Our store admin will verify your UPI payment shortly and update your order status. You can track updates anytime using your order number.
            </p>

            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-2xl bg-rose py-3.5 text-xs font-extrabold text-white shadow-md hover:bg-rose/90 transition-all"
            >
              Done & Return to Store
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
