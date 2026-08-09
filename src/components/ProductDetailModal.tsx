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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/95 p-2 sm:p-4 flex items-start justify-center min-h-full py-4 sm:py-8 piko-fade-up">
      <div className="relative my-auto max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border-2 border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-slate-100 p-5 sm:p-7 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 grid size-9 place-items-center rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-slate-100 hover:bg-rose hover:text-white transition-colors border border-slate-200 dark:border-zinc-700"
        >
          <X className="size-5" />
        </button>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Image Gallery */}
          <div className="space-y-3">
            <div className="relative aspect-square overflow-hidden rounded-2xl border-2 border-slate-200 dark:border-zinc-700 bg-slate-100 dark:bg-zinc-800">
              <img
                src={product.images[activeImgIndex] || product.images[0]}
                alt={product.name}
                className="h-full w-full object-cover"
              />
              {discount > 0 && (
                <span className="absolute left-3 top-3 rounded-full bg-rose px-3 py-1 text-xs font-black text-white shadow-md">
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
                      activeImgIndex === idx ? 'border-rose scale-105' : 'border-slate-300 dark:border-zinc-700 opacity-70 hover:opacity-100'
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
                <span className="rounded-full bg-rose px-3 py-0.5 text-xs font-black text-white uppercase tracking-wider shadow-sm">
                  {product.category_slug || 'PIKO Treasure'}
                </span>
                <span className="flex items-center gap-1 text-xs font-extrabold text-amber-600 dark:text-amber-400">
                  <Star className="size-3.5 fill-amber-400 text-amber-500" /> {product.rating} ({product.rating_count} reviews)
                </span>
              </div>

              <h2 className="mt-2.5 font-display text-2xl sm:text-3xl font-black text-slate-900 dark:text-white leading-tight">
                {product.name}
              </h2>

              {/* Price */}
              <div className="mt-3 flex items-baseline gap-2.5">
                <span className="font-display text-3xl font-black text-rose">
                  {formatINR(product.selling_price)}
                </span>
                {product.compare_at_price && product.compare_at_price > product.selling_price && (
                  <span className="text-base text-slate-400 line-through font-semibold">
                    {formatINR(product.compare_at_price)}
                  </span>
                )}
              </div>

              <p className="mt-3 text-sm leading-relaxed font-medium text-slate-700 dark:text-slate-300">
                {product.description || product.short_description}
              </p>

              {/* Specifications */}
              {Object.keys(product.specifications || {}).length > 0 && (
                <div className="mt-4 rounded-2xl border-2 border-slate-200 dark:border-zinc-700 bg-slate-100 dark:bg-zinc-800/90 p-4 text-xs space-y-2 shadow-sm">
                  <p className="font-extrabold text-slate-900 dark:text-white text-xs uppercase tracking-wider">Specifications:</p>
                  {Object.entries(product.specifications).map(([key, val]) => (
                    <div key={key} className="flex justify-between border-b border-slate-200 dark:border-zinc-700 pb-1.5 last:border-b-0 last:pb-0">
                      <span className="text-slate-600 dark:text-slate-400 font-semibold">{key}</span>
                      <span className="font-extrabold text-slate-900 dark:text-white">{val}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-zinc-800">
              {/* Quantity selector */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">Quantity:</span>
                <div className="flex items-center rounded-xl border-2 border-slate-300 dark:border-zinc-700 bg-slate-100 dark:bg-zinc-800 p-1">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="grid size-8 place-items-center rounded-lg bg-white dark:bg-zinc-700 hover:bg-rose hover:text-white font-extrabold text-base shadow-sm transition-colors"
                  >
                    -
                  </button>
                  <span className="w-10 text-center text-sm font-black text-slate-900 dark:text-white">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="grid size-8 place-items-center rounded-lg bg-white dark:bg-zinc-700 hover:bg-rose hover:text-white font-extrabold text-base shadow-sm transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={handleAdd}
                  disabled={!product.in_stock}
                  className={`flex items-center justify-center gap-2 rounded-2xl py-3.5 text-xs font-black transition-all shadow-md ${
                    addedNotice
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-slate-800 dark:hover:bg-zinc-200'
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
                  className="flex items-center justify-center gap-2 rounded-2xl bg-rose py-3.5 text-xs font-black text-white shadow-lg hover:bg-rose/90 transition-all active:scale-98"
                >
                  <Sparkles className="size-4" />
                  <span>Buy Now</span>
                </button>
              </div>

              <div className="flex items-center justify-center gap-4 text-xs font-semibold text-slate-600 dark:text-slate-400 pt-1">
                <span className="flex items-center gap-1.5">
                  <Truck className="size-4 text-rose" /> Ships in 24h
                </span>
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="size-4 text-rose" /> 100% Genuine
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
