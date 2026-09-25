'use client';

/**
 * RAMYAS JEWELLER - Delete Customer Confirmation Modal
 * Invokes SECURITY DEFINER procedure public.delete_customer_account(p_customer_id uuid).
 * Enforces financial history checks and safe administrative deletion.
 */

import React, { useState } from 'react';
import { X, Trash2, AlertTriangle, AlertCircle, Loader2 } from 'lucide-react';
import { deleteCustomerAccount } from '@/lib/supabase/rpc';

interface DeleteCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: {
    id: string;
    customer_code: string;
    full_name: string;
    phone_number: string;
  };
  onSuccess: (message: string) => void;
}

export default function DeleteCustomerModal({
  isOpen,
  onClose,
  customer,
  onSuccess,
}: DeleteCustomerModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleClose = () => {
    if (isSubmitting) return;
    setErrorMessage(null);
    onClose();
  };

  const handleDeleteCustomer = async () => {
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const res = await deleteCustomerAccount({
        p_customer_id: customer.id,
      });

      if (res.error) {
        setErrorMessage(res.error);
        setIsSubmitting(false);
        return;
      }

      if (!res.data || !res.data.success) {
        setErrorMessage('Failed to delete customer account.');
        setIsSubmitting(false);
        return;
      }

      onSuccess(res.data.message || 'Customer account successfully deleted.');
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred while deleting customer.';
      setErrorMessage(msg);
      setIsSubmitting(false);
    }
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

        <div className="space-y-5">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Delete Customer</h3>
              <p className="text-xs text-rose-600 font-medium mt-0.5">
                This permanently removes the customer account and cannot be undone.
              </p>
            </div>
          </div>

          {/* Customer Summary Box */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs text-slate-600">
            <div className="flex justify-between">
              <span className="text-slate-400">Customer Name:</span>
              <span className="font-semibold text-slate-800">{customer.full_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Customer Code:</span>
              <span className="font-mono font-semibold text-slate-800">{customer.customer_code}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Phone Number:</span>
              <span className="font-semibold text-slate-800">{customer.phone_number}</span>
            </div>
          </div>

          {/* Error Message Alert */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          {/* Safety Notice */}
          <div className="flex items-start gap-2 text-xs text-slate-500 bg-amber-50/60 border border-amber-200/80 p-3 rounded-xl">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              Customers with financial transaction history (payments, redemptions, credited bonuses) cannot be deleted.
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteCustomer}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm transition cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Confirm Delete</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
