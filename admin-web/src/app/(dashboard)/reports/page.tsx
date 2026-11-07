'use client';

/**
 * RAMYAS JEWELLER - Reports & Business Intelligence
 * Live Supabase financial analytics with verified collection charts.
 * Displays October historical showroom collections and November regular collections.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Download,
  Award,
  AlertCircle,
  Receipt,
  Calendar,
  TrendingUp,
  CreditCard
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

interface MetricRibbonItem {
  label: string;
  value: string;
  change: string;
  sub: string;
  isAlert?: boolean;
}

interface ChartBarItem {
  label: string;
  amount: number;
  heightPct: number;
  count: number;
  isCurrent?: boolean;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

interface TransactionItem {
  id: string;
  customerName: string;
  customerCode?: string;
  amount: number;
  method: string;
  date: string;
  actualDate?: string;
  isHistorical?: boolean;
  status: string;
}

export default function ReportsPage() {
  const [period, setPeriod] = useState<'Month' | 'Week' | 'Year' | 'Custom'>('Month');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [ribbons, setRibbons] = useState<MetricRibbonItem[]>([
    { label: 'TODAY', value: '₹0', change: '', sub: 'Today collection' },
    { label: 'MONTHLY', value: '₹0', change: '', sub: 'Current month' },
    { label: 'YEARLY', value: '₹0', change: '', sub: 'Annual collection' },
    { label: 'CUSTOMERS', value: '0', change: '', sub: 'Enrolled members' },
    { label: 'COMPLETED', value: '0', change: '', sub: 'Matured cycles' },
    { label: 'PENDING', value: '0', change: '', sub: 'Due installments', isAlert: true },
    { label: 'REDEMPTION', value: '₹0', change: '', sub: 'Ready to claim' },
  ]);

  const [chartBars, setChartBars] = useState<ChartBarItem[]>(() => {
    const currentMonthIdx = new Date().getMonth();
    return MONTH_NAMES.map((m, idx) => ({
      label: m,
      amount: 0,
      heightPct: 0,
      count: 0,
      isCurrent: idx === currentMonthIdx,
    }));
  });
  const [recentTransactions, setRecentTransactions] = useState<TransactionItem[]>([]);

  const fetchReportsData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString();

      const [paymentsRes, schemesRes, customersCountRes, pendingInstRes, recentPayRes] =
        await Promise.all([
          supabase
            .from('payments')
            .select(`
              id,
              amount,
              payment_date,
              actual_payment_date,
              is_historical,
              historical_reason,
              payment_method,
              payment_status
            `)
            .eq('payment_status', 'SUCCESS'),
          supabase.from('schemes').select('id, status, maturity_amount'),
          supabase.from('customers').select('id', { count: 'exact', head: true }),
          supabase.from('scheme_installments').select('id', { count: 'exact', head: true }).eq('status', 'PENDING'),
          supabase
            .from('payments')
            .select(`
              id,
              amount,
              payment_method,
              payment_date,
              actual_payment_date,
              is_historical,
              payment_status,
              customers (
                full_name,
                customer_code
              )
            `)
            .eq('payment_status', 'SUCCESS')
            .order('payment_date', { ascending: false })
            .limit(6)
        ]);

      if (paymentsRes.error) throw paymentsRes.error;
      if (schemesRes.error) throw schemesRes.error;

      interface RawPayment {
        id: string;
        amount: number;
        payment_date: string;
        actual_payment_date?: string | null;
        is_historical?: boolean;
        historical_reason?: string | null;
        payment_method?: string;
        payment_status?: string;
      }

      const payments: RawPayment[] = (paymentsRes.data || []) as RawPayment[];
      const schemes = schemesRes.data || [];

      // Ribbon Calculations
      // For Today: check if payment_date or actual_payment_date matches today
      const todayTotal = payments
        .filter((p) => p.payment_date >= startOfToday)
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

      // For Monthly: Include genuine November collections
      const monthTotal = payments
        .filter((p) => {
          const effectiveDate = p.actual_payment_date || p.payment_date;
          return effectiveDate >= startOfMonth;
        })
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

      // For Yearly: Include all genuine FY collections
      const yearTotal = payments
        .filter((p) => {
          const effectiveDate = p.actual_payment_date || p.payment_date;
          return effectiveDate >= startOfYear;
        })
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

      const totalCustomers = customersCountRes.count || 0;
      const completedCount = schemes.filter((s) => s.status === 'COMPLETED' || s.status === 'MATURED').length;
      const pendingCount = pendingInstRes.count || 0;

      const redemptionReadyTotal = schemes
        .filter((s) => s.status === 'MATURED' || s.status === 'COMPLETED')
        .reduce((sum, s) => sum + (Number(s.maturity_amount) || 13000), 0);

      setRibbons([
        { label: 'TODAY', value: formatCurrency(todayTotal), change: '', sub: 'Today collection' },
        { label: 'MONTHLY', value: formatCurrency(monthTotal), change: '', sub: 'Current month' },
        { label: 'YEARLY', value: formatCurrency(yearTotal), change: '', sub: 'Annual collection' },
        { label: 'CUSTOMERS', value: String(totalCustomers), change: '', sub: 'Enrolled members' },
        { label: 'COMPLETED', value: String(completedCount), change: '', sub: 'Matured cycles' },
        { label: 'PENDING', value: String(pendingCount), change: '', sub: 'Due installments', isAlert: pendingCount > 0 },
        { label: 'REDEMPTION', value: formatCurrency(redemptionReadyTotal), change: '', sub: 'Ready to claim' },
      ]);

      // Chart Bar Generation
      if (period === 'Week') {
        // Daily breakdown for current week (Monday to Sunday)
        const dayBuckets: Record<string, { amount: number; count: number }> = {};
        DAY_NAMES.forEach((d) => {
          dayBuckets[d] = { amount: 0, count: 0 };
        });

        // Compute start of current week (Monday)
        const currentDayOfWeek = (now.getDay() + 6) % 7; // 0 = Mon, 6 = Sun
        const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - currentDayOfWeek);
        const endOfWeek = new Date(monday.getTime() + 7 * 24 * 60 * 60 * 1000);

        payments.forEach((p) => {
          const effectiveStr = p.actual_payment_date || p.payment_date;
          const d = new Date(effectiveStr);
          if (d >= monday && d < endOfWeek) {
            const dayIdx = (d.getDay() + 6) % 7;
            const dayName = DAY_NAMES[dayIdx];
            dayBuckets[dayName].amount += Number(p.amount) || 0;
            dayBuckets[dayName].count += 1;
          }
        });

        const maxDayAmount = Math.max(1000, ...Object.values(dayBuckets).map((b) => b.amount));
        const bars: ChartBarItem[] = DAY_NAMES.map((d, idx) => ({
          label: d,
          amount: dayBuckets[d].amount,
          heightPct: Math.round((dayBuckets[d].amount / maxDayAmount) * 100),
          count: dayBuckets[d].count,
          isCurrent: idx === currentDayOfWeek,
        }));
        setChartBars(bars);
      } else if (period === 'Year') {
        // Multi-year comparison (past 3 calendar years)
        const currentYear = now.getFullYear();
        const years = [currentYear - 2, currentYear - 1, currentYear].map(String);
        const yearBuckets: Record<string, { amount: number; count: number }> = {};
        years.forEach((y) => {
          yearBuckets[y] = { amount: 0, count: 0 };
        });

        payments.forEach((p) => {
          const effectiveStr = p.actual_payment_date || p.payment_date;
          const y = String(new Date(effectiveStr).getFullYear());
          if (yearBuckets[y]) {
            yearBuckets[y].amount += Number(p.amount) || 0;
            yearBuckets[y].count += 1;
          }
        });

        const maxYearAmount = Math.max(1000, ...Object.values(yearBuckets).map((b) => b.amount));
        const bars: ChartBarItem[] = years.map((y) => ({
          label: y,
          amount: yearBuckets[y].amount,
          heightPct: Math.round((yearBuckets[y].amount / maxYearAmount) * 100),
          count: yearBuckets[y].count,
          isCurrent: y === String(currentYear),
        }));
        setChartBars(bars);
      } else {
        // Default to Monthly FY Breakdown (Jan - Dec)
        const monthBuckets: Record<string, { amount: number; count: number }> = {};
        MONTH_NAMES.forEach((m) => {
          monthBuckets[m] = { amount: 0, count: 0 };
        });

        payments.forEach((p) => {
          // Attribute to verified actual collection date (e.g. October 7 collection in Oct), otherwise system payment date
          const effectiveStr = p.actual_payment_date || p.payment_date;
          const d = new Date(effectiveStr);
          if (d.getFullYear() === now.getFullYear()) {
            const m = MONTH_NAMES[d.getMonth()];
            monthBuckets[m].amount += Number(p.amount) || 0;
            monthBuckets[m].count += 1;
          }
        });

        const maxMonthAmount = Math.max(1000, ...Object.values(monthBuckets).map((b) => b.amount));
        const currentMonthIdx = now.getMonth();

        const bars: ChartBarItem[] = MONTH_NAMES.map((m, idx) => ({
          label: m,
          amount: monthBuckets[m].amount,
          heightPct: Math.round((monthBuckets[m].amount / maxMonthAmount) * 100),
          count: monthBuckets[m].count,
          isCurrent: idx === currentMonthIdx,
        }));

        setChartBars(bars);
      }

      // Recent Transactions
      const rawRecent = (recentPayRes.data || []) as unknown as Array<{
        id: string;
        amount: number;
        payment_method: string;
        payment_date: string;
        actual_payment_date?: string | null;
        is_historical?: boolean;
        payment_status: string;
        customers?: { full_name: string; customer_code?: string };
      }>;

      const mappedRecent: TransactionItem[] = rawRecent.map((p) => ({
        id: p.id,
        customerName: p.customers?.full_name || 'Customer',
        customerCode: p.customers?.customer_code,
        amount: Number(p.amount) || 0,
        method: p.payment_method || 'CASH',
        date: formatDate(p.payment_date),
        actualDate: p.actual_payment_date ? formatDate(p.actual_payment_date) : undefined,
        isHistorical: p.is_historical,
        status: p.payment_status || 'SUCCESSFUL',
      }));

      setRecentTransactions(mappedRecent);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load report metrics.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, [period]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchReportsData();
  }, [fetchReportsData]);

  const maxChartAmount = Math.max(1000, ...chartBars.map((b) => b.amount));
  const totalChartCollections = chartBars.reduce((sum, b) => sum + b.amount, 0);
  const activePeriods = chartBars.filter((b) => b.amount > 0);
  const peakPeriod = chartBars.reduce(
    (max, b) => (b.amount > max.amount ? b : max),
    chartBars[0] || { label: 'None', amount: 0, heightPct: 0, count: 0 }
  );

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-bold text-2xl text-slate-900 tracking-tight flex items-center gap-2">
            Reports & Business Intelligence
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Live business performance and verified savings scheme analytics for RAMYA&apos;S JEWELLER.
          </p>
        </div>

        {/* Time Period Filter & Export PDF */}
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {(['Month', 'Week', 'Year', 'Custom'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  period === p
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 hover:bg-slate-50 text-xs font-bold shadow-2xs transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-blue-600" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="luxury-card p-4 bg-rose-50 border-rose-200 text-rose-900 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <div className="text-xs sm:text-sm font-medium">{errorMessage}</div>
          </div>
          <button
            onClick={() => fetchReportsData()}
            className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* Top 7 Metric Ribbons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {ribbons.map((ribbon) => (
          <div
            key={ribbon.label}
            className={`bg-white rounded-2xl p-3.5 border shadow-2xs flex flex-col justify-between ${
              ribbon.isAlert ? 'border-amber-200 bg-amber-50/20' : 'border-slate-200'
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              {ribbon.label}
            </span>

            <div className="my-2">
              <span className="font-heading font-bold text-lg text-slate-900 block font-mono">
                {isLoading ? '...' : ribbon.value}
              </span>
              <span className="text-[10px] text-slate-500 font-medium block truncate">
                {ribbon.sub}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Chart & Insights Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Collection Bar Chart (Col Span 8) */}
        <div className="lg:col-span-8 bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-heading font-bold text-base text-slate-900">
                  {period === 'Week'
                    ? 'Weekly Collection Breakdown'
                    : 'Collection Overview (FY Breakdown)'}
                </h2>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  Live Ledger
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {period === 'Week'
                  ? 'Daily verified savings scheme installments for the current week'
                  : `Monthly verified savings scheme installments collected (${new Date().getFullYear()} FY View)`}
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-medium text-slate-600">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-gradient-to-t from-[#0d52bd] to-blue-500 inline-block shadow-2xs"></span>
                <span className="text-[11px] text-slate-600 font-semibold">Collected</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-slate-100 border border-slate-200 inline-block"></span>
                <span className="text-[11px] text-slate-400">No Activity</span>
              </div>
            </div>
          </div>

          {/* Chart Viewport: Y-Axis Reference Scale & Fixed Height Grid */}
          <div className="pt-4 pb-2">
            {/* Main Chart Row with Y-Axis and Bars Area */}
            <div className="flex items-end">
              {/* Left Y-Axis Scale Values */}
              <div
                className="w-14 shrink-0 flex flex-col justify-between items-end pr-3 select-none text-[10px] font-mono font-medium text-slate-400"
                style={{ height: '160px' }}
              >
                <span className="leading-none">{formatCurrency(maxChartAmount)}</span>
                <span className="leading-none">{formatCurrency(Math.round(maxChartAmount / 2))}</span>
                <span className="leading-none text-slate-500 font-semibold">₹0</span>
              </div>

              {/* Chart Grid & Bars Track Container */}
              <div
                className="flex-1 relative flex items-end"
                style={{ height: '160px' }}
              >
                {/* Horizontal Reference Lines Across Full Width */}
                <div className="absolute inset-0 pointer-events-none flex flex-col justify-between">
                  <div className="border-b border-dashed border-slate-200 w-full" />
                  <div className="border-b border-dashed border-slate-100 w-full" />
                  <div className="border-b border-slate-200 w-full" />
                </div>

                {/* Bars Flex Row */}
                <div className="w-full h-full flex items-end justify-between gap-1 sm:gap-2 px-1 relative z-10">
                  {chartBars.map((b) => {
                    const hasAmount = b.amount > 0;
                    const barHeightPx = hasAmount
                      ? Math.max(16, Math.round((b.amount / maxChartAmount) * 128))
                      : 4;

                    return (
                      <div
                        key={b.label}
                        className="flex-1 h-full flex flex-col justify-end items-center group relative cursor-pointer min-w-0"
                      >
                        {/* Floating Amount Badge above the bar */}
                        {hasAmount ? (
                          <div className="mb-1.5 px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-mono font-bold whitespace-nowrap shadow-2xs group-hover:bg-blue-600 group-hover:text-white transition-all z-20">
                            {formatCurrency(b.amount)}
                          </div>
                        ) : (
                          <div className="mb-1.5 h-[18px] opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none">
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-white text-[9px] font-mono whitespace-nowrap shadow-xs">
                              ₹0
                            </span>
                          </div>
                        )}

                        {/* Bar Track & Fill with guaranteed parent height */}
                        <div
                          className={`w-full max-w-[32px] sm:max-w-[38px] flex items-end justify-center relative ${
                            b.isCurrent ? 'rounded-t-lg ring-2 ring-blue-400/40' : ''
                          }`}
                          style={{ height: '128px' }}
                        >
                          {/* Background placeholder slot */}
                          <div className="w-full h-full rounded-t-lg bg-slate-50/70 border border-dashed border-slate-200/60 absolute inset-0" />

                          {/* Bar Fill */}
                          <div
                            className={`w-full rounded-t-lg transition-all duration-500 ease-out relative z-10 ${
                              hasAmount
                                ? 'bg-gradient-to-t from-[#0d52bd] via-blue-600 to-amber-400 shadow-md shadow-blue-500/20 group-hover:brightness-110'
                                : 'bg-slate-200/70 group-hover:bg-slate-300'
                            }`}
                            style={{
                              height: `${barHeightPx}px`,
                            }}
                          >
                            {hasAmount && (
                              <div className="absolute top-0 inset-x-0 h-1 bg-amber-300 rounded-t-lg opacity-90 shadow-2xs" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* X-Axis Labels Row Aligned With Chart Columns */}
            <div className="flex pt-2.5 mt-1 border-t border-slate-200">
              <div className="w-14 shrink-0" />
              <div className="flex-1 flex justify-between gap-1 sm:gap-2 px-1">
                {chartBars.map((b) => {
                  const hasAmount = b.amount > 0;

                  return (
                    <div key={b.label} className="flex-1 text-center min-w-0">
                      <span
                        className={`text-[11px] block transition-colors truncate ${
                          b.isCurrent
                            ? 'text-blue-700 font-extrabold bg-blue-50 border border-blue-200 rounded px-0.5'
                            : hasAmount
                            ? 'text-slate-900 font-bold'
                            : 'text-slate-400 font-medium'
                        }`}
                      >
                        {b.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Quick Stats Summary Footer */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
              <span>
                Total Collections:{' '}
                <span className="font-mono font-bold text-slate-900">
                  {formatCurrency(totalChartCollections)}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-500" />
              <span>
                Peak Month:{' '}
                <span className="font-mono font-bold text-slate-900">
                  {peakPeriod.amount > 0
                    ? `${peakPeriod.label} (${formatCurrency(peakPeriod.amount)})`
                    : 'None yet'}
                </span>
              </span>
            </div>
            <div>
              Active Months:{' '}
              <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                {activePeriods.length} / {chartBars.length}
              </span>
            </div>
          </div>
        </div>

        {/* Scheme Milestones Highlights (Col Span 4) */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Award className="w-4 h-4 text-amber-500" />
            <span>Scheme Milestones</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                Fixed Monthly Target
              </span>
              <div className="text-sm font-bold text-slate-900">₹1,000 / Month Standard Plan</div>
              <div className="text-[11px] text-slate-500">12 Months Tenure • 100% Guaranteed Bonus</div>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/60 space-y-1">
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide">
                Shop Bonus Commitment
              </span>
              <div className="text-sm font-bold text-emerald-900">+₹1,000 Maturity Credit</div>
              <div className="text-[11px] text-emerald-700">Credited automatically on 12th installment</div>
            </div>

            <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200/60 space-y-1">
              <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wide">
                Total Scheme Payout
              </span>
              <div className="text-sm font-bold text-blue-950">₹13,000 Gold Purchase Value</div>
              <div className="text-[11px] text-blue-700">Redeemable against any gold or silver jewellery</div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions Live Feed */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-heading font-bold text-base text-slate-900 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-blue-600" />
              Recent Payment Activity (Live Feed)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Verified savings scheme receipts with genuine showroom collection dates
            </p>
          </div>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <div className="text-sm font-semibold text-slate-600">No transaction data available yet.</div>
            <div className="text-xs text-slate-400 mt-0.5">
              As customer payments are recorded, receipts will appear here.
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Collection Date</th>
                  <th className="py-3 px-4">Entry Timestamp</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      <div>{tx.customerName}</div>
                      {tx.customerCode && (
                        <span className="text-[10px] font-mono font-normal text-slate-400">
                          {tx.customerCode}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {formatCurrency(tx.amount)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-100 border border-slate-200 text-slate-700">
                        {tx.method}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700">
                      {tx.actualDate ? (
                        <div className="flex items-center gap-1.5">
                          <span>{tx.actualDate}</span>
                          <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                            HISTORICAL
                          </span>
                        </div>
                      ) : (
                        <span>{tx.date}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                      {tx.date}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
