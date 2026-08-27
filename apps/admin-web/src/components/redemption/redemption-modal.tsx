'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Printer, CheckCircle2, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { RedemptionService, RedemptionCandidate } from '@/features/redemptions';
import { AppError } from '@/lib/errors/app-error';

interface CompleteRedemptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerSchemeId?: string;
  onSuccess?: () => void;
}

export function CompleteRedemptionModal({
  isOpen,
  onClose,
  customerSchemeId,
  onSuccess,
}: CompleteRedemptionModalProps) {
  const [billNumber, setBillNumber] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [category, setCategory] = useState('Gold');
  const [notes, setNotes] = useState('');

  const [details, setDetails] = useState<RedemptionCandidate | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchDetails = useCallback(async () => {
    if (!customerSchemeId) return;

    setIsLoadingDetails(true);
    setErrorMessage(null);

    try {
      const data = await RedemptionService.getCustomerSchemeRedemptionDetails(customerSchemeId);
      setDetails(data);
      setBillAmount(String(data.finalRedeemedValue));
    } catch (err) {
      if (err instanceof AppError) {
        setErrorMessage(err.toUserMessage());
      } else {
        setErrorMessage('Failed to load scheme redemption details.');
      }
    } finally {
      setIsLoadingDetails(false);
    }
  }, [customerSchemeId]);

  useEffect(() => {
    if (isOpen && customerSchemeId) {
      fetchDetails();
    }
  }, [isOpen, customerSchemeId, fetchDetails]);

  if (!isOpen) return null;

  const handleCompleteRedemption = async () => {
    if (isSubmitting || !customerSchemeId) return;

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const fullNotes = `Category: ${category} | Bill: ${billNumber} | Bill Amount: ₹${billAmount}${notes ? ` | Notes: ${notes}` : ''}`;
      await RedemptionService.completeRedemption(customerSchemeId, fullNotes);

      setSuccessMessage('Scheme redemption completed successfully!');
      if (onSuccess) {
        onSuccess();
      }

      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
      }, 1000);
    } catch (err) {
      if (err instanceof AppError) {
        setErrorMessage(err.toUserMessage());
      } else {
        setErrorMessage('Unable to complete redemption. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}` : name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end font-sans">
      {/* Slide-over Drawer Panel */}
      <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-blue-950">Complete Redemption</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Finalize the customer's jewellery savings scheme.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 flex-1">
          {successMessage && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {isLoadingDetails ? (
            <div className="p-12 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
              <p className="text-xs font-bold text-slate-500">Loading scheme details from database...</p>
            </div>
          ) : (
            <>
              {/* Customer Summary Card */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-900 text-white flex items-center justify-center font-bold text-base shadow-sm shrink-0">
                    {getInitials(details?.customerName || 'Customer')}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-extrabold text-sm text-slate-900 truncate">{details?.customerName || 'Customer'}</h3>
                    <p className="text-[11px] text-slate-400 font-mono truncate">
                      ID: {details?.customerNumber || 'N/A'} • {details?.mobileNumber || '—'}
                    </p>
                  </div>
                </div>

                <div className="h-px bg-slate-200/60" />

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">SCHEME</span>
                    <p className="font-bold text-slate-900 mt-0.5">{details?.schemeName || 'Savings Scheme'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">JOINED</span>
                    <p className="font-bold text-slate-900 mt-0.5">{details?.startDate || '—'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">STATUS</span>
                    <p className="mt-0.5">
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-md">
                        {details?.status || 'Active'}
                      </span>
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">ACCOUNT NO</span>
                    <p className="font-bold text-slate-900 mt-0.5 font-mono">{details?.schemeAccountNumber || '—'}</p>
                  </div>
                </div>
              </div>

              {/* Total Eligible Value Card */}
              <div className="p-6 rounded-2xl bg-blue-950 text-white shadow-lg space-y-4 relative overflow-hidden">
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[10px] font-extrabold text-blue-200/80 uppercase tracking-wider">TOTAL PAID AMOUNT</span>
                    <p className="text-xl font-extrabold mt-0.5">₹{(details?.totalPaidAmount ?? 0).toLocaleString('en-IN')}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-wider">SHOP BONUS</span>
                    <p className="text-xl font-extrabold mt-0.5 text-amber-400">₹{(details?.bonusAmount ?? 0).toLocaleString('en-IN')}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-blue-900 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-extrabold text-blue-200/80 uppercase tracking-wider">NET ELIGIBLE VALUE</span>
                    <h1 className="text-3xl font-black tracking-tight mt-0.5 text-amber-400">
                      ₹{(details?.finalRedeemedValue ?? 0).toLocaleString('en-IN')}
                    </h1>
                  </div>
                  <ShieldCheck className="w-8 h-8 text-amber-400 stroke-1" />
                </div>
              </div>

              {/* Purchase Details Form */}
              <div className="space-y-4 pt-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">PURCHASE DETAILS</h4>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Bill Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. INV-8829"
                      value={billNumber}
                      onChange={(e) => setBillNumber(e.target.value)}
                      disabled={isSubmitting}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Bill Amount (₹)
                    </label>
                    <input
                      type="text"
                      value={billAmount}
                      onChange={(e) => setBillAmount(e.target.value)}
                      disabled={isSubmitting}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* Category Pills */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Jewellery Category
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {['Gold', 'Silver', 'Diamond', 'Other'].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategory(cat)}
                        disabled={isSubmitting}
                        className={`py-2 rounded-xl text-xs font-bold transition-all ${
                          category === cat
                            ? 'bg-blue-900 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t border-slate-100 space-y-3 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={isSubmitting}
              className="p-3 bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition-all shadow-2xs disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCompleteRedemption}
              disabled={isSubmitting || isLoadingDetails}
              className="flex-1 py-3 bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-900/20 disabled:opacity-60 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>Complete Redemption</span>
                  <CheckCircle2 className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          <p className="text-[10px] text-center text-slate-400 font-semibold uppercase tracking-widest pt-1">
            AUTHORIZED BY RAMYAS JEWELLER MANAGEMENT SYSTEM
          </p>
        </div>
      </div>
    </div>
  );
}
