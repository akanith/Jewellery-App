'use client';

/**
 * RAMYAS JEWELLER - Admin Customer Password Reset Request Inbox
 * Step 9.11E: Connected to live Supabase RPCs.
 * Secure shop-admin verification and reset completion flow.
 */

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  KeyRound,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  Phone,
  UserCheck,
  ShieldAlert,
  ArrowLeft,
  Copy,
  Check,
  Loader2,
  XCircle,
  User
} from 'lucide-react';
import { formatDate, formatTime, formatPhoneNumber } from '@/lib/formatters';
import {
  getPendingCustomerPasswordResetRequests,
  completeCustomerPasswordResetRequest,
  cancelCustomerPasswordResetRequest
} from '@/lib/supabase/rpc';
import { PendingPasswordResetRequest } from '@/types/database';

interface SuccessResetState {
  customerName: string;
  customerCode: string;
  customerMobile: string;
  tempPassword: string;
}

export default function PasswordResetRequestsPage() {
  const [requests, setRequests] = useState<PendingPasswordResetRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Verification & Action States
  const [selectedForVerify, setSelectedForVerify] = useState<PendingPasswordResetRequest | null>(null);
  const [selectedForCancel, setSelectedForCancel] = useState<PendingPasswordResetRequest | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // One-time success dialog state (Wiped when closed)
  const [successData, setSuccessData] = useState<SuccessResetState | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const { data, error } = await getPendingCustomerPasswordResetRequests();
      if (error) {
        throw new Error(error);
      }
      setRequests(data || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch password reset requests.';
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    fetchRequests().then(() => {
      if (!isMounted) return;
    });
    return () => {
      isMounted = false;
    };
  }, [fetchRequests]);

  // Handle Complete Reset
  const handleConfirmReset = async () => {
    if (!selectedForVerify) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const { data, error } = await completeCustomerPasswordResetRequest(selectedForVerify.request_id);

      if (error || !data || !data.success) {
        throw new Error(error || 'Failed to complete password reset.');
      }

      // Store temp password ONLY in state for one-time display dialog
      setSuccessData({
        customerName: selectedForVerify.customer_name,
        customerCode: selectedForVerify.customer_code,
        customerMobile: selectedForVerify.customer_mobile,
        tempPassword: data.temporary_password,
      });

      setSelectedForVerify(null);
      await fetchRequests();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to complete password reset.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Cancel Request
  const handleConfirmCancel = async () => {
    if (!selectedForCancel) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const { error } = await cancelCustomerPasswordResetRequest(selectedForCancel.request_id);

      if (error) {
        throw new Error(error);
      }

      setSuccessBanner(`Password reset request for ${selectedForCancel.customer_name} was cancelled.`);
      setSelectedForCancel(null);
      await fetchRequests();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to cancel password reset request.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyPassword = () => {
    if (successData?.tempPassword) {
      navigator.clipboard.writeText(successData.tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mb-1">
            <Link href="/" className="hover:text-blue-600 transition-colors">
              Home
            </Link>
            <span>&gt;</span>
            <Link href="/customers" className="hover:text-blue-600 transition-colors">
              Customers
            </Link>
            <span>&gt;</span>
            <span className="text-slate-900 font-bold">Password Reset Inbox</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif-luxury text-slate-900 flex items-center gap-3">
            <KeyRound className="w-7 h-7 text-amber-600" />
            <span>Customer Password Reset Inbox</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Review pending password reset requests from customer mobile app. Manual identity verification required before issue.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => fetchRequests()}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs disabled:opacity-50 cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Inbox</span>
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successBanner && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessBanner(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Error Banner */}
      {errorMessage && (
        <div className="luxury-card p-4 bg-rose-50 border-rose-200 text-rose-900 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-sm">Action Error</div>
              <div className="text-xs text-rose-700 mt-0.5">{errorMessage}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => fetchRequests()}
            className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Requests Data Table / Container */}
      <div className="luxury-card overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <div className="text-sm font-medium text-slate-600">
              Fetching pending customer password reset requests...
            </div>
          </div>
        ) : requests.length === 0 ? (
          /* Clean Empty State */
          <div className="py-16 px-6 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-4 border border-slate-200">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 font-serif-luxury">
              No Password Reset Requests
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-sm mt-1.5 mb-6">
              Customers who request a password reset will appear here.
            </p>
            <Link
              href="/customers"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Customers</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm text-slate-700">
              <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider text-[11px] font-semibold border-b border-slate-200/80">
                <tr>
                  <th className="py-3.5 px-5">Customer</th>
                  <th className="py-3.5 px-5">Contact Mobile</th>
                  <th className="py-3.5 px-5">Requested Time</th>
                  <th className="py-3.5 px-5">Status</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map((req) => (
                  <tr key={req.request_id} className="hover:bg-slate-50/70 transition">
                    {/* Customer Name & Code */}
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-800 font-bold text-xs flex items-center justify-center shrink-0">
                          {(req.customer_name || 'C').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <Link
                            href={`/customers/${req.customer_id}`}
                            className="font-bold text-slate-900 hover:text-blue-600 hover:underline"
                          >
                            {req.customer_name}
                          </Link>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {req.customer_code}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Mobile Number */}
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-1.5 font-medium text-slate-900">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formatPhoneNumber(req.customer_mobile)}</span>
                      </div>
                    </td>

                    {/* Requested Time */}
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-1.5 text-xs text-slate-700">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {formatDate(req.requested_at)} at {formatTime(req.requested_at)}
                        </span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-5">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                        {req.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedForVerify(req)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl royal-button text-xs font-bold cursor-pointer"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Verify & Reset Password</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedForCancel(req)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200 hover:border-rose-200 text-xs font-semibold transition cursor-pointer"
                          title="Cancel request"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Cancel</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CONFIRMATION DIALOG 1: Verification & Reset Modal */}
      {selectedForVerify && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="luxury-card max-w-lg w-full p-6 bg-white shadow-2xl space-y-5">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold font-serif-luxury text-slate-900 text-lg">
                  Verify Customer & Reset Password
                </h3>
                <p className="text-xs text-slate-500">
                  Shop-Admin Verification Checkpoint
                </p>
              </div>
            </div>

            {/* Customer Details Box */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Customer Name:</span>
                <span className="font-bold text-slate-900">{selectedForVerify.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Customer Code:</span>
                <span className="font-mono font-bold text-blue-600">{selectedForVerify.customer_code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Registered Mobile:</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatPhoneNumber(selectedForVerify.customer_mobile)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Requested Time:</span>
                <span className="text-slate-700 font-medium">
                  {formatDate(selectedForVerify.requested_at)} at {formatTime(selectedForVerify.requested_at)}
                </span>
              </div>
            </div>

            {/* Verification Warning Notice */}
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-amber-800">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Customer Identity Verification Required</span>
              </div>
              <p className="leading-relaxed text-[11px] text-amber-800/90 pl-5">
                Confirm that you have verified the customer&apos;s identity before resetting their password.
              </p>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedForVerify(null)}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl royal-button text-xs font-bold flex items-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Resetting...</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="w-4 h-4" />
                    <span>Verify & Reset Password</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ONE-TIME SUCCESS DIALOG: Temporary Password Display */}
      {successData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="luxury-card max-w-lg w-full p-6 sm:p-7 bg-white shadow-2xl space-y-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-xl font-bold font-serif-luxury text-slate-900">
                Password Reset Successful
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Temporary password has been generated for customer <span className="font-bold text-slate-800">{successData.customerName}</span>.
              </p>
            </div>

            {/* Temporary Password Highlight Box */}
            <div className="p-5 rounded-2xl bg-slate-900 text-white space-y-2">
              <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                Temporary Login Password
              </div>
              <div className="text-3xl font-mono font-bold tracking-widest text-amber-300">
                {successData.tempPassword}
              </div>
              <div className="text-[10px] text-slate-400">
                (Last 4 digits of registered mobile: {formatPhoneNumber(successData.customerMobile)})
              </div>
            </div>

            {/* Security Protocol Warning */}
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-left text-xs text-amber-900 flex items-start gap-2.5 leading-relaxed">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                Share this temporary password securely with the verified customer. They must create a new password after logging in.
              </div>
            </div>

            {/* Actions: Copy & Done */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={handleCopyPassword}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-700">Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-600" />
                    <span>Copy Temporary Password</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setSuccessData(null)}
                className="flex-1 py-3 px-4 rounded-xl royal-button font-bold text-xs flex items-center justify-center transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION DIALOG 3: Cancel Request Modal */}
      {selectedForCancel && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="luxury-card max-w-md w-full p-6 bg-white shadow-2xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold font-serif-luxury text-slate-900 text-base">
                  Cancel Password Reset Request?
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedForCancel.customer_name} ({selectedForCancel.customer_code})
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to cancel this password reset request? The request will be removed from the pending inbox and audited in database history.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedForCancel(null)}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold transition"
              >
                No, Keep Request
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Cancelling...</span>
                  </>
                ) : (
                  <span>Confirm Cancellation</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
