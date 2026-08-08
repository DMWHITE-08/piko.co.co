import React, { useState } from 'react';
import { X, CheckCircle, ShieldCheck, CreditCard, QrCode, Truck, Lock, ArrowRight } from 'lucide-react';
import { CartItem, Order, PaymentMethod } from '../types';
import { formatINR, generateOrderNumber, generateId } from '../lib/utils';

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

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('Karnataka');
  const [pincode, setPincode] = useState('');
  const [landmark, setLandmark] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi');
  const [giftNote, setGiftNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const subtotal = cart.reduce((sum, item) => sum + item.product.selling_price * item.quantity, 0);
  const shippingFee = subtotal >= 499 ? 0 : 49;
  const totalAmount = Math.max(0, subtotal - appliedDiscount + shippingFee);

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !address || !pincode || !city) {
      setErrorMsg('Please fill in all required shipping fields.');
      return;
    }

    if (paymentMethod === 'cod') {
      setErrorMsg('Cash on Delivery (COD) is disabled.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    const orderNum = generateOrderNumber();
    const now = new Date().toISOString();

    const newOrder: Order = {
      id: generateId(),
      order_number: orderNum,
      customer_name: name,
      customer_email: email || `${phone}@piko.co`,
      customer_phone: phone,
      shipping_address: {
        address,
        city,
        state,
        pincode,
        landmark,
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
      payment_method: paymentMethod,
      payment_status: 'pending',
      order_status: 'processing',
      tracking_events: [
        {
          status: 'processing',
          description: `Order ${orderNum} confirmed. Thank you for shopping with PIKO!`,
          occurred_at: now,
        },
      ],
      created_at: now,
      updated_at: now,
    };

    try {
      // 1. Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setErrorMsg('Failed to load Razorpay payment script. Please check your network connection.');
        setIsSubmitting(false);
        return;
      }

      // 2. Create Razorpay order on server
      const orderRes = await fetch('/api/payments/create-razorpay-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: totalAmount,
          currency: 'INR',
          receipt: orderNum,
          notes: {
            customer_name: name,
            customer_phone: phone,
            piko_order_id: newOrder.id,
          },
        }),
      });

      const orderData = await orderRes.json();

      if (!orderData.success || !orderData.razorpay_order_id) {
        setErrorMsg(orderData.error || 'Failed to initialize payment order with server.');
        setIsSubmitting(false);
        return;
      }

      // 3. Open Razorpay Checkout modal
      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'PIKO Store',
        description: `Payment for Order ${orderNum}`,
        image: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=200&auto=format&fit=crop&q=80',
        order_id: orderData.razorpay_order_id,
        handler: async function (response: any) {
          try {
            // 4. Server-side payment signature verification & marking as PAID
            const verifyRes = await fetch('/api/payments/verify-razorpay-signature', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id || orderData.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id || `pay_${Date.now()}`,
                razorpay_signature: response.razorpay_signature || 'test_sig',
                order: newOrder,
              }),
            });

            const verifyData = await verifyRes.json();

            if (verifyData.success && verifyData.order) {
              setIsSubmitting(false);
              onOrderPlaced(verifyData.order);
            } else {
              setErrorMsg(verifyData.error || 'Server payment verification failed.');
              setIsSubmitting(false);
            }
          } catch (verifyErr) {
            console.error('Payment verification error:', verifyErr);
            setErrorMsg('Network error while verifying payment with server.');
            setIsSubmitting(false);
          }
        },
        prefill: {
          name: name,
          email: email || `${phone}@piko.co`,
          contact: phone,
        },
        notes: {
          order_number: orderNum,
        },
        theme: {
          color: '#E11D48',
        },
        modal: {
          ondismiss: function () {
            setIsSubmitting(false);
            setErrorMsg('Payment process was cancelled.');
          },
        },
      };

      const razorpayWindow = new (window as any).Razorpay(options);
      razorpayWindow.open();
    } catch (err: any) {
      console.error('Checkout error:', err);
      setErrorMsg('Failed to initialize payment modal. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm p-4 flex items-center justify-center piko-fade-up">
      <div className="relative w-full max-w-2xl rounded-3xl border border-border bg-card p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 grid size-9 place-items-center rounded-full bg-secondary text-foreground hover:bg-rose/10 hover:text-rose"
        >
          <X className="size-5" />
        </button>

        <div className="mb-6">
          <span className="rounded-full bg-rose/10 px-3 py-1 text-xs font-bold text-rose">
            Checkout & Shipping
          </span>
          <h2 className="mt-1 font-display text-2xl font-bold text-foreground">Complete Your Order</h2>
          <p className="text-xs text-muted-foreground">
            Enter your delivery details to receive your PIKO treasures.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 rounded-xl bg-destructive/10 p-3 text-xs text-destructive font-medium">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmitOrder} className="space-y-4">
          {/* Contact & Shipping */}
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
              <label className="text-[11px] font-bold text-foreground">Phone Number *</label>
              <input
                required
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="mt-1 h-9 w-full rounded-xl border border-border bg-secondary px-3 text-xs outline-none focus:ring-1 focus:ring-rose"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-foreground">Email Address (for order updates)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. albin@example.com"
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
              className="mt-1 w-full rounded-xl border border-border bg-secondary p-3 text-xs outline-none focus:ring-1 focus:ring-rose"
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
                placeholder="e.g. Bengaluru"
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
                placeholder="560001"
                className="mt-1 h-9 w-full rounded-xl border border-border bg-secondary px-3 text-xs outline-none focus:ring-1 focus:ring-rose"
              />
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-2 pt-2">
            <label className="text-[11px] font-bold text-foreground">Payment Method</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { id: 'upi', label: 'UPI / GPay', icon: QrCode, disabled: false },
                { id: 'razorpay', label: 'Razorpay', icon: CreditCard, disabled: false },
                { id: 'card', label: 'Debit/Credit Card', icon: ShieldCheck, disabled: false },
                { id: 'cod', label: 'COD (Disabled)', icon: Truck, disabled: true },
              ].map((m) => {
                const Icon = m.icon;
                const isSelected = paymentMethod === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    disabled={m.disabled}
                    onClick={() => {
                      if (!m.disabled) {
                        setPaymentMethod(m.id as PaymentMethod);
                      }
                    }}
                    className={`flex flex-col items-center justify-center rounded-2xl border p-3 text-center transition-all ${
                      m.disabled
                        ? 'opacity-50 cursor-not-allowed border-border bg-secondary/50 text-muted-foreground'
                        : isSelected
                        ? 'border-rose bg-rose/10 font-bold text-rose shadow-sm'
                        : 'border-border bg-secondary text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Icon className="size-5 mb-1" />
                    <span className="text-[11px]">{m.label}</span>
                  </button>
                );
              })}
            </div>
            {paymentMethod === 'cod' && (
              <p className="text-[10px] text-destructive font-medium">
                Cash on Delivery is currently disabled for security and prepaid order discounts.
              </p>
            )}
          </div>

          {/* Order Summary Box */}
          <div className="rounded-2xl bg-secondary/50 p-4 text-xs space-y-1.5">
            <div className="flex justify-between text-muted-foreground">
              <span>Items Subtotal ({cart.length} items)</span>
              <span>{formatINR(subtotal)}</span>
            </div>
            {appliedDiscount > 0 && (
              <div className="flex justify-between text-emerald-600 font-semibold">
                <span>Discount ({promoCode})</span>
                <span>-{formatINR(appliedDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between text-muted-foreground">
              <span>Shipping Fee</span>
              <span>{shippingFee === 0 ? 'FREE' : formatINR(shippingFee)}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-2 text-sm font-extrabold text-foreground">
              <span>Total Amount</span>
              <span className="text-rose">{formatINR(totalAmount)}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-rose py-4 text-sm font-bold text-rose-foreground shadow-xl hover:bg-rose/90 transition-all active:scale-98"
          >
            {isSubmitting ? (
              <span>Processing Payment…</span>
            ) : (
              <>
                <Lock className="size-4" />
                <span>Pay {formatINR(totalAmount)} & Place Order</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
