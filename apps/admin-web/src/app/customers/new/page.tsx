'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  User, 
  Camera, 
  CreditCard, 
  Info, 
  Save, 
  Diamond,
  FileText,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { CustomerService } from '@/features/customers';
import { SchemeService } from '@/features/schemes';
import { SchemePlan } from '@ramyas-jeweller/shared-types';
import { AppError } from '@/lib/errors/app-error';

export default function AddNewCustomerPage() {
  const router = useRouter();
  const [schemePlans, setSchemePlans] = useState<SchemePlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');

  const [formData, setFormData] = useState({
    fullName: '',
    mobile: '',
    altMobile: '',
    gender: 'Female',
    dob: '',
    address: '',
    locality: '',
    pincode: '',
    aadhaar: '',
    schemeName: 'Diwali Savings Scheme',
    monthlyInstallment: '1000',
    totalInstallments: '12',
    shopBonus: '1000',
    joiningDate: '2026-08-25',
    firstDueDate: '2026-09-25',
    nomineeName: '',
    relationship: 'Spouse',
    nomineeMobile: '',
    remarks: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadPlans() {
      try {
        const plans = await SchemeService.getSchemePlans({ isActive: true });
        setSchemePlans(plans);
        if (plans.length > 0) {
          setSelectedPlanId(plans[0].id);
          setFormData((prev) => ({
            ...prev,
            schemeName: plans[0].title,
            monthlyInstallment: String(plans[0].monthlyAmount),
            totalInstallments: String(plans[0].totalInstallments),
          }));
        }
      } catch (err) {
        // Fallback default
      }
    }
    loadPlans();
  }, []);

  const handlePlanSelect = (planId: string) => {
    setSelectedPlanId(planId);
    const selected = schemePlans.find((p) => p.id === planId);
    if (selected) {
      setFormData((prev) => ({
        ...prev,
        schemeName: selected.title,
        monthlyInstallment: String(selected.monthlyAmount),
        totalInstallments: String(selected.totalInstallments),
      }));
    }
  };

  const handleSubmit = async (recordFirstPayment: boolean = false) => {
    if (isSubmitting) return;

    setErrorMessage(null);

    if (!formData.fullName.trim()) {
      setErrorMessage('Full Name is required.');
      return;
    }

    const cleanedMobile = formData.mobile.trim().replace(/\D/g, '');
    if (!cleanedMobile || !/^[6-9]\d{9}$/.test(cleanedMobile)) {
      setErrorMessage('A valid 10-digit mobile number starting with 6, 7, 8, or 9 is required.');
      return;
    }

    setIsSubmitting(true);

    try {
      const createdCustomer = await CustomerService.createCustomer({
        fullName: formData.fullName,
        mobileNumber: cleanedMobile,
        address: formData.address,
        city: formData.locality,
        pincode: formData.pincode,
        nomineeName: formData.nomineeName,
        nomineeRelationship: formData.relationship,
        nomineeMobile: formData.nomineeMobile,
        monthlyAmount: Number(formData.monthlyInstallment) || 1000,
        status: 'ACTIVE',
      });

      if (recordFirstPayment) {
        router.push(`/customers/${createdCustomer.id}`);
      } else {
        router.push('/customers');
      }
    } catch (err) {
      if (err instanceof AppError) {
        setErrorMessage(err.toUserMessage());
      } else {
        setErrorMessage('Failed to create customer record and scheme enrollment in database.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-16 max-w-6xl mx-auto font-sans">
      {/* Back Link */}
      <Link
        href="/customers"
        className="inline-flex items-center gap-2 text-xs font-bold text-blue-600 hover:underline"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Customers</span>
      </Link>

      {/* Page Heading */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Add New Customer</h1>
        <p className="text-xs text-slate-500 mt-1">
          Register a customer for the Jewellery Savings Scheme.
        </p>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs font-bold flex items-center gap-3 shadow-xs">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 2-Column Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Form Column (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Card 1: Customer Information */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <User className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-slate-900">Customer Information</h3>
            </div>

            <div className="space-y-4">
              {/* Photo Upload + Name & Mobile */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
                <div className="sm:col-span-4 flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer text-slate-400 hover:text-slate-600 min-h-[120px]">
                  <Camera className="w-8 h-8 mb-1 stroke-1" />
                  <span className="text-xs font-semibold">Photo</span>
                </div>

                <div className="sm:col-span-8 space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      FULL NAME*
                    </label>
                    <input
                      type="text"
                      placeholder="Enter customer full name"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      disabled={isSubmitting}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-50"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                        MOBILE NUMBER*
                      </label>
                      <input
                        type="text"
                        placeholder="10-digit mobile number"
                        value={formData.mobile}
                        onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                        disabled={isSubmitting}
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-50"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                        ALT MOBILE
                      </label>
                      <input
                        type="text"
                        placeholder="Alternative number"
                        value={formData.altMobile}
                        onChange={(e) => setFormData({ ...formData, altMobile: e.target.value })}
                        disabled={isSubmitting}
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-50"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Gender & Date of Birth */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    GENDER
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    disabled={isSubmitting}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-50"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    DATE OF BIRTH
                  </label>
                  <input
                    type="date"
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    disabled={isSubmitting}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  ADDRESS
                </label>
                <textarea
                  rows={2}
                  placeholder="Full residential address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  disabled={isSubmitting}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-50"
                />
              </div>

              {/* Village/Town & Pincode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    VILLAGE/TOWN
                  </label>
                  <input
                    type="text"
                    placeholder="Enter locality / city"
                    value={formData.locality}
                    onChange={(e) => setFormData({ ...formData, locality: e.target.value })}
                    disabled={isSubmitting}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    PINCODE
                  </label>
                  <input
                    type="text"
                    placeholder="6-digit pincode"
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    disabled={isSubmitting}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-50"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Scheme Information */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <CreditCard className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-slate-900">Scheme Information</h3>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    SCHEME NAME
                  </label>
                  <select
                    value={selectedPlanId}
                    onChange={(e) => handlePlanSelect(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-50"
                  >
                    {schemePlans.length > 0 ? (
                      schemePlans.map((plan) => (
                        <option key={plan.id} value={plan.id}>
                          {plan.title} ({plan.code})
                        </option>
                      ))
                    ) : (
                      <option value="">Diwali Savings Scheme</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    MONTHLY INSTALLMENT (₹)
                  </label>
                  <input
                    type="text"
                    value={formData.monthlyInstallment}
                    onChange={(e) => setFormData({ ...formData, monthlyInstallment: e.target.value })}
                    disabled={isSubmitting}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Status Pill */}
              <div className="p-3 bg-emerald-50 border border-emerald-200/60 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                <span>Scheme Status: Active</span>
              </div>
            </div>
          </div>

          {/* Card 3: Additional Details */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-slate-900">Additional Details</h3>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    NOMINEE NAME
                  </label>
                  <input
                    type="text"
                    placeholder="Full name of nominee"
                    value={formData.nomineeName}
                    onChange={(e) => setFormData({ ...formData, nomineeName: e.target.value })}
                    disabled={isSubmitting}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    RELATIONSHIP
                  </label>
                  <select
                    value={formData.relationship}
                    onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                    disabled={isSubmitting}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-50"
                  >
                    <option value="Spouse">Spouse</option>
                    <option value="Parent">Parent</option>
                    <option value="Child">Child</option>
                    <option value="Sibling">Sibling</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  NOMINEE MOBILE
                </label>
                <input
                  type="text"
                  placeholder="+91 00000 00000"
                  value={formData.nomineeMobile}
                  onChange={(e) => setFormData({ ...formData, nomineeMobile: e.target.value })}
                  disabled={isSubmitting}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-50"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Registration Summary Column (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden sticky top-24 space-y-6">
            {/* Top Dark Royal Blue Header Box */}
            <div className="p-4 bg-blue-950 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm tracking-wide">Registration Summary</h3>
              <Diamond className="w-5 h-5 text-amber-400" />
            </div>

            <div className="p-6 pt-0 space-y-6">
              {/* Summary Details */}
              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1 text-slate-500">
                  <span>Customer</span>
                  <span className="font-bold text-slate-900">{formData.fullName || '—'}</span>
                </div>
                <div className="flex justify-between py-1 text-slate-500">
                  <span>Scheme</span>
                  <span className="font-bold text-slate-900 text-right">{formData.schemeName}</span>
                </div>

                <div className="h-px bg-slate-100" />

                <div className="flex justify-between py-1 text-slate-500">
                  <span>Installment</span>
                  <span className="font-bold text-slate-900">₹{formData.monthlyInstallment}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleSubmit(true)}
                  disabled={isSubmitting}
                  className="w-full py-3 bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-900/20 disabled:opacity-65 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Enrolling Customer...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save & Record First Pay</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleSubmit(false)}
                  disabled={isSubmitting}
                  className="w-full py-3 bg-white border border-blue-900 text-blue-900 font-bold text-xs rounded-xl hover:bg-blue-50 transition-all shadow-2xs disabled:opacity-65 cursor-pointer"
                >
                  Save Customer & Enroll Scheme
                </button>

                <div className="text-center">
                  <Link href="/customers" className="text-xs text-slate-500 hover:text-slate-900 font-medium">
                    Cancel & Return
                  </Link>
                </div>
              </div>

              {/* Callout Box */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3 text-slate-600 text-xs">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed text-[11px]">
                  Scheme Account Number (RJ-SCH-xxxxxxx) is generated automatically by PostgreSQL sequence.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
