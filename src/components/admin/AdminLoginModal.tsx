import React, { useState } from 'react';
import { Lock, KeyRound, ShieldCheck, X, AlertCircle } from 'lucide-react';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  if (!isOpen) return null;

  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();

      if (data.success || password === 'arlinalbin') {
        onLoginSuccess();
        setPassword('');
      } else {
        setErrorMsg(data.error || 'Invalid admin password');
      }
    } catch {
      // Fallback local check for offline or client environment
      if (password === 'arlinalbin') {
        onLoginSuccess();
        setPassword('');
      } else {
        setErrorMsg('Invalid admin password. Default is "arlinalbin"');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm piko-fade-up">
      <div className="relative w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 grid size-8 place-items-center rounded-full bg-secondary text-foreground hover:bg-rose/10 hover:text-rose"
        >
          <X className="size-4" />
        </button>

        <div className="text-center space-y-2 mb-6">
          <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-rose/10 text-rose">
            <Lock className="size-6" />
          </div>
          <h2 className="font-display text-2xl font-bold text-foreground">Admin Order Dashboard</h2>
          <p className="text-xs text-muted-foreground">
            Enter store administrator password to manage orders and catalog.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-xs text-destructive font-medium">
            <AlertCircle className="size-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-[11px] font-bold text-foreground block mb-1">
              Store Password
            </label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password..."
                className="h-11 w-full rounded-2xl border border-border bg-secondary pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-rose"
              />
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Default admin password: <code className="rounded bg-rose/10 px-1.5 py-0.5 font-mono text-rose font-bold">arlinalbin</code>
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-rose py-3.5 text-xs font-bold text-rose-foreground shadow-lg hover:bg-rose/90 transition-all active:scale-98"
          >
            <ShieldCheck className="size-4" />
            <span>{loading ? 'Authenticating…' : 'Login to Dashboard'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
