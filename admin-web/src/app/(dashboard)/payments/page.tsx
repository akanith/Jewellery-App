'use client';

/**
 * RAMYAS JEWELLER - Installments & Payments Ledger
 * Connected to live Supabase payments, schemes, and current-month collection data.
 */

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Search,
  PlusCircle,
  CheckCircle2,
  DollarSign,
  Smartphone,
  Banknote,
  Receipt,
  Loader2,
  AlertCircle,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { formatCurrency, formatDate, formatTime } from '@/lib/formatters';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import RecordInstallmentDrawer, {
  RecordInstallmentCustomerProp,
  RecordInstallmentSchemeProp,
} from '@/components/modals/RecordInstallmentDrawer';

interface PaymentItem {
  id: string;
  receipt_number: string;
  customer_id: string;
  customer_name: string;
  customer_code: string;
  phone_number: string;
  scheme_id: string;
  scheme_code: string;
  installment_number: number;
  amount: number;
  payment_date: string;
  payment_method: string;
  transaction_reference: string | null;
  recorded_by: string;
  status: string;
}

interface PendingInstallmentItem {
  id: string;
  scheme_id: string;
  customer_id: string;
  customer_name: string;
  customer_code: string;
  phone_number: string;
  scheme_code: string;
  installment_number: number;
  total_installments: number;
  amount: number;
  due_date: string;
  calendar_month: string;
  status: string;
}

export default function PaymentsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [selectedCustomerProp, setSelectedCustomerProp] = useState<RecordInstallmentCustomerProp | undefined>(undefined);
  const [selectedSchemeProp, setSelectedSchemeProp] = useState<RecordInstallmentSchemeProp | undefined>(undefined);

  // Live state
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [pendingInstallments, setPendingInstallments] = useState<PendingInstallmentItem[]>([]);
  const [thisMonthPaidCount, setThisMonthPaidCount] = useState(0);
  const [thisMonthCollectedAmount, setThisMonthCollectedAmount] = useState(0);
  const [totalEligibleCount, setTotalEligibleCount] = useState(0);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Current Calendar Month YYYY-MM-01 & Display Month Name
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const currentMonthName = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  const fetchPaymentsData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const supabase = getSupabaseBrowserClient();

      // 1. Fetch Historical Payment Ledger
      const { data: paymentsRes, error: paymentsErr } = await supabase
        .from('payments')
        .select(`
          id,
          receipt_number,
          customer_id,
          scheme_id,
          installment_number,
          amount,
          payment_date,
          payment_method,
          transaction_reference,
          recorded_by,
          payment_status,
          customers (
            id,
            full_name,
            customer_code,
            phone_number
          ),
          schemes (
            id,
            scheme_code
          )
        `)
        .order('payment_date', { ascending: false });

      if (paymentsErr) throw paymentsErr;

      // 2. Fetch Current Month Installments for Collection Section
      const { data: currentMonthInstallmentsRes, error: currentMonthErr } = await supabase
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
        .eq('calendar_month', currentMonthStr)
        .order('due_date', { ascending: true });

      if (currentMonthErr) throw currentMonthErr;

      // Map Historical Payments
      const rawPayments = (paymentsRes || []) as unknown as Array<{
        id: string;
        receipt_number: string;
        customer_id: string;
        scheme_id: string;
        installment_number: number;
        amount: number;
        payment_date: string;
        payment_method: string;
        transaction_reference: string | null;
        recorded_by: string;
        payment_status: string;
        customers?: { id: string; full_name: string; customer_code: string; phone_number: string };
        schemes?: { id: string; scheme_code: string };
      }>;

      const mappedPayments: PaymentItem[] = rawPayments.map((p) => ({
        id: p.id,
        receipt_number: p.receipt_number,
        customer_id: p.customer_id,
        customer_name: p.customers?.full_name || 'Customer',
        customer_code: p.customers?.customer_code || 'RJ-CUST',
        phone_number: p.customers?.phone_number || '—',
        scheme_id: p.scheme_id,
        scheme_code: p.schemes?.scheme_code || 'RJ-SCH',
        installment_number: p.installment_number,
        amount: Number(p.amount) || 1000,
        payment_date: p.payment_date,
        payment_method: p.payment_method,
        transaction_reference: p.transaction_reference,
        recorded_by: 'Admin',
        status: p.payment_status || 'SUCCESS',
      }));

      setPayments(mappedPayments);

      // Process Current Month Pending & Collection Metrics
      const rawCurrentMonth = (currentMonthInstallmentsRes || []) as unknown as Array<{
        id: string;
        scheme_id: string;
        customer_id: string;
        installment_number: number;
        installment_amount: number;
        due_date: string;
        calendar_month: string;
        status: string;
        schemes?: { id: string; scheme_code: string; status: string; total_installments: number };
        customers?: { id: string; customer_code: string; full_name: string; phone_number: string };
      }>;

      // Filter strictly active scheme records
      const activeCurrentMonth = rawCurrentMonth.filter(
        (item) => item.schemes?.status === 'ACTIVE'
      );

      // Current Month Pending Installments
      const mappedPending: PendingInstallmentItem[] = activeCurrentMonth
        .filter((item) => item.status === 'PENDING')
        .map((item) => ({
          id: item.id,
          scheme_id: item.scheme_id,
          customer_id: item.customer_id,
          customer_name: item.customers?.full_name || 'Customer',
          customer_code: item.customers?.customer_code || 'RJ-CUST',
          phone_number: item.customers?.phone_number || '—',
          scheme_code: item.schemes?.scheme_code || 'RJ-SCH',
          installment_number: item.installment_number,
          total_installments: item.schemes?.total_installments || 12,
          amount: Number(item.installment_amount) || 1000,
          due_date: item.due_date,
          calendar_month: item.calendar_month,
          status: item.status,
        }));

      setPendingInstallments(mappedPending);

      // Collection metrics
      const paidItems = activeCurrentMonth.filter((item) => item.status === 'PAID');
      const paidCount = paidItems.length;
      const collectedAmount = paidItems.reduce(
        (acc, item) => acc + (Number(item.installment_amount) || 1000),
        0
      );

      setThisMonthPaidCount(paidCount);
      setThisMonthCollectedAmount(collectedAmount);
      setTotalEligibleCount(activeCurrentMonth.length);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch payment records.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, [currentMonthStr]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPaymentsData();
  }, [fetchPaymentsData]);

  // Handle Record Payment for a specific Pending Customer
  const handleRecordForPending = (item: PendingInstallmentItem) => {
    const paidMonths = item.installment_number - 1;
    const paidAmount = paidMonths * 1000;
    const remainingAmount = (item.total_installments - paidMonths) * 1000;

    setSelectedCustomerProp({
      id: item.customer_code,
      name: item.customer_name,
      phone: item.phone_number,
      schemeName: item.scheme_code,
    });

    setSelectedSchemeProp({
      id: item.scheme_id,
      paidMonths,
      totalMonths: item.total_installments,
      paidAmount,
      remainingAmount,
      bonusAmount: 1000,
      eligibleValue: 13000,
      currentInstallmentNumber: item.installment_number,
      currentMonthName: formatDate(item.due_date),
      isCurrentMonthPaid: false,
    });

    setShowRecordModal(true);
  };

  // Open empty drawer for search
  const handleOpenGeneralDrawer = () => {
    setSelectedCustomerProp(undefined);
    setSelectedSchemeProp(undefined);
    setShowRecordModal(true);
  };

  // Quick stats calculation for overall ledger
  const totalAmount = payments.reduce((acc, p) => acc + p.amount, 0);
  const totalCount = payments.length;
  const cashPaymentsTotal = payments
    .filter((p) => p.payment_method === 'CASH')
    .reduce((acc, p) => acc + p.amount, 0);
  const digitalPaymentsTotal = totalAmount - cashPaymentsTotal;

  // Filter historical payments
  const filteredPayments = payments.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      p.customer_name.toLowerCase().includes(q) ||
      p.customer_code.toLowerCase().includes(q) ||
      p.phone_number.includes(q) ||
      p.receipt_number.toLowerCase().includes(q) ||
      p.scheme_code.toLowerCase().includes(q);

    const matchesMethod = methodFilter === 'ALL' || p.payment_method === methodFilter;

    return matchesSearch && matchesMethod;
  });

  return (
    <div className="space-y-8 pb-12">
      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif-luxury text-slate-900">
            Installment & Collection Ledger
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Current-month collection status, customer follow-up, and verified payment history.
          </p>
        </div>

        <button
          onClick={handleOpenGeneralDrawer}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl royal-button text-xs font-semibold self-start sm:self-auto cursor-pointer shadow-xs"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Payment</span>
        </button>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="luxury-card p-4 bg-rose-50 border-rose-200 text-rose-900 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <div className="text-xs sm:text-sm font-medium">{errorMessage}</div>
          </div>
          <button
            onClick={() => fetchPaymentsData()}
            className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 1: CURRENT-MONTH COLLECTION FOLLOW-UP SECTION */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
          <div>
            <h2 className="text-xl font-bold font-serif-luxury text-slate-900 flex items-center gap-2">
              <span>This Month&apos;s Pending Payments</span>
              <span className="text-xs font-sans font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                {currentMonthName}
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Customers who have not yet paid their current month&apos;s installment
            </p>
          </div>
        </div>

        {/* Collection Summary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* THIS MONTH PENDING */}
          <div className="luxury-card p-4 bg-white shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
              <span>THIS MONTH PENDING</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-serif-luxury text-slate-900 mt-2">
              {isLoading ? (
                <Loader2 className="w-6 h-6 text-amber-600 animate-spin my-1" />
              ) : (
                `${pendingInstallments.length} Customers`
              )}
            </div>
            <div className="text-xs font-medium text-amber-600 mt-2">
              Customers to contact
            </div>
          </div>

          {/* THIS MONTH COLLECTED */}
          <div className="luxury-card p-4 bg-white shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
              <span>THIS MONTH COLLECTED</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-serif-luxury text-slate-900 mt-2">
              {isLoading ? (
                <Loader2 className="w-6 h-6 text-emerald-600 animate-spin my-1" />
              ) : (
                formatCurrency(thisMonthCollectedAmount)
              )}
            </div>
            <div className="text-xs font-medium text-emerald-600 mt-2">
              Verified collection
            </div>
          </div>

          {/* COLLECTION PROGRESS */}
          <div className="luxury-card p-4 bg-white shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
                <span>COLLECTION PROGRESS</span>
                <TrendingUp className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-base font-bold font-serif-luxury text-slate-900 mt-2 flex items-center justify-between">
                <span>{thisMonthPaidCount} / {totalEligibleCount} Customers Paid</span>
                <span className="text-xs font-sans font-bold text-blue-600">
                  {totalEligibleCount > 0 ? Math.round((thisMonthPaidCount / totalEligibleCount) * 100) : 0}%
                </span>
              </div>
            </div>

            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden mt-3">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-500"
                style={{
                  width: `${totalEligibleCount > 0 ? (thisMonthPaidCount / totalEligibleCount) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Pending Customer Cards / Rows */}
        {isLoading ? (
          <div className="luxury-card py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
            <div className="text-xs font-medium text-slate-500">
              Checking current month collection status...
            </div>
          </div>
        ) : pendingInstallments.length === 0 ? (
          <div className="luxury-card p-8 text-center bg-emerald-50/50 border-emerald-200/60">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
            <h3 className="text-base font-bold text-slate-900 font-serif-luxury">
              All current-month installments collected
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              No customers are pending for {currentMonthName}.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingInstallments.map((item) => (
              <div
                key={item.id}
                className="luxury-card p-4 bg-white hover:border-blue-300 transition flex flex-col justify-between space-y-3.5 shadow-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">{item.customer_name}</h3>
                    <div className="text-xs text-slate-500 font-mono mt-0.5">
                      {item.customer_code} • {item.phone_number}
                    </div>
                  </div>
                  <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                    PENDING
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Installment</div>
                    <div className="font-semibold text-slate-800">#{item.installment_number} of 12</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Amount</div>
                    <div className="font-bold text-slate-900 font-mono">{formatCurrency(item.amount)}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Due Date</div>
                    <div className="font-medium text-slate-700">{formatDate(item.due_date)}</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRecordForPending(item)}
                  className="w-full py-2 px-3 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Record Payment</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2: HISTORICAL PAYMENTS LEDGER */}
      {/* ========================================================================= */}
      <div className="space-y-4 pt-4">
        <div className="border-b border-slate-200/80 pb-3">
          <h2 className="text-xl font-bold font-serif-luxury text-slate-900">
            Payment Receipts Ledger
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Complete transaction history and digital passbook receipts
          </p>
        </div>

        {/* Summary KPI Cards for Historical Ledger */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Total Payments */}
          <div className="luxury-card p-4 sm:p-5 bg-white shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
              <span>Total Payments</span>
              <Receipt className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-serif-luxury text-slate-900 mt-2">
              {isLoading ? <Loader2 className="w-6 h-6 text-blue-600 animate-spin my-1" /> : totalCount}
            </div>
            <div className="text-xs font-medium text-slate-500 mt-2">
              Verified ledger transactions
            </div>
          </div>

          {/* Total Collection */}
          <div className="luxury-card p-4 sm:p-5 bg-white shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
              <span>Total Collection</span>
              <DollarSign className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-serif-luxury text-slate-900 mt-2">
              {isLoading ? (
                <Loader2 className="w-6 h-6 text-emerald-600 animate-spin my-1" />
              ) : (
                formatCurrency(totalAmount)
              )}
            </div>
            <div className="text-xs font-medium text-emerald-600 mt-2">
              100% Scheme Contributions
            </div>
          </div>

          {/* Hard Cash Collection */}
          <div className="luxury-card p-4 sm:p-5 bg-white shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
              <span>Hard Cash</span>
              <Banknote className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-serif-luxury text-slate-900 mt-2">
              {isLoading ? (
                <Loader2 className="w-6 h-6 text-amber-600 animate-spin my-1" />
              ) : (
                formatCurrency(cashPaymentsTotal)
              )}
            </div>
            <div className="text-xs font-medium text-slate-500 mt-2">
              In-store physical receipts
            </div>
          </div>

          {/* Digital Collection */}
          <div className="luxury-card p-4 sm:p-5 bg-white shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
              <span>Digital / UPI</span>
              <Smartphone className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-serif-luxury text-slate-900 mt-2">
              {isLoading ? (
                <Loader2 className="w-6 h-6 text-blue-600 animate-spin my-1" />
              ) : (
                formatCurrency(digitalPaymentsTotal)
              )}
            </div>
            <div className="text-xs font-medium text-slate-500 mt-2">
              GPay, PhonePe, UPI & Bank
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="luxury-card p-4 sm:p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xs">
          <div className="relative w-full md:max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by receipt #, customer name, mobile, or scheme..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
            {['ALL', 'GPAY', 'PHONEPE', 'CASH', 'BANK_TRANSFER'].map((method) => (
              <button
                key={method}
                onClick={() => setMethodFilter(method)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer shrink-0 ${
                  methodFilter === method
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {method === 'ALL' ? 'All Methods' : method.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Payments Ledger Table */}
        <div className="luxury-card overflow-hidden shadow-sm">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              <div className="text-sm font-medium text-slate-600">
                Loading live payment transactions...
              </div>
            </div>
          ) : payments.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Receipt className="w-10 h-10 mx-auto text-slate-300 mb-3" />
              <h3 className="text-base font-bold text-slate-800 font-serif-luxury">
                No Payments Recorded Yet
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto mt-1 mb-6">
                When customers pay their monthly scheme installments, receipts and transactions will appear here.
              </p>
              <button
                onClick={handleOpenGeneralDrawer}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl royal-button text-xs font-semibold cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Record First Payment</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm text-slate-700">
                <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider text-[11px] font-semibold border-b border-slate-200/80">
                  <tr>
                    <th className="py-3.5 px-5">Receipt No.</th>
                    <th className="py-3.5 px-5">Date & Time</th>
                    <th className="py-3.5 px-5">Customer</th>
                    <th className="py-3.5 px-5">Installment</th>
                    <th className="py-3.5 px-5">Amount</th>
                    <th className="py-3.5 px-5">Method</th>
                    <th className="py-3.5 px-5">Status</th>
                    <th className="py-3.5 px-5 text-right">Passbook</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPayments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        No payment transactions found matching your filters.
                      </td>
                    </tr>
                  ) : (
                    filteredPayments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/70 transition">
                        {/* Receipt No */}
                        <td className="py-4 px-5 font-mono font-bold text-blue-600">
                          #{p.receipt_number}
                        </td>

                        {/* Date & Time */}
                        <td className="py-4 px-5">
                          <div className="font-medium text-slate-900">{formatDate(p.payment_date)}</div>
                          <div className="text-[11px] text-slate-500">{formatTime(p.payment_date)}</div>
                        </td>

                        {/* Customer */}
                        <td className="py-4 px-5">
                          <div className="font-bold text-slate-900">{p.customer_name}</div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {p.customer_code} • {p.phone_number}
                          </div>
                        </td>

                        {/* Installment */}
                        <td className="py-4 px-5">
                          <span className="font-semibold text-slate-800">
                            #{p.installment_number} of 12
                          </span>
                          <div className="text-[10px] text-slate-500 font-mono">{p.scheme_code}</div>
                        </td>

                        {/* Amount */}
                        <td className="py-4 px-5 font-mono font-bold text-slate-900">
                          {formatCurrency(p.amount)}
                        </td>

                        {/* Method */}
                        <td className="py-4 px-5">
                          <span className="inline-block px-2.5 py-1 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {p.payment_method}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-4 px-5">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            RECORDED
                          </span>
                        </td>

                        {/* Action */}
                        <td className="py-4 px-5 text-right">
                          <Link
                            href={`/customers/${p.customer_id}`}
                            className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Record Installment Slide-Over Drawer */}
      <RecordInstallmentDrawer
        isOpen={showRecordModal}
        onClose={() => setShowRecordModal(false)}
        customer={selectedCustomerProp}
        scheme={selectedSchemeProp}
        onSuccess={() => {
          setShowRecordModal(false);
          fetchPaymentsData();
        }}
      />
    </div>
  );
}
