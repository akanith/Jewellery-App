'use client';

import Link from 'next/link';
import { 
  CreditCard, 
  UserPlus, 
  TrendingUp, 
  Users, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Plus, 
  Activity, 
  DollarSign, 
  Award,
  Sparkles
} from 'lucide-react';

export default function AdminHomePage() {
  return (
    <div className="space-y-8 pb-16 relative">
      {/* Top Greeting & Tasks Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            Good Morning <span className="text-xl">👋</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">August 25, 2026</p>
        </div>

        {/* Today's Tasks Badges */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-700">Today's Tasks</span>
          <span className="px-3 py-1 bg-amber-50 text-amber-800 text-xs font-bold rounded-full border border-amber-200/80 shadow-2xs">
            18 Pending Customers
          </span>
          <span className="px-3 py-1 bg-blue-50 text-blue-800 text-xs font-bold rounded-full border border-blue-200/80 shadow-2xs">
            5 Ready for Redemption
          </span>
        </div>
      </div>

      {/* 2 Primary Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Record Payment */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-blue-300 transition-all">
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <CreditCard className="w-6 h-6" />
            </div>
            <div className="w-24 h-24 bg-blue-50/50 rounded-full absolute -right-6 -bottom-6 pointer-events-none group-hover:scale-110 transition-transform" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">Record Payment</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            Update customer's monthly payment for their gold scheme.
          </p>
          <Link
            href="/payments"
            className="inline-flex items-center gap-2 text-xs font-bold text-blue-600 mt-6 hover:gap-3 transition-all"
          >
            <span>Open Payment Portal</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Card 2: Add Customer */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-blue-300 transition-all">
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <UserPlus className="w-6 h-6" />
            </div>
            <div className="w-24 h-24 bg-slate-100/50 rounded-full absolute -right-6 -bottom-6 pointer-events-none group-hover:scale-110 transition-transform" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">Add Customer</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            Register a new savings scheme for a walk-in customer.
          </p>
          <Link
            href="/customers/new"
            className="inline-flex items-center gap-2 text-xs font-bold text-blue-600 mt-6 hover:gap-3 transition-all"
          >
            <span>Create New Account</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* 4 Metric KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Today's Collection</span>
          <div className="flex items-baseline justify-between">
            <h2 className="text-2xl font-bold text-blue-600">₹18,000</h2>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              <TrendingUp className="w-3 h-3" /> 12% <span className="text-[9px] text-slate-400 font-normal">from yesterday</span>
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Customers</span>
          <div className="flex items-baseline justify-between">
            <h2 className="text-2xl font-bold text-slate-900">286</h2>
            <span className="text-[11px] text-slate-500">All schemes active</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pending Payments</span>
          <div className="flex items-baseline justify-between">
            <h2 className="text-2xl font-bold text-amber-600">18</h2>
            <span className="text-[11px] text-slate-500">Due this week</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Completed Schemes</span>
          <div className="flex items-baseline justify-between">
            <h2 className="text-2xl font-bold text-slate-900">82</h2>
            <span className="text-[11px] text-slate-500">FY 2023-24</span>
          </div>
        </div>
      </div>

      {/* Middle Grid: Pending Payments & Recent Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Pending Payments Table */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900">Pending Payments</h3>
              <Link href="/payments" className="text-xs font-bold text-blue-600 hover:underline">
                View All
              </Link>
            </div>

            <div className="divide-y divide-slate-100">
              {/* Header */}
              <div className="bg-slate-50 px-5 py-3 grid grid-cols-12 text-[11px] font-bold text-slate-400 uppercase tracking-wider items-center">
                <span className="col-span-3">Customer</span>
                <span className="col-span-2">Installment</span>
                <span className="col-span-3">Method</span>
                <span className="col-span-2 text-center">Status</span>
                <span className="col-span-2 text-right">Action</span>
              </div>

              {/* Row 1 */}
              <div className="px-5 py-4 grid grid-cols-12 items-center text-xs hover:bg-slate-50/80 transition-colors">
                <div className="col-span-3 space-y-0.5">
                  <p className="font-bold text-slate-900">Ananya Sharma</p>
                  <p className="text-[11px] text-slate-400">+91 98765 43210</p>
                </div>
                <div className="col-span-2">
                  <span className="font-bold text-slate-900">₹2,500</span>
                  <span className="text-[11px] text-slate-400 ml-1">(6/11)</span>
                </div>
                <div className="col-span-3 flex items-center gap-1.5 text-slate-600 font-medium">
                  <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                  <span>GPay</span>
                </div>
                <div className="col-span-2 text-center">
                  <span className="px-2 py-0.5 text-[10px] font-extrabold text-red-700 bg-red-50 border border-red-100 rounded-md">
                    OVERDUE
                  </span>
                </div>
                <div className="col-span-2 text-right">
                  <Link
                    href="/payments"
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] rounded-lg transition-all shadow-2xs inline-block"
                  >
                    Record
                  </Link>
                </div>
              </div>

              {/* Row 2 */}
              <div className="px-5 py-4 grid grid-cols-12 items-center text-xs hover:bg-slate-50/80 transition-colors">
                <div className="col-span-3 space-y-0.5">
                  <p className="font-bold text-slate-900">Rajesh Kumar</p>
                  <p className="text-[11px] text-slate-400">+91 91234 56789</p>
                </div>
                <div className="col-span-2">
                  <span className="font-bold text-slate-900">₹5,000</span>
                  <span className="text-[11px] text-slate-400 ml-1">(3/11)</span>
                </div>
                <div className="col-span-3 flex items-center gap-1.5 text-slate-600 font-medium">
                  <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                  <span>Cash</span>
                </div>
                <div className="col-span-2 text-center">
                  <span className="px-2 py-0.5 text-[10px] font-extrabold text-amber-800 bg-amber-50 border border-amber-200 rounded-md">
                    DUE TODAY
                  </span>
                </div>
                <div className="col-span-2 text-right">
                  <Link
                    href="/payments"
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] rounded-lg transition-all shadow-2xs inline-block"
                  >
                    Record
                  </Link>
                </div>
              </div>

              {/* Row 3 */}
              <div className="px-5 py-4 grid grid-cols-12 items-center text-xs hover:bg-slate-50/80 transition-colors">
                <div className="col-span-3 space-y-0.5">
                  <p className="font-bold text-slate-900">Meera Iyer</p>
                  <p className="text-[11px] text-slate-400">+91 88888 77777</p>
                </div>
                <div className="col-span-2">
                  <span className="font-bold text-slate-900">₹1,000</span>
                  <span className="text-[11px] text-slate-400 ml-1">(11/11)</span>
                </div>
                <div className="col-span-3 flex items-center gap-1.5 text-slate-600 font-medium">
                  <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                  <span>PhonePe</span>
                </div>
                <div className="col-span-2 text-center">
                  <span className="px-2 py-0.5 text-[10px] font-extrabold text-amber-800 bg-amber-50 border border-amber-200 rounded-md">
                    DUE TODAY
                  </span>
                </div>
                <div className="col-span-2 text-right">
                  <Link
                    href="/payments"
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] rounded-lg transition-all shadow-2xs inline-block"
                  >
                    Record
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Recent Payments */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-base text-slate-900">Recent Payments</h3>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          </div>

          <div className="space-y-3">
            {[
              { name: 'Sanjay Patel', method: 'Cash', time: '10:45 AM', amount: '₹3,000' },
              { name: 'Divya Rao', method: 'GPay', time: '09:30 AM', amount: '₹2,000' },
              { name: 'Lakshmi P.', method: 'PhonePe', time: '08:15 AM', amount: '₹5,000' },
              { name: 'Varun Bajaj', method: 'Cash', time: 'Yesterday', amount: '₹1,500' },
              { name: 'Priya M.', method: 'GPay', time: 'Yesterday', amount: '₹2,500' },
            ].map((p, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50/60 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{p.name}</h4>
                    <p className="text-[10px] text-slate-400">{p.method} • {p.time}</p>
                  </div>
                </div>
                <span className="text-sm font-bold text-blue-600">{p.amount}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Section: Recent System Activity */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Recent System Activity</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-3.5 rounded-xl bg-white border border-slate-200 flex items-center gap-3 shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <UserPlus className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">Customer Added</p>
              <p className="text-[10px] text-slate-400 truncate">Rohan V. • 10m ago</p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-white border border-slate-200 flex items-center gap-3 shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CreditCard className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">Payment Recorded</p>
              <p className="text-[10px] text-slate-400 truncate">Sunita G. • 24m ago</p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-white border border-slate-200 flex items-center gap-3 shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
              <Award className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">Scheme Completed</p>
              <p className="text-[10px] text-slate-400 truncate">Karan J. • 1h ago</p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-white border border-slate-200 flex items-center gap-3 shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
              <Activity className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">Customer Edited</p>
              <p className="text-[10px] text-slate-400 truncate">Vikas D. • 2h ago</p>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Plus Action Button (FAB) */}
      <Link
        href="/customers/new"
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-xl shadow-blue-600/30 transition-transform hover:scale-105 z-40"
      >
        <Plus className="w-7 h-7" />
      </Link>
    </div>
  );
}
