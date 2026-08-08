import React, { useState } from 'react';
import { Plus, Edit, Trash2, CheckCircle2, XCircle, Package, Image as ImageIcon, Sparkles, X } from 'lucide-react';
import { Category, Product } from '../../types';
import { formatINR, generateId } from '../../lib/utils';

interface AdminProductsManagerProps {
  products: Product[];
  categories: Category[];
  onAddProduct: (product: Product) => void;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onClearAllProducts: () => void;
  onRestoreSampleProducts: () => void;
}

export const AdminProductsManager: React.FC<AdminProductsManagerProps> = ({
  products,
  categories,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onClearAllProducts,
  onRestoreSampleProducts,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [shortDesc, setShortDesc] = useState('');
  const [desc, setDesc] = useState('');
  const [categorySlug, setCategorySlug] = useState('gifts');
  const [sellingPrice, setSellingPrice] = useState(299);
  const [comparePrice, setComparePrice] = useState(599);
  const [imageUrl, setImageUrl] = useState('');

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setName('');
    setShortDesc('');
    setDesc('');
    setCategorySlug(categories[0]?.slug || 'gifts');
    setSellingPrice(299);
    setComparePrice(599);
    setImageUrl('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setShortDesc(p.short_description);
    setDesc(p.description);
    setCategorySlug(p.category_slug || 'gifts');
    setSellingPrice(p.selling_price);
    setComparePrice(p.compare_at_price || 0);
    setImageUrl(p.images[0] || '');
    setIsModalOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !sellingPrice) return;

    const img = imageUrl.trim() || 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=800&auto=format&fit=crop&q=80';
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

    if (editingProduct) {
      const updated: Product = {
        ...editingProduct,
        name,
        slug,
        short_description: shortDesc,
        description: desc,
        category_slug: categorySlug,
        selling_price: Number(sellingPrice),
        compare_at_price: Number(comparePrice) || null,
        images: [img],
      };
      onUpdateProduct(updated);
    } else {
      const newProd: Product = {
        id: generateId(),
        name,
        slug,
        short_description: shortDesc,
        description: desc,
        specifications: { Category: categorySlug },
        images: [img],
        category_id: `cat-${categorySlug}`,
        category_slug: categorySlug,
        source_price: Math.round(Number(sellingPrice) * 0.5),
        selling_price: Number(sellingPrice),
        compare_at_price: Number(comparePrice) || null,
        stock_count: 25,
        in_stock: true,
        is_featured: true,
        rating: 4.8,
        rating_count: 12,
        tags: ['new', categorySlug],
        created_at: new Date().toISOString(),
      };
      onAddProduct(newProd);
    }

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 piko-fade-up">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Catalog & Inventory</h2>
          <p className="text-xs text-muted-foreground">
            Add new treasures, modify pricing, toggle stock, or manage catalog listings ({products.length} products).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {products.length > 0 ? (
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to clear all products from the store?')) {
                  onClearAllProducts();
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-destructive/10 border border-destructive/20 px-3.5 py-2.5 text-xs font-bold text-destructive hover:bg-destructive hover:text-white transition-all"
            >
              <Trash2 className="size-3.5" />
              <span>Clear Catalog</span>
            </button>
          ) : (
            <button
              onClick={onRestoreSampleProducts}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-secondary border border-border px-3.5 py-2.5 text-xs font-bold text-foreground hover:bg-rose/10 hover:text-rose transition-all"
            >
              <Sparkles className="size-3.5 text-rose" />
              <span>Restore Sample Products</span>
            </button>
          )}

          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 rounded-2xl bg-rose px-5 py-2.5 text-xs font-bold text-rose-foreground shadow-md hover:bg-rose/90 transition-all active:scale-95"
          >
            <Plus className="size-4" />
            <span>Add New Product</span>
          </button>
        </div>
      </div>

      {/* Product Cards Table Grid */}
      {products.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <div
              key={p.id}
              className="flex gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft hover:shadow-lift transition-all"
            >
              <img
                src={p.images[0]}
                alt={p.name}
                className="size-20 rounded-xl object-cover border border-border shrink-0"
              />
              <div className="flex flex-1 flex-col justify-between">
                <div>
                  <span className="rounded-full bg-rose/10 px-2 py-0.5 text-[10px] font-bold text-rose uppercase">
                    {p.category_slug}
                  </span>
                  <h3 className="font-semibold text-xs text-foreground line-clamp-1 mt-1">{p.name}</h3>
                  <p className="font-extrabold text-xs text-foreground mt-0.5">{formatINR(p.selling_price)}</p>
                </div>

                <div className="flex items-center justify-between pt-2">
                  {/* Stock Toggle */}
                  <button
                    onClick={() => onUpdateProduct({ ...p, in_stock: !p.in_stock })}
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold transition-colors ${
                      p.in_stock
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-destructive/10 text-destructive'
                    }`}
                  >
                    {p.in_stock ? 'In Stock' : 'Out of Stock'}
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(p)}
                      className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg"
                      title="Edit Product"
                    >
                      <Edit className="size-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteProduct(p.id)}
                      className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                      title="Delete Product"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card p-12 text-center">
          <Package className="size-12 text-muted-foreground/50 mb-3" />
          <h3 className="font-display text-lg font-bold text-foreground">Clean Catalog Ready</h3>
          <p className="mt-1 text-xs text-muted-foreground max-w-md">
            Your store is now completely clean and ready for your products! Click "Add New Product" to list your first item.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-2 rounded-2xl bg-rose px-6 py-3 text-xs font-bold text-rose-foreground shadow-lg hover:bg-rose/90 transition-all"
            >
              <Plus className="size-4" />
              <span>Add Your First Product</span>
            </button>
            <button
              onClick={onRestoreSampleProducts}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-secondary px-5 py-3 text-xs font-bold text-foreground hover:bg-secondary/80 transition-all"
            >
              <Sparkles className="size-3.5 text-rose" />
              <span>Load Sample Demo Data</span>
            </button>
          </div>
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm piko-fade-up">
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border border-border bg-card p-6 shadow-2xl">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 grid size-8 place-items-center rounded-full bg-secondary text-foreground hover:bg-rose/10 hover:text-rose"
            >
              <X className="size-4" />
            </button>

            <h3 className="font-display text-xl font-bold text-foreground mb-4">
              {editingProduct ? 'Edit Product' : 'Add New Treasure'}
            </h3>

            <form onSubmit={handleSaveProduct} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-foreground">Product Title *</label>
                <input
                  required
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Handmade Rose-Gold Charm"
                  className="mt-1 h-9 w-full rounded-xl border border-border bg-secondary px-3 outline-none focus:ring-1 focus:ring-rose"
                />
              </div>

              <div>
                <label className="font-bold text-foreground">Category *</label>
                <select
                  value={categorySlug}
                  onChange={(e) => setCategorySlug(e.target.value)}
                  className="mt-1 h-9 w-full rounded-xl border border-border bg-secondary px-3 outline-none focus:ring-1 focus:ring-rose"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-foreground">Selling Price (₹) *</label>
                  <input
                    required
                    type="number"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(Number(e.target.value))}
                    className="mt-1 h-9 w-full rounded-xl border border-border bg-secondary px-3 outline-none focus:ring-1 focus:ring-rose"
                  />
                </div>
                <div>
                  <label className="font-bold text-foreground">Original Price (₹)</label>
                  <input
                    type="number"
                    value={comparePrice}
                    onChange={(e) => setComparePrice(Number(e.target.value))}
                    className="mt-1 h-9 w-full rounded-xl border border-border bg-secondary px-3 outline-none focus:ring-1 focus:ring-rose"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-foreground">Image URL</label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="mt-1 h-9 w-full rounded-xl border border-border bg-secondary px-3 outline-none focus:ring-1 focus:ring-rose"
                />
              </div>

              <div>
                <label className="font-bold text-foreground">Short Description</label>
                <input
                  type="text"
                  value={shortDesc}
                  onChange={(e) => setShortDesc(e.target.value)}
                  placeholder="One liner summary..."
                  className="mt-1 h-9 w-full rounded-xl border border-border bg-secondary px-3 outline-none focus:ring-1 focus:ring-rose"
                />
              </div>

              <div>
                <label className="font-bold text-foreground">Full Description</label>
                <textarea
                  rows={3}
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="Detailed specifications and highlights..."
                  className="mt-1 w-full rounded-xl border border-border bg-secondary p-2.5 outline-none focus:ring-1 focus:ring-rose"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-2xl bg-rose py-3 text-xs font-bold text-rose-foreground shadow-md hover:bg-rose/90 mt-2"
              >
                Save Product
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
