import React, { useState } from 'react';
import { X, Trash2, ShoppingBag, ArrowRight, Tag, Truck, Check } from 'lucide-react';
import { CartItem } from '../types';
import { formatINR } from '../lib/utils';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onCheckout: (appliedDiscount: number, promoCode: string) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
}) => {
  if (!isOpen) return null;

  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [promoError, setPromoError] = useState('');

  const subtotal = cart.reduce((sum, item) => sum + item.product.selling_price * item.quantity, 0);
  const freeShippingThreshold = 499;
  const shippingFee = subtotal >= freeShippingThreshold || cart.length === 0 ? 0 : 49;
  const total = Math.max(0, subtotal - discountAmount + shippingFee);

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    setPromoError('');
    const code = promoCode.trim().toUpperCase();
    if (code === 'PIKO10') {
      const disc = Math.round(subtotal * 0.1);
      setDiscountAmount(disc);
      setAppliedPromo('PIKO10 (10% OFF)');
      setPromoCode('');
    } else if (code === 'FREESHIP') {
      setDiscountAmount(shippingFee);
      setAppliedPromo('FREESHIP');
      setPromoCode('');
    } else {
      setPromoError('Invalid code. Try "PIKO10" for 10% off');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/95 piko-fade-up">
      <div className="absolute inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-md bg-white dark:bg-zinc-900 border-l-2 border-slate-300 dark:border-zinc-700 shadow-2xl flex flex-col justify-between">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border p-4">
            <div className="flex items-center gap-2">
              <ShoppingBag className="size-5 text-rose" />
              <h2 className="font-display text-lg font-bold text-foreground">Your Shopping Bag</h2>
              <span className="rounded-full bg-rose/10 px-2 py-0.5 text-xs font-bold text-rose">
                {cart.reduce((s, i) => s + i.quantity, 0)} items
              </span>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Free shipping bar */}
            <div className="rounded-2xl bg-secondary/60 p-3 space-y-1 text-xs">
              <div className="flex items-center justify-between font-semibold">
                <span className="flex items-center gap-1.5 text-foreground">
                  <Truck className="size-4 text-rose" />
                  {subtotal >= freeShippingThreshold ? 'Free Express Shipping unlocked!' : `Add ${formatINR(freeShippingThreshold - subtotal)} more for Free Shipping`}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
                <div
                  className="h-full bg-rose transition-all duration-300"
                  style={{ width: `${Math.min(100, (subtotal / freeShippingThreshold) * 100)}%` }}
                />
              </div>
            </div>

            {cart.length > 0 ? (
              <div className="space-y-3">
                {cart.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex gap-3 rounded-2xl border border-border/80 bg-card p-3 shadow-soft"
                  >
                    <img
                      src={item.product.images[0]}
                      alt={item.product.name}
                      className="size-20 rounded-xl object-cover border border-border/60 shrink-0"
                    />
                    <div className="flex flex-1 flex-col justify-between">
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="line-clamp-1 font-sans text-xs font-bold text-foreground">
                          {item.product.name}
                        </h4>
                        <button
                          onClick={() => onRemoveItem(item.product.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>

                      <p className="text-xs font-extrabold text-foreground">
                        {formatINR(item.product.selling_price)}
                      </p>

                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center rounded-lg border border-border bg-secondary p-0.5 text-xs">
                          <button
                            onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                            className="px-2 font-bold hover:bg-background rounded"
                          >
                            -
                          </button>
                          <span className="px-2 font-semibold">{item.quantity}</span>
                          <button
                            onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                            className="px-2 font-bold hover:bg-background rounded"
                          >
                            +
                          </button>
                        </div>
                        <span className="text-xs font-bold text-rose">
                          {formatINR(item.product.selling_price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <ShoppingBag className="size-12 text-muted-foreground/40 mb-3" />
                <p className="font-display text-base font-bold text-foreground">Your bag is empty</p>
                <p className="text-xs text-muted-foreground mt-1">Explore our little treasures to add items!</p>
              </div>
            )}
          </div>

          {/* Footer / Summary */}
          {cart.length > 0 && (
            <div className="border-t border-border bg-card p-4 space-y-3">
              {/* Promo code input */}
              <form onSubmit={handleApplyPromo} className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    placeholder="Coupon code (PIKO10)..."
                    className="h-9 w-full rounded-xl border border-border bg-secondary pl-8 pr-2 text-xs uppercase outline-none focus:ring-1 focus:ring-rose"
                  />
                </div>
                <button
                  type="submit"
                  className="h-9 rounded-xl bg-secondary px-3 text-xs font-bold text-foreground hover:bg-rose hover:text-rose-foreground transition-colors"
                >
                  Apply
                </button>
              </form>

              {appliedPromo && (
                <div className="flex items-center justify-between text-xs text-emerald-600 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-lg">
                  <span className="flex items-center gap-1">
                    <Check className="size-3.5" /> Code {appliedPromo} applied
                  </span>
                  <span>-{formatINR(discountAmount)}</span>
                </div>
              )}

              {promoError && <p className="text-[11px] text-destructive">{promoError}</p>}

              {/* Order Math */}
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{formatINR(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Discount</span>
                    <span>-{formatINR(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-muted-foreground">
                  <span>Delivery</span>
                  <span>{shippingFee === 0 ? 'FREE' : formatINR(shippingFee)}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-2 text-sm font-extrabold text-foreground">
                  <span>Total Payable</span>
                  <span className="text-rose">{formatINR(total)}</span>
                </div>
              </div>

              <button
                onClick={() => onCheckout(discountAmount, appliedPromo || '')}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-rose py-3.5 text-xs font-bold text-rose-foreground shadow-lg hover:bg-rose/90 transition-all active:scale-98"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="size-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
