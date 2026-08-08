import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import { Order } from '../../types';
import { formatINR } from '../../lib/utils';

interface AdminAnalyticsProps {
  orders: Order[];
}

const COLORS = ['#e11d48', '#f59e0b', '#10b981', '#6366f1', '#8b5cf6'];

export const AdminAnalytics: React.FC<AdminAnalyticsProps> = ({ orders }) => {
  // Compute daily revenue trend over last 7 days
  const dailyData = React.useMemo(() => {
    const daysMap: Record<string, number> = {};
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const key = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      daysMap[key] = 0;
    }

    orders.forEach((o) => {
      if (o.payment_status === 'paid') {
        const dKey = new Date(o.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        if (daysMap[dKey] !== undefined) {
          daysMap[dKey] += o.total_amount;
        }
      }
    });

    return Object.entries(daysMap).map(([date, revenue]) => ({ date, revenue }));
  }, [orders]);

  // Payment method breakdown
  const paymentData = React.useMemo(() => {
    const counts: Record<string, number> = { upi: 0, razorpay: 0, card: 0, cod: 0 };
    orders.forEach((o) => {
      counts[o.payment_method] = (counts[o.payment_method] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({
      name: name.toUpperCase(),
      value,
    }));
  }, [orders]);

  return (
    <div className="space-y-6 piko-fade-up">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">Sales & Revenue Analytics</h2>
        <p className="text-xs text-muted-foreground">Visual breakdown of daily income and payment preferences.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Revenue Trend Area Chart */}
        <div className="lg:col-span-2 rounded-3xl border border-border bg-card p-6 shadow-soft space-y-3">
          <h3 className="font-display text-base font-bold text-foreground">7-Day Revenue Trend</h3>
          <div className="h-64 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#e11d48" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#e11d48" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#888888" fontSize={11} />
                <YAxis stroke="#888888" fontSize={11} tickFormatter={(v) => `₹${v}`} />
                <Tooltip formatter={(value: any) => [formatINR(Number(value)), 'Revenue']} />
                <Area type="monotone" dataKey="revenue" stroke="#e11d48" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Methods Pie Chart */}
        <div className="rounded-3xl border border-border bg-card p-6 shadow-soft space-y-3">
          <h3 className="font-display text-base font-bold text-foreground">Payment Method Mix</h3>
          <div className="h-64 w-full text-xs flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={paymentData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                  {paymentData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
