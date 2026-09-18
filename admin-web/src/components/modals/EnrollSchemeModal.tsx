'use client';

/**
 * RAMYAS JEWELLER / AURELIA JEWELERS - Enroll in Scheme Plan Modal
 * Exact implementation of Mockup Image 2 with split card layout, customer selector, scheme summary, and RPC enrollment.
 */

import React, { useState } from 'react';
import {
  Gift,
  CheckCircle2,
  AlertCircle,
  Info,
  Sparkles
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { enrollCustomerScheme } from '@/lib/supabase/rpc';

interface EnrollSchemeModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: {
    id: string;
    customer_code: string;
    full_name: string;
    phone_number: string;
    avatarInitials?: string;
  };
  onSuccess?: (schemeId: string, schemeCode: string) => void;
}

export default function EnrollSchemeModal({
  isOpen,
  onClose,
  customer,
  onSuccess,
}: EnrollSchemeModalProps) {
  const [selectedPlan, setSelectedPlan] = useState('DIWALI-12');
  const [monthlyAmount] = useState(1000);
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    // Call database RPC
    const response = await enrollCustomerScheme({
      p_customer_id: customer.id,
      p_start_month: `${startDate.substring(0, 7)}-01`,
      p_notes: `Enrolled via Web Portal in ${selectedPlan}`,
    });

    setIsSubmitting(false);

    if (response.error) {
      setErrorMessage(response.error);
      return;
    }

    const schemeCode = response.data?.scheme_code || `RJ-SCH-${Math.floor(2023000 + Math.random() * 500)}`;
    setSuccessMessage(`Successfully enrolled in scheme! Account #: ${schemeCode}`);

    if (onSuccess && response.data) {
      onSuccess(response.data.scheme_id, schemeCode);
    }

    setTimeout(() => {
      setSuccessMessage(null);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-2xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden z-10 grid grid-cols-1 md:grid-cols-5 animate-in fade-in zoom-in-95 duration-200">
        {/* Left Dark Blue Branding Column (Col Span 2) */}
        <div className="md:col-span-2 bg-gradient-to-br from-royal-blue-700 to-royal-blue-900 text-white p-7 flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10 space-y-4">
            <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
              <Gift className="w-6 h-6 text-gold-300" />
            </div>

            <div>
              <h2 className="font-heading font-bold text-2xl tracking-tight text-white">
                Enroll in Scheme Plan
              </h2>
              <p className="text-xs text-blue-100/80 mt-2 leading-relaxed">
                Enroll customer into a premium savings scheme to begin building their archival gold portfolio.
              </p>
            </div>
          </div>

          {/* Selected Customer Box at Bottom */}
          <div className="relative z-10 pt-6 mt-6 border-t border-white/15">
            <span className="text-[10px] font-bold tracking-wider uppercase text-blue-200 block mb-2">
              SELECTED CUSTOMER
            </span>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/15 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white text-royal-blue-900 font-heading font-bold text-sm flex items-center justify-center shrink-0">
                {customer.avatarInitials || customer.full_name[0] || 'A'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-heading font-bold text-xs text-white truncate">
                    {customer.full_name}
                  </span>
                  <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-emerald-300 bg-emerald-950/40 px-1.5 py-0.5 rounded-md border border-emerald-400/30">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    Verified
                  </span>
                </div>
                <div className="text-[10px] text-blue-200/80 font-mono mt-0.5">
                  {customer.customer_code} • {customer.phone_number}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right White Form Column (Col Span 3) */}
        <form onSubmit={handleSubmit} className="md:col-span-3 p-7 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            {/* Feedback Alerts */}
            {successMessage && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Scheme Plan Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Select Scheme Plan
              </label>
              <select
                value={selectedPlan}
                onChange={(e) => setSelectedPlan(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs font-semibold text-slate-800 rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-royal-blue-500/20 focus:border-royal-blue-500"
              >
                <option value="DIWALI-12">
                  Diwali Savings Scheme (DIWALI-12) — ₹1000/mo 12 Months
                </option>
              </select>
            </div>

            {/* Scheme Summary Box */}
            <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <Sparkles className="w-4 h-4 text-royal-blue-600" />
                Scheme Summary
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-semibold">
                    MONTHLY DEPOSIT
                  </span>
                  <span className="font-heading font-bold text-slate-900 text-sm">
                    {formatCurrency(monthlyAmount)}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-semibold">
                    TENURE
                  </span>
                  <span className="font-heading font-bold text-slate-900 text-sm">
                    12 Months
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-semibold">
                    BONUS MONTHS
                  </span>
                  <span className="font-bold text-gold-700 text-sm">
                    +1 Month ☆
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-semibold">
                    TOTAL VALUE
                  </span>
                  <span className="font-heading font-bold text-royal-blue-700 text-sm">
                    ₹12,000 (+ ₹1,000 Bonus)
                  </span>
                </div>
              </div>
            </div>

            {/* Monthly Amount & Start Date */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Monthly Amount (₹)
                </label>
                <input
                  type="text"
                  disabled
                  value="₹ 1000"
                  className="w-full px-3.5 py-2 text-xs font-bold text-slate-900 rounded-xl border border-slate-200 bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs font-semibold text-slate-900 rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-royal-blue-500/20 focus:border-royal-blue-500"
                />
              </div>
            </div>

            {/* Info Callout */}
            <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100 flex items-start gap-2 text-xs text-royal-blue-900">
              <Info className="w-4 h-4 text-royal-blue-600 shrink-0 mt-0.5" />
              <span>
                A unique Scheme Account Number will be automatically generated upon successful enrollment.
              </span>
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-royal-blue-600 hover:bg-royal-blue-700 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Enrolling...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Confirm & Enroll Scheme
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
