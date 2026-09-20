'use client';

/**
 * RAMYAS JEWELLER - Admin Reset Customer Password Modal
 * Invokes SECURITY DEFINER procedure public.admin_reset_customer_password(p_customer_id uuid).
 * Displays a one-time temporary password for the admin to communicate securely to the customer.
 */

import React, { useState } from 'react';
import { X, KeyRound, CheckCircle2, AlertCircle, Loader2, Copy, Check, ShieldAlert } from 'lucide-react';
import { adminResetCustomerPassword } from '@/lib/supabase/rpc';

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: {
    id: string;
    customer_code: string;
    full_name: string;
    phone_number: string;
  };
  onSuccess: () => void;
}

export default function ResetPasswordModal({
  isOpen,
  onClose,
  customer,
  onSuccess,
}: ResetPasswordModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    if (isSubmitting) return;
    setTemporaryPassword(null);
    setErrorMessage(null);
    setCopied(false);
    onClose();
  };

  const handleDone = () => {
    setTemporaryPassword(null);
    setErrorMessage(null);
    setCopied(false);
    onSuccess();
    onClose();
  };

  const handleResetPassword = async () => {
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const res = await adminResetCustomerPassword({
        p_customer_id: customer.id,
      });

      if (res.error || !res.data || !res.data.success) {
        setErrorMessage('Unable to reset the customer\'s password. Please try again.');
        return;
      }

      setTemporaryPassword(res.data.temporary_password);
    } catch {
      setErrorMessage('Unable to reset the customer\'s password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyPassword = () => {
    if (!temporaryPassword) return;
    navigator.clipboard.writeText(temporaryPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 relative">
        {/* Close Button */}
        <button
          onClick={handleClose}
          disabled={isSubmitting}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition disabled:opacity-50 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* ========================================================================= */}
        {/* SUCCESS PHASE: One-time temporary password display                         */}
        {/* ========================================================================= */}
        {temporaryPassword ? (
          <div className="space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/60">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold font-serif-luxury text-slate-900 text-lg">
                  Password Reset Successful
                </h3>
                <p className="text-xs text-slate-500">
                  Temporary password generated successfully
                </p>
              </div>
            </div>

            {/* Customer Details Summary */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Customer Name:</span>
                <span className="font-bold text-slate-900">{customer.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Customer ID:</span>
                <span className="font-mono font-bold text-blue-600">{customer.customer_code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Mobile Number:</span>
                <span className="font-mono font-bold text-slate-900">+91 {customer.phone_number}</span>
              </div>
            </div>

            {/* Temporary Password Display Box */}
            <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 text-center space-y-2">
              <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
                Temporary Password
              </span>
              <div className="flex items-center justify-center gap-3">
                <span className="text-3xl font-mono font-bold tracking-widest text-slate-900 bg-white px-4 py-1.5 rounded-lg border border-amber-300 shadow-xs">
                  {temporaryPassword}
                </span>
                <button
                  onClick={handleCopyPassword}
                  className="p-2.5 rounded-lg bg-white border border-amber-300 text-amber-800 hover:bg-amber-100 transition shadow-xs flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                  title="Copy Temporary Password"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span className="text-emerald-700">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-amber-700" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Security Warning */}
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-[11px] text-blue-900 flex items-start gap-2.5 leading-relaxed">
              <ShieldAlert className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                Share this temporary password securely with the verified customer. The customer must change it after login.
              </div>
            </div>

            {/* Done Action Button */}
            <div className="pt-2">
              <button
                onClick={handleDone}
                className="w-full py-3 rounded-xl royal-button font-bold text-xs cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* CONFIRMATION PHASE: Admin confirmation dialog                              */
          /* ========================================================================= */
          <div className="space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/60">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold font-serif-luxury text-slate-900 text-lg">
                  Reset Customer Password
                </h3>
                <p className="text-xs text-slate-500">
                  {customer.full_name} ({customer.customer_code})
                </p>
              </div>
            </div>

            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <div>{errorMessage}</div>
              </div>
            )}

            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <p>
                This will reset the customer&apos;s password to a temporary password based on the last 4 digits of their registered mobile number (<span className="font-mono font-bold text-slate-800">+91 {customer.phone_number}</span>).
              </p>
              <p className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700">
                The customer will be required to create a new password when they next log in.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold transition disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetPassword}
                disabled={isSubmitting}
                className="flex-1 py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer shadow-xs"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Resetting...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Reset Password</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
