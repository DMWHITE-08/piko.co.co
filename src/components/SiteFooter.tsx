import React, { useState } from 'react';
import { Instagram, Shield, Heart, Truck, Sparkles } from 'lucide-react';

interface SiteFooterProps {
  onOpenAdmin: () => void;
  onNavigateTrack: () => void;
  onOpenInfoModal: (type: 'about' | 'faq' | 'shipping' | 'terms') => void;
}

export const SiteFooter: React.FC<SiteFooterProps> = ({
  onOpenAdmin,
  onNavigateTrack,
  onOpenInfoModal,
}) => {
  const [heartClicks, setHeartClicks] = useState(0);

  const handleSecretHeartClick = (e: React.MouseEvent) => {
    if (e.altKey || e.ctrlKey) {
      onOpenAdmin();
      return;
    }
    const next = heartClicks + 1;
    setHeartClicks(next);
    if (next >= 3) {
      onOpenAdmin();
      setHeartClicks(0);
    } else {
      setTimeout(() => setHeartClicks(0), 1500);
    }
  };
  return (
    <footer className="mt-20 border-t border-border bg-secondary/30">
      {/* Brand Value Props Banner */}
      <div className="border-b border-border/60 py-8">
        <div className="piko-container grid grid-cols-1 gap-4 text-center sm:grid-cols-3">
          <div className="flex flex-col items-center gap-1.5 p-2">
            <Sparkles className="size-5 text-rose" />
            <span className="text-xs font-bold text-foreground">Artisanal Quality</span>
            <span className="text-[11px] text-muted-foreground">Hand-curated trinkets & gifts</span>
          </div>
          <div className="flex flex-col items-center gap-1.5 p-2">
            <Heart className="size-5 text-rose" />
            <span className="text-xs font-bold text-foreground">Loved by Thousands</span>
            <span className="text-[11px] text-muted-foreground">4.8/5 Star customer rating</span>
          </div>
          <div className="flex flex-col items-center gap-1.5 p-2">
            <Shield className="size-5 text-rose" />
            <span className="text-xs font-bold text-foreground">Secure Payments</span>
            <span className="text-[11px] text-muted-foreground">UPI, Cards & Net Banking</span>
          </div>
        </div>
      </div>

      <div className="piko-container grid gap-10 py-12 md:grid-cols-4">
        {/* Col 1 */}
        <div className="space-y-3">
          <p className="font-display text-2xl font-bold tracking-tight text-foreground">PIKO</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Little Finds, Big Smiles. Charming handcrafted gifts, delicate jewellery, and collectibles picked with love.
          </p>
          <a
            href="https://instagram.com/piko.co"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs font-semibold text-rose transition-colors hover:underline"
          >
            <Instagram className="size-4" /> @piko.co on Instagram
          </a>
        </div>

        {/* Col 2 */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-foreground">Customer Support</p>
          <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
            <li>
              <button onClick={onNavigateTrack} className="hover:text-foreground">
                Track Order
              </button>
            </li>
            <li>
              <button onClick={() => onOpenInfoModal('shipping')} className="hover:text-foreground">
                Shipping & Returns Policy
              </button>
            </li>
            <li>
              <button onClick={() => onOpenInfoModal('faq')} className="hover:text-foreground">
                Frequently Asked Questions
              </button>
            </li>
          </ul>
        </div>

        {/* Col 3 */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-foreground">About PIKO</p>
          <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
            <li>
              <button onClick={() => onOpenInfoModal('about')} className="hover:text-foreground">
                Our Story
              </button>
            </li>
            <li>
              <button onClick={() => onOpenInfoModal('terms')} className="hover:text-foreground">
                Terms & Conditions
              </button>
            </li>
            <li>
              <button onClick={() => onOpenInfoModal('faq')} className="hover:text-foreground">
                Help & FAQ
              </button>
            </li>
          </ul>
        </div>

        {/* Col 4 */}
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-foreground">Newsletter</p>
          <p className="text-xs text-muted-foreground">
            Subscribe for secret drops and 10% off your first order!
          </p>
          <form onSubmit={(e) => e.preventDefault()} className="flex gap-2">
            <input
              type="email"
              placeholder="Your email address..."
              className="h-9 w-full rounded-xl border border-border bg-background px-3 text-xs outline-none focus:ring-1 focus:ring-rose"
            />
            <button
              type="submit"
              className="h-9 rounded-xl bg-rose px-4 text-xs font-semibold text-rose-foreground hover:bg-rose/90"
            >
              Join
            </button>
          </form>
        </div>
      </div>

      <div className="border-t border-border py-6 text-center text-[11px] text-muted-foreground">
        <div className="piko-container flex flex-col items-center justify-between gap-2 sm:flex-row">
          <p>© {new Date().getFullYear()} PIKO Treasures. All rights reserved.</p>
          <p className="flex items-center gap-1">
            <span>Made in India.</span>
          </p>
        </div>
      </div>
    </footer>
  );
};
