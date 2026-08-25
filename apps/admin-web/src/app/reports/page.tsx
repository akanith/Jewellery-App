'use client';

import { useState } from 'react';
import { 
  Download, 
  TrendingUp, 
  Users, 
  CheckCircle2, 
  AlertTriangle, 
  Gift, 
  Award, 
  ArrowUpRight,
  PieChart,
  BarChart3,
  Sparkles
} from 'lucide-react';

export default function AnalyticsReportsPage() {
  const [timeframe, setTimeframe] = useState('Month');

  return (
    <div className="space-y-8 pb-16">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Reports</h1>
          <p className="text-sm text-slate-500 mt-1">
            Business insights and scheme performance for Ramyas Jeweller collections.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Timeframe selector pills */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1">
            {['Month', 'Week', 'Year', 'Custom'].map((t) => (
              <button
                key={t}
                onClick={() => setTimeframe(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  timeframe === t
                    ? 'bg-blue-950 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <button className="px-4 py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-extrabold text-xs rounded-xl flex items-center gap-2 transition-all shadow-md shadow-amber-400/20">
            <Download className="w-4 h-4" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* 7 Summary Cards Horizontal Scroll Row (from Screenshot 4) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* 1. Today */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">TODAY</span>
          <h3 className="text-lg font-black text-slate-900">₹84.2k</h3>
          <p className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5">
            <TrendingUp className="w-3 h-3" /> +12%
          </p>
        </div>

        {/* 2. Monthly */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">MONTHLY</span>
          <h3 className="text-lg font-black text-slate-900">₹12.4M</h3>
          <p className="text-[10px] text-slate-400">v/s last month</p>
        </div>

        {/* 3. Yearly */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">YEARLY</span>
          <h3 className="text-lg font-black text-slate-900">₹142M</h3>
          <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
            <div className="bg-blue-900 h-full w-[75%]" />
          </div>
        </div>

        {/* 4. Customers */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">CUSTOMERS</span>
          <h3 className="text-lg font-black text-slate-900">3,104</h3>
          <p className="text-[10px] font-bold text-emerald-600">+82</p>
        </div>

        {/* 5. Completed */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">COMPLETED</span>
          <h3 className="text-lg font-black text-slate-900">1,892</h3>
          <p className="text-[10px] text-slate-400">Scheme cycles</p>
        </div>

        {/* 6. Pending (Red text) */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">PENDING</span>
          <h3 className="text-lg font-black text-red-600">142</h3>
          <p className="text-[10px] text-red-500 font-medium">Requires attention</p>
        </div>

        {/* 7. Redemption */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">REDEMPTION</span>
          <h3 className="text-lg font-black text-slate-900">₹4.8M</h3>
          <p className="text-[10px] text-slate-400">Ready to claim</p>
        </div>
      </div>

      {/* Main Charts Grid: Collection Overview & Payment Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Collection Overview Bar Chart Card (8 cols) */}
        <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-base text-slate-900">Collection Overview</h3>
              <p className="text-xs text-slate-400">Monthly installment collection performance</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
              <span className="w-3 h-3 rounded-full bg-blue-900" />
              <span>Primary Scheme</span>
            </div>
          </div>

          {/* Bar Chart Visual Representation */}
          <div className="h-64 flex items-end justify-between gap-4 pt-8 px-4 border-b border-slate-100 pb-4">
            {[
              { month: 'Jan', val: 45 },
              { month: 'Feb', val: 60 },
              { month: 'Mar', val: 52 },
              { month: 'Apr', val: 78 },
              { month: 'May', val: 92 },
              { month: 'Jun', val: 68 },
              { month: 'Jul', val: 84 },
              { month: 'Aug', val: 98 },
            ].map((item, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-3 group h-full justify-end">
                <div
                  className="w-full bg-blue-900 hover:bg-blue-950 rounded-xl transition-all duration-300 relative group-hover:shadow-md"
                  style={{ height: `${item.val}%` }}
                >
                  <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded pointer-events-none transition-opacity">
                    ₹{(item.val * 1.5).toFixed(1)}L
                  </div>
                </div>
                <span className="text-xs font-bold text-slate-500">{item.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Insights Donut Chart Card (4 cols) */}
        <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6 flex flex-col justify-between">
          <div>
            <h3 className="font-extrabold text-base text-slate-900">Payment Insights</h3>
            <p className="text-xs text-slate-400">Method distribution</p>

            {/* Donut Graphic */}
            <div className="my-8 flex items-center justify-center relative">
              <div className="w-44 h-44 rounded-full border-[14px] border-blue-900 border-r-amber-500 border-b-slate-300 flex items-center justify-center">
                <div className="text-center space-y-0.5">
                  <h2 className="text-xl font-extrabold text-slate-900">₹24M</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">TOTAL FLOW</p>
                </div>
              </div>
            </div>

            {/* Legend List */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between font-bold">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-900" />
                  <span className="text-slate-700">GPay / UPI</span>
                </div>
                <span className="text-slate-900">65%</span>
              </div>

              <div className="flex items-center justify-between font-bold">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="text-slate-700">Cash</span>
                </div>
                <span className="text-slate-900">20%</span>
              </div>

              <div className="flex items-center justify-between font-bold">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                  <span className="text-slate-700">Bank Transfer</span>
                </div>
                <span className="text-slate-900">15%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Growth Trend Line Chart Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-base text-slate-900">Customer Growth Trend</h3>
            <p className="text-xs text-slate-400">New acquisitions over the last 12 months</p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-extrabold text-blue-900">+1,240</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Net New Growth</p>
          </div>
        </div>

        {/* SVG Sparkline Curve */}
        <div className="h-32 w-full pt-4">
          <svg className="w-full h-full overflow-visible" viewBox="0 0 1000 100" preserveAspectRatio="none">
            <path
              d="M 0,80 Q 200,75 400,60 T 800,40 T 1000,10"
              fill="none"
              stroke="#1e3a8a"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>

      {/* Scheme Lifecycle & Milestones Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Side: Lifecycle Cards Grid (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <h3 className="font-extrabold text-base text-slate-900">Scheme Lifecycle</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Active</span>
              <h2 className="text-2xl font-black text-slate-900">2,410</h2>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Pending</span>
              <h2 className="text-2xl font-black text-slate-900">32</h2>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
              <span className="text-[10px] font-bold text-amber-600 uppercase">Ready for Redemption</span>
              <h2 className="text-2xl font-black text-amber-600">118</h2>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Inactive</span>
              <h2 className="text-2xl font-black text-slate-900">45</h2>
            </div>
          </div>
        </div>

        {/* Right Side: Milestones (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <h3 className="font-extrabold text-base text-slate-900">Milestones</h3>
          <div className="space-y-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Highest Collection Month</h4>
                <p className="text-[11px] text-slate-400">August 2024 • ₹1.82M Collected</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Record New Customers</h4>
                <p className="text-[11px] text-slate-400">May 2024 • 142 New Joinings</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                <Gift className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Highest Redemption</h4>
                <p className="text-[11px] text-slate-400">Diwali Period • ₹8.4M Value Distributed</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h3 className="font-extrabold text-base text-slate-900">Recent Transactions</h3>
          <button className="text-xs font-bold text-blue-900 hover:underline flex items-center gap-1">
            <span>View All</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          <div className="py-2.5 grid grid-cols-12 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            <span className="col-span-3">CUSTOMER</span>
            <span className="col-span-3">AMOUNT</span>
            <span className="col-span-2">METHOD</span>
            <span className="col-span-2">DATE</span>
            <span className="col-span-2 text-right">STATUS</span>
          </div>

          {[
            { name: 'Ananya Sharma', amount: '₹5,000.00', method: 'GPay', date: 'Aug 25, 2026', status: 'SUCCESSFUL', style: 'bg-emerald-50 text-emerald-700' },
            { name: 'Rahul Kapoor', amount: '₹2,500.00', method: 'Cash', date: 'Aug 25, 2026', status: 'SUCCESSFUL', style: 'bg-emerald-50 text-emerald-700' },
            { name: 'Vikram Singh', amount: '₹10,000.00', method: 'Bank Transfer', date: 'Aug 24, 2026', status: 'PROCESSING', style: 'bg-amber-50 text-amber-800' },
            { name: 'Priya Menon', amount: '₹5,000.00', method: 'PhonePe', date: 'Aug 24, 2026', status: 'SUCCESSFUL', style: 'bg-emerald-50 text-emerald-700' },
          ].map((t, idx) => (
            <div key={idx} className="py-3.5 grid grid-cols-12 items-center hover:bg-slate-50 transition-colors">
              <span className="col-span-3 font-bold text-slate-900">{t.name}</span>
              <span className="col-span-3 font-extrabold text-slate-900">{t.amount}</span>
              <span className="col-span-2 text-slate-600 font-medium">{t.method}</span>
              <span className="col-span-2 text-slate-400">{t.date}</span>
              <div className="col-span-2 text-right">
                <span className={`px-2.5 py-1 text-[10px] font-extrabold rounded-md ${t.style}`}>
                  {t.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
