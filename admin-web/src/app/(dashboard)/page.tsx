'use client';

/**
 * RAMYAS JEWELLER - Main Admin Dashboard Overview
 * Connected to live Supabase data with real-time aggregation and current-month pending logic.
 */

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  CreditCard,
  UserPlus,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  Loader2,
  AlertCircle,
  Clock
} from 'lucide-react';
import { formatCurrency, formatTime, formatDate } from '@/lib/formatters';
import { useAuth } from '@/lib/auth-context';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

interface PendingInstallmentItem {
  id: string;
  scheme_id: string;
  customer_id: string;
  customer_name: string;
  customer_code: string;
  phone: string;
  scheme_code: string;
  installment_number: number;
  total_installments: number;
  amount: number;
  due_date: string;
}

interface RecentPaymentItem {
  id: string;
  customer_name: string;
  amount: number;
  method: string;
  time: string;
  receipt_number: string;
}

interface RecentAuditItem {
  id: string;
  action: string;
  entity_table: string;
  time: string;
}

export default function DashboardPage() {
  const { profile, user } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [stats, setStats] = useState({
    todayCollection: 0,
    activeCustomers: 0,
    pendingPaymentsCount: 0,
    maturedSchemesCount: 0,
  });

  const [pendingInstallments, setPendingInstallments] = useState<PendingInstallmentItem[]>([]);
  const [recentPayments, setRecentPayments] = useState<RecentPaymentItem[]>([]);
  const [recentAudits, setRecentAudits] = useState<RecentAuditItem[]>([]);

  const adminDisplayName = profile?.full_name || (
    user?.email === 'admin1@gmail.com'
      ? 'A.B.Kathiravven'
      : user?.email === 'admin2@gmail.com'
      ? 'A.K.Anith'
      : 'Admin'
  );

  // Dynamic Current Calendar Month Strings
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const currentMonthDisplay = now.toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      // Current calendar month date string: YYYY-MM-01
      const currentDate = new Date();
      const yearMonthStart = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-01`;

      // 1. Fetch Today's Payments & Total Active Schemes & Current Month Pending Installments
      const [
        paymentsRes,
        schemesRes,
        customersRes,
        pendingInstallmentsRes,
        recentPaymentsRes,
        auditsRes
      ] = await Promise.all([
        supabase
          .from('payments')
          .select('amount, payment_date')
          .gte('payment_date', todayStart.toISOString()),
        supabase
          .from('schemes')
          .select('id, status'),
        supabase
          .from('customers')
          .select('id', { count: 'exact', head: true }),
        supabase
          .from('scheme_installments')
          .select(`
            id,
            scheme_id,
            customer_id,
            installment_number,
            installment_amount,
            due_date,
            calendar_month,
            status,
            schemes (
              id,
              scheme_code,
              status,
              total_installments
            ),
            customers (
              id,
              customer_code,
              full_name,
              phone_number
            )
          `)
          .eq('calendar_month', yearMonthStart)
          .eq('status', 'PENDING')
          .order('due_date', { ascending: true }),
        supabase
          .from('payments')
          .select(`
            id,
            amount,
            payment_method,
            payment_date,
            receipt_number,
            customers (
              full_name
            )
          `)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('audit_logs')
          .select('id, action, entity_table, created_at')
          .order('created_at', { ascending: false })
          .limit(4)
      ]);

      if (paymentsRes.error) throw paymentsRes.error;
      if (schemesRes.error) throw schemesRes.error;

      // Calculate Stats
      const todayTotal = (paymentsRes.data || []).reduce(
        (sum, p) => sum + (Number(p.amount) || 0),
        0
      );

      const allSchemes = schemesRes.data || [];
      const activeSchemesCount = allSchemes.filter((s) => s.status === 'ACTIVE').length;
      const maturedCount = allSchemes.filter(
        (s) => s.status === 'MATURED' || s.status === 'COMPLETED'
      ).length;

      // Map Pending Installments (Strictly Current Calendar Month & Active Schemes)
      const mappedPending: PendingInstallmentItem[] = [];
      const rawPending = (pendingInstallmentsRes.data || []) as unknown as Array<{
        id: string;
        scheme_id: string;
        customer_id: string;
        installment_number: number;
        installment_amount: number;
        due_date: string;
        schemes?: { scheme_code: string; status: string; total_installments: number };
        customers?: { customer_code: string; full_name: string; phone_number: string };
      }>;

      for (const item of rawPending) {
        if (item.schemes?.status === 'ACTIVE') {
          mappedPending.push({
            id: item.id,
            scheme_id: item.scheme_id,
            customer_id: item.customer_id,
            customer_name: item.customers?.full_name || 'Customer',
            customer_code: item.customers?.customer_code || '—',
            phone: item.customers?.phone_number || '—',
            scheme_code: item.schemes?.scheme_code || '—',
            installment_number: item.installment_number,
            total_installments: item.schemes?.total_installments || 12,
            amount: Number(item.installment_amount) || 1000,
            due_date: item.due_date,
          });
        }
      }

      // Map Recent Payments
      const rawRecent = (recentPaymentsRes.data || []) as unknown as Array<{
        id: string;
        amount: number;
        payment_method: string;
        payment_date: string;
        receipt_number: string;
        customers?: { full_name: string };
      }>;

      const mappedRecent: RecentPaymentItem[] = rawRecent.map((p) => ({
        id: p.id,
        customer_name: p.customers?.full_name || 'Customer',
        amount: Number(p.amount) || 0,
        method: p.payment_method || 'CASH',
        time: formatTime(p.payment_date) || formatDate(p.payment_date),
        receipt_number: p.receipt_number,
      }));

      // Map Recent Audits
      const mappedAudits: RecentAuditItem[] = (auditsRes.data || []).map((a) => ({
        id: a.id,
        action: a.action,
        entity_table: a.entity_table,
        time: formatDate(a.created_at),
      }));

      setStats({
        todayCollection: todayTotal,
        activeCustomers: activeSchemesCount || (customersRes.count || 0),
        pendingPaymentsCount: mappedPending.length,
        maturedSchemesCount: maturedCount,
      });

      setPendingInstallments(mappedPending);
      setRecentPayments(mappedRecent);
      setRecentAudits(mappedAudits);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load live dashboard statistics.';
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDashboardData();
  }, [fetchDashboardData]);

  const todayDate = new Date().toLocaleDateString('en-IN', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="space-y-8">
      {/* Top Banner & Tasks Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif-luxury text-slate-900 flex items-center gap-2">
            <span>Good Day, {adminDisplayName}</span>
            <span>👋</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            {todayDate} — Store Operations Dashboard
          </p>
        </div>

        {/* Task Indicators */}
        <div className="flex items-center gap-2.5">
          <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            {stats.pendingPaymentsCount} Pending This Month
          </span>
          <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-amber-500" />
            {stats.maturedSchemesCount} Ready for Redemption
          </span>
        </div>
      </div>

      {/* Error Alert Banner */}
      {errorMessage && (
        <div className="luxury-card p-4 bg-rose-50 border-rose-200 text-rose-900 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <div className="text-xs sm:text-sm font-medium">{errorMessage}</div>
          </div>
          <button
            onClick={() => fetchDashboardData()}
            className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* QUICK ACTIONS HERO CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Record Payment Card */}
        <div className="luxury-card p-6 sm:p-7 relative overflow-hidden group hover:border-blue-300 transition-all shadow-sm">
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200/60 text-blue-600 flex items-center justify-center shadow-xs">
              <CreditCard className="w-6 h-6" />
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-600 bg-blue-50/80 px-2.5 py-1 rounded-md">
              Instant Receipt
            </span>
          </div>
          <h3 className="text-xl font-bold font-serif-luxury text-slate-900 mt-5">
            Record Payment
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-sm">
            Update customer monthly payment for their gold scheme and auto-issue digital receipts.
          </p>
          <div className="mt-6">
            <Link
              href="/payments"
              className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700 hover:gap-3 transition-all"
            >
              <span>Open Payment Portal</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Add Customer Card */}
        <div className="luxury-card p-6 sm:p-7 relative overflow-hidden group hover:border-emerald-300 transition-all shadow-sm">
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200/60 text-emerald-600 flex items-center justify-center shadow-xs">
              <UserPlus className="w-6 h-6" />
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 bg-emerald-50/80 px-2.5 py-1 rounded-md">
              12-Month Plan
            </span>
          </div>
          <h3 className="text-xl font-bold font-serif-luxury text-slate-900 mt-5">
            Add Customer
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-sm">
            Register a new walk-in customer and enroll in the 12-month ₹1,000 savings scheme.
          </p>
          <div className="mt-6">
            <Link
              href="/customers/new"
              className="inline-flex items-center gap-2 text-sm font-bold text-emerald-600 hover:text-emerald-700 hover:gap-3 transition-all"
            >
              <span>Create New Account</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* KEY METRIC TILES ROW */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Today's Collection */}
        <div className="luxury-card p-5 bg-white shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Today&apos;s Collection
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-serif-luxury text-slate-900 mt-2">
            {isLoading ? (
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin my-1" />
            ) : (
              formatCurrency(stats.todayCollection)
            )}
          </div>
          <div className="text-xs font-medium text-slate-500 mt-2">
            Verified ledger receipts
          </div>
        </div>

        {/* Active Customers */}
        <div className="luxury-card p-5 bg-white shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Active Customers
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-serif-luxury text-slate-900 mt-2">
            {isLoading ? (
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin my-1" />
            ) : (
              stats.activeCustomers
            )}
          </div>
          <div className="text-xs font-medium text-slate-500 mt-2">
            Enrolled scheme members
          </div>
        </div>

        {/* This Month Pending */}
        <div className="luxury-card p-5 bg-white shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            THIS MONTH PENDING
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-serif-luxury text-amber-600 mt-2">
            {isLoading ? (
              <Loader2 className="w-6 h-6 text-amber-600 animate-spin my-1" />
            ) : (
              stats.pendingPaymentsCount
            )}
          </div>
          <div className="text-xs font-medium text-slate-500 mt-2">
            Due for current month
          </div>
        </div>

        {/* Completed Schemes */}
        <div className="luxury-card p-5 bg-white shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Completed / Matured
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-serif-luxury text-blue-600 mt-2">
            {isLoading ? (
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin my-1" />
            ) : (
              stats.maturedSchemesCount
            )}
          </div>
          <div className="text-xs font-medium text-slate-500 mt-2">
            Eligible for redemption
          </div>
        </div>
      </div>

      {/* TWO COLUMN CONTENT: Pending Installments vs Recent Receipts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT 2 COLUMNS: This Month's Pending Payments List */}
        <div className="lg:col-span-2 luxury-card p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-bold font-serif-luxury text-slate-900">
                  This Month&apos;s Pending Payments
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                  {currentMonthDisplay}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Customers who have not yet paid their current month&apos;s installment
              </p>
            </div>
            <Link
              href="/payments"
              className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline shrink-0"
            >
              View All
            </Link>
          </div>

          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <div className="text-xs">Loading current month pending payments...</div>
            </div>
          ) : pendingInstallments.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
              <div className="text-sm font-semibold text-slate-700">This month is fully collected</div>
              <div className="text-xs text-slate-400 mt-1">No pending customer installments for this month.</div>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {pendingInstallments.map((item) => (
                <div
                  key={item.id}
                  className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 p-2.5 rounded-xl transition"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                      {item.customer_name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">{item.customer_name}</span>
                        <span className="font-mono text-[11px] text-slate-500">({item.customer_code})</span>
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                        <span>{item.phone}</span>
                        <span>•</span>
                        <span className="font-mono font-medium text-slate-700">
                          Installment #{item.installment_number}/{item.total_installments}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    <div className="text-right">
                      <div className="text-sm font-bold text-slate-900">{formatCurrency(item.amount)}</div>
                      <div className="flex items-center gap-1.5 justify-end mt-0.5">
                        <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                          Due {formatDate(item.due_date)}
                        </span>
                        <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                          PENDING
                        </span>
                      </div>
                    </div>

                    <Link
                      href={`/customers/${item.customer_id}`}
                      className="px-4 py-2 rounded-xl royal-button text-xs font-semibold shrink-0"
                    >
                      Record Payment
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT 1 COLUMN: Recent Payments Feed */}
        <div className="luxury-card p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold font-serif-luxury text-slate-900">
                  Recent Payments
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Latest receipts issued</p>
              </div>
            </div>

            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                <div className="text-xs">Loading payments...</div>
              </div>
            ) : recentPayments.length === 0 ? (
              <div className="py-10 text-center text-slate-400">
                <Clock className="w-7 h-7 mx-auto mb-2 text-slate-300" />
                <div className="text-xs font-medium text-slate-600">No payments recorded yet</div>
                <div className="text-[11px] text-slate-400 mt-0.5">New receipts will appear here live.</div>
              </div>
            ) : (
              <div className="space-y-4">
                {recentPayments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">{p.customer_name}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          <span className="font-medium text-slate-700">{p.method}</span> • {p.time}
                        </div>
                      </div>
                    </div>
                    <div className="text-right font-mono font-bold text-xs text-slate-900">
                      {formatCurrency(p.amount)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-6 mt-6 border-t border-slate-100 text-center">
            <Link
              href="/payments"
              className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline"
            >
              Open Full Payment Ledger →
            </Link>
          </div>
        </div>
      </div>

      {/* RECENT AUDIT ACTIVITY ROW */}
      <div className="luxury-card p-6 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">
          Recent System Activity (Audit Trail)
        </h3>
        {recentAudits.length === 0 ? (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 text-center text-xs text-slate-500">
            No system audit logs recorded yet. All administrative actions will be logged securely here.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recentAudits.map((a) => (
              <div key={a.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center gap-3 text-xs">
                <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-slate-800">{a.action}</div>
                  <div className="text-slate-500 text-[11px]">
                    {a.entity_table} • {a.time}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
