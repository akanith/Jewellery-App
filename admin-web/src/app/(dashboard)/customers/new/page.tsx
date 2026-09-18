'use client';

/**
 * RAMYAS JEWELLER - Add Customer & Scheme Enrollment Form
 * Matches Mockup Design #2.
 */

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  User,
  ShieldCheck,
  CreditCard,
  FileText,
  Gem,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { createCustomerWithScheme } from '@/lib/supabase/rpc';

interface SuccessEnrollmentData {
  customerId: string;
  customerCode: string;
  schemeCode: string;
}

export default function NewCustomerPage() {

  // Form State
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [altPhone, setAltPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Dindigul');
  const [pincode, setPincode] = useState('624001');
  const [nomineeName, setNomineeName] = useState('');
  const [nomineeRelationship, setNomineeRelationship] = useState('Spouse');
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<SuccessEnrollmentData | null>(null);

  // Scheme Calculations
  const todayDate = new Date();
  const joiningDateFormatted = todayDate.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const lastDayOfMonth = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 0);
  const firstDueDateFormatted = lastDayOfMonth.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const maturityDate = new Date(todayDate.getFullYear() + 1, todayDate.getMonth(), 0);
  const maturityDateFormatted = maturityDate.toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validation
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    if (!fullName.trim()) {
      setErrorMessage('Full name is required.');
      return;
    }

    if (cleanPhone.length !== 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }

    setIsSubmitting(true);

    try {
      const startMonthStr = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-01`;

      const { data, error, rawError } = await createCustomerWithScheme({
        p_full_name: fullName.trim(),
        p_phone_number: cleanPhone,
        p_address: address.trim() || null,
        p_city: city.trim() || 'Dindigul',
        p_pincode: pincode.trim() || null,
        p_alternate_phone: altPhone.replace(/\D/g, '') || null,
        p_nominee_name: nomineeName.trim() || null,
        p_nominee_relationship: nomineeRelationship || null,
        p_notes: notes.trim() || null,
        p_enroll_scheme: true,
        p_start_month: startMonthStr,
      });

      if (error || !data) {
        console.error('Customer registration error:', {
          message: error,
          code: rawError?.code,
          details: rawError?.details,
          hint: rawError?.hint,
        });

        if (error?.toLowerCase().includes('already registered to an administrator')) {
          throw new Error('This mobile number is already registered to an administrator.');
        }
        if (
          error?.toLowerCase().includes('already exists') ||
          error?.toLowerCase().includes('duplicate key') ||
          error?.toLowerCase().includes('uq_customers_phone_number') ||
          error?.toLowerCase().includes('uq_profiles_phone_number')
        ) {
          throw new Error('A customer with this mobile number already exists.');
        }
        if (error?.toLowerCase().includes('unauthorized') || error?.toLowerCase().includes('registered administrators')) {
          throw new Error('Unauthorized: Only registered administrators can create customers.');
        }

        throw new Error(error || 'Failed to register customer.');
      }

      setSuccessData({
        customerId: data.customer_id,
        customerCode: data.customer_code,
        schemeCode: data.scheme_code || 'RJ-SCH-ACTIVE',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to register customer.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (successData) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <div className="luxury-card p-8 sm:p-10 text-center shadow-lg bg-white">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold font-serif-luxury text-slate-900">
            Customer Successfully Enrolled!
          </h2>
          <p className="text-sm text-slate-500 mt-2">
            The customer profile and 12-month savings scheme have been atomically created.
          </p>

          <div className="my-8 p-5 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-3">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Customer Name:</span>
              <span className="font-bold text-slate-900">{fullName}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Customer Code:</span>
              <span className="font-mono font-bold text-blue-600">{successData.customerCode}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Scheme Code:</span>
              <span className="font-mono font-bold text-amber-600">{successData.schemeCode}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Maturity Value:</span>
              <span className="font-bold text-emerald-700">₹13,000 (with ₹1,000 bonus)</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href={`/customers/${successData.customerId}`}
              className="px-6 py-3 rounded-xl royal-button text-xs font-semibold text-center"
            >
              Open Customer Passbook
            </Link>
            <button
              onClick={() => {
                setSuccessData(null);
                setFullName('');
                setPhoneNumber('');
                setAltPhone('');
                setAddress('');
                setNomineeName('');
                setNotes('');
              }}
              className="px-6 py-3 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold text-center"
            >
              Add Another Customer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb Back Link */}
      <div>
        <Link
          href="/customers"
          className="inline-flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-800 hover:gap-3 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Customers</span>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold font-serif-luxury text-slate-900 mt-2">
          Add New Customer
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Register a customer for the 12-Month Jewellery Savings Scheme.
        </p>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <div>{errorMessage}</div>
        </div>
      )}

      {/* Main Two-Column Layout (Form on Left, Sticky Summary on Right) */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT 2 COLUMNS: Form Inputs */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* SECTION 1: Customer Information */}
          <div className="luxury-card p-6 sm:p-7 shadow-xs">
            <div className="flex items-center gap-2.5 pb-4 mb-6 border-b border-slate-100">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                <User className="w-4 h-4" />
              </div>
              <h2 className="font-bold font-serif-luxury text-slate-900 text-base">
                Customer Information
              </h2>
            </div>

            <div className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter customer full name"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition"
                />
              </div>

              {/* Mobile & Alt Mobile */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Mobile Number <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-xs text-slate-400 font-medium">
                      +91
                    </span>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="98765 43210"
                      className="w-full pl-12 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Alt Mobile (Optional)
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-xs text-slate-400 font-medium">
                      +91
                    </span>
                    <input
                      type="tel"
                      maxLength={10}
                      value={altPhone}
                      onChange={(e) => setAltPhone(e.target.value)}
                      placeholder="Alternative number"
                      className="w-full pl-12 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition"
                    />
                  </div>
                </div>
              </div>

              {/* Residential Address */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Residential Address
                </label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street name, house number, area"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition"
                />
              </div>

              {/* City & Pincode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    City / Town
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Coimbatore"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Pincode
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    placeholder="641001"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: Scheme Information (Read-Only Gold Standard Plan) */}
          <div className="luxury-card p-6 sm:p-7 shadow-xs">
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                  <CreditCard className="w-4 h-4" />
                </div>
                <h2 className="font-bold font-serif-luxury text-slate-900 text-base">
                  Savings Scheme Configuration
                </h2>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Scheme Status: Active
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Scheme Name
                </label>
                <input
                  type="text"
                  disabled
                  value="Diwali Savings Scheme"
                  className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Monthly Installment
                </label>
                <input
                  type="text"
                  disabled
                  value="₹1,000.00 / month"
                  className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Total Installments
                </label>
                <input
                  type="text"
                  disabled
                  value="12 Monthly Installments"
                  className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Shop Completion Bonus
                </label>
                <input
                  type="text"
                  disabled
                  value="₹1,000.00 (On 12th payment)"
                  className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold font-mono text-amber-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Joining Date
                </label>
                <input
                  type="text"
                  disabled
                  value={joiningDateFormatted}
                  className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  First Installment Due Date
                </label>
                <input
                  type="text"
                  disabled
                  value={firstDueDateFormatted}
                  className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-medium text-slate-800"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: Additional & Nominee Details */}
          <div className="luxury-card p-6 sm:p-7 shadow-xs">
            <div className="flex items-center gap-2.5 pb-4 mb-6 border-b border-slate-100">
              <div className="p-2 rounded-lg bg-slate-100 text-slate-600">
                <FileText className="w-4 h-4" />
              </div>
              <h2 className="font-bold font-serif-luxury text-slate-900 text-base">
                Nominee & Remarks
              </h2>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Nominee Name
                  </label>
                  <input
                    type="text"
                    value={nomineeName}
                    onChange={(e) => setNomineeName(e.target.value)}
                    placeholder="Full name of nominee"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Relationship
                  </label>
                  <select
                    value={nomineeRelationship}
                    onChange={(e) => setNomineeRelationship(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition"
                  >
                    <option value="Spouse">Spouse</option>
                    <option value="Child">Child (Son / Daughter)</option>
                    <option value="Parent">Parent (Father / Mother)</option>
                    <option value="Sibling">Sibling (Brother / Sister)</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Remarks / Special Notes
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Special instructions, preferences, or referral notes"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition"
                />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT 1 COLUMN: Sticky Registration Summary Sidebar (Mockup #2) */}
        <div className="space-y-6">
          <div className="luxury-card p-6 shadow-sm sticky top-24">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
              <h3 className="font-bold font-serif-luxury text-slate-900 text-base flex items-center gap-2">
                <Gem className="w-4 h-4 text-blue-600" />
                <span>Registration Summary</span>
              </h3>
            </div>

            <div className="space-y-3.5 text-xs text-slate-600">
              <div className="flex justify-between pb-2 border-b border-slate-100">
                <span>Customer:</span>
                <span className="font-bold text-slate-900">{fullName || '—'}</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-slate-100">
                <span>Scheme Plan:</span>
                <span className="font-semibold text-slate-800">12-Month Gold Savings</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-slate-100">
                <span>Monthly Installment:</span>
                <span className="font-mono font-bold text-slate-900">₹1,000</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-slate-100">
                <span>Total Customer Contribution:</span>
                <span className="font-mono font-bold text-slate-900">₹12,000</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-slate-100">
                <span>Shop Completion Bonus:</span>
                <span className="font-mono font-bold text-amber-600">+₹1,000</span>
              </div>
              <div className="flex justify-between pt-1 text-sm font-bold text-slate-900">
                <span>Expected Maturity:</span>
                <span className="text-blue-700">{maturityDateFormatted}</span>
              </div>
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200/60 text-center">
                <div className="text-[11px] text-blue-700 font-semibold uppercase tracking-wider">Total Maturity Value</div>
                <div className="text-xl font-bold font-mono text-blue-900 mt-0.5">₹13,000.00</div>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 rounded-xl royal-button font-bold text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isSubmitting ? (
                  <span>Saving & Enrolling...</span>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Save Customer Profile</span>
                  </>
                )}
              </button>

              <Link
                href="/customers"
                className="block text-center text-xs font-semibold text-slate-500 hover:text-slate-800 py-2 transition"
              >
                Cancel & Return
              </Link>
            </div>

            <div className="mt-5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 flex items-start gap-2 leading-relaxed">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
              <div>
                Saving creates the customer profile, schedules all 12 installment slots, and initializes the completion bonus ledger.
              </div>
            </div>
          </div>
        </div>

      </form>
    </div>
  );
}
