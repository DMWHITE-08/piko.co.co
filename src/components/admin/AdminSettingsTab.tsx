import React, { useState, useEffect } from 'react';
import { Save, CheckCircle2, QrCode, Store, Truck, ShieldAlert } from 'lucide-react';
import { StoreSettings } from '../../types';
import { fetchStoreSettings, updateStoreSettingsApi, DEFAULT_SETTINGS } from '../../lib/api';

interface AdminSettingsTabProps {
  token?: string;
  onShowToast: (msg: string) => void;
}

export const AdminSettingsTab: React.FC<AdminSettingsTabProps> = ({ token = 'piko_admin_session_valid', onShowToast }) => {
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchStoreSettings().then((data) => {
      if (data) setSettings(data);
      setLoading(false);
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await updateStoreSettingsApi(settings, token);
      setSettings(updated);
      onShowToast('Store settings saved successfully!');
    } catch (err) {
      onShowToast('Failed to save store settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-xs text-muted-foreground">Loading store settings…</div>;
  }

  return (
    <div className="max-w-2xl space-y-6 piko-fade-up">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">UPI Payment & Store Settings</h2>
        <p className="text-xs text-muted-foreground">
          Configure your manual UPI ID, QR Code image, Store Name, and Delivery Fees for Checkout.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6 rounded-3xl border border-border bg-card p-6 shadow-soft">
        {/* UPI Configuration Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <QrCode className="size-5 text-rose" />
            <h3 className="font-display text-base font-bold text-foreground">UPI Payment Details</h3>
          </div>

          <div>
            <label className="text-xs font-bold text-foreground">Store UPI ID *</label>
            <p className="text-[11px] text-muted-foreground">Customers will make payments to this UPI ID at checkout.</p>
            <input
              required
              type="text"
              value={settings.upi_id}
              onChange={(e) => setSettings({ ...settings, upi_id: e.target.value })}
              placeholder="e.g. piko@upi or 8590918769@paytm"
              className="mt-1 h-10 w-full rounded-2xl border border-border bg-secondary px-3.5 text-xs font-mono font-bold text-foreground outline-none focus:ring-1 focus:ring-rose"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-foreground">UPI QR Code Image URL (Optional)</label>
            <p className="text-[11px] text-muted-foreground">Provide a custom QR image URL, or leave blank to auto-generate a dynamic QR code.</p>
            <input
              type="url"
              value={settings.upi_qr_url}
              onChange={(e) => setSettings({ ...settings, upi_qr_url: e.target.value })}
              placeholder="https://example.com/upi-qr.png"
              className="mt-1 h-10 w-full rounded-2xl border border-border bg-secondary px-3.5 text-xs outline-none focus:ring-1 focus:ring-rose"
            />
          </div>
        </div>

        {/* Store & Shipping Section */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Store className="size-5 text-rose" />
            <h3 className="font-display text-base font-bold text-foreground">Store Branding & Delivery</h3>
          </div>

          <div>
            <label className="text-xs font-bold text-foreground">Store Name *</label>
            <input
              required
              type="text"
              value={settings.store_name}
              onChange={(e) => setSettings({ ...settings, store_name: e.target.value })}
              placeholder="PIKO's Little Treasures"
              className="mt-1 h-10 w-full rounded-2xl border border-border bg-secondary px-3.5 text-xs outline-none focus:ring-1 focus:ring-rose"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-bold text-foreground">Flat Shipping Fee (₹) *</label>
              <input
                required
                type="number"
                min={0}
                value={settings.shipping_fee}
                onChange={(e) => setSettings({ ...settings, shipping_fee: Number(e.target.value) })}
                className="mt-1 h-10 w-full rounded-2xl border border-border bg-secondary px-3.5 text-xs outline-none focus:ring-1 focus:ring-rose"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-foreground">Free Shipping Threshold (₹) *</label>
              <input
                required
                type="number"
                min={0}
                value={settings.free_shipping_threshold}
                onChange={(e) => setSettings({ ...settings, free_shipping_threshold: Number(e.target.value) })}
                className="mt-1 h-10 w-full rounded-2xl border border-border bg-secondary px-3.5 text-xs outline-none focus:ring-1 focus:ring-rose"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-rose py-3.5 text-xs font-bold text-rose-foreground shadow-lg hover:bg-rose/90 transition-all active:scale-98"
        >
          {saving ? (
            <span>Saving Settings…</span>
          ) : (
            <>
              <Save className="size-4" />
              <span>Save Settings</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};
