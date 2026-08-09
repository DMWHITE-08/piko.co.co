import React from 'react';
import { Star, ShoppingBag, Eye, Heart } from 'lucide-react';
import { Product } from '../types';
import { discountPercent, formatINR } from '../lib/utils';

interface ProductCardProps {
  product: Product;
  onQuickView: (product: Product) => void;
  onAddToCart: (product: Product, e: React.MouseEvent) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onQuickView,
  onAddToCart,
}) => {
  const discount = discountPercent(product.selling_price, product.compare_at_price);

  return (
    <div
      onClick={() => onQuickView(product)}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-card p-3 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lift cursor-pointer"
    >
      {/* Image Container */}
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-secondary/50">
        <img
          src={product.images[0] || 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600&auto=format&fit=crop&q=80'}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />

        {/* Badges Overlay */}
        <div className="absolute left-2.5 top-2.5 flex flex-col gap-1">
          {discount > 0 && (
            <span className="rounded-full bg-rose px-2 py-0.5 text-[10px] font-extrabold text-rose-foreground shadow-sm">
              -{discount}% OFF
            </span>
          )}
          {product.is_featured && (
            <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-extrabold text-white shadow-sm">
              Popular
            </span>
          )}
        </div>

        {/* Quick Actions Hover overlay */}
        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onQuickView(product);
            }}
            className="flex size-10 items-center justify-center rounded-full bg-background/90 text-foreground shadow-md transition-transform hover:scale-110"
            title="Quick view details"
          >
            <Eye className="size-4" />
          </button>
        </div>
      </div>

      {/* Product Content */}
      <div className="mt-3 flex flex-1 flex-col justify-between space-y-2">
        <div>
          {/* Rating */}
          <div className="flex items-center gap-1 text-[11px] font-medium text-amber-500">
            <Star className="size-3 fill-amber-400 text-amber-400" />
            <span>{product.rating}</span>
            <span className="text-muted-foreground">({product.rating_count})</span>
          </div>

          {/* Title */}
          <h3 className="line-clamp-1 font-sans text-sm font-semibold text-foreground group-hover:text-rose transition-colors">
            {product.name}
          </h3>

          <p className="line-clamp-1 text-[11px] text-muted-foreground">
            {product.short_description}
          </p>
        </div>

        {/* Pricing & Add to Cart */}
        <div className="flex items-center justify-between pt-1">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-display text-base font-extrabold text-foreground">
                {formatINR(product.selling_price)}
              </span>
              {product.compare_at_price && product.compare_at_price > product.selling_price && (
                <span className="text-xs text-muted-foreground line-through">
                  {formatINR(product.compare_at_price)}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={(e) => onAddToCart(product, e)}
            disabled={!product.in_stock}
            className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold transition-all active:scale-95 ${
              product.in_stock
                ? 'bg-rose text-rose-foreground hover:bg-rose/90 shadow-sm'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            }`}
          >
            <ShoppingBag className="size-3.5" />
            <span>{product.in_stock ? 'Add' : 'Out'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
