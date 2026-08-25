'use client';

import { useEffect, useState, useCallback } from 'react';
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
  Sparkles,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { DashboardService } from '@/features/dashboard';
import { AdminDashboardStats } from '@ramyas-jeweller/shared-types';
import { AppError } from '@/lib/errors/app-error';

export default function AdminHomePage() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await DashboardService.getDashboardStats();
      setStats(data);
    } catch (err) {
      if (err instanceof AppError) {
        setError(err.toUserMessage());
      } else {
        setError('Failed to load dashboard statistics. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <div className="space-y-8 pb-16 relative">
      {/* Error Banner with Retry */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs font-bold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchStats}
            className="px-3 py-1.5 bg-white border border-red-200 hover:bg-red-100 text-red-900 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      )}

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
            {isLoading ? '...' : `${stats?.pendingInstallments ?? 0} Pending Customers`}
          </span>
          <span className="px-3 py-1 bg-blue-50 text-blue-800 text-xs font-bold rounded-full border border-blue-200/80 shadow-2xs">
            {isLoading ? '...' : `${stats?.activeSchemes ?? 0} Active Schemes`}
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

      {/* 4 Metric KPI Stat Cards — Live RPC Data */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Metric 1: Total Collections */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Collections</span>
          <div className="flex items-baseline justify-between min-h-[32px]">
            {isLoading ? (
              <div className="h-8 w-24 bg-slate-100 animate-pulse rounded-lg" />
            ) : (
              <h2 className="text-2xl font-bold text-blue-600">
                ₹{(stats?.totalCollections ?? 0).toLocaleString('en-IN')}
              </h2>
            )}
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              <TrendingUp className="w-3 h-3" /> Live
            </span>
          </div>
        </div>

        {/* Metric 2: Active Customers */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Customers</span>
          <div className="flex items-baseline justify-between min-h-[32px]">
            {isLoading ? (
              <div className="h-8 w-16 bg-slate-100 animate-pulse rounded-lg" />
            ) : (
              <h2 className="text-2xl font-bold text-slate-900">
                {stats?.totalCustomers ?? 0}
              </h2>
            )}
            <span className="text-[11px] text-slate-500">Registered</span>
          </div>
        </div>

        {/* Metric 3: Pending Installments */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pending Installments</span>
          <div className="flex items-baseline justify-between min-h-[32px]">
            {isLoading ? (
              <div className="h-8 w-16 bg-slate-100 animate-pulse rounded-lg" />
            ) : (
              <h2 className="text-2xl font-bold text-amber-600">
                {stats?.pendingInstallments ?? 0}
              </h2>
            )}
            <span className="text-[11px] text-slate-500">Requires collection</span>
          </div>
        </div>

        {/* Metric 4: Active Schemes */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Schemes</span>
          <div className="flex items-baseline justify-between min-h-[32px]">
            {isLoading ? (
              <div className="h-8 w-16 bg-slate-100 animate-pulse rounded-lg" />
            ) : (
              <h2 className="text-2xl font-bold text-slate-900">
                {stats?.activeSchemes ?? 0}
              </h2>
            )}
            <span className="text-[11px] text-slate-500">Enrolled term plans</span>
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

              {/* Clean Empty State */}
              <div className="p-10 text-center space-y-2">
                <Clock className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="font-bold text-xs text-slate-700">No Pending Payments</p>
                <p className="text-[11px] text-slate-400">All customer installments are currently up to date.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Recent Payments */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-base text-slate-900">Recent Payments</h3>
            <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
          </div>

          <div className="p-8 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="font-bold text-xs text-slate-700">No Recent Payments</p>
            <p className="text-[11px] text-slate-400">Payment receipts will appear here as they are recorded.</p>
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
