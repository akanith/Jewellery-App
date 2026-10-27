'use client';

/**
 * RAMYAS JEWELLER - Customer Profile & 12-Month Passbook Timeline
 * Step 9.3: Connected to live Supabase database.
 * If customer does not exist, renders a clean Not-Found state with navigation back.
 */

import React, { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CreditCard,
  Edit,
  Printer,
  Gift,
  CheckCircle2,
  Phone,
  MapPin,
  Sparkles,
  ArrowLeft,
  Loader2,
  AlertCircle,
  UserX,
  FileText,
  Clock,
  KeyRound,
  Trash2,
  PlusCircle,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import RecordInstallmentDrawer from '@/components/modals/RecordInstallmentDrawer';
import EditCustomerModal from '@/components/modals/EditCustomerModal';
import ResetPasswordModal from '@/components/modals/ResetPasswordModal';
import DeleteCustomerModal from '@/components/modals/DeleteCustomerModal';
import EnrollSchemeModal from '@/components/modals/EnrollSchemeModal';

interface CustomerDetailPageProps {
  params: Promise<{ id: string }>;
}

interface CustomerData {
  id: string;
  customer_code: string;
  full_name: string;
  phone_number: string;
  city: string | null;
  address: string | null;
  pincode: string | null;
  nominee_name: string | null;
  nominee_relationship: string | null;
  notes: string | null;
  created_at: string;
  password_status?: string | null;
}

interface InstallmentData {
  id: string;
  installment_number: number;
  calendar_month: string;
  due_date: string;
  installment_amount: number;
  status: string;
  paid_amount: number;
  paid_date: string | null;
  notes: string | null;
}

interface RawSchemeRow {
  id: string;
  scheme_code: string;
  slot_number?: number | null;
  monthly_installment_amount: number | string | null;
  total_installments: number | string | null;
  bonus_amount: number | string | null;
  maturity_amount: number | string | null;
  start_month: string;
  end_month: string;
  status: string;
  notes: string | null;
  scheme_installments?: InstallmentData[] | null;
}

interface SchemeData {
  id: string;
  scheme_code: string;
  slot_number: number | null;
  monthly_installment_amount: number;
  total_installments: number;
  bonus_amount: number;
  maturity_amount: number;
  start_month: string;
  end_month: string;
  status: string;
  notes: string | null;
  installments: InstallmentData[];
}

export type SchemeLifecycleStatus =
  | 'ACTIVE'
  | 'COMPLETED'
  | 'MATURED'
  | 'PARTIALLY_REDEEMED'
  | 'FULLY_REDEEMED'
  | 'EMERGENCY_REFUNDED'
  | 'CANCELLED';

const getStatusBadgeStyle = (status: string) => {
  switch (status) {
    case 'ACTIVE':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'COMPLETED':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'MATURED':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'PARTIALLY_REDEEMED':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'FULLY_REDEEMED':
      return 'bg-slate-100 text-slate-700 border-slate-200';
    case 'EMERGENCY_REFUNDED':
      return 'bg-rose-100 text-rose-800 border-rose-200';
    case 'CANCELLED':
      return 'bg-slate-100 text-slate-500 border-slate-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
};

const SCHEMES_QUERY_WITH_SLOT = `
  id,
  scheme_code,
  slot_number,
  monthly_installment_amount,
  total_installments,
  bonus_amount,
  maturity_amount,
  start_month,
  end_month,
  status,
  notes,
  scheme_installments (
    id,
    installment_number,
    calendar_month,
    due_date,
    installment_amount,
    status,
    paid_amount,
    paid_date,
    notes
  )
`;

const SCHEMES_QUERY_BASE = `
  id,
  scheme_code,
  monthly_installment_amount,
  total_installments,
  bonus_amount,
  maturity_amount,
  start_month,
  end_month,
  status,
  notes,
  scheme_installments (
    id,
    installment_number,
    calendar_month,
    due_date,
    installment_amount,
    status,
    paid_amount,
    paid_date,
    notes
  )
`;

export default function CustomerDetailPage({ params }: CustomerDetailPageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const customerId = resolvedParams.id;

  const [isLoading, setIsLoading] = useState(true);
  const [isSchemesLoading, setIsSchemesLoading] = useState(false);
  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [allSchemes, setAllSchemes] = useState<SchemeData[]>([]);
  const [selectedSchemeId, setSelectedSchemeId] = useState<string | null>(null);
  const [customerError, setCustomerError] = useState<string | null>(null);
  const [schemesError, setSchemesError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [isRecordDrawerOpen, setIsRecordDrawerOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);

  // 1. Isolated Schemes Fetcher with Pre-Migration Schema Fallback
  const fetchSchemesForCustomer = useCallback(async (custUuid: string) => {
    setIsSchemesLoading(true);
    setSchemesError(null);

    try {
      const supabase = getSupabaseBrowserClient();

      let rawSchemes: RawSchemeRow[] = [];
      let schemeErr: { code?: string; message?: string } | null = null;

      // 1A. Attempt query with slot_number for multi-scheme architecture
      const primaryRes = await supabase
        .from('schemes')
        .select(SCHEMES_QUERY_WITH_SLOT)
        .eq('customer_id', custUuid)
        .order('created_at', { ascending: false });

      if (!primaryRes.error && primaryRes.data) {
        rawSchemes = primaryRes.data as unknown as RawSchemeRow[];
      } else if (
        primaryRes.error &&
        (primaryRes.error.code === '42703' || primaryRes.error.message?.includes('slot_number'))
      ) {
        // 1B. If database has not yet applied the slot_number migration (PostgreSQL error 42703),
        // gracefully fall back to the pre-migration column list so active schemes still load.
        const fallbackRes = await supabase
          .from('schemes')
          .select(SCHEMES_QUERY_BASE)
          .eq('customer_id', custUuid)
          .order('created_at', { ascending: false });

        if (!fallbackRes.error && fallbackRes.data) {
          rawSchemes = fallbackRes.data as unknown as RawSchemeRow[];
        } else {
          schemeErr = fallbackRes.error;
        }
      } else {
        schemeErr = primaryRes.error;
      }

      if (schemeErr) {
        setSchemesError(schemeErr.message || 'Failed to load savings schemes.');
        setAllSchemes([]);
        setSelectedSchemeId(null);
        return;
      }

      if (rawSchemes.length > 0) {
        const mappedSchemes: SchemeData[] = rawSchemes.map((s) => ({
          id: s.id,
          scheme_code: s.scheme_code,
          slot_number: typeof s.slot_number === 'number' ? s.slot_number : (s.slot_number ? Number(s.slot_number) : null),
          monthly_installment_amount: Number(s.monthly_installment_amount) || 1000,
          total_installments: Number(s.total_installments) || 12,
          bonus_amount: Number(s.bonus_amount) || 1000,
          maturity_amount: Number(s.maturity_amount) || 13000,
          start_month: s.start_month,
          end_month: s.end_month,
          status: s.status,
          notes: s.notes,
          installments: (s.scheme_installments || []).sort(
            (a: InstallmentData, b: InstallmentData) => a.installment_number - b.installment_number
          ),
        }));

        setAllSchemes(mappedSchemes);
        setSelectedSchemeId((prev) => {
          if (prev && mappedSchemes.some((item) => item.id === prev)) {
            return prev;
          }
          const primary =
            mappedSchemes.find((s) => s.status === 'ACTIVE') ||
            mappedSchemes.find((s) => s.status === 'COMPLETED' || s.status === 'MATURED' || s.status === 'PARTIALLY_REDEEMED') ||
            mappedSchemes[0];
          return primary.id;
        });
      } else {
        setAllSchemes([]);
        setSelectedSchemeId(null);
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err !== null && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Failed to load savings schemes.';
      setSchemesError(msg);
      setAllSchemes([]);
      setSelectedSchemeId(null);
    } finally {
      setIsSchemesLoading(false);
    }
  }, []);

  // 2. Main Customer Details Fetcher
  const fetchCustomerDetails = useCallback(async () => {
    try {
      const supabase = getSupabaseBrowserClient();
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(customerId);

      // Fetch Customer Record
      let custQuery = supabase
        .from('customers')
        .select('*');

      custQuery = isUuid
        ? custQuery.eq('id', customerId)
        : custQuery.eq('customer_code', customerId);

      const { data: custData, error: custErr } = await custQuery.maybeSingle();

      if (custErr) {
        setCustomerError(custErr.message || 'Failed to load customer profile.');
        setIsLoading(false);
        return;
      }

      if (!custData) {
        setNotFound(true);
        setIsLoading(false);
        return;
      }

      setCustomer(custData as CustomerData);

      // Fetch Schemes for customer in isolated operation
      await fetchSchemesForCustomer(custData.id);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err !== null && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Failed to load customer profile.';
      setCustomerError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [customerId, fetchSchemesForCustomer]);

  const handleRetryCustomer = useCallback(() => {
    setIsLoading(true);
    setCustomerError(null);
    setNotFound(false);
    fetchCustomerDetails();
  }, [fetchCustomerDetails]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCustomerDetails();
  }, [fetchCustomerDetails]);

  // Loading State
  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <div className="text-sm font-medium text-slate-600">Loading customer profile & passbook...</div>
      </div>
    );
  }

  // Not Found State
  if (notFound) {
    return (
      <div className="max-w-xl mx-auto py-16 px-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-100">
          <UserX className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold font-serif-luxury text-slate-900">
          Customer Not Found
        </h2>
        <p className="text-sm text-slate-500 mt-2 mb-6">
          No verified customer account exists for identifier <code className="font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">{customerId}</code> in the database.
        </p>
        <Link
          href="/customers"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl royal-button text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Customers Directory</span>
        </Link>
      </div>
    );
  }

  // Fatal Customer Error State (when customer record itself cannot be loaded)
  if (customerError && !customer) {
    return (
      <div className="max-w-xl mx-auto py-16 px-6 text-center">
        <div className="luxury-card p-6 bg-rose-50 border-rose-200 text-rose-900 space-y-4">
          <div className="flex items-center justify-center gap-2 text-rose-700 font-bold">
            <AlertCircle className="w-6 h-6 shrink-0" />
            <span>Failed to Load Customer Profile</span>
          </div>
          <p className="text-xs text-rose-700 font-mono">{customerError}</p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => fetchCustomerDetails()}
              className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition cursor-pointer"
            >
              Retry Loading
            </button>
            <Link
              href="/customers"
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition"
            >
              Back to Directory
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!customer) {
    return null;
  }

  // Selected scheme & calculations
  const scheme = allSchemes.find((s) => s.id === selectedSchemeId) || allSchemes[0] || null;
  const currentSlotIndex = scheme ? allSchemes.findIndex((s) => s.id === scheme.id) : 0;
  const installments = scheme?.installments || [];
  const paidCount = installments.filter((i) => i.status === 'PAID').length;
  const totalMonths = scheme?.total_installments || 12;
  const paidAmount = installments
    .filter((i) => i.status === 'PAID')
    .reduce((sum, i) => sum + (Number(i.paid_amount) || 0), 0);
  const remainingAmount = Math.max(0, (totalMonths * (scheme?.monthly_installment_amount || 1000)) - paidAmount);
  const progressPercentage = totalMonths > 0 ? ((paidCount / totalMonths) * 100).toFixed(1) : '0';
  const nextPendingInstallment = installments.find((i) => i.status === 'PENDING');
  const isMatured = scheme?.status === 'MATURED' || scheme?.status === 'COMPLETED' || paidCount === 12;


  const combinedPaidAmount = allSchemes.reduce((sum, s) => {
    return (
      sum +
      s.installments
        .filter((i) => i.status === 'PAID')
        .reduce((iSum, i) => iSum + (Number(i.paid_amount) || 0), 0)
    );
  }, 0);

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Breadcrumb & Action Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <Link href="/customers" className="hover:text-blue-600 transition-colors">
            Customers
          </Link>
          <span>&gt;</span>
          <span className="text-blue-900 font-bold">{customer.full_name}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsResetModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-amber-200 text-xs font-semibold text-amber-800 hover:bg-amber-50/60 transition shadow-xs cursor-pointer"
          >
            <KeyRound className="w-4 h-4 text-amber-600" />
            <span>Reset Password</span>
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Print Passbook</span>
          </button>
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs cursor-pointer"
          >
            <Edit className="w-4 h-4 text-slate-500" />
            <span>Edit Profile</span>
          </button>
          <button
            onClick={() => setIsDeleteModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-rose-200 text-xs font-semibold text-rose-700 hover:bg-rose-50/60 transition shadow-xs cursor-pointer"
          >
            <Trash2 className="w-4 h-4 text-rose-600" />
            <span>Delete Customer</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {customerError && (
        <div className="luxury-card p-4 bg-rose-50 border-rose-200 text-rose-900 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <div className="text-xs sm:text-sm font-medium">{customerError}</div>
          </div>
          <button
            onClick={handleRetryCustomer}
            className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* Top Section: Customer Profile Card (Left) & Scheme Progress (Right) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Customer Card (Col Span 4) */}
        <div className="md:col-span-4 bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="text-center space-y-3 pb-5 border-b border-slate-100">
            {/* Avatar Initials Badge */}
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-600 to-blue-400 text-white font-serif-luxury font-bold text-2xl flex items-center justify-center mx-auto shadow-md">
              {(customer.full_name || 'C').slice(0, 2).toUpperCase()}
            </div>

            <div>
              <h2 className="font-heading font-bold text-xl text-slate-900">
                {customer.full_name}
              </h2>
              <p className="text-xs font-mono text-slate-500 mt-0.5">
                ID: {customer.customer_code}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Verified Member
              </span>
              {customer.password_status && (
                <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                  customer.password_status === 'RESET_REQUIRED'
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : customer.password_status === 'LOCKED'
                    ? 'bg-rose-50 text-rose-800 border-rose-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    customer.password_status === 'RESET_REQUIRED'
                      ? 'bg-amber-500 animate-pulse'
                      : customer.password_status === 'LOCKED'
                      ? 'bg-rose-500'
                      : 'bg-emerald-500'
                  }`}></span>
                  Password: {customer.password_status}
                </span>
              )}
            </div>
          </div>

          {/* Details List */}
          <div className="pt-4 space-y-3 text-xs">
            <div className="flex items-start gap-3">
              <Phone className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] font-bold text-slate-400 tracking-wider block uppercase">
                  MOBILE NUMBER
                </span>
                <span className="font-semibold text-slate-800">{customer.phone_number}</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] font-bold text-slate-400 tracking-wider block uppercase">
                  LOCATION & ADDRESS
                </span>
                <span className="font-semibold text-slate-800">
                  {customer.address || customer.city || 'Coimbatore'}
                </span>
              </div>
            </div>

            {customer.nominee_name && (
              <div className="flex items-start gap-3">
                <Gift className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] font-bold text-slate-400 tracking-wider block uppercase">
                    NOMINEE
                  </span>
                  <span className="font-semibold text-slate-800">
                    {customer.nominee_name} ({customer.nominee_relationship || 'Nominee'})
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <Clock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] font-bold text-slate-400 tracking-wider block uppercase">
                  JOINED ON
                </span>
                <span className="font-semibold text-slate-800">{formatDate(customer.created_at)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Scheme Progress Card (Col Span 8) */}
        <div className="md:col-span-8 bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs flex flex-col justify-between">
          {schemesError ? (
            <div className="py-12 text-center flex flex-col items-center justify-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center mx-auto text-rose-600">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800 font-serif-luxury">
                Failed to Load Schemes
              </h3>
              <p className="text-xs text-rose-600 max-w-sm mx-auto font-mono">
                {schemesError}
              </p>
              <button
                type="button"
                onClick={() => fetchSchemesForCustomer(customer.id)}
                className="mt-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer shadow-xs transition"
              >
                Retry Loading Schemes
              </button>
            </div>
          ) : isSchemesLoading ? (
            <div className="py-16 text-center flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
              <div className="text-xs font-medium text-slate-500">Loading customer savings schemes...</div>
            </div>
          ) : !scheme ? (
            <div className="py-12 text-center flex flex-col items-center justify-center space-y-3">
              <Sparkles className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-800 font-serif-luxury">
                No Active Scheme Enrolled
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                This customer does not have an active savings scheme enrolled yet. Enroll them now into their first scheme.
              </p>
              <button
                type="button"
                onClick={() => setIsEnrollModalOpen(true)}
                className="mt-2 px-5 py-2.5 rounded-xl royal-button font-bold text-xs flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Enroll in Savings Scheme</span>
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Multi-Scheme Switcher Bar (when customer has multiple schemes) */}
              {allSchemes.length > 1 && (
                <div className="border-b border-slate-100 pb-4">
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Customer Schemes ({allSchemes.length})
                    </div>
                    <div className="text-[11px] font-medium text-slate-500">
                      Combined Paid: <span className="font-bold font-mono text-slate-900">{formatCurrency(combinedPaidAmount)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {allSchemes.map((s, idx) => {
                      const isSelected = scheme?.id === s.id;
                      const sPaidCount = s.installments.filter((i) => i.status === 'PAID').length;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setSelectedSchemeId(s.id)}
                          className={`px-3 py-2 rounded-xl text-xs font-medium border text-left shrink-0 transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-blue-50/80 border-blue-500 text-blue-900 shadow-2xs font-semibold'
                              : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              isSelected ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
                            }`}>
                              Slot #{s.slot_number ?? (idx + 1)}
                            </span>
                            <span className="font-mono font-bold text-[11px]">{s.scheme_code}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getStatusBadgeStyle(s.status)}`}>
                              {s.status}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-3 mt-1.5 text-[11px] text-slate-500">
                            <span>{formatCurrency(s.monthly_installment_amount)}/mo</span>
                            <span>{sPaidCount}/{s.total_installments} Paid</span>
                          </div>
                        </button>
                      );
                    })}

                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 font-mono">
                      {allSchemes.length > 1 ? `SLOT #${scheme.slot_number ?? (currentSlotIndex + 1)} • ` : ''}{scheme.scheme_code}
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadgeStyle(scheme.status)}`}>
                      {scheme.status}
                    </span>
                  </div>
                  <h3 className="font-heading font-bold text-xl text-slate-900">
                    12-Month Gold Savings Scheme
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Monthly Contribution: {formatCurrency(scheme.monthly_installment_amount)} / month
                  </p>
                </div>

                <div className="sm:text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    TOTAL ELIGIBLE MATURITY
                  </span>
                  <span className="font-heading font-bold text-2xl sm:text-3xl text-blue-700">
                    {formatCurrency(scheme.maturity_amount)}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-2">
                  <span>{paidCount} of {totalMonths} Months Completed</span>
                  <span className="font-bold text-blue-700">{progressPercentage}%</span>
                </div>
                <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isMatured ? 'bg-amber-500' : 'bg-blue-600'
                    }`}
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1.5">
                  <span>Started {formatDate(scheme.start_month)}</span>
                  <span>Matures {formatDate(scheme.end_month)}</span>
                </div>
              </div>

              {/* Metric Cubes */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Paid Amount</div>
                  <div className="text-base font-bold text-slate-900 mt-0.5 font-mono">
                    {formatCurrency(paidAmount)}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Remaining</div>
                  <div className="text-base font-bold text-slate-900 mt-0.5 font-mono">
                    {formatCurrency(remainingAmount)}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Shop Bonus</div>
                  <div className="text-base font-bold text-amber-600 mt-0.5 font-mono">
                    +{formatCurrency(scheme.bonus_amount)}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200/60">
                  <div className="text-[10px] font-bold text-blue-600 uppercase">Next Due</div>
                  <div className="text-xs font-bold text-blue-900 mt-1 truncate">
                    {nextPendingInstallment ? formatDate(nextPendingInstallment.due_date) : 'Completed'}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center gap-3">
                {scheme.status === 'ACTIVE' && nextPendingInstallment && (
                  <button
                    onClick={() => setIsRecordDrawerOpen(true)}
                    className="px-5 py-2.5 rounded-xl royal-button font-bold text-xs flex items-center gap-2 cursor-pointer"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Record Installment #{nextPendingInstallment.installment_number}</span>
                  </button>
                )}


                {isMatured && (
                  <Link
                    href={`/redemption?scheme=${scheme.id}`}
                    className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm"
                  >
                    <Gift className="w-4 h-4" />
                    <span>Proceed to Scheme Redemption</span>
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Passbook Installment Timeline (12 Months) */}
      {scheme && (
        <div className="luxury-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-heading font-bold text-lg text-slate-900">
                12-Month Passbook Installment Timeline {allSchemes.length > 1 ? `(Slot #${scheme.slot_number ?? (currentSlotIndex + 1)} • ${scheme.scheme_code})` : ''}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Complete record of scheduled and paid monthly installments
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {installments.map((inst) => {
              const isPaid = inst.status === 'PAID';

              return (
                <div
                  key={inst.id}
                  className={`p-4 rounded-xl border transition ${
                    isPaid
                      ? 'bg-emerald-50/40 border-emerald-200'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold text-slate-800">
                      Month #{inst.installment_number}
                    </span>
                    {isPaid ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded">
                        <CheckCircle2 className="w-3 h-3" /> PAID
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded">
                        PENDING
                      </span>
                    )}
                  </div>

                  <div className="text-sm font-bold text-slate-900 font-mono">
                    {formatCurrency(isPaid ? inst.paid_amount : inst.installment_amount)}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {isPaid
                      ? `Paid on ${formatDate(inst.paid_date)}`
                      : `Due on ${formatDate(inst.due_date)}`}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Customer Notes */}
      {customer.notes && (
        <div className="luxury-card p-6 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            <FileText className="w-4 h-4 text-blue-600" />
            <span>Customer Profile Notes</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed italic bg-slate-50 p-4 rounded-xl border border-slate-200/60">
            &ldquo;{customer.notes}&rdquo;
          </p>
        </div>
      )}

      {/* Record Installment Drawer */}
      {scheme && nextPendingInstallment && (
        <RecordInstallmentDrawer
          isOpen={isRecordDrawerOpen}
          onClose={() => setIsRecordDrawerOpen(false)}
          customer={{
            name: customer.full_name,
            id: customer.customer_code,
            phone: customer.phone_number,
            schemeName: '12-Month Gold Savings Scheme',
          }}
          scheme={{
            id: scheme.id,
            paidMonths: paidCount,
            totalMonths: totalMonths,
            paidAmount: paidAmount,
            remainingAmount: remainingAmount,
            bonusAmount: scheme.bonus_amount,
            eligibleValue: scheme.maturity_amount,
            currentInstallmentNumber: nextPendingInstallment.installment_number,
            currentMonthName: formatDate(nextPendingInstallment.due_date),
          }}
          onSuccess={() => {
            setIsRecordDrawerOpen(false);
            fetchCustomerDetails();
          }}
        />
      )}

      {/* Edit Customer Modal */}
      {customer && (
        <EditCustomerModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          customer={{
            id: customer.id,
            customer_code: customer.customer_code,
            full_name: customer.full_name,
            phone_number: customer.phone_number,
            city: customer.city || '',
            address: customer.address || '',
            pincode: customer.pincode || '',
            nominee_name: customer.nominee_name || '',
            nominee_relationship: customer.nominee_relationship || '',
            notes: customer.notes || '',
          }}
          onSuccess={() => {
            setIsEditModalOpen(false);
            fetchCustomerDetails();
          }}
        />
      )}

      {/* Reset Customer Password Modal */}
      {customer && (
        <ResetPasswordModal
          isOpen={isResetModalOpen}
          onClose={() => setIsResetModalOpen(false)}
          customer={{
            id: customer.id,
            customer_code: customer.customer_code,
            full_name: customer.full_name,
            phone_number: customer.phone_number,
          }}
          onSuccess={() => {
            setIsResetModalOpen(false);
            fetchCustomerDetails();
          }}
        />
      )}

      {/* Delete Customer Confirmation Modal */}
      {customer && (
        <DeleteCustomerModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          customer={{
            id: customer.id,
            customer_code: customer.customer_code,
            full_name: customer.full_name,
            phone_number: customer.phone_number,
          }}
          onSuccess={(msg) => {
            setIsDeleteModalOpen(false);
            sessionStorage.setItem('flash_message', msg);
            router.push('/customers');
            router.refresh();
          }}
        />
      )}

      {/* Enroll in Another Scheme Modal */}
      {customer && (
        <EnrollSchemeModal
          isOpen={isEnrollModalOpen}
          onClose={() => setIsEnrollModalOpen(false)}
          customer={{
            id: customer.id,
            customer_code: customer.customer_code,
            full_name: customer.full_name,
            phone_number: customer.phone_number,
          }}
          existingSchemes={allSchemes}
          onSuccess={async (newSchemeId) => {
            setIsEnrollModalOpen(false);
            await fetchCustomerDetails();
            if (newSchemeId) {
              setSelectedSchemeId(newSchemeId);
            }
          }}
        />
      )}
    </div>
  );
}
