'use client';

/**
 * RAMYAS JEWELLER - Record Installment Slide-over Drawer
 * Production Right-Side Slide-Over Drawer with Live Customer Search,
 * Strict Current-Calendar-Month Installment Enforcement, Fixed ₹1,000 Amount,
 * 7 Payment Method Selection Cards, and Real Supabase RPC Integration.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  CreditCard,
  Calendar,
  Banknote,
  Smartphone,
  Landmark,
  CheckCircle2,
  Check,
  AlertCircle,
  Search,
  Loader2,
  UserCheck,
  QrCode,
  Layers,
  ArrowLeft
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { PaymentMethod } from '@/types/database';
import { recordInstallmentPayment } from '@/lib/supabase/rpc';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export interface RecordInstallmentCustomerProp {
  name: string;
  id: string; // customer_code or uuid
  phone: string;
  schemeName?: string;
  avatarUrl?: string;
}

export interface RecordInstallmentSchemeProp {
  id: string;
  paidMonths: number;
  totalMonths: number;
  paidAmount: number;
  remainingAmount: number;
  bonusAmount: number;
  eligibleValue: number;
  currentInstallmentNumber: number;
  currentMonthName: string;
  isCurrentMonthPaid?: boolean;
}

interface RecordInstallmentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  customer?: RecordInstallmentCustomerProp;
  scheme?: RecordInstallmentSchemeProp;
  onSuccess?: (receiptNumber: string) => void;
}

interface CustomerSearchResult {
  id: string;
  customer_code: string;
  full_name: string;
  phone_number: string;
  city: string | null;
  scheme_id: string | null;
  scheme_code: string | null;
  scheme_status: string | null;
  paid_months: number;
  total_months: number;
  paid_amount: number;
  remaining_amount: number;
  bonus_amount: number;
  maturity_amount: number;
  current_month_inst_num: number;
  current_month_due_date: string;
  is_current_month_paid: boolean;
}

export default function RecordInstallmentDrawer({
  isOpen,
  onClose,
  customer: preselectedCustomer,
  scheme: preselectedScheme,
  onSuccess,
}: RecordInstallmentDrawerProps) {
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CustomerSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchHasRun, setSearchHasRun] = useState(false);

  // Selected State
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSearchResult | null>(null);

  // Payment Form State
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('CASH');
  const [paymentDate, setPaymentDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [transactionRef, setTransactionRef] = useState('');
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reset drawer state when isOpen transitions from false to true
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setSearchQuery('');
      setSearchResults([]);
      setIsSearching(false);
      setSearchHasRun(false);
      setSelectedCustomer(null);
      setSelectedMethod('CASH');
      setTransactionRef('');
      setNotes('');
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }

  // Current Calendar Month YYYY-MM-01 String
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

  // Search Supabase Customers
  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setSearchHasRun(false);
      return;
    }

    setIsSearching(true);
    setSearchHasRun(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const q = query.trim();

      const { data, error } = await supabase
        .from('customers')
        .select(`
          id,
          customer_code,
          full_name,
          phone_number,
          city,
          schemes (
            id,
            scheme_code,
            status,
            monthly_installment_amount,
            total_installments,
            bonus_amount,
            maturity_amount,
            scheme_installments (
              id,
              installment_number,
              calendar_month,
              due_date,
              status,
              installment_amount,
              paid_amount
            )
          )
        `)
        .or(`full_name.ilike.%${q}%,phone_number.ilike.%${q}%,customer_code.ilike.%${q}%`)
        .limit(10);

      if (error) throw error;

      const results: CustomerSearchResult[] = (data || []).map((c) => {
        const rawSchemes = (c.schemes || []) as Array<{
          id: string;
          scheme_code: string;
          status: string;
          monthly_installment_amount: number;
          total_installments: number;
          bonus_amount: number;
          maturity_amount: number;
          scheme_installments: Array<{
            id: string;
            installment_number: number;
            calendar_month: string;
            due_date: string;
            status: string;
            installment_amount: number;
            paid_amount: number;
          }>;
        }>;

        const activeScheme = rawSchemes.find((s) => s.status === 'ACTIVE') || rawSchemes[0];
        const installments = activeScheme?.scheme_installments || [];

        const paidInsts = installments.filter((i) => i.status === 'PAID');
        const paidMonths = paidInsts.length;
        const totalMonths = activeScheme?.total_installments || 12;
        const paidAmount = paidInsts.reduce((sum, i) => sum + (Number(i.paid_amount) || 0), 0);
        const remainingAmount = Math.max(0, (totalMonths * 1000) - paidAmount);

        // Find Current Calendar Month Installment
        const currentMonthInst = installments.find(
          (i) => i.calendar_month === currentMonthStr
        );

        const isCurrentMonthPaid = currentMonthInst ? currentMonthInst.status === 'PAID' : false;
        const currentMonthInstNum = currentMonthInst ? currentMonthInst.installment_number : (paidMonths + 1);
        const currentMonthDueDate = currentMonthInst ? currentMonthInst.due_date : formatDate(new Date().toISOString());

        return {
          id: c.id,
          customer_code: c.customer_code,
          full_name: c.full_name,
          phone_number: c.phone_number,
          city: c.city,
          scheme_id: activeScheme?.id || null,
          scheme_code: activeScheme?.scheme_code || null,
          scheme_status: activeScheme?.status || null,
          paid_months: paidMonths,
          total_months: totalMonths,
          paid_amount: paidAmount,
          remaining_amount: remainingAmount,
          bonus_amount: Number(activeScheme?.bonus_amount) || 1000,
          maturity_amount: Number(activeScheme?.maturity_amount) || 13000,
          current_month_inst_num: currentMonthInstNum,
          current_month_due_date: currentMonthDueDate,
          is_current_month_paid: isCurrentMonthPaid,
        };
      });

      setSearchResults(results);
    } catch (err: unknown) {
      console.error('Customer search error:', err);
    } finally {
      setIsSearching(false);
    }
  }, [currentMonthStr]);

  // Debounced search trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        handleSearch(searchQuery);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, handleSearch]);

  if (!isOpen) return null;

  // Active Customer & Scheme Data Resolution
  const activeCustomerName = preselectedCustomer?.name || selectedCustomer?.full_name || '';
  const activeCustomerCode = preselectedCustomer?.id || selectedCustomer?.customer_code || '';
  const activeCustomerPhone = preselectedCustomer?.phone || selectedCustomer?.phone_number || '';
  const activeSchemeCode = preselectedCustomer?.schemeName || selectedCustomer?.scheme_code || 'RJ-SCH-2026';
  const activeSchemeId = preselectedScheme?.id || selectedCustomer?.scheme_id || '';

  const paidMonths = preselectedScheme?.paidMonths ?? selectedCustomer?.paid_months ?? 0;
  const totalMonths = preselectedScheme?.totalMonths ?? selectedCustomer?.total_months ?? 12;
  const paidAmount = preselectedScheme?.paidAmount ?? selectedCustomer?.paid_amount ?? 0;
  const remainingAmount = preselectedScheme?.remainingAmount ?? selectedCustomer?.remaining_amount ?? 12000;
  const bonusAmount = preselectedScheme?.bonusAmount ?? selectedCustomer?.bonus_amount ?? 1000;
  const eligibleValue = preselectedScheme?.eligibleValue ?? selectedCustomer?.maturity_amount ?? 13000;

  const currentInstallmentNumber = preselectedScheme?.currentInstallmentNumber ?? selectedCustomer?.current_month_inst_num ?? (paidMonths + 1);
  const currentMonthName = preselectedScheme?.currentMonthName || selectedCustomer?.current_month_due_date || formatDate(new Date().toISOString());

  // Strict Current Calendar Month Paid Status
  const isCurrentMonthPaid = preselectedScheme?.isCurrentMonthPaid ?? selectedCustomer?.is_current_month_paid ?? false;

  const hasSelectedCustomer = Boolean(preselectedCustomer || selectedCustomer);
  const progressPercent = Math.round((paidMonths / totalMonths) * 100);

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSchemeId) {
      setErrorMessage('No active scheme found for selected customer.');
      return;
    }

    if (isCurrentMonthPaid) {
      setErrorMessage("Current calendar month's installment is already paid.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const response = await recordInstallmentPayment({
      p_scheme_id: activeSchemeId,
      p_installment_number: currentInstallmentNumber,
      p_payment_method: selectedMethod,
      p_transaction_reference: transactionRef.trim() || `${selectedMethod}-COUNTER`,
      p_notes: notes.trim() || null,
    });

    setIsSubmitting(false);

    if (response.error) {
      setErrorMessage(response.error);
      return;
    }

    const receiptNum = response.data?.receipt_number || `RJ-RCP-2026-LIVE`;
    setSuccessMessage(`Installment payment recorded successfully! Receipt #${receiptNum}`);

    if (onSuccess) {
      onSuccess(receiptNum);
    }

    setTimeout(() => {
      setSuccessMessage(null);
      onClose();
    }, 1200);
  };

  // Available Payment Methods
  const PAYMENT_METHODS: Array<{ id: PaymentMethod; label: string; icon: React.ElementType }> = [
    { id: 'CASH', label: 'Cash', icon: Banknote },
    { id: 'GPAY', label: 'GPay', icon: CreditCard },
    { id: 'PHONEPE', label: 'PhonePe', icon: Smartphone },
    { id: 'BANK_TRANSFER', label: 'Transfer', icon: Landmark },
    { id: 'UPI', label: 'UPI', icon: QrCode },
    { id: 'CARD', label: 'Card', icon: CreditCard },
    { id: 'OTHER', label: 'Other', icon: Layers },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Dark Translucent Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/50 backdrop-blur-2xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Right-Side Slide-Over Drawer Shell */}
      <div className="relative w-full max-w-lg sm:w-[480px] bg-white h-full shadow-2xl z-10 flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-300">
        
        {/* FIXED HEADER */}
        <div className="p-6 pb-4 border-b border-slate-200/80 bg-white shrink-0 flex items-start justify-between">
          <div>
            <h2 className="font-serif-luxury font-bold text-xl text-slate-900 tracking-tight">
              RECORD INSTALLMENT
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Record this month&apos;s installment for the selected customer.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SCROLLABLE CONTENT AREA */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          
          {/* Feedback Alerts */}
          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">{successMessage}</span>
            </div>
          )}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="font-semibold">{errorMessage}</span>
            </div>
          )}

          {/* STATE 1: CUSTOMER SEARCH (If no customer pre-selected or selected) */}
          {!hasSelectedCustomer ? (
            <div className="space-y-4">
              <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                SEARCH CUSTOMER
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by customer name, mobile number, customer code..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition"
                  autoFocus
                />
              </div>

              {/* Search States */}
              {isSearching ? (
                <div className="py-10 flex flex-col items-center justify-center text-slate-400 gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  <div className="text-xs">Searching live customer database...</div>
                </div>
              ) : !searchHasRun ? (
                <div className="py-10 text-center text-slate-400 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
                  <UserCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <div className="text-xs font-medium text-slate-600">Search for a customer</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Type customer name, phone, or code above.</div>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="py-10 text-center text-slate-400 bg-slate-50/60 rounded-2xl border border-slate-200">
                  <AlertCircle className="w-7 h-7 text-amber-500 mx-auto mb-2" />
                  <div className="text-xs font-bold text-slate-700">No customer found</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Try searching by name, mobile number, or customer code.</div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Select Customer ({searchResults.length})
                  </div>
                  {searchResults.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedCustomer(item)}
                      className="w-full text-left p-3.5 rounded-xl border border-slate-200/80 bg-white hover:border-blue-500 hover:bg-blue-50/30 transition group flex items-start justify-between gap-3 cursor-pointer"
                    >
                      <div>
                        <div className="font-bold text-sm text-slate-900 group-hover:text-blue-900">
                          {item.full_name}
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-slate-600">{item.customer_code}</span>
                          <span>•</span>
                          <span>{item.phone_number}</span>
                          {item.city && <span>• {item.city}</span>}
                        </div>
                        {item.scheme_code && (
                          <div className="text-[11px] font-mono font-medium text-blue-700 mt-1">
                            Scheme: {item.scheme_code}
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          {item.paid_months} / {item.total_months} Paid
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* STATE 2: SELECTED CUSTOMER DETAILS & SCHEME PROGRESS */
            <div className="space-y-5">
              
              {/* Selected Customer Card Header */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                    {activeCustomerName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm text-slate-900 truncate">
                      {activeCustomerName}
                    </h3>
                    <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2 mt-0.5">
                      <span className="font-mono">{activeCustomerCode}</span>
                      <span>•</span>
                      <span>{activeCustomerPhone}</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Scheme: <span className="font-semibold text-slate-700 font-mono">{activeSchemeCode}</span>
                    </div>
                  </div>
                </div>

                {!preselectedCustomer && (
                  <button
                    type="button"
                    onClick={() => setSelectedCustomer(null)}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 shrink-0"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Change</span>
                  </button>
                )}
              </div>

              {/* SCHEME PROGRESS */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="uppercase text-[11px] text-slate-500 tracking-wider">
                    SCHEME PROGRESS
                  </span>
                  <span className="text-blue-900 font-bold">
                    {paidMonths} / {totalMonths} Months
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* 4 Financial Summary Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-xl p-3 border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Paid</span>
                  <span className="text-base font-bold font-serif-luxury text-slate-900 mt-0.5 block">
                    {formatCurrency(paidAmount)}
                  </span>
                </div>

                <div className="bg-white rounded-xl p-3 border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Remaining</span>
                  <span className="text-base font-bold font-serif-luxury text-slate-900 mt-0.5 block">
                    {formatCurrency(remainingAmount)}
                  </span>
                </div>

                <div className="bg-white rounded-xl p-3 border border-slate-200 relative">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Bonus</span>
                    <span className="text-[9px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                      Upon 12th
                    </span>
                  </div>
                  <span className="text-base font-bold font-serif-luxury text-amber-600 mt-0.5 block">
                    +{formatCurrency(bonusAmount)}
                  </span>
                </div>

                <div className="bg-blue-50/60 rounded-xl p-3 border border-blue-200/60">
                  <span className="text-[10px] text-blue-700 font-bold uppercase block">Matured Target</span>
                  <span className="text-base font-bold font-serif-luxury text-blue-950 mt-0.5 block">
                    {formatCurrency(eligibleValue)}
                  </span>
                </div>
              </div>

              {/* CURRENT INSTALLMENT CARD */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    CURRENT INSTALLMENT
                  </span>
                  <span className="text-xs font-bold font-mono text-slate-800">
                    Installment #{currentInstallmentNumber} of {totalMonths}
                  </span>
                </div>

                {isCurrentMonthPaid ? (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      Current month&apos;s installment is already paid.
                    </div>
                    <div className="text-[11px] text-amber-800">
                      Next month&apos;s installment cannot be paid until that calendar month begins.
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span>Due Month:</span>
                      <span className="font-bold text-slate-900">{currentMonthName}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Amount (Fixed)
                        </label>
                        <input
                          type="text"
                          disabled
                          value="₹ 1,000"
                          className="w-full px-3.5 py-2 text-xs font-bold text-slate-900 rounded-xl border border-slate-200 bg-slate-100"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Payment Date
                        </label>
                        <input
                          type="date"
                          value={paymentDate}
                          onChange={(e) => setPaymentDate(e.target.value)}
                          className="w-full px-3.5 py-2 text-xs font-semibold text-slate-900 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* PAYMENT METHOD SELECTOR (7 Selectable Cards) */}
              {!isCurrentMonthPaid && (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                    SELECT PAYMENT METHOD
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {PAYMENT_METHODS.map((m) => {
                      const Icon = m.icon;
                      const selected = selectedMethod === m.id;

                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setSelectedMethod(m.id)}
                          className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all relative cursor-pointer ${
                            selected
                              ? 'border-blue-600 bg-blue-50/60 text-blue-900 ring-2 ring-blue-600/20 font-bold'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {selected && (
                            <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </div>
                          )}
                          <Icon className="w-4 h-4 text-slate-700" />
                          <span className="text-[11px]">{m.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TRANSACTION REFERENCE & NOTES */}
              {!isCurrentMonthPaid && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Transaction Reference / Counter Receipt (Optional)
                    </label>
                    <input
                      type="text"
                      value={transactionRef}
                      onChange={(e) => setTransactionRef(e.target.value)}
                      placeholder="e.g. UPI/491028301920 or Counter Slip"
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Internal Notes (Optional)
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Optional staff payment remarks..."
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                    />
                  </div>
                </div>
              )}

            </div>
          )}
        </div>

        {/* FIXED FOOTER ACTIONS */}
        <div className="p-6 border-t border-slate-200/80 flex items-center justify-end gap-3 bg-slate-50/80 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          
          {hasSelectedCustomer && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || isCurrentMonthPaid || !activeSchemeId}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Recording...</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  <span>Record Installment</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
