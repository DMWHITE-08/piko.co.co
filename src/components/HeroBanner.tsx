import React from 'react';
import { Sparkles, ArrowRight, Car } from 'lucide-react';

interface HeroBannerProps {
  onSelectCategory: (categorySlug: string) => void;
  onExploreAll: () => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ onSelectCategory, onExploreAll }) => {
  return (
    <section className="relative overflow-hidden border-b border-border/60 bg-gradient-to-b from-rose/10 via-background to-background py-10 md:py-16">
      <div className="piko-container relative z-10 grid items-center gap-8 md:grid-cols-12">
        {/* Left text */}
        <div className="space-y-4 md:col-span-7">
          <div className="inline-flex items-center gap-2 rounded-full border border-rose/30 bg-rose/10 px-3.5 py-1 text-xs font-semibold text-rose">
            <Sparkles className="size-3.5" />
            <span>Handcrafted Gifts & Cute Collectibles</span>
          </div>

          <h1 className="font-display text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl">
            Little Finds, <br />
            <span className="bg-gradient-to-r from-rose to-amber-600 bg-clip-text text-transparent">
              Big Smiles.
            </span>
          </h1>

          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Discover cute trinkets, rose-gold jewellery, 1:43 die-cast F1 models, plushies, and custom gift hampers made with love for your special someone.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={onExploreAll}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-md transition-all hover:bg-primary/90 hover:shadow-lg active:scale-95"
            >
              <span>Explore Collection</span>
              <ArrowRight className="size-4" />
            </button>

            <button
              onClick={() => onSelectCategory('f1-collectibles')}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-5 py-3 text-sm font-semibold text-foreground transition-all hover:border-rose hover:text-rose active:scale-95"
            >
              <Car className="size-4 text-rose" />
              <span>F1 Die-Cast Models</span>
            </button>
          </div>

          {/* Quick Badges */}
          <div className="flex items-center gap-6 pt-4 text-xs font-medium text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
              <span>Free Shipping over ₹499</span>
            </div>
          </div>
        </div>

        {/* Right visual card grid */}
        <div className="md:col-span-5">
          <div className="relative mx-auto max-w-sm">
            {/* Main Featured Banner Card */}
            <div className="overflow-hidden rounded-3xl border border-border/80 bg-card p-3 shadow-lift transition-transform hover:-translate-y-1">
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
                <img
                  src="https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=800&auto=format&fit=crop&q=80"
                  alt="PIKO Gift Hamper"
                  className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-3 left-3 right-3 text-white">
                  <span className="rounded-full bg-rose px-2.5 py-0.5 text-[10px] font-bold text-rose-foreground uppercase tracking-wider">
                    Bestseller
                  </span>
                  <p className="mt-1 font-display text-lg font-bold">PIKO Birthday Box</p>
                  <p className="text-xs text-white/80">₹649 • Curated Gift Hamper</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
