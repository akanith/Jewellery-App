'use client';

/**
 * RAMYAS JEWELLER - Admin Family Access & Linked Profiles Card
 * Allows administrators to inspect active family links and explicitly link or
 * unlink existing customer profiles sharing the same normalized mobile number
 * without merging accounts, schemes, installments, payments, or passwords.
 */

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Users,
  Link2,
  Unlink,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Phone,
  RefreshCw,
  X,
  ArrowRightLeft,
} from 'lucide-react';
import {
  getCustomerFamilyContext,
  linkCustomerFamilyProfiles,
  unlinkCustomerFamilyProfiles,
} from '@/lib/supabase/rpc';
import type {
  CustomerFamilyCandidate,
  CustomerFamilyLinkedMember,
} from '@/types/database';
import { formatDate, formatPhoneNumber } from '@/lib/formatters';

interface FamilyAccessCardProps {
  customer: {
    id: string;
    customer_code: string;
    full_name: string;
    phone_number: string;
  };
  refreshKey?: number;
}

const RELATIONSHIP_OPTIONS = [
  { value: 'FAMILY_MEMBER', label: 'Family Member' },
  { value: 'SPOUSE', label: 'Spouse' },
  { value: 'PARENT', label: 'Parent' },
  { value: 'CHILD', label: 'Child' },
  { value: 'SIBLING', label: 'Sibling' },
  { value: 'OTHER', label: 'Other' },
];

export default function FamilyAccessCard({
  customer,
  refreshKey = 0,
}: FamilyAccessCardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [normalizedPhone, setNormalizedPhone] = useState<string>('');
  const [linkedMembers, setLinkedMembers] = useState<CustomerFamilyLinkedMember[]>([]);
  const [candidates, setCandidates] = useState<CustomerFamilyCandidate[]>([]);

  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Explicit Link Modal State
  const [linkTarget, setLinkTarget] = useState<CustomerFamilyCandidate | null>(null);
  const [relationship, setRelationship] = useState<string>('FAMILY_MEMBER');
  const [linkNotes, setLinkNotes] = useState<string>('');
  const [consentConfirmed, setConsentConfirmed] = useState<boolean>(false);
  const [isLinking, setIsLinking] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Explicit Unlink Confirmation State
  const [unlinkTarget, setUnlinkTarget] = useState<CustomerFamilyLinkedMember | null>(null);
  const [isUnlinking, setIsUnlinking] = useState<boolean>(false);

  const loadFamilyContext = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    const res = await getCustomerFamilyContext(customer.id);
    if (res.error || !res.data) {
      setLoadError(res.error || 'Failed to load family access records.');
      setIsLoading(false);
      return;
    }

    setNormalizedPhone(res.data.normalized_phone || customer.phone_number);
    setLinkedMembers(Array.isArray(res.data.linked_members) ? res.data.linked_members : []);
    setCandidates(
      Array.isArray(res.data.shared_phone_candidates)
        ? res.data.shared_phone_candidates
        : []
    );
    setIsLoading(false);
  }, [customer.id, customer.phone_number]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadFamilyContext();
  }, [loadFamilyContext, refreshKey]);

  const openLinkModal = (candidate: CustomerFamilyCandidate) => {
    setLinkTarget(candidate);
    setRelationship('FAMILY_MEMBER');
    setLinkNotes('');
    setConsentConfirmed(false);
    setModalError(null);
    setActionError(null);
    setActionSuccess(null);
  };

  const closeLinkModal = () => {
    if (isLinking) return;
    setLinkTarget(null);
    setModalError(null);
    setConsentConfirmed(false);
  };

  const handleConfirmLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkTarget || !consentConfirmed) return;

    setIsLinking(true);
    setModalError(null);
    setActionError(null);
    setActionSuccess(null);

    const res = await linkCustomerFamilyProfiles({
      p_customer_id_1: customer.id,
      p_customer_id_2: linkTarget.customer_id,
      p_relationship: relationship,
      p_notes: linkNotes.trim() || null,
      p_consent_confirmed: true,
    });

    if (res.error || !res.data?.success) {
      setModalError(res.error || res.data?.message || 'Unable to link customer profiles.');
      setIsLinking(false);
      return;
    }

    const linkedName = linkTarget.full_name;
    const linkedCode = linkTarget.customer_code;
    setIsLinking(false);
    setLinkTarget(null);
    setConsentConfirmed(false);
    setActionSuccess(
      `Linked ${customer.full_name} (${customer.customer_code}) with ${linkedName} (${linkedCode}) as ${relationship}. Both profiles and schemes remain independent.`
    );
    await loadFamilyContext();
  };

  const handleConfirmUnlink = async () => {
    if (!unlinkTarget) return;

    setIsUnlinking(true);
    setActionError(null);
    setActionSuccess(null);

    const res = await unlinkCustomerFamilyProfiles({
      p_customer_id_1: customer.id,
      p_customer_id_2: unlinkTarget.customer_id,
    });

    if (res.error || !res.data?.success) {
      setActionError(res.error || res.data?.message || 'Unable to remove family link.');
      setIsUnlinking(false);
      return;
    }

    const unlinkedName = unlinkTarget.full_name;
    const unlinkedCode = unlinkTarget.customer_code;
    setIsUnlinking(false);
    setUnlinkTarget(null);
    setActionSuccess(
      `Unlinked ${unlinkedName} (${unlinkedCode}). Shared customer-app profile switching is disabled; both customer profiles and schemes remain intact.`
    );
    await loadFamilyContext();
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-heading font-bold text-lg text-slate-900">
                Family Access &amp; Linked Profiles
              </h3>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                {linkedMembers.length} Linked
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Explicitly authorize existing family members sharing a verified mobile number to switch profiles in the Customer App without merging customer records.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => loadFamilyContext()}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition self-start sm:self-auto cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Feedback Banners */}
      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>{actionSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionSuccess(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {actionError && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{actionError}</span>
        </div>
      )}

      {loadError ? (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{loadError}</span>
          </div>
          <button
            type="button"
            onClick={() => loadFamilyContext()}
            className="px-3 py-1 rounded-lg bg-rose-600 text-white font-semibold hover:bg-rose-700 cursor-pointer"
          >
            Retry
          </button>
        </div>
      ) : isLoading ? (
        <div className="py-8 flex items-center justify-center gap-2 text-xs text-slate-500">
          <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
          <span>Loading family authorizations and matching mobile profiles...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Column 1: Currently Linked Family Members */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Authorized Family Links ({linkedMembers.length})
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                <ShieldCheck className="w-3.5 h-3.5" />
                Explicit Authorization Only
              </span>
            </div>

            {linkedMembers.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-xs text-slate-500">
                No family members are currently linked to this customer. Even if another customer shares the same mobile number, accounts remain strictly isolated until you link them manually.
              </div>
            ) : (
              <div className="space-y-2.5">
                {linkedMembers.map((member) => (
                  <div
                    key={member.customer_id}
                    className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-200/80 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/customers/${member.customer_id}`}
                            className="font-bold text-sm text-blue-800 hover:underline truncate"
                          >
                            {member.full_name}
                          </Link>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                            {member.customer_code}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                            {member.relationship_type}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-600">
                          <span className="inline-flex items-center gap-1 font-mono">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {formatPhoneNumber(member.phone_number)}
                          </span>
                          {!member.shares_current_phone && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                              Different Mobile Now • Link Preserved
                            </span>
                          )}
                          <span className="text-slate-400">•</span>
                          <span>Linked {formatDate(member.linked_at)}</span>
                        </div>
                        {member.notes && (
                          <p className="text-[11px] text-slate-500 mt-1">{member.notes}</p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setUnlinkTarget(member);
                          setActionError(null);
                          setActionSuccess(null);
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-rose-200 text-[11px] font-semibold text-rose-700 hover:bg-rose-50 transition shrink-0 cursor-pointer"
                      >
                        <Unlink className="w-3.5 h-3.5" />
                        <span>Unlink</span>
                      </button>
                    </div>

                    {unlinkTarget?.customer_id === member.customer_id && (
                      <div className="p-3 rounded-lg bg-white border border-rose-200 text-xs space-y-2">
                        <div className="font-semibold text-rose-900">
                          Remove family authorization between {customer.full_name} and {member.full_name}?
                        </div>
                        <p className="text-[11px] text-slate-600">
                          Both customer IDs, savings schemes, installments, payments, and passwords stay untouched. Shared profile switching in the Customer App will stop immediately.
                        </p>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setUnlinkTarget(null)}
                            disabled={isUnlinking}
                            className="px-3 py-1 rounded-lg border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleConfirmUnlink}
                            disabled={isUnlinking}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-600 text-white font-semibold hover:bg-rose-700 cursor-pointer disabled:opacity-50"
                          >
                            {isUnlinking && <Loader2 className="w-3 h-3 animate-spin" />}
                            <span>Confirm Unlink</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Column 2: Unlinked Customers Sharing the Same Normalized Mobile Number */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Other Customers on {formatPhoneNumber(normalizedPhone || customer.phone_number)} ({candidates.length})
              </span>
            </div>

            {candidates.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-xs text-slate-500 space-y-1">
                <div>
                  No other unlinked active customers currently share mobile number{' '}
                  <span className="font-mono font-semibold text-slate-700">
                    {formatPhoneNumber(normalizedPhone || customer.phone_number)}
                  </span>.
                </div>
                <div className="text-[11px] text-slate-400">
                  To link a family member whose previous mobile number differed, first update their mobile number via Edit Profile to match this number, then click Refresh here.
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                {candidates.map((cand) => (
                  <div
                    key={cand.customer_id}
                    className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/customers/${cand.customer_id}`}
                          className="font-bold text-sm text-slate-900 hover:text-blue-700 hover:underline truncate"
                        >
                          {cand.full_name}
                        </Link>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white border border-amber-200 text-amber-900">
                          {cand.customer_code}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-600">
                        <span className="font-mono">{formatPhoneNumber(cand.phone_number)}</span>
                        <span>•</span>
                        <span>{cand.city || 'Dindigul'}</span>
                        <span>•</span>
                        <span className="text-amber-800 font-medium">Not linked (Isolated)</span>
                      </div>
                      {cand.has_conflicting_cross_phone_link && (
                        <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200">
                          <AlertCircle className="w-3 h-3" />
                          Currently linked to another profile with a different mobile number
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => openLinkModal(cand)}
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl royal-button text-xs font-semibold shrink-0 cursor-pointer"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                      <span>Link Family Member</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Explicit Link Confirmation Modal */}
      {linkTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-2xs" onClick={closeLinkModal} />
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 sm:p-7 z-10 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Link2 className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-bold font-serif-luxury text-slate-900">
                  Link Existing Family Profiles
                </h3>
              </div>
              <button
                type="button"
                onClick={closeLinkModal}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{modalError}</span>
              </div>
            )}

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs">
              <div className="min-w-0">
                <div className="font-bold text-slate-900 truncate">{customer.full_name}</div>
                <div className="font-mono text-[11px] text-blue-700">{customer.customer_code}</div>
              </div>
              <ArrowRightLeft className="w-4 h-4 text-amber-600 shrink-0" />
              <div className="min-w-0 text-right">
                <div className="font-bold text-slate-900 truncate">{linkTarget.full_name}</div>
                <div className="font-mono text-[11px] text-blue-700">{linkTarget.customer_code}</div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 text-[11px] text-blue-900 leading-relaxed">
              <span className="font-bold">No Account Merge:</span> Both customer IDs, savings schemes, installment history, payment records, and passwords stay completely separate. Only bidirectional profile switching in the Customer App will be enabled for shared mobile{' '}
              <span className="font-mono font-bold">
                {formatPhoneNumber(normalizedPhone || customer.phone_number)}
              </span>.
            </div>

            <form onSubmit={handleConfirmLink} className="space-y-4 text-xs">
              <div>
                <label htmlFor="family-relationship-select" className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Family Relationship
                </label>
                <select
                  id="family-relationship-select"
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold"
                >
                  {RELATIONSHIP_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Verification Notes (Optional)
                </label>
                <input
                  type="text"
                  value={linkNotes}
                  onChange={(e) => setLinkNotes(e.target.value)}
                  placeholder="e.g., Verified family request after mobile number update"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                />
              </div>

              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/80 border border-amber-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentConfirmed}
                  onChange={(e) => setConsentConfirmed(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded border-amber-300 text-amber-700 focus:ring-amber-500 cursor-pointer shrink-0"
                />
                <span className="text-amber-950 leading-relaxed">
                  I confirm showroom/customer consent has been verified from both{' '}
                  <strong>{customer.full_name}</strong> and{' '}
                  <strong>{linkTarget.full_name}</strong> to link these profiles for family access.
                </span>
              </label>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeLinkModal}
                  disabled={isLinking}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!consentConfirmed || isLinking}
                  className="px-5 py-2 rounded-xl royal-button font-bold text-white inline-flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isLinking ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>Confirm &amp; Link Profiles</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
