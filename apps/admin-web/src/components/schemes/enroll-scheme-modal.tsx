'use client';

import { useState, useEffect } from 'react';
import { Gift, CheckCircle2, AlertCircle, Loader2, Calendar, Info, BarChart2, UserCheck } from 'lucide-react';
import { Customer, SchemePlan } from '@ramyas-jeweller/shared-types';
import { SchemeService } from '@/features/schemes';
import { AppError } from '@/lib/errors/app-error';

interface EnrollSchemeModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer;
  onSuccess: () => void;
}

export function EnrollSchemeModal({
  isOpen,
  onClose,
  customer,
  onSuccess,
}: EnrollSchemeModalProps) {
  const [plans, setPlans] = useState<SchemePlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [monthlyAmount, setMonthlyAmount] = useState<string>('');
  const [totalInstallments, setTotalInstallments] = useState<string>('12');

  const [isLoadingPlans, setIsLoadingPlans] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStartDate(new Date().toISOString().split('T')[0]);
      setErrorMessage(null);
      fetchPlans();
    }
  }, [isOpen]);

  const fetchPlans = async () => {
    setIsLoadingPlans(true);
    try {
      const activePlans = await SchemeService.getSchemePlans({ isActive: true });
      setPlans(activePlans);
      if (activePlans.length > 0) {
        const first = activePlans[0];
        setSelectedPlanId(first.id);
        setMonthlyAmount(String(first.monthlyAmount));
        setTotalInstallments(String(first.totalInstallments));
      }
    } catch (err) {
      if (err instanceof AppError) {
        setErrorMessage(err.toUserMessage());
      } else {
        setErrorMessage('Failed to fetch available scheme plans.');
      }
    } finally {
      setIsLoadingPlans(false);
    }
  };

  const handlePlanChange = (planId: string) => {
    setSelectedPlanId(planId);
    const selected = plans.find((p) => p.id === planId);
    if (selected) {
      setMonthlyAmount(String(selected.monthlyAmount));
      setTotalInstallments(String(selected.totalInstallments));
    }
  };

  if (!isOpen) return null;

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}` : name.slice(0, 1).toUpperCase();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanId || !monthlyAmount || !totalInstallments) {
      setErrorMessage('Please select a scheme plan and verify installment details.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await SchemeService.createCustomerScheme({
        customerId: customer.id,
        schemePlanId: selectedPlanId,
        monthlyAmount: Number(monthlyAmount),
        totalInstallments: Number(totalInstallments),
        startDate: startDate || new Date().toISOString().split('T')[0],
      });

      onSuccess();
      onClose();
    } catch (err) {
      if (err instanceof AppError) {
        setErrorMessage(err.toUserMessage());
      } else {
        setErrorMessage('Failed to enroll customer in scheme.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 font-sans">
      {/* 2-Column Split Modal matching Screenshot */}
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col md:flex-row animate-in fade-in zoom-in-95 duration-200 border border-slate-100">
        
        {/* Left Panel — Vibrant Deep Blue Accent Box */}
        <div className="w-full md:w-5/12 bg-[#1258D3] p-8 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="space-y-6 relative z-10">
            {/* Gift Icon Box */}
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-sm">
              <Gift className="w-6 h-6 text-white" />
            </div>

            {/* Title & Subtitle */}
            <div className="space-y-2">
              <h2 className="text-3xl font-serif font-bold text-white tracking-tight">
                Enroll in Scheme Plan
              </h2>
              <p className="text-xs text-blue-100/90 leading-relaxed font-sans font-normal">
                Enroll customer into a premium savings scheme to begin building their archival gold portfolio.
              </p>
            </div>
          </div>

          {/* Selected Customer Box at bottom of Left Panel */}
          <div className="pt-8 relative z-10 space-y-2">
            <span className="text-[10px] font-bold text-blue-200 uppercase tracking-widest block font-sans">
              SELECTED CUSTOMER
            </span>
            <div className="p-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-white text-blue-900 flex items-center justify-center font-extrabold text-base shadow-xs shrink-0 font-serif">
                {getInitials(customer.fullName)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-extrabold text-sm text-white truncate">{customer.fullName}</h4>
                  <span className="px-2 py-0.5 bg-emerald-400/20 text-emerald-200 border border-emerald-300/30 text-[10px] font-bold rounded-full flex items-center gap-1 shrink-0">
                    <UserCheck className="w-2.5 h-2.5" />
                    Verified
                  </span>
                </div>
                <p className="text-[11px] text-blue-100/80 font-mono mt-0.5 truncate">
                  ID: {customer.customerNumber} • Mobile: {customer.mobileNumber}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel — Form & Details */}
        <div className="w-full md:w-7/12 bg-white p-8 flex flex-col justify-between space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6 flex-1">
            {errorMessage && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700 font-medium">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Select Scheme Plan Dropdown */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span>Select Scheme Plan <span className="text-red-500">*</span></span>
                {isLoadingPlans && <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin" />}
              </label>
              <div className="relative">
                <select
                  value={selectedPlanId}
                  onChange={(e) => handlePlanChange(e.target.value)}
                  disabled={isLoadingPlans || isSubmitting}
                  className="w-full px-4 py-3 bg-slate-50/80 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all outline-hidden appearance-none cursor-pointer disabled:bg-slate-100"
                >
                  {plans.length === 0 ? (
                    <option value="">No active scheme plans available</option>
                  ) : (
                    plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} ({p.code}) — ₹{p.monthlyAmount}/mo
                      </option>
                    ))
                  )}
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Scheme Summary Preview Box */}
            {selectedPlan && (
              <div className="p-5 bg-slate-100/70 border border-slate-200/80 rounded-2xl space-y-4">
                <div className="flex items-center gap-2 text-slate-800 font-extrabold text-xs">
                  <BarChart2 className="w-4 h-4 text-slate-600" />
                  <span>Scheme Summary</span>
                </div>

                <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">MONTHLY DEPOSIT</span>
                    <p className="font-extrabold text-slate-900 text-sm mt-0.5">₹{selectedPlan.monthlyAmount.toLocaleString('en-IN')}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">TENURE</span>
                    <p className="font-extrabold text-slate-900 text-sm mt-0.5">{selectedPlan.totalInstallments} Months</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">BONUS MONTHS</span>
                    <p className="font-extrabold text-amber-700 text-xs mt-0.5 flex items-center gap-1">
                      +{selectedPlan.bonusMonths} Month <span className="text-amber-500">☆</span>
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">TOTAL VALUE</span>
                    <p className="font-black text-blue-800 text-base mt-0.5">
                      ₹{(selectedPlan.monthlyAmount * selectedPlan.totalInstallments).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Form Inputs: Monthly Amount & Start Date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Monthly Amount (₹)</label>
                <input
                  type="number"
                  value={monthlyAmount}
                  onChange={(e) => setMonthlyAmount(e.target.value)}
                  required
                  min="100"
                  disabled={isSubmitting}
                  className="w-full px-4 py-3 bg-slate-50/80 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all outline-hidden"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Start Date</label>
                <div className="relative">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    disabled={isSubmitting}
                    className="w-full px-4 py-3 bg-slate-50/80 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all outline-hidden pr-9"
                  />
                  <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Auto-generated Account Number Info Strip */}
            <div className="p-3.5 bg-blue-50/60 border border-blue-100 rounded-2xl flex items-center gap-3 text-xs text-slate-600">
              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <Info className="w-3.5 h-3.5" />
              </div>
              <span className="text-[11px] leading-tight text-slate-600">
                A unique Scheme Account Number will be automatically generated upon successful enrollment.
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-5 py-2.5 text-slate-600 hover:text-slate-800 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting || plans.length === 0}
                className="px-6 py-3 bg-[#1258D3] hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/20 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Enrolling Customer...</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="w-4 h-4" />
                    <span>Confirm & Enroll Scheme</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
