'use client';

/**
 * RAMYAS JEWELLER - Record Installment Slide-over Drawer
 * Production Right-Side Slide-Over Drawer with Live Customer Search,
 * Explicit Multi-Scheme Selector, Scheme-Scoped Installment Selection,
 * Fixed ₹1,000 Amount, 7 Payment Method Selection Cards, and Real Supabase RPC Integration.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  ArrowLeft,
  ChevronRight,
  Lock,
} from 'lucide-react';
import { formatCurrency, formatDate, formatMonthYear } from '@/lib/formatters';
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

export interface DrawerInstallment {
  id: string;
  scheme_id: string;
  customer_id: string;
  installment_number: number;
  calendar_month: string;
  due_date: string;
  status: 'PENDING' | 'PAID';
  installment_amount: number;
  paid_amount: number;
  paid_date?: string | null;
}

export interface DrawerScheme {
  id: string;
  customer_id: string;
  scheme_code: string;
  slot_number: number | null;
  status: string;
  monthly_installment_amount: number;
  total_installments: number;
  target_contribution: number;
  bonus_amount: number;
  maturity_amount: number;
  start_month: string;
  end_month: string;
  created_at: string;
  scheme_installments: DrawerInstallment[];
}

export interface DrawerCustomer {
  id: string;
  customer_code: string;
  full_name: string;
  phone_number: string;
  city: string | null;
  schemes: DrawerScheme[];
}

interface RawInstallmentQueryRow {
  id: string;
  scheme_id: string;
  customer_id: string;
  installment_number: number | string;
  calendar_month: string;
  due_date: string;
  status: string;
  installment_amount?: number | string;
  paid_amount?: number | string;
  paid_date?: string | null;
}

interface RawSchemeQueryRow {
  id: string;
  customer_id?: string;
  scheme_code: string;
  slot_number?: number | string | null;
  status: string;
  monthly_installment_amount?: number | string;
  total_installments?: number | string;
  target_contribution?: number | string;
  bonus_amount?: number | string;
  maturity_amount?: number | string;
  start_month: string;
  end_month: string;
  created_at: string;
  scheme_installments?: RawInstallmentQueryRow[];
}

interface RawCustomerQueryRow {
  id: string;
  customer_code: string;
  full_name: string;
  phone_number: string;
  city: string | null;
  schemes?: RawSchemeQueryRow[];
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
  const [searchResults, setSearchResults] = useState<DrawerCustomer[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchHasRun, setSearchHasRun] = useState(false);

  // Selected Entities
  const [selectedCustomer, setSelectedCustomer] = useState<DrawerCustomer | null>(null);
  const [selectedScheme, setSelectedScheme] = useState<DrawerScheme | null>(null);
  const [selectedInstallmentNumber, setSelectedInstallmentNumber] = useState<number | null>(null);

  // Payment Form State
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('CASH');
  const [paymentDate, setPaymentDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [transactionRef, setTransactionRef] = useState('');
  const [notes, setNotes] = useState('');

  // Submission & Feedback State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Current Calendar Month YYYY-MM-01 String
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

  // Reset drawer state when isOpen transitions
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setSearchQuery('');
      setSearchResults([]);
      setIsSearching(false);
      setSearchHasRun(false);
      setSelectedCustomer(null);
      setSelectedScheme(null);
      setSelectedInstallmentNumber(preselectedScheme ? preselectedScheme.currentInstallmentNumber : null);
      setSelectedMethod('CASH');
      setTransactionRef('');
      setNotes('');
      setErrorMessage(null);
      setSuccessMessage(null);
      setIsSubmitting(false);
    }
  }

  // Search Supabase Customers with their complete schemes & installments
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

      let rawCustomerRows: RawCustomerQueryRow[] = [];
      let queryErr: { code?: string; message?: string } | null = null;

      const primaryRes = await supabase
        .from('customers')
        .select(`
          id,
          customer_code,
          full_name,
          phone_number,
          city,
          schemes (
            id,
            customer_id,
            scheme_code,
            slot_number,
            status,
            monthly_installment_amount,
            total_installments,
            target_contribution,
            bonus_amount,
            maturity_amount,
            start_month,
            end_month,
            created_at,
            scheme_installments (
              id,
              scheme_id,
              customer_id,
              installment_number,
              calendar_month,
              due_date,
              status,
              installment_amount,
              paid_amount,
              paid_date
            )
          )
        `)
        .or(`full_name.ilike.%${q}%,phone_number.ilike.%${q}%,customer_code.ilike.%${q}%`)
        .limit(10);

      if (!primaryRes.error && primaryRes.data) {
        rawCustomerRows = primaryRes.data as unknown as RawCustomerQueryRow[];
      } else if (
        primaryRes.error &&
        (primaryRes.error.code === '42703' || primaryRes.error.message?.includes('slot_number'))
      ) {
        // Gracefully handle pre-migration database if slot_number column does not exist yet (PostgreSQL error 42703)
        const fallbackRes = await supabase
          .from('customers')
          .select(`
            id,
            customer_code,
            full_name,
            phone_number,
            city,
            schemes (
              id,
              customer_id,
              scheme_code,
              status,
              monthly_installment_amount,
              total_installments,
              target_contribution,
              bonus_amount,
              maturity_amount,
              start_month,
              end_month,
              created_at,
              scheme_installments (
                id,
                scheme_id,
                customer_id,
                installment_number,
                calendar_month,
                due_date,
                status,
                installment_amount,
                paid_amount,
                paid_date
              )
            )
          `)
          .or(`full_name.ilike.%${q}%,phone_number.ilike.%${q}%,customer_code.ilike.%${q}%`)
          .limit(10);

        if (!fallbackRes.error && fallbackRes.data) {
          rawCustomerRows = fallbackRes.data as unknown as RawCustomerQueryRow[];
        } else {
          queryErr = fallbackRes.error;
        }
      } else {
        queryErr = primaryRes.error;
      }

      if (queryErr) throw queryErr;

      // Transform response ensuring structured, typesafe objects
      const customers: DrawerCustomer[] = rawCustomerRows.map((c) => {
        const rawSchemes = c.schemes || [];
        const mappedSchemes: DrawerScheme[] = rawSchemes.map((s) => {
          const rawInsts = s.scheme_installments || [];
          const mappedInsts: DrawerInstallment[] = rawInsts.map((inst) => ({
            id: inst.id,
            scheme_id: inst.scheme_id,
            customer_id: inst.customer_id,
            installment_number: Number(inst.installment_number),
            calendar_month: inst.calendar_month,
            due_date: inst.due_date,
            status: inst.status === 'PAID' ? 'PAID' : 'PENDING',
            installment_amount: Number(inst.installment_amount) || 1000,
            paid_amount: Number(inst.paid_amount) || 0,
            paid_date: inst.paid_date || null,
          }));

          // Sort installments ascending by installment_number
          mappedInsts.sort((a, b) => a.installment_number - b.installment_number);

          return {
            id: s.id,
            customer_id: s.customer_id || c.id,
            scheme_code: s.scheme_code,
            slot_number: typeof s.slot_number === 'number' ? s.slot_number : (s.slot_number ? Number(s.slot_number) : null),
            status: s.status,
            monthly_installment_amount: Number(s.monthly_installment_amount) || 1000,
            total_installments: Number(s.total_installments) || 12,
            target_contribution: Number(s.target_contribution) || 12000,
            bonus_amount: Number(s.bonus_amount) || 1000,
            maturity_amount: Number(s.maturity_amount) || 13000,
            start_month: s.start_month,
            end_month: s.end_month,
            created_at: s.created_at,
            scheme_installments: mappedInsts,
          };
        });

        // Sort schemes by creation date descending
        mappedSchemes.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        return {
          id: c.id,
          customer_code: c.customer_code,
          full_name: c.full_name,
          phone_number: c.phone_number,
          city: c.city,
          schemes: mappedSchemes,
        };
      });

      setSearchResults(customers);
    } catch (err: unknown) {
      console.error('Customer search error:', err);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        handleSearch(searchQuery);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, handleSearch]);

  // Active Customer Resolution
  const activeCustomerName = preselectedCustomer?.name || selectedCustomer?.full_name || '';
  const activeCustomerCode = preselectedCustomer?.id || selectedCustomer?.customer_code || '';
  const activeCustomerPhone = preselectedCustomer?.phone || selectedCustomer?.phone_number || '';
  const hasSelectedCustomer = Boolean(preselectedCustomer || selectedCustomer);

  // Active Scheme Resolution
  const activeSchemeId = preselectedScheme?.id || selectedScheme?.id || '';
  const activeSchemeCode = preselectedCustomer?.schemeName || selectedScheme?.scheme_code || 'RJ-SCH-2026';
  const activeSchemeStatus = selectedScheme?.status || 'ACTIVE';

  // Eligible schemes for selected customer
  const eligibleSchemes = useMemo(() => {
    if (!selectedCustomer) return [];
    return selectedCustomer.schemes.filter(
      (s) => s.status === 'ACTIVE' || s.status === 'COMPLETED'
    );
  }, [selectedCustomer]);

  // Installments for active scheme
  const activeSchemeInstallments: DrawerInstallment[] = useMemo(() => {
    if (selectedScheme) {
      return selectedScheme.scheme_installments;
    }
    return [];
  }, [selectedScheme]);

  // Financial Stats Calculation
  const paidMonths = useMemo(() => {
    if (preselectedScheme) return preselectedScheme.paidMonths;
    if (selectedScheme) {
      return activeSchemeInstallments.filter((i) => i.status === 'PAID').length;
    }
    return 0;
  }, [preselectedScheme, selectedScheme, activeSchemeInstallments]);

  const totalMonths = useMemo(() => {
    if (preselectedScheme) return preselectedScheme.totalMonths;
    if (selectedScheme) return selectedScheme.total_installments;
    return 12;
  }, [preselectedScheme, selectedScheme]);

  const paidAmount = useMemo(() => {
    if (preselectedScheme) return preselectedScheme.paidAmount;
    if (selectedScheme) {
      return activeSchemeInstallments
        .filter((i) => i.status === 'PAID')
        .reduce((sum, i) => sum + (Number(i.paid_amount) || Number(i.installment_amount) || 1000), 0);
    }
    return 0;
  }, [preselectedScheme, selectedScheme, activeSchemeInstallments]);

  const remainingAmount = useMemo(() => {
    if (preselectedScheme) return preselectedScheme.remainingAmount;
    if (selectedScheme) {
      return Math.max(0, (totalMonths * 1000) - paidAmount);
    }
    return 12000;
  }, [preselectedScheme, selectedScheme, totalMonths, paidAmount]);

  const bonusAmount = useMemo(() => {
    if (preselectedScheme) return preselectedScheme.bonusAmount;
    if (selectedScheme) return selectedScheme.bonus_amount;
    return 1000;
  }, [preselectedScheme, selectedScheme]);

  const eligibleValue = useMemo(() => {
    if (preselectedScheme) return preselectedScheme.eligibleValue;
    if (selectedScheme) return selectedScheme.maturity_amount;
    return 13000;
  }, [preselectedScheme, selectedScheme]);

  // Eligibility Evaluation of Installments
  const pendingInstallments = useMemo(() => {
    return activeSchemeInstallments.filter((i) => i.status === 'PENDING');
  }, [activeSchemeInstallments]);

  const eligiblePendingInstallments = useMemo(() => {
    return activeSchemeInstallments.filter(
      (i) => i.status === 'PENDING' && i.calendar_month <= currentMonthStr
    );
  }, [activeSchemeInstallments, currentMonthStr]);

  const isAllInstallmentsPaid = Boolean(
    selectedScheme &&
    activeSchemeInstallments.length > 0 &&
    pendingInstallments.length === 0
  );

  const isNextInstallmentFutureMonth = Boolean(
    selectedScheme &&
    pendingInstallments.length > 0 &&
    eligiblePendingInstallments.length === 0
  );

  // In preselected scheme mode, fallback to caller's flag
  const isCurrentMonthPaid = Boolean(
    preselectedScheme?.isCurrentMonthPaid ||
    isAllInstallmentsPaid ||
    isNextInstallmentFutureMonth
  );

  // Resolved Installment Number to Pay
  const activeInstallmentNumber = useMemo(() => {
    if (selectedInstallmentNumber !== null) {
      return selectedInstallmentNumber;
    }
    if (preselectedScheme) {
      return preselectedScheme.currentInstallmentNumber;
    }
    if (eligiblePendingInstallments.length > 0) {
      return eligiblePendingInstallments[0].installment_number;
    }
    if (pendingInstallments.length > 0) {
      return pendingInstallments[0].installment_number;
    }
    return paidMonths + 1;
  }, [selectedInstallmentNumber, preselectedScheme, eligiblePendingInstallments, pendingInstallments, paidMonths]);

  // Installment details for the selected installment
  const currentInstallmentObj = useMemo(() => {
    return activeSchemeInstallments.find((i) => i.installment_number === activeInstallmentNumber);
  }, [activeSchemeInstallments, activeInstallmentNumber]);

  const currentMonthDisplayName = useMemo(() => {
    if (currentInstallmentObj) {
      return `${formatMonthYear(currentInstallmentObj.calendar_month)} (Due: ${formatDate(currentInstallmentObj.due_date)})`;
    }
    if (preselectedScheme) {
      return preselectedScheme.currentMonthName;
    }
    return formatDate(new Date().toISOString());
  }, [currentInstallmentObj, preselectedScheme]);

  const progressPercent = Math.min(100, Math.round((paidMonths / (totalMonths || 12)) * 100));

  // Handler: Admin selects customer from search
  const handleSelectCustomer = (customer: DrawerCustomer) => {
    setSelectedCustomer(customer);
    setErrorMessage(null);
    setSuccessMessage(null);

    const eligible = customer.schemes.filter(
      (s) => s.status === 'ACTIVE' || s.status === 'COMPLETED'
    );

    if (eligible.length === 1) {
      // Single-scheme workflow: preserve smooth workflow by selecting the only eligible scheme
      handleSelectScheme(eligible[0]);
    } else {
      // Multiple schemes exist (or 0 eligible): do NOT silently default! Staff must explicitly choose.
      setSelectedScheme(null);
      setSelectedInstallmentNumber(null);
    }
  };

  // Handler: Admin selects a specific scheme
  const handleSelectScheme = (scheme: DrawerScheme) => {
    setSelectedScheme(scheme);
    setErrorMessage(null);

    // Find earliest eligible pending installment
    const eligible = scheme.scheme_installments.filter(
      (i) => i.status === 'PENDING' && i.calendar_month <= currentMonthStr
    );

    if (eligible.length > 0) {
      setSelectedInstallmentNumber(eligible[0].installment_number);
    } else {
      setSelectedInstallmentNumber(null);
    }
  };

  // Reset Customer Selection
  const handleResetCustomer = () => {
    setSelectedCustomer(null);
    setSelectedScheme(null);
    setSelectedInstallmentNumber(null);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  // Reset Scheme Selection (to choose another scheme for same customer)
  const handleResetScheme = () => {
    setSelectedScheme(null);
    setSelectedInstallmentNumber(null);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  // Form Submission with Strict Validation
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    // 1. Validate Customer
    const customerId = preselectedCustomer?.id || selectedCustomer?.id;
    if (!customerId) {
      setErrorMessage('Please select a customer first.');
      return;
    }

    // 2. Validate Scheme Selection
    if (!activeSchemeId) {
      setErrorMessage('Please select a target savings scheme.');
      return;
    }

    // 3. Validate Scheme Ownership & Status
    if (selectedCustomer && selectedScheme) {
      if (selectedScheme.customer_id !== selectedCustomer.id) {
        setErrorMessage('Validation error: Selected scheme does not belong to the selected customer.');
        return;
      }
      if (selectedScheme.status !== 'ACTIVE' && selectedScheme.status !== 'COMPLETED') {
        setErrorMessage(`Cannot record installment for scheme with status "${selectedScheme.status}".`);
        return;
      }
    }

    // 4. Validate Installment Selection
    if (!activeInstallmentNumber || activeInstallmentNumber < 1 || activeInstallmentNumber > 12) {
      setErrorMessage('Please select a valid installment number (1-12).');
      return;
    }

    // 5. Cross-validate installment with selected scheme
    if (selectedScheme) {
      const targetInst = activeSchemeInstallments.find(
        (i) => i.installment_number === activeInstallmentNumber
      );

      if (!targetInst) {
        setErrorMessage(`Installment #${activeInstallmentNumber} not found in this scheme.`);
        return;
      }

      if (targetInst.scheme_id !== selectedScheme.id) {
        setErrorMessage('Validation error: Installment does not belong to the selected scheme.');
        return;
      }

      if (targetInst.status === 'PAID') {
        setErrorMessage(`Installment #${activeInstallmentNumber} has already been paid.`);
        return;
      }

      if (targetInst.calendar_month > currentMonthStr) {
        setErrorMessage(
          `Installment #${activeInstallmentNumber} for calendar month ${formatMonthYear(targetInst.calendar_month)} cannot be paid before that month begins.`
        );
        return;
      }
    } else if (isCurrentMonthPaid) {
      setErrorMessage("Current calendar month's installment is already paid.");
      return;
    }

    // 6. Execute Supabase RPC
    setIsSubmitting(true);
    setErrorMessage(null);

    const response = await recordInstallmentPayment({
      p_scheme_id: activeSchemeId,
      p_installment_number: activeInstallmentNumber,
      p_payment_method: selectedMethod,
      p_transaction_reference: transactionRef.trim() || `${selectedMethod}-COUNTER`,
      p_notes: notes.trim() || null,
    });

    setIsSubmitting(false);

    if (response.error) {
      setErrorMessage(response.error);
      return;
    }

    const receiptNum = response.data?.receipt_number || `RJ-RCP-${now.getFullYear()}-RECORDED`;
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

  // Helper boolean to know if scheme selection is complete
  const isSchemeChosen = Boolean(preselectedScheme || selectedScheme);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Dark Translucent Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/50 backdrop-blur-2xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Right-Side Slide-Over Drawer Shell */}
      <div className="relative w-full max-w-lg sm:w-[500px] bg-white h-full shadow-2xl z-10 flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-300">
        
        {/* FIXED HEADER */}
        <div className="p-6 pb-4 border-b border-slate-200/80 bg-white shrink-0 flex items-start justify-between">
          <div>
            <h2 className="font-serif-luxury font-bold text-xl text-slate-900 tracking-tight">
              RECORD INSTALLMENT
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Record a verified monthly installment payment for a customer scheme.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
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

          {/* STAGE 1: SEARCH CUSTOMER (If no customer pre-selected or selected) */}
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

              {/* Search Result States */}
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
                  <div className="text-[11px] text-slate-400 mt-0.5">Try searching with alternative spelling or mobile number.</div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Select Customer ({searchResults.length})
                  </div>
                  {searchResults.map((cust) => {
                    const activeCount = cust.schemes.filter(
                      (s) => s.status === 'ACTIVE' || s.status === 'COMPLETED'
                    ).length;

                    return (
                      <button
                        key={cust.id}
                        type="button"
                        onClick={() => handleSelectCustomer(cust)}
                        className="w-full text-left p-3.5 rounded-xl border border-slate-200/80 bg-white hover:border-blue-500 hover:bg-blue-50/30 transition group flex items-start justify-between gap-3 cursor-pointer"
                      >
                        <div>
                          <div className="font-bold text-sm text-slate-900 group-hover:text-blue-900">
                            {cust.full_name}
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                            <span className="font-mono text-slate-600">{cust.customer_code}</span>
                            <span>•</span>
                            <span>{cust.phone_number}</span>
                            {cust.city && <span>• {cust.city}</span>}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          {activeCount > 1 ? (
                            <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                              {activeCount} Schemes
                            </span>
                          ) : activeCount === 1 ? (
                            <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              1 Active Scheme
                            </span>
                          ) : (
                            <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                              No Active Schemes
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : !isSchemeChosen ? (
            /* STAGE 2: MULTI-SCHEME SELECTION (Customer selected, but scheme not yet chosen) */
            <div className="space-y-4">
              
              {/* Selected Customer Header Banner */}
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
                      <span className="font-mono font-medium">{activeCustomerCode}</span>
                      <span>•</span>
                      <span>{activeCustomerPhone}</span>
                    </div>
                  </div>
                </div>

                {!preselectedCustomer && (
                  <button
                    type="button"
                    onClick={handleResetCustomer}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Change</span>
                  </button>
                )}
              </div>

              {/* Explicit Scheme Selection List */}
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    SELECT SCHEME ({selectedCustomer?.schemes.length || 0})
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Choose which scheme to pay
                  </span>
                </div>

                {(!selectedCustomer?.schemes || selectedCustomer.schemes.length === 0) ? (
                  <div className="p-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-500 space-y-1">
                    <AlertCircle className="w-6 h-6 text-amber-500 mx-auto mb-1" />
                    <div className="text-xs font-bold text-slate-700">No schemes found</div>
                    <div className="text-[11px] text-slate-400">
                      This customer has not been enrolled in any savings scheme yet.
                    </div>
                  </div>
                ) : eligibleSchemes.length === 0 ? (
                  <div className="p-6 text-center bg-amber-50/60 rounded-2xl border border-amber-200 text-amber-900 space-y-1">
                    <AlertCircle className="w-6 h-6 text-amber-600 mx-auto mb-1" />
                    <div className="text-xs font-bold">No eligible open schemes</div>
                    <div className="text-[11px] text-amber-800">
                      All existing schemes for this customer are either matured, cancelled, or refunded.
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedCustomer.schemes.map((s) => {
                      const isEligible = s.status === 'ACTIVE' || s.status === 'COMPLETED';
                      const schemePaidCount = s.scheme_installments.filter((i) => i.status === 'PAID').length;
                      const nextDue = s.scheme_installments.find((i) => i.status === 'PENDING');
                      const schemePaidAmount = s.scheme_installments
                        .filter((i) => i.status === 'PAID')
                        .reduce((sum, i) => sum + (Number(i.paid_amount) || Number(i.installment_amount) || 1000), 0);

                      return (
                        <div
                          key={s.id}
                          className={`p-4 rounded-2xl border transition-all ${
                            isEligible
                              ? 'bg-white border-slate-200 hover:border-blue-500 hover:shadow-sm'
                              : 'bg-slate-50/70 border-slate-200/60 opacity-60'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                {s.slot_number != null && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
                                    Slot #{s.slot_number}
                                  </span>
                                )}
                                <span className="font-mono font-bold text-sm text-slate-900">
                                  {s.scheme_code}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                    s.status === 'ACTIVE'
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : s.status === 'COMPLETED'
                                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                                  }`}
                                >
                                  {s.status}
                                </span>
                              </div>

                              <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                                <span>{schemePaidCount} of {s.total_installments} Paid</span>
                                <span>•</span>
                                <span>{formatCurrency(schemePaidAmount)} / {formatCurrency(s.target_contribution)}</span>
                              </div>

                              {nextDue && (
                                <div className="text-[11px] text-blue-700 font-medium mt-1.5 flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  <span>Next Due: #{nextDue.installment_number} ({formatMonthYear(nextDue.calendar_month)})</span>
                                </div>
                              )}
                            </div>

                            {isEligible ? (
                              <button
                                type="button"
                                onClick={() => handleSelectScheme(s)}
                                className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition flex items-center gap-1 cursor-pointer shrink-0"
                              >
                                <span>Select</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <span className="text-[11px] font-semibold text-slate-400 italic">
                                Closed
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* STAGE 3: SCHEME SELECTED -> INSTALLMENTS & PAYMENT FORM */
            <div className="space-y-5">
              {/* Selected Customer & Scheme Header Summary */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                      {activeCustomerName.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-sm text-slate-900 truncate">
                        {activeCustomerName}
                      </h3>
                      <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2 mt-0.5">
                        <span className="font-mono font-medium">{activeCustomerCode}</span>
                        <span>•</span>
                        <span>{activeCustomerPhone}</span>
                      </div>
                    </div>
                  </div>

                  {!preselectedCustomer && (
                    <button
                      type="button"
                      onClick={handleResetCustomer}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Customer</span>
                    </button>
                  )}
                </div>

                {/* Scheme Identifier Line */}
                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">Scheme:</span>
                    {selectedScheme?.slot_number != null && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
                        Slot #{selectedScheme.slot_number}
                      </span>
                    )}
                    <span className="font-mono font-bold text-slate-900">{activeSchemeCode}</span>
                    <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {activeSchemeStatus}
                    </span>
                  </div>

                  {!preselectedScheme && selectedCustomer && selectedCustomer.schemes.length > 1 && (
                    <button
                      type="button"
                      onClick={handleResetScheme}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowLeft className="w-3 h-3" />
                      <span>Change Scheme</span>
                    </button>
                  )}
                </div>
              </div>

              {/* SCHEME PROGRESS BAR */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="uppercase text-[11px] text-slate-500 tracking-wider">
                    SCHEME PROGRESS
                  </span>
                  <span className="text-blue-900 font-bold">
                    {paidMonths} / {totalMonths} Months ({progressPercent}%)
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

              {/* INSTALLMENT DISPLAY & SELECTION CARD */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    INSTALLMENT SELECTION
                  </span>
                  <span className="text-xs font-bold font-mono text-slate-800">
                    Installment #{activeInstallmentNumber} of {totalMonths}
                  </span>
                </div>

                {/* State: All 12 Installments Fully Paid */}
                {isAllInstallmentsPaid ? (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      All 12 installments are completed for this scheme!
                    </div>
                    <div className="text-[11px] text-emerald-800">
                      This scheme enrollment is fully paid and ready for redemption.
                    </div>
                  </div>
                ) : isNextInstallmentFutureMonth ? (
                  /* State: Next Installment belongs to a future calendar month */
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      Current calendar month&apos;s installment is already paid.
                    </div>
                    <div className="text-[11px] text-amber-800">
                      Installment #{pendingInstallments[0]?.installment_number} is scheduled for{' '}
                      <span className="font-bold">
                        {formatMonthYear(pendingInstallments[0]?.calendar_month)}
                      </span>
                      . It cannot be paid before that calendar month begins.
                    </div>
                  </div>
                ) : (
                  /* State: Eligible pending installment(s) available */
                  <div className="space-y-3 pt-1">
                    {/* Installment Selector Dropdown (When multiple pending installments exist) */}
                    {activeSchemeInstallments.length > 0 && (
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Select Installment to Record
                        </label>
                        <select
                          value={activeInstallmentNumber}
                          onChange={(e) => setSelectedInstallmentNumber(Number(e.target.value))}
                          className="w-full px-3.5 py-2 text-xs font-bold text-slate-900 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                        >
                          {activeSchemeInstallments.map((inst) => {
                            const isPaid = inst.status === 'PAID';
                            const isFuture = !isPaid && inst.calendar_month > currentMonthStr;

                            return (
                              <option
                                key={inst.id}
                                value={inst.installment_number}
                                disabled={isPaid || isFuture}
                              >
                                Installment #{inst.installment_number} - {formatMonthYear(inst.calendar_month)}{' '}
                                {isPaid ? '(✓ Paid)' : isFuture ? '(Locked - Future Month)' : '(Due Now)'}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    )}

                    {/* 12-Month Slot Visualization Grid */}
                    {activeSchemeInstallments.length > 0 && (
                      <div className="pt-2">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                          Scheme Installments Ledger (12 Months)
                        </div>
                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                          {activeSchemeInstallments.map((inst) => {
                            const isPaid = inst.status === 'PAID';
                            const isSelected = inst.installment_number === activeInstallmentNumber;
                            const isFuture = !isPaid && inst.calendar_month > currentMonthStr;
                            const isEligible = !isPaid && inst.calendar_month <= currentMonthStr;

                            return (
                              <button
                                key={inst.id}
                                type="button"
                                disabled={isPaid || isFuture}
                                onClick={() => setSelectedInstallmentNumber(inst.installment_number)}
                                className={`p-1.5 rounded-lg border text-center transition flex flex-col items-center justify-center gap-0.5 ${
                                  isSelected
                                    ? 'border-blue-600 bg-blue-50 text-blue-900 ring-2 ring-blue-600/20 font-bold'
                                    : isPaid
                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                    : isEligible
                                    ? 'border-amber-300 bg-amber-50/70 text-amber-900 hover:border-amber-500 cursor-pointer'
                                    : 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed opacity-60'
                                }`}
                                title={`Installment #${inst.installment_number} - ${formatMonthYear(inst.calendar_month)} (${inst.status})`}
                              >
                                <span className="text-[10px] font-mono">#{inst.installment_number}</span>
                                {isPaid ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : isFuture ? (
                                  <Lock className="w-2.5 h-2.5 text-slate-400" />
                                ) : (
                                  <span className="text-[9px] font-bold text-amber-800">DUE</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Amount & Payment Date Fields */}
                    <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
                      <span>Due Period:</span>
                      <span className="font-bold text-slate-900">{currentMonthDisplayName}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
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
          
          {hasSelectedCustomer && isSchemeChosen && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || isCurrentMonthPaid || !activeSchemeId || !activeInstallmentNumber}
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
