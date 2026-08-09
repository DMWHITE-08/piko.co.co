import React, { useState } from 'react';
import { ShoppingBag, Search, Menu, X, ShieldCheck, Heart, Moon, Sun } from 'lucide-react';
import { CartItem } from '../types';

interface SiteHeaderProps {
  cartCount: number;
  onOpenCart: () => void;
  onOpenAdmin: () => void;
  isAdmin: boolean;
  onSelectCategory: (categorySlug: string) => void;
  activeCategory: string;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onNavigateHome: () => void;
  onNavigateTrack: () => void;
  activeView: 'shop' | 'track' | 'admin' | 'info';
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

const NAV_ITEMS = [
  { label: 'All Shop', slug: 'all' },
  { label: 'Gifts', slug: 'gifts' },
  { label: 'Tech & Gadgets', slug: 'tech' },
  { label: 'Home Decor', slug: 'home-decor' },
  { label: 'Jewellery', slug: 'jewellery' },
  { label: 'Toys & Plushies', slug: 'toys' },
  { label: 'F1 Collectibles', slug: 'f1-collectibles' },
  { label: 'Couple Gifts', slug: 'couple-gifts' },
  { label: 'Stationery', slug: 'stationery' },
];

export const SiteHeader: React.FC<SiteHeaderProps> = ({
  cartCount,
  onOpenCart,
  onOpenAdmin,
  isAdmin,
  onSelectCategory,
  activeCategory,
  searchQuery,
  onSearchChange,
  onNavigateHome,
  onNavigateTrack,
  activeView,
  isDarkMode,
  onToggleDarkMode,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [logoClickCount, setLogoClickCount] = useState(0);

  const handleCategoryClick = (slug: string) => {
    onNavigateHome();
    onSelectCategory(slug);
    setMobileMenuOpen(false);
  };

  const handleLogoClick = (e: React.MouseEvent) => {
    // Secret trigger: Alt+Click or Ctrl+Click on logo opens admin
    if (e.altKey || e.ctrlKey) {
      onOpenAdmin();
      return;
    }

    onNavigateHome();

    // Secret trigger: Triple click on logo opens admin
    const nextCount = logoClickCount + 1;
    setLogoClickCount(nextCount);
    if (nextCount >= 3) {
      onOpenAdmin();
      setLogoClickCount(0);
    } else {
      setTimeout(() => setLogoClickCount(0), 1500);
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-md shadow-sm transition-colors">
      <div className="piko-container flex h-16 items-center justify-between gap-3">
        {/* Mobile Hamburger Button */}
        <button
          type="button"
          aria-label="Toggle menu"
          className="rounded-xl p-2.5 text-foreground hover:bg-secondary md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>

        {/* Brand Logo */}
        <button
          onClick={handleLogoClick}
          className="group flex items-center gap-2 text-left outline-none cursor-pointer"
          title="PIKO Treasures"
        >
          <span className="font-display text-2xl font-extrabold tracking-tight text-foreground transition-transform group-hover:scale-105">
            PIKO
          </span>
          <span className="hidden rounded-full bg-rose/10 px-2.5 py-0.5 text-[11px] font-semibold text-rose sm:inline-block">
            Little Treasures
          </span>
        </button>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.slug}
              onClick={() => handleCategoryClick(item.slug)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-all ${
                activeView === 'shop' && activeCategory === item.slug
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
            >
              {item.label}
            </button>
          ))}
          <button
            onClick={onNavigateTrack}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-all ${
              activeView === 'track'
                ? 'bg-rose text-rose-foreground font-semibold shadow-sm'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            }`}
          >
            Track Order
          </button>
        </nav>

        {/* Search & Actions */}
        <div className="flex items-center gap-2">
          {/* Search bar */}
          <div className="relative hidden w-48 lg:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                onNavigateHome();
                onSearchChange(e.target.value);
              }}
              placeholder="Search little treasures…"
              className="h-9 w-full rounded-full border border-border/80 bg-secondary/80 pl-9 pr-3 text-xs outline-none focus:border-rose focus:ring-1 focus:ring-rose"
            />
          </div>

          {/* Dark mode toggle */}
          <button
            onClick={onToggleDarkMode}
            aria-label="Toggle theme"
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            {isDarkMode ? <Sun className="size-5 text-amber-400" /> : <Moon className="size-5" />}
          </button>

          {/* Admin Dashboard Button (Only visible when logged in) */}
          {isAdmin && (
            <button
              onClick={onOpenAdmin}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 dark:text-emerald-400"
              title="Admin Dashboard"
            >
              <ShieldCheck className="size-4 text-emerald-500" />
              <span className="hidden sm:inline">Admin Dashboard</span>
            </button>
          )}

          {/* Cart Icon */}
          <button
            onClick={onOpenCart}
            aria-label="Open cart"
            className="relative flex items-center justify-center rounded-full bg-primary p-2.5 text-primary-foreground shadow-sm transition-transform active:scale-95"
          >
            <ShoppingBag className="size-4" />
            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 grid size-5 min-w-5 place-items-center rounded-full bg-rose text-[10px] font-extrabold text-rose-foreground shadow-sm animate-pulse">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="border-t border-border bg-background px-4 py-4 md:hidden piko-fade-up">
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                onNavigateHome();
                onSearchChange(e.target.value);
              }}
              placeholder="Search gifts, jewellery, F1…"
              className="h-10 w-full rounded-xl border border-border bg-secondary pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-rose"
            />
          </div>
          <div className="grid gap-1">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.slug}
                onClick={() => handleCategoryClick(item.slug)}
                className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                  activeCategory === item.slug ? 'bg-secondary text-rose font-semibold' : 'text-foreground hover:bg-secondary/50'
                }`}
              >
                <span>{item.label}</span>
              </button>
            ))}
            <button
              onClick={() => {
                onNavigateTrack();
                setMobileMenuOpen(false);
              }}
              className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-rose/10 py-3 text-sm font-semibold text-rose"
            >
              Track Order Status
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
