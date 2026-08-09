import React, { useState, useMemo } from 'react';
import { SlidersHorizontal, Search, Sparkles, Filter, X } from 'lucide-react';
import { Category, Product } from '../types';
import { ProductCard } from './ProductCard';

interface ProductsBrowserProps {
  products: Product[];
  categories: Category[];
  activeCategory: string;
  onSelectCategory: (categorySlug: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onQuickView: (product: Product) => void;
  onAddToCart: (product: Product, e: React.MouseEvent) => void;
}

export const ProductsBrowser: React.FC<ProductsBrowserProps> = ({
  products,
  categories,
  activeCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  onQuickView,
  onAddToCart,
}) => {
  const [sortOption, setSortOption] = useState<'newest' | 'price_asc' | 'price_desc' | 'rating'>('newest');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [maxPriceFilter, setMaxPriceFilter] = useState<number>(1000);

  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        // Category filter
        if (activeCategory !== 'all' && p.category_slug !== activeCategory) {
          return false;
        }
        // Search query
        if (
          searchQuery.trim() &&
          !p.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !p.short_description.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !p.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
        ) {
          return false;
        }
        // Tag filter
        if (selectedTag !== 'all' && !p.tags.includes(selectedTag)) {
          return false;
        }
        // Price filter
        if (p.selling_price > maxPriceFilter) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortOption === 'price_asc') return a.selling_price - b.selling_price;
        if (sortOption === 'price_desc') return b.selling_price - a.selling_price;
        if (sortOption === 'rating') return b.rating - a.rating;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [products, activeCategory, searchQuery, selectedTag, maxPriceFilter, sortOption]);

  return (
    <section className="py-10">
      <div className="piko-container space-y-6">
        {/* Category Header & Filter Pills */}
        <div className="flex flex-col gap-4 border-b border-border/80 pb-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {activeCategory === 'all'
                ? 'All Little Treasures'
                : categories.find((c) => c.slug === activeCategory)?.name || 'Collection'}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Showing {filteredProducts.length} items curated with love
            </p>
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onSelectCategory('all')}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                activeCategory === 'all'
                  ? 'bg-rose text-rose-foreground shadow-sm'
                  : 'bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground'
              }`}
            >
              All Items
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat.slug)}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                  activeCategory === cat.slug
                    ? 'bg-rose text-rose-foreground shadow-sm'
                    : 'bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border/80 bg-card p-3 shadow-soft">
          {/* Tag filters */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <Filter className="size-3.5" /> Filter:
            </span>
            {['all', 'bestseller', 'trending', 'tech', 'home-decor', 'stationery', 'gift', 'under299', 'f1', 'jewellery'].map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`rounded-full px-3 py-1 text-[11px] font-medium capitalize transition-all whitespace-nowrap ${
                  selectedTag === tag
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground hover:text-foreground'
                }`}
              >
                {tag === 'all' ? 'All Tags' : `#${tag}`}
              </button>
            ))}
          </div>

          {/* Sorting dropdown & Price filter */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Max ₹{maxPriceFilter}</span>
              <input
                type="range"
                min="199"
                max="1000"
                step="50"
                value={maxPriceFilter}
                onChange={(e) => setMaxPriceFilter(Number(e.target.value))}
                className="h-1.5 w-24 rounded-lg bg-secondary accent-rose cursor-pointer"
              />
            </div>

            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as any)}
              className="h-8 rounded-xl border border-border bg-background px-3 text-xs font-medium text-foreground outline-none focus:ring-1 focus:ring-rose"
            >
              <option value="newest">Sort: Newest</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="rating">Top Rated</option>
            </select>
          </div>
        </div>

        {/* Search indicator if searching */}
        {searchQuery && (
          <div className="flex items-center justify-between rounded-xl bg-rose/10 px-4 py-2.5 text-xs text-rose font-medium">
            <span>
              Searching for "<strong>{searchQuery}</strong>" ({filteredProducts.length} results)
            </span>
            <button onClick={() => onSearchChange('')} className="hover:underline flex items-center gap-1">
              <X className="size-3.5" /> Clear Search
            </button>
          </div>
        )}

        {/* Product Grid */}
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-6 lg:grid-cols-4">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onQuickView={onQuickView}
                onAddToCart={onAddToCart}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card p-12 text-center">
            <Sparkles className="size-10 text-muted-foreground/60 mb-2" />
            <h3 className="font-display text-lg font-bold text-foreground">No little treasures found</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Try adjusting your filters, price slider, or search term.
            </p>
            <button
              onClick={() => {
                onSelectCategory('all');
                onSearchChange('');
                setSelectedTag('all');
                setMaxPriceFilter(1000);
              }}
              className="mt-4 rounded-full bg-rose px-5 py-2 text-xs font-semibold text-rose-foreground"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
