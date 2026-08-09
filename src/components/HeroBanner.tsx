import React from 'react';
import { Sparkles, ArrowRight, Car } from 'lucide-react';

interface HeroBannerProps {
  onSelectCategory: (categorySlug: string) => void;
  onExploreAll: () => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ onSelectCategory, onExploreAll }) => {
  return (
    <section className="relative overflow-hidden border-b border-border/60 bg-gradient-to-b from-rose/10 via-background to-background py-10 md:py-16">
      <div className="piko-container relative z-10 mx-auto max-w-3xl text-center">
        <div className="space-y-4">
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

          <p className="mx-auto max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Discover cute trinkets, rose-gold jewellery, 1:43 die-cast F1 models, plushies, and custom gift hampers made with love for your special someone.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
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
          <div className="flex items-center justify-center gap-6 pt-4 text-xs font-medium text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
              <span>Free Shipping over ₹499</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
