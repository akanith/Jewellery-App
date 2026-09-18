'use client';

/**
 * RAMYAS JEWELLER - Customer Profile & 12-Month Passbook Timeline
 * Step 9.3: Connected to live Supabase database.
 * If customer does not exist, renders a clean Not-Found state with navigation back.
 */

import React, { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
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
  Clock
} from 'lucide-react';
import { formatCurrency, formatDate, formatTime } from '@/lib/formatters';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import RecordInstallmentDrawer from '@/components/modals/RecordInstallmentDrawer';
import EditCustomerModal from '@/components/modals/EditCustomerModal';

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

interface SchemeData {
  id: string;
  scheme_code: string;
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

export default function CustomerDetailPage({ params }: CustomerDetailPageProps) {
  const resolvedParams = use(params);
  const customerId = resolvedParams.id;

  const [isLoading, setIsLoading] = useState(true);
  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [scheme, setScheme] = useState<SchemeData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [isRecordDrawerOpen, setIsRecordDrawerOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const fetchCustomerDetails = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setNotFound(false);

    try {
      const supabase = getSupabaseBrowserClient();

      // 1. Fetch Customer Record
      const { data: custData, error: custErr } = await supabase
        .from('customers')
        .select('*')
        .or(`id.eq.${customerId},customer_code.eq.${customerId}`)
        .maybeSingle();

      if (custErr) throw custErr;
      if (!custData) {
        setNotFound(true);
        setIsLoading(false);
        return;
      }

      setCustomer(custData as CustomerData);

      // 2. Fetch Customer Schemes & Installments
      const { data: schemesData, error: schemeErr } = await supabase
        .from('schemes')
        .select(`
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
        `)
        .eq('customer_id', custData.id)
        .order('created_at', { ascending: false });

      if (schemeErr) throw schemeErr;

      const rawSchemes = schemesData || [];
      if (rawSchemes.length > 0) {
        const primary = rawSchemes.find((s) => s.status === 'ACTIVE') || rawSchemes[0];
        const installments = (primary.scheme_installments || []).sort(
          (a: InstallmentData, b: InstallmentData) => a.installment_number - b.installment_number
        );

        setScheme({
          id: primary.id,
          scheme_code: primary.scheme_code,
          monthly_installment_amount: Number(primary.monthly_installment_amount) || 1000,
          total_installments: primary.total_installments || 12,
          bonus_amount: Number(primary.bonus_amount) || 1000,
          maturity_amount: Number(primary.maturity_amount) || 13000,
          start_month: primary.start_month,
          end_month: primary.end_month,
          status: primary.status,
          notes: primary.notes,
          installments,
        });
      } else {
        setScheme(null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load customer profile.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, [customerId]);

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
  if (notFound || !customer) {
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

  // Calculations for active scheme
  const installments = scheme?.installments || [];
  const paidCount = installments.filter((i) => i.status === 'PAID').length;
  const totalMonths = scheme?.total_installments || 12;
  const paidAmount = installments
    .filter((i) => i.status === 'PAID')
    .reduce((sum, i) => sum + (Number(i.paid_amount) || 0), 0);
  const remainingAmount = Math.max(0, (totalMonths * (scheme?.monthly_installment_amount || 1000)) - paidAmount);
  const progressPercentage = ((paidCount / totalMonths) * 100).toFixed(1);
  const nextPendingInstallment = installments.find((i) => i.status === 'PENDING');
  const isMatured = scheme?.status === 'MATURED' || scheme?.status === 'COMPLETED' || paidCount === 12;

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

        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Print Passbook</span>
          </button>
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs"
          >
            <Edit className="w-4 h-4 text-slate-500" />
            <span>Edit Profile</span>
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
            onClick={() => fetchCustomerDetails()}
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

            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Verified Member
              </span>
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
          {!scheme ? (
            <div className="py-12 text-center flex flex-col items-center justify-center">
              <Sparkles className="w-10 h-10 text-slate-300 mb-2" />
              <h3 className="text-base font-bold text-slate-800 font-serif-luxury">
                No Active Scheme Enrolled
              </h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                This customer does not have an active savings scheme enrolled yet.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 font-mono mb-2">
                    {scheme.scheme_code}
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
                12-Month Passbook Installment Timeline
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
    </div>
  );
}
