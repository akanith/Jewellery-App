'use client';

/**
 * RAMYAS JEWELLER - Enroll in Scheme Plan Modal (Add Another Scheme)
 * Five-Slot Multi-Scheme Architecture Integration:
 * - Displays customer identity
 * - Visualizes 5-slot architecture (occupied, next free slot, and available slots)
 * - Limits open schemes strictly to 5 (enforcing documented lifecycle rules)
 * - Validates scheme start month within +/- 12 months
 * - Invokes secured enroll_customer_scheme RPC without direct client table inserts
 * - Prevents duplicate submissions and displays clear success and error feedback
 */

import React, { useState, useMemo } from 'react';
import {
  X,
  Layers,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Lock,
  PlusCircle,
  FileText,
  UserCheck,
} from 'lucide-react';
import { formatCurrency, formatMonthYear } from '@/lib/formatters';
import { enrollCustomerScheme } from '@/lib/supabase/rpc';

export interface ExistingSchemeItem {
  id: string;
  scheme_code: string;
  slot_number: number | null;
  status: string;
  start_month?: string;
  end_month?: string;
  total_installments?: number;
}

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
  existingSchemes: ExistingSchemeItem[];
  onSuccess?: (schemeId: string, schemeCode: string, slotNumber?: number | null) => void;
}

const OPEN_STATUSES = ['ACTIVE', 'COMPLETED', 'MATURED', 'PARTIALLY_REDEEMED'];

export default function EnrollSchemeModal({
  isOpen,
  onClose,
  customer,
  existingSchemes = [],
  onSuccess,
}: EnrollSchemeModalProps) {
  // Current calendar month YYYY-MM
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [startMonth, setStartMonth] = useState<string>(currentMonthStr);
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 1. Determine Open Schemes & Slot Allocation
  const openSchemes = useMemo(() => {
    return existingSchemes.filter((s) => OPEN_STATUSES.includes(s.status));
  }, [existingSchemes]);

  const openCount = openSchemes.length;
  const isMaxReached = openCount >= 5;

  // Occupied slots set among open schemes
  const occupiedSlotsMap = useMemo(() => {
    const map = new Map<number, ExistingSchemeItem>();
    openSchemes.forEach((s, idx) => {
      const slotNum = typeof s.slot_number === 'number' ? s.slot_number : (s.slot_number ? Number(s.slot_number) : (idx + 1));
      if (slotNum >= 1 && slotNum <= 5) {
        map.set(slotNum, s);
      }
    });
    return map;
  }, [openSchemes]);

  // Lowest available free slot (1..5)
  const nextAvailableSlot = useMemo(() => {
    for (let slot = 1; slot <= 5; slot++) {
      if (!occupiedSlotsMap.has(slot)) {
        return slot;
      }
    }
    return null;
  }, [occupiedSlotsMap]);

  // Calculate End Month: startMonth + 11 months (total 12 calendar months)
  const calculatedEndMonth = useMemo(() => {
    if (!startMonth || !/^\d{4}-\d{2}$/.test(startMonth)) return '';
    const [y, m] = startMonth.split('-').map(Number);
    if (!y || !m) return '';
    const totalM = (y * 12 + (m - 1)) + 11;
    const endY = Math.floor(totalM / 12);
    const endM = (totalM % 12) + 1;
    return `${endY}-${String(endM).padStart(2, '0')}-01`;
  }, [startMonth]);

  // Validate Start Month strictly against DB RPC limits (+/- 12 months)
  const validateStartMonth = (monthStr: string): string | null => {
    if (!monthStr || !/^\d{4}-\d{2}$/.test(monthStr)) {
      return 'Please select a valid start month (YYYY-MM).';
    }
    const [y, m] = monthStr.split('-').map(Number);
    if (m < 1 || m > 12) {
      return 'Invalid calendar month.';
    }
    const selectedDate = new Date(y, m - 1, 1);
    const minDate = new Date(now.getFullYear(), now.getMonth() - 12, 1);
    const maxDate = new Date(now.getFullYear(), now.getMonth() + 12, 1);

    if (selectedDate < minDate || selectedDate > maxDate) {
      return 'Start month must be within 12 months in the past or 12 months in the future.';
    }
    return null;
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (isMaxReached) {
      setErrorMessage(
        'Customer already holds the maximum permitted 5 open schemes. An existing scheme must be redeemed or cancelled before enrolling in a new slot.'
      );
      return;
    }

    const dateErr = validateStartMonth(startMonth);
    if (dateErr) {
      setErrorMessage(dateErr);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const formattedStartMonth = `${startMonth}-01`;

    const response = await enrollCustomerScheme({
      p_customer_id: customer.id,
      p_start_month: formattedStartMonth,
      p_notes: notes.trim() || null,
    });

    setIsSubmitting(false);

    if (response.error) {
      setErrorMessage(response.error);
      return;
    }

    const assignedSlot = response.data?.slot_number ?? nextAvailableSlot;
    const schemeCode = response.data?.scheme_code || 'RJ-SCH-RECORDED';
    const newSchemeId = response.data?.scheme_id || '';

    setSuccessMessage(
      `Scheme enrolled successfully! Account ${schemeCode} allocated to Slot #${assignedSlot}.`
    );

    if (onSuccess && newSchemeId) {
      onSuccess(newSchemeId, schemeCode, assignedSlot);
    }

    setTimeout(() => {
      setSuccessMessage(null);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Dark Translucent Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-2xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Card Shell */}
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200 border border-slate-200">

        {/* HEADER */}
        <div className="p-6 pb-4 border-b border-slate-200/80 bg-white shrink-0 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200/80 shrink-0">
              <PlusCircle className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-serif-luxury font-bold text-xl text-slate-900 tracking-tight">
                {openCount === 0 ? 'ENROLL IN SAVINGS SCHEME' : 'ADD ANOTHER SCHEME'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Enroll customer into the Ramyas Jeweller 12-Month Gold Savings Scheme.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SCROLLABLE BODY */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">

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

          {/* 1. Customer Identity Strip */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                {customer.avatarInitials || (customer.full_name || 'C').slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-slate-900 truncate">
                    {customer.full_name}
                  </h3>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <UserCheck className="w-3 h-3" />
                    Verified
                  </span>
                </div>
                <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2 mt-0.5">
                  <span className="font-mono font-medium">{customer.customer_code}</span>
                  <span>•</span>
                  <span>{customer.phone_number}</span>
                </div>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Open Schemes
              </span>
              <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded-full border inline-block mt-0.5 ${
                isMaxReached
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : 'bg-blue-50 text-blue-700 border-blue-200'
              }`}>
                {openCount} / 5 Slots
              </span>
            </div>
          </div>

          {/* 2. Five-Slot Architecture Capacity & Allocation Grid */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                FIVE-SLOT ARCHITECTURE CAPACITY
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                {isMaxReached ? 'All slots full' : `Next Assigned: Slot #${nextAvailableSlot}`}
              </span>
            </div>

            {/* Visual 5-Slot Badges */}
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((slot) => {
                const occupiedBy = occupiedSlotsMap.get(slot);
                const isNext = !isMaxReached && slot === nextAvailableSlot;

                return (
                  <div
                    key={slot}
                    className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-between min-h-[70px] ${
                      occupiedBy
                        ? 'bg-blue-50/60 border-blue-200 text-blue-900'
                        : isNext
                        ? 'bg-amber-50/80 border-amber-300 text-amber-900 ring-2 ring-amber-400/30'
                        : 'bg-slate-50/60 border-dashed border-slate-200 text-slate-400'
                    }`}
                  >
                    <span className="text-[10px] font-mono font-bold">
                      Slot #{slot}
                    </span>

                    {occupiedBy ? (
                      <div className="space-y-0.5">
                        <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-blue-100 text-blue-800 uppercase block truncate max-w-[80px]">
                          {occupiedBy.status}
                        </span>
                        <span className="text-[8px] font-mono text-slate-500 block truncate max-w-[80px]">
                          {occupiedBy.scheme_code}
                        </span>
                      </div>
                    ) : isNext ? (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500 text-white uppercase shadow-2xs">
                        Next Free
                      </span>
                    ) : (
                      <span className="text-[9px] text-slate-400">
                        Available
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Max Limit Warning Banner */}
            {isMaxReached && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                  Maximum 5 Open Schemes Limit Reached
                </div>
                <div className="text-[11px] text-amber-800 leading-relaxed">
                  Store policy permits a maximum of 5 open scheme enrollments per customer. An existing scheme must be redeemed, completed, or cancelled before a new slot can be allocated.
                </div>
              </div>
            )}
          </div>

          {/* 3. Scheme Plan & Terms Summary */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                SCHEME FINANCIAL TERMS
              </span>
              <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                12-Month Gold Savings
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Monthly Deposit</span>
                <span className="text-sm font-bold font-serif-luxury text-slate-900 mt-0.5 block">
                  ₹ 1,000 / mo
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Tenure</span>
                <span className="text-sm font-bold font-serif-luxury text-slate-900 mt-0.5 block">
                  12 Months
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-200/60">
                <span className="text-[10px] text-amber-800 font-bold uppercase block">Shop Bonus</span>
                <span className="text-sm font-bold font-serif-luxury text-amber-700 mt-0.5 block">
                  + ₹ 1,000
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-200/60">
                <span className="text-[10px] text-blue-800 font-bold uppercase block">Maturity Target</span>
                <span className="text-sm font-bold font-serif-luxury text-blue-950 mt-0.5 block">
                  {formatCurrency(13000)}
                </span>
              </div>
            </div>
          </div>

          {/* 4. Scheme Start Month Selector */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                SCHEME START MONTH
              </label>
              <input
                type="month"
                value={startMonth}
                disabled={isSubmitting || isMaxReached}
                onChange={(e) => setStartMonth(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs font-bold text-slate-900 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 disabled:bg-slate-100 disabled:cursor-not-allowed"
                required
              />
            </div>

            {/* Period Preview Strip */}
            {startMonth && calculatedEndMonth && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs text-slate-600">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Installment #1 Due</span>
                  <span className="font-bold text-slate-900">
                    {formatMonthYear(`${startMonth}-01`)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Matures In</span>
                  <span className="font-bold text-blue-900">
                    {formatMonthYear(calculatedEndMonth)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 5. Optional Admin Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              ENROLLMENT NOTES (OPTIONAL)
            </label>
            <textarea
              rows={2}
              value={notes}
              disabled={isSubmitting || isMaxReached}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Enrolled in-store by customer request; linked to second festival token."
              className="w-full px-3.5 py-2 text-xs text-slate-900 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 disabled:bg-slate-100"
            />
          </div>

          {/* MODAL FOOTER */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting || isMaxReached}
              className="px-5 py-2.5 rounded-xl royal-button font-bold text-xs flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Enrolling Scheme...</span>
                </>
              ) : isMaxReached ? (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Max Schemes Reached (5/5)</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm & Enroll (Slot #{nextAvailableSlot})</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
