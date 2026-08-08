import React, { useState } from 'react';
import { X, Star, ShoppingBag, Truck, ShieldCheck, Heart, Sparkles, Check } from 'lucide-react';
import { Product } from '../types';
import { discountPercent, formatINR } from '../lib/utils';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number) => void;
  onBuyNow: (product: Product, quantity: number) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  onAddToCart,
  onBuyNow,
}) => {
  if (!product) return null;

  const [activeImgIndex, setActiveImgIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [addedNotice, setAddedNotice] = useState(false);

  const discount = discountPercent(product.selling_price, product.compare_at_price);

  const handleAdd = () => {
    onAddToCart(product, quantity);
    setAddedNotice(true);
    setTimeout(() => setAddedNotice(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm piko-fade-up">
      <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-border bg-card p-6 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 grid size-9 place-items-center rounded-full bg-secondary text-foreground hover:bg-rose/10 hover:text-rose transition-colors"
        >
          <X className="size-5" />
        </button>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Image Gallery */}
          <div className="space-y-3">
            <div className="relative aspect-square overflow-hidden rounded-2xl border border-border bg-secondary/30">
              <img
                src={product.images[activeImgIndex] || product.images[0]}
                alt={product.name}
                className="h-full w-full object-cover"
              />
              {discount > 0 && (
                <span className="absolute left-3 top-3 rounded-full bg-rose px-3 py-1 text-xs font-bold text-rose-foreground shadow-sm">
                  {discount}% OFF
                </span>
              )}
            </div>

            {/* Thumbnails */}
            {product.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImgIndex(idx)}
                    className={`relative size-16 shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                      activeImgIndex === idx ? 'border-rose scale-105' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details Column */}
          <div className="flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-rose/10 px-3 py-0.5 text-xs font-semibold text-rose uppercase tracking-wider">
                  {product.category_slug || 'PIKO Treasure'}
                </span>
                <span className="flex items-center gap-1 text-xs font-bold text-amber-500">
                  <Star className="size-3.5 fill-amber-400" /> {product.rating} ({product.rating_count} reviews)
                </span>
              </div>

              <h2 className="mt-2 font-display text-2xl font-bold text-foreground">
                {product.name}
              </h2>

              {/* Price */}
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-display text-2xl font-extrabold text-foreground">
                  {formatINR(product.selling_price)}
                </span>
                {product.compare_at_price && product.compare_at_price > product.selling_price && (
                  <span className="text-sm text-muted-foreground line-through">
                    {formatINR(product.compare_at_price)}
                  </span>
                )}
              </div>

              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                {product.description || product.short_description}
              </p>

              {/* Specifications */}
              {Object.keys(product.specifications || {}).length > 0 && (
                <div className="mt-4 rounded-xl bg-secondary/50 p-3 text-xs space-y-1.5">
                  <p className="font-bold text-foreground">Specifications:</p>
                  {Object.entries(product.specifications).map(([key, val]) => (
                    <div key={key} className="flex justify-between border-b border-border/40 pb-1">
                      <span className="text-muted-foreground">{key}</span>
                      <span className="font-semibold text-foreground">{val}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-3 pt-2">
              {/* Quantity selector */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">Quantity:</span>
                <div className="flex items-center rounded-xl border border-border bg-secondary p-1">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="grid size-7 place-items-center rounded-lg hover:bg-background font-bold text-sm"
                  >
                    -
                  </button>
                  <span className="w-8 text-center text-xs font-bold">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="grid size-7 place-items-center rounded-lg hover:bg-background font-bold text-sm"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleAdd}
                  disabled={!product.in_stock}
                  className={`flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold transition-all ${
                    addedNotice
                      ? 'bg-emerald-600 text-white'
                      : 'bg-secondary text-foreground hover:bg-rose/10 hover:text-rose'
                  }`}
                >
                  {addedNotice ? <Check className="size-4" /> : <ShoppingBag className="size-4" />}
                  <span>{addedNotice ? 'Added to Cart!' : 'Add to Cart'}</span>
                </button>

                <button
                  onClick={() => {
                    onBuyNow(product, quantity);
                    onClose();
                  }}
                  disabled={!product.in_stock}
                  className="flex items-center justify-center gap-2 rounded-xl bg-rose py-3 text-xs font-bold text-rose-foreground shadow-md hover:bg-rose/90 transition-all"
                >
                  <Sparkles className="size-4" />
                  <span>Buy Now</span>
                </button>
              </div>

              <div className="flex items-center justify-center gap-4 text-[11px] text-muted-foreground pt-1">
                <span className="flex items-center gap-1">
                  <Truck className="size-3.5 text-rose" /> Dispatched within 24–48 hours
                </span>
                <span className="flex items-center gap-1">
                  <ShieldCheck className="size-3.5 text-rose" /> 100% Genuine
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
