import React from 'react';
import { X, Heart, Shield, Truck, HelpCircle, FileText } from 'lucide-react';

interface InfoModalProps {
  type: 'about' | 'faq' | 'shipping' | 'terms' | null;
  onClose: () => void;
}

export const InfoModal: React.FC<InfoModalProps> = ({ type, onClose }) => {
  if (!type) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm piko-fade-up">
      <div className="relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-4">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 grid size-9 place-items-center rounded-full bg-secondary text-foreground hover:bg-rose/10 hover:text-rose"
        >
          <X className="size-5" />
        </button>

        {type === 'about' && (
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-rose/10 px-3 py-1 text-xs font-bold text-rose">
              <Heart className="size-3.5" /> About PIKO
            </div>
            <h2 className="font-display text-2xl font-bold text-foreground">Our Story & Mission</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              PIKO was founded with a simple vision: to make gift-giving effortless, delightful, and affordable. From delicate 18k rose-gold plated necklaces to precision 1:43 die-cast F1 models and squishy plushies, every item in our boutique is hand-curated to bring genuine smiles.
            </p>
            <div className="rounded-2xl bg-secondary/50 p-4 text-xs space-y-2">
              <p className="font-bold text-foreground">What makes us special?</p>
              <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                <li>100% Quality Checked before packing</li>
                <li>Custom handwritten gift notes with every order</li>
                <li>Fast 24–48 hour express dispatch from Bengaluru</li>
              </ul>
            </div>
          </div>
        )}

        {type === 'faq' && (
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-rose/10 px-3 py-1 text-xs font-bold text-rose">
              <HelpCircle className="size-3.5" /> FAQ
            </div>
            <h2 className="font-display text-2xl font-bold text-foreground">Frequently Asked Questions</h2>
            <div className="space-y-3 text-xs">
              <div className="rounded-2xl border border-border p-3">
                <p className="font-bold text-foreground">How long does delivery take?</p>
                <p className="text-muted-foreground mt-1">
                  Orders are dispatched within 24–48 hours. Standard delivery takes 3-5 business days across India. Express metro delivery takes 2-3 days.
                </p>
              </div>
              <div className="rounded-2xl border border-border p-3">
                <p className="font-bold text-foreground">Do you accept Cash on Delivery (COD)?</p>
                <p className="text-muted-foreground mt-1">
                  COD is currently disabled for security and faster order processing. We accept instant UPI (GPay, PhonePe, Paytm), NetBanking, and Credit/Debit Cards.
                </p>
              </div>
              <div className="rounded-2xl border border-border p-3">
                <p className="font-bold text-foreground">How do I track my order?</p>
                <p className="text-muted-foreground mt-1">
                  You can track your order status live using our "Track Order" page with your Order Number or phone number.
                </p>
              </div>
            </div>
          </div>
        )}

        {type === 'shipping' && (
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-rose/10 px-3 py-1 text-xs font-bold text-rose">
              <Truck className="size-3.5" /> Shipping & Returns
            </div>
            <h2 className="font-display text-2xl font-bold text-foreground">Delivery & Hassle-Free Returns</h2>
            <div className="text-xs space-y-3 leading-relaxed text-muted-foreground">
              <p>
                <strong className="text-foreground">Free Shipping:</strong> Enjoy free express shipping on all orders over ₹499! A flat rate of ₹49 applies for smaller orders.
              </p>
              <p>
                <strong className="text-foreground">Easy Returns:</strong> If your item arrives damaged or incomplete, contact us within 7 days of delivery. We will issue an instant replacement or full refund.
              </p>
            </div>
          </div>
        )}

        {type === 'terms' && (
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-rose/10 px-3 py-1 text-xs font-bold text-rose">
              <FileText className="size-3.5" /> Terms
            </div>
            <h2 className="font-display text-2xl font-bold text-foreground">Terms & Store Policies</h2>
            <div className="text-xs text-muted-foreground space-y-2 leading-relaxed">
              <p>
                By placing an order on PIKO Treasures, you agree to our standard store policies. Prices include applicable GST. Product colors may vary slightly due to studio lighting.
              </p>
              <p>For support inquiries, reach out to us at <strong>support@piko.co</strong>.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
