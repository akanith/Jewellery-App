'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { 
  Phone, 
  MapPin, 
  Calendar, 
  CreditCard, 
  Edit, 
  Printer, 
  Gift, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Loader2,
  Award,
  PlusCircle
} from 'lucide-react';
import { CompleteRedemptionModal } from '@/components/redemption/redemption-modal';
import { RecordInstallmentModal } from '@/components/payments/record-installment-modal';
import { EditCustomerModal } from '@/components/customers/edit-customer-modal';
import { EnrollSchemeModal } from '@/components/schemes/enroll-scheme-modal';
import { CustomerService } from '@/features/customers';
import { SchemeService } from '@/features/schemes';
import { PaymentService } from '@/features/payments';
import { Customer, CustomerScheme, Installment } from '@ramyas-jeweller/shared-types';
import { AppError } from '@/lib/errors/app-error';

export default function CustomerDetailsPage() {
  const params = useParams();
  const customerId = params?.id as string;

  const [isRedemptionOpen, setIsRedemptionOpen] = useState(false);
  const [isInstallmentOpen, setIsInstallmentOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerSchemes, setCustomerSchemes] = useState<CustomerScheme[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomerDetails = useCallback(async () => {
    if (!customerId) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/customers/${customerId}?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) {
        throw new Error('Customer or scheme not found in database');
      }

      const data = await res.json();
      if (!data.success || !data.customer) {
        throw new Error(data.error || 'Failed to load customer profile');
      }

      const mappedCust: Customer = {
        id: String(data.customer.id),
        customerNumber: String(data.customer.customer_number || ''),
        profileId: data.customer.profile_id ? String(data.customer.profile_id) : null,
        fullName: String(data.customer.full_name || ''),
        mobileNumber: String(data.customer.mobile_number || ''),
        email: data.customer.email ? String(data.customer.email) : null,
        address: data.customer.address ? String(data.customer.address) : null,
        city: data.customer.city ? String(data.customer.city) : null,
        pincode: data.customer.pincode ? String(data.customer.pincode) : null,
        nomineeName: data.customer.nominee_name ? String(data.customer.nominee_name) : null,
        nomineeRelationship: data.customer.nominee_relationship ? String(data.customer.nominee_relationship) : null,
        nomineeMobile: data.customer.nominee_mobile ? String(data.customer.nominee_mobile) : null,
        status: (data.customer.status as any) || 'ACTIVE',
        createdAt: String(data.customer.created_at || new Date().toISOString()),
        updatedAt: String(data.customer.updated_at || new Date().toISOString()),
      };

      setCustomer(mappedCust);

      if (data.scheme) {
        const mappedScheme: CustomerScheme = {
          id: String(data.scheme.id),
          schemeAccountNumber: String(data.scheme.scheme_account_number || ''),
          customerId: String(data.scheme.customer_id),
          schemePlanId: String(data.scheme.scheme_plan_id),
          startDate: String(data.scheme.start_date || ''),
          maturityDate: data.scheme.maturity_date ? String(data.scheme.maturity_date) : null,
          monthlyAmount: Number(data.scheme.monthly_amount || 0),
          totalInstallments: Number(data.scheme.total_installments || 12),
          paidInstallmentsCount: Number(data.scheme.paid_installments_count || 0),
          totalAmountPaid: Number(data.scheme.total_amount_paid || 0),
          status: (data.scheme.status as any) || 'ACTIVE',
          createdBy: data.scheme.created_by ? String(data.scheme.created_by) : null,
          createdAt: String(data.scheme.created_at || new Date().toISOString()),
          updatedAt: String(data.scheme.updated_at || new Date().toISOString()),
        };
        setCustomerSchemes([mappedScheme]);
      } else {
        setCustomerSchemes([]);
      }

      if (Array.isArray(data.installments) && data.installments.length > 0) {
        const mappedInstalls: Installment[] = data.installments.map((row: any) => ({
          id: String(row.id),
          customerSchemeId: String(row.customer_scheme_id || data.scheme?.id || ''),
          installmentNumber: Number(row.installment_number || 1),
          dueDate: String(row.due_date || ''),
          expectedAmount: Number(row.expected_amount || row.due_amount || 0),
          paidAmount: Number(row.paid_amount || 0),
          paymentDate: row.payment_date ? String(row.payment_date) : null,
          paymentMethod: row.payment_method ? row.payment_method : null,
          paymentReference: row.payment_reference ? String(row.payment_reference) : null,
          status: (row.status as any) || 'PENDING',
          receivedBy: row.received_by ? String(row.received_by) : null,
          createdAt: String(row.created_at || new Date().toISOString()),
          updatedAt: String(row.updated_at || new Date().toISOString()),
        }));
        setInstallments(mappedInstalls);
      } else {
        setInstallments([]);
      }
    } catch (err) {
      if (err instanceof AppError) {
        setError(err.toUserMessage());
      } else {
        setError('Failed to load customer profile details.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    fetchCustomerDetails();
  }, [fetchCustomerDetails]);

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}` : name.slice(0, 2).toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="min-h-[500px] flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-xs font-bold text-slate-500">Loading Customer Profile...</p>
        </div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="p-8 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4 max-w-xl mx-auto text-center font-sans my-12">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-900">Customer Profile Error</h2>
        <p className="text-xs text-slate-500">{error || 'Unable to locate customer record in database.'}</p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link
            href="/customers"
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
          >
            Back to Customers
          </Link>
          <button
            onClick={fetchCustomerDetails}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-2xs"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const activeScheme = customerSchemes.length > 0 ? customerSchemes[0] : null;
  const nextPendingInstallment = installments.find((inst) => inst.status === 'PENDING');
  const totalTargetValue = activeScheme ? activeScheme.monthlyAmount * activeScheme.totalInstallments : 0;
  const progressPercent = activeScheme ? Math.min(100, Math.round((activeScheme.paidInstallmentsCount / activeScheme.totalInstallments) * 100)) : 0;

  return (
    <div className="space-y-8 pb-16 font-sans">
      {/* Modals & Drawers */}
      <EnrollSchemeModal
        isOpen={isEnrollModalOpen}
        onClose={() => setIsEnrollModalOpen(false)}
        customer={customer}
        onSuccess={fetchCustomerDetails}
      />

      <RecordInstallmentModal
        isOpen={isInstallmentOpen}
        onClose={() => setIsInstallmentOpen(false)}
        customerName={customer.fullName}
        customerNumber={customer.customerNumber}
        mobileNumber={customer.mobileNumber}
        customerSchemeId={activeScheme?.id}
        installmentId={nextPendingInstallment?.id}
        schemeTitle={activeScheme ? 'Gold Savings Scheme' : undefined}
        defaultAmount={nextPendingInstallment?.expectedAmount || activeScheme?.monthlyAmount}
        paidCount={activeScheme?.paidInstallmentsCount}
        totalInstallments={activeScheme?.totalInstallments}
        onSuccess={fetchCustomerDetails}
      />

      <EditCustomerModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        customerId={customer.id}
        customerData={{
          name: customer.fullName,
          mobile: customer.mobileNumber,
          address: customer.address || '',
          nomineeName: customer.nomineeName || '',
          relationship: customer.nomineeRelationship || 'Spouse',
          status: customer.status,
        }}
        onSave={fetchCustomerDetails}
      />

      {activeScheme && (
        <CompleteRedemptionModal
          isOpen={isRedemptionOpen}
          onClose={() => setIsRedemptionOpen(false)}
          customerSchemeId={activeScheme.id}
          customerName={customer.fullName}
          customerNumber={customer.customerNumber}
          schemeTitle="Gold Savings Scheme"
          totalPaidAmount={activeScheme.totalAmountPaid}
          monthlyAmount={activeScheme.monthlyAmount}
          onSuccess={fetchCustomerDetails}
        />
      )}

      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
        <Link href="/customers" className="hover:text-blue-600">Customers</Link>
        <span>/</span>
        <span className="text-slate-900 font-bold">{customer.fullName}</span>
      </div>

      {/* Top Header Row: 2 Cards Side-by-Side */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Card 1: Customer Profile Card (5 cols) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-xl shadow-md ring-4 ring-blue-50 shrink-0">
              {getInitials(customer.fullName)}
            </div>
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-slate-900 truncate">{customer.fullName}</h2>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 shrink-0 ${
                  customer.status === 'ACTIVE'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${customer.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                  {customer.status}
                </span>
              </div>
              <p className="text-xs font-mono text-slate-500 font-bold">Customer ID: {customer.customerNumber}</p>
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-3 text-slate-600">
              <Phone className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="font-semibold text-slate-900">{customer.mobileNumber}</span>
            </div>
            <div className="flex items-center gap-3 text-slate-600">
              <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
              <span>{customer.address || customer.city || 'Address Not Specified'}</span>
            </div>
            <div className="flex items-center gap-3 text-slate-600">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <span>Registered On: <strong className="text-slate-900">{new Date(customer.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</strong></span>
            </div>
          </div>
        </div>

        {/* Card 2: Scheme Progress Card (7 cols) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-bold text-lg text-slate-900">
                {activeScheme ? 'Gold Savings Scheme' : 'No Enrolled Scheme'}
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                {activeScheme ? `Account No: ${activeScheme.schemeAccountNumber}` : 'Customer has not enrolled in a scheme yet.'}
              </p>
            </div>
            {activeScheme && (
              <div className="text-right">
                <h2 className="text-2xl font-extrabold text-blue-600">₹{totalTargetValue.toLocaleString('en-IN')}</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">SCHEME TARGET VALUE</p>
              </div>
            )}
          </div>

          {activeScheme ? (
            <>
              {/* Progress Bar & Month Count */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-700">{activeScheme.paidInstallmentsCount} of {activeScheme.totalInstallments} Months Completed</span>
                  <span className="text-blue-600 font-extrabold">{progressPercent}%</span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 font-medium pt-1">
                  <span>Start: {activeScheme.startDate}</span>
                  <span>Maturity: {activeScheme.maturityDate || '12 Months'}</span>
                </div>
              </div>

              {/* 4 Stat Box Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Paid Amount</span>
                  <p className="text-base font-bold text-slate-900 mt-0.5">₹{activeScheme.totalAmountPaid.toLocaleString('en-IN')}</p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Remaining</span>
                  <p className="text-base font-bold text-slate-900 mt-0.5">₹{(totalTargetValue - activeScheme.totalAmountPaid).toLocaleString('en-IN')}</p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Monthly Pay</span>
                  <p className="text-base font-bold text-slate-900 mt-0.5">₹{activeScheme.monthlyAmount.toLocaleString('en-IN')}</p>
                </div>
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-center">
                  <span className="text-[10px] font-bold text-blue-600 uppercase">Status</span>
                  <p className="text-base font-bold text-blue-700 mt-0.5 uppercase">{activeScheme.status}</p>
                </div>
              </div>
            </>
          ) : (
            <div className="p-6 bg-slate-50 rounded-xl text-center space-y-3">
              <Award className="w-8 h-8 text-slate-300 mx-auto" />
              <div>
                <p className="text-xs text-slate-700 font-bold">No Enrolled Scheme</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Customer has not enrolled in a scheme yet.</p>
              </div>
              <button
                onClick={() => setIsEnrollModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Enroll in Scheme Plan</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Quick Action Button Bar */}
      <div className="flex flex-wrap items-center gap-3">
        {activeScheme ? (
          <>
            <button
              onClick={() => setIsInstallmentOpen(true)}
              disabled={!nextPendingInstallment}
              className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <CreditCard className="w-4 h-4" />
              <span>{nextPendingInstallment ? 'Record Installment' : 'All Installments Completed'}</span>
            </button>

            <button
              onClick={() => setIsEditModalOpen(true)}
              className="px-5 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-2 shadow-2xs transition-all cursor-pointer"
            >
              <Edit className="w-4 h-4 text-slate-500" />
              <span>Edit Customer</span>
            </button>

            <button className="px-5 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-2 shadow-2xs transition-all cursor-pointer">
              <Printer className="w-4 h-4 text-slate-500" />
              <span>Print Passbook</span>
            </button>

            <button 
              onClick={() => setIsRedemptionOpen(true)}
              disabled={activeScheme.status === 'REDEEMED'}
              className="px-5 py-3 bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-800 font-bold text-xs rounded-xl flex items-center gap-2 shadow-2xs transition-all ml-auto cursor-pointer disabled:opacity-50"
            >
              <Gift className="w-4 h-4 text-amber-600" />
              <span>{activeScheme.status === 'REDEEMED' ? 'Scheme Redeemed' : 'Redeem Scheme'}</span>
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setIsEnrollModalOpen(true)}
              className="px-5 py-3 bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-md shadow-blue-900/20 transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Enroll Customer in Scheme</span>
            </button>

            <button
              onClick={() => setIsEditModalOpen(true)}
              className="px-5 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-2 shadow-2xs transition-all cursor-pointer"
            >
              <Edit className="w-4 h-4 text-slate-500" />
              <span>Edit Customer Profile</span>
            </button>
          </>
        )}
      </div>

      {/* Main Grid: Left Timeline (8 cols) & Right Actions (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Installment Timeline */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="font-bold text-lg text-slate-900">Installment Timeline</h3>
              <span className="text-xs font-semibold text-slate-400">Payment Schedule</span>
            </div>

            {activeScheme ? (
              installments.length > 0 ? (
                <div className="space-y-4 relative pl-6 border-l-2 border-slate-100">
                  {installments.map((inst) => {
                    const isPaid = inst.status === 'PAID';
                    const isNextPending = nextPendingInstallment && inst.id === nextPendingInstallment.id;

                    return (
                      <div key={inst.id} className="relative group">
                        <span className={`w-3 h-3 rounded-full absolute -left-[31px] top-4 ring-4 ring-white ${
                          isPaid ? 'bg-emerald-500' : isNextPending ? 'bg-amber-500' : 'bg-slate-300'
                        }`} />

                        <div className={`p-4 rounded-xl border flex items-center justify-between transition-colors ${
                          isPaid 
                            ? 'bg-slate-50 border-slate-100' 
                            : isNextPending 
                            ? 'bg-amber-50/40 border-amber-200/80' 
                            : 'bg-white border-slate-100'
                        }`}>
                          <div className="space-y-0.5">
                            <p className="font-bold text-slate-900 text-xs">
                              Installment {inst.installmentNumber} of {activeScheme.totalInstallments}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {isPaid 
                                ? `Paid on ${inst.paymentDate ? new Date(inst.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Date N/A'} • ${inst.paymentMethod || 'CASH'}` 
                                : `Due Date: ${inst.dueDate ? new Date(inst.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}`}
                            </p>
                          </div>

                          <div>
                            {isPaid ? (
                              <span className="font-bold text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 inline-block">
                                PAID (₹{inst.paidAmount.toLocaleString('en-IN')})
                              </span>
                            ) : isNextPending ? (
                              <button
                                onClick={() => setIsInstallmentOpen(true)}
                                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition-all shadow-2xs cursor-pointer"
                              >
                                Pay ₹{inst.expectedAmount.toLocaleString('en-IN')}
                              </button>
                            ) : (
                              <span className="font-medium text-xs text-slate-400 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100 inline-block">
                                UPCOMING (₹{inst.expectedAmount.toLocaleString('en-IN')})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 bg-slate-50 rounded-xl text-center space-y-2">
                  <Clock className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs text-slate-700 font-bold">Installments Generating...</p>
                  <p className="text-[11px] text-slate-400">Loading schedule records for this scheme.</p>
                </div>
              )
            ) : (
              <div className="p-8 bg-slate-50 rounded-xl text-center space-y-2">
                <Clock className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-700 font-bold">No Installment Timeline</p>
                <p className="text-[11px] text-slate-400">Enroll this customer in a savings scheme to generate their payment schedule.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Nominee & Status Details */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-base text-slate-900 border-b border-slate-100 pb-3">Nominee Details</h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 text-slate-500">
                <span>Nominee Name</span>
                <span className="font-bold text-slate-900">{customer.nomineeName || 'Not Specified'}</span>
              </div>
              <div className="flex justify-between py-1 text-slate-500">
                <span>Relationship</span>
                <span className="font-bold text-slate-900">{customer.nomineeRelationship || 'Spouse'}</span>
              </div>
              <div className="flex justify-between py-1 text-slate-500">
                <span>Nominee Mobile</span>
                <span className="font-bold text-slate-900">{customer.nomineeMobile || '—'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
