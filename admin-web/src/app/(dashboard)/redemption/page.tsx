'use client';

/**
 * RAMYAS JEWELLER - Scheme Redemption Hub
 * Step 9.3: Connected to live Supabase schemes and redemption records.
 */

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Gift,
  Search,
  CheckCircle2,
  Sparkles,
  X,
  Printer,
  Loader2,
  AlertCircle,
  PackageCheck,
  Building2,
  ArrowRight
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { ItemCategory } from '@/types/database';
import { recordSchemeRedemption } from '@/lib/supabase/rpc';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

interface RedemptionCustomerRecord {
  id: string;
  scheme_id: string;
  customer_id: string;
  customer_code: string;
  customer_name: string;
  phone_number: string;
  scheme_code: string;
  paid_amount: number;
  bonus_amount: number;
  eligible_value: number;
  status: string;
  start_month: string;
  end_month: string;
}

export default function RedemptionPage() {
  const [activeTab, setActiveTab] = useState<'ALL' | 'READY' | 'REDEEMED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRedemptionDrawerOpen, setIsRedemptionDrawerOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<RedemptionCustomerRecord | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [schemes, setSchemes] = useState<RedemptionCustomerRecord[]>([]);

  // Form states for Complete Redemption Slide-over
  const [billNumber, setBillNumber] = useState('');
  const [billAmount, setBillAmount] = useState<number>(13000);
  const [selectedCategory, setSelectedCategory] = useState<ItemCategory>('GOLD');
  const [redemptionRemarks, setRedemptionRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [drawerError, setDrawerError] = useState<string | null>(null);

  const fetchRedemptionData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const supabase = getSupabaseBrowserClient();

      const { data, error } = await supabase
        .from('schemes')
        .select(`
          id,
          scheme_code,
          customer_id,
          monthly_installment_amount,
          total_installments,
          bonus_amount,
          maturity_amount,
          start_month,
          end_month,
          status,
          customers (
            id,
            full_name,
            customer_code,
            phone_number
          ),
          scheme_installments (
            id,
            paid_amount,
            status
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const rawSchemes = (data || []) as unknown as Array<{
        id: string;
        scheme_code: string;
        customer_id: string;
        bonus_amount: number;
        maturity_amount: number;
        start_month: string;
        end_month: string;
        status: string;
        customers?: { id: string; full_name: string; customer_code: string; phone_number: string };
        scheme_installments?: Array<{ paid_amount: number; status: string }>;
      }>;

      const mapped: RedemptionCustomerRecord[] = rawSchemes.map((s) => {
        const installments = s.scheme_installments || [];
        const paidTotal = installments
          .filter((i) => i.status === 'PAID')
          .reduce((sum, i) => sum + (Number(i.paid_amount) || 0), 0);

        return {
          id: s.id,
          scheme_id: s.id,
          customer_id: s.customer_id,
          customer_code: s.customers?.customer_code || 'RJ-CUST',
          customer_name: s.customers?.full_name || 'Customer',
          phone_number: s.customers?.phone_number || '—',
          scheme_code: s.scheme_code,
          paid_amount: paidTotal,
          bonus_amount: Number(s.bonus_amount) || 1000,
          eligible_value: Number(s.maturity_amount) || 13000,
          status: s.status,
          start_month: s.start_month,
          end_month: s.end_month,
        };
      });

      setSchemes(mapped);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch redemption schemes.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchRedemptionData();
  }, [fetchRedemptionData]);

  const openRedemptionDrawer = (record: RedemptionCustomerRecord) => {
    setSelectedRecord(record);
    setBillAmount(record.eligible_value);
    // eslint-disable-next-line react-hooks/purity
    setBillNumber(`INV-${Math.floor(8820 + Math.random() * 500)}`);
    setDrawerError(null);
    setSuccessMessage(null);
    setIsRedemptionDrawerOpen(true);
  };

  const handleCompleteRedemption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;

    if (!billNumber.trim()) {
      setDrawerError('Please enter a valid store invoice/bill number.');
      return;
    }

    if (billAmount <= 0) {
      setDrawerError('Please enter a valid purchase bill amount.');
      return;
    }

    setIsSubmitting(true);
    setDrawerError(null);
    setSuccessMessage(null);

    const schemeAmountUsed = Math.min(selectedRecord.eligible_value, billAmount);

    const response = await recordSchemeRedemption({
      p_scheme_id: selectedRecord.scheme_id,
      p_scheme_amount_used: schemeAmountUsed,
      p_purchase_total: billAmount,
      p_invoice_number: billNumber.trim(),
      p_items: [
        {
          item_description: `${selectedCategory} Jewellery Purchase`,
          category: selectedCategory,
          quantity: 1,
          product_amount: billAmount,
        },
      ],
      p_notes: redemptionRemarks.trim() || null,
    });

    setIsSubmitting(false);

    if (response.error) {
      setDrawerError(response.error);
      return;
    }

    const redemptionCode = response.data?.redemption_code || 'RJ-RED';
    setSuccessMessage(`Redemption successfully recorded! Voucher: ${redemptionCode}`);

    setTimeout(() => {
      setIsRedemptionDrawerOpen(false);
      setSuccessMessage(null);
      fetchRedemptionData();
    }, 1500);
  };

  const filteredSchemes = schemes.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      s.customer_name.toLowerCase().includes(q) ||
      s.customer_code.toLowerCase().includes(q) ||
      s.phone_number.includes(q) ||
      s.scheme_code.toLowerCase().includes(q);

    const isMatured = s.status === 'MATURED' || s.status === 'COMPLETED';
    const isRedeemed = s.status === 'FULLY_REDEEMED' || s.status === 'PARTIALLY_REDEEMED';

    const matchesTab =
      activeTab === 'ALL' ||
      (activeTab === 'READY' && isMatured) ||
      (activeTab === 'REDEEMED' && isRedeemed);

    return matchesSearch && matchesTab;
  });

  const readyCount = schemes.filter((s) => s.status === 'MATURED' || s.status === 'COMPLETED').length;
  const redeemedCount = schemes.filter(
    (s) => s.status === 'FULLY_REDEEMED' || s.status === 'PARTIALLY_REDEEMED'
  ).length;

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-bold text-2xl text-slate-900 tracking-tight flex items-center gap-2.5">
            <span>Scheme Redemption Hub</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              {readyCount} Ready to Claim
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Manage scheme maturities, record jewellery purchases, and process bonus disbursements.
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="luxury-card p-4 bg-rose-50 border-rose-200 text-rose-900 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <div className="text-xs sm:text-sm font-medium">{errorMessage}</div>
          </div>
          <button
            onClick={() => fetchRedemptionData()}
            className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* Tabs & Search Filter */}
      <div className="luxury-card p-4 sm:p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xs">
        <div className="relative w-full md:max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by customer name, mobile, code, or scheme..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === 'ALL'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Schemes ({schemes.length})
          </button>
          <button
            onClick={() => setActiveTab('READY')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === 'READY'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            Ready for Redemption ({readyCount})
          </button>
          <button
            onClick={() => setActiveTab('REDEEMED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === 'REDEEMED'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            Redeemed ({redeemedCount})
          </button>
        </div>
      </div>

      {/* Redemption Records Table */}
      <div className="luxury-card overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
            <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
            <div className="text-sm font-medium text-slate-600">Loading scheme redemption records...</div>
          </div>
        ) : schemes.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Gift className="w-10 h-10 mx-auto text-slate-300 mb-3" />
            <h3 className="text-base font-bold text-slate-800 font-serif-luxury">
              No Schemes for Redemption
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto mt-1 mb-6">
              When customers complete their 12-month savings schemes, they will become eligible for bonus addition and jewellery redemption here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm text-slate-700">
              <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider text-[11px] font-semibold border-b border-slate-200/80">
                <tr>
                  <th className="py-3.5 px-5">Customer</th>
                  <th className="py-3.5 px-5">Scheme Code</th>
                  <th className="py-3.5 px-5">Paid (12 Mo)</th>
                  <th className="py-3.5 px-5">Shop Bonus</th>
                  <th className="py-3.5 px-5">Total Eligible</th>
                  <th className="py-3.5 px-5">Status</th>
                  <th className="py-3.5 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSchemes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No schemes found matching your tab or search filter.
                    </td>
                  </tr>
                ) : (
                  filteredSchemes.map((s) => {
                    const isMatured = s.status === 'MATURED' || s.status === 'COMPLETED';
                    const isRedeemed = s.status === 'FULLY_REDEEMED' || s.status === 'PARTIALLY_REDEEMED';

                    return (
                      <tr key={s.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-4 px-5">
                          <div className="font-bold text-slate-900">{s.customer_name}</div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {s.customer_code} • {s.phone_number}
                          </div>
                        </td>

                        <td className="py-4 px-5 font-mono font-semibold text-slate-800">
                          {s.scheme_code}
                        </td>

                        <td className="py-4 px-5 font-mono font-bold text-slate-900">
                          {formatCurrency(s.paid_amount)}
                        </td>

                        <td className="py-4 px-5 font-mono font-bold text-amber-600">
                          +{formatCurrency(s.bonus_amount)}
                        </td>

                        <td className="py-4 px-5 font-mono font-bold text-blue-700">
                          {formatCurrency(s.eligible_value)}
                        </td>

                        <td className="py-4 px-5">
                          {isMatured ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                              <Sparkles className="w-2.5 h-2.5" /> Ready to Claim
                            </span>
                          ) : isRedeemed ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-2.5 h-2.5" /> Redeemed
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                              In Progress
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-5 text-right">
                          {isMatured ? (
                            <button
                              onClick={() => openRedemptionDrawer(s)}
                              className="px-3.5 py-1.5 rounded-xl royal-button font-bold text-xs cursor-pointer inline-flex items-center gap-1.5"
                            >
                              <Gift className="w-3.5 h-3.5" />
                              <span>Redeem</span>
                            </button>
                          ) : (
                            <Link
                              href={`/customers/${s.customer_id}`}
                              className="text-xs font-semibold text-blue-600 hover:underline"
                            >
                              Passbook →
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Complete Redemption Slide-over Modal */}
      {isRedemptionDrawerOpen && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-2xs"
            onClick={() => setIsRedemptionDrawerOpen(false)}
          />
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 sm:p-8 z-10 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-amber-600" />
                <h3 className="text-lg font-bold font-serif-luxury text-slate-900">
                  Complete Scheme Redemption
                </h3>
              </div>
              <button
                onClick={() => setIsRedemptionDrawerOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {successMessage && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}
            {drawerError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{drawerError}</span>
              </div>
            )}

            {/* Customer & Scheme Summary Card */}
            <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white rounded-2xl p-4 space-y-2">
              <div className="text-xs font-semibold text-blue-200">CUSTOMER & SCHEME</div>
              <div className="text-base font-bold">{selectedRecord.customer_name}</div>
              <div className="text-xs text-blue-200 font-mono">
                {selectedRecord.customer_code} • {selectedRecord.scheme_code}
              </div>
              <div className="pt-2 border-t border-blue-700/60 flex items-center justify-between text-xs font-semibold">
                <span>Total Maturity Value:</span>
                <span className="text-amber-300 text-sm font-bold font-mono">
                  {formatCurrency(selectedRecord.eligible_value)}
                </span>
              </div>
            </div>

            <form onSubmit={handleCompleteRedemption} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Store Invoice / Bill No.
                  </label>
                  <input
                    type="text"
                    required
                    value={billNumber}
                    onChange={(e) => setBillNumber(e.target.value)}
                    placeholder="e.g. INV-8829"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Purchase Bill Amount (₹)
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={billAmount}
                    onChange={(e) => setBillAmount(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Jewellery Category
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['GOLD', 'SILVER', 'OTHER'] as ItemCategory[]).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`py-2 rounded-xl text-xs font-bold border transition ${
                        selectedCategory === cat
                          ? 'bg-amber-50 border-amber-500 text-amber-800'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Settlement Preview */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Scheme Maturity Applied:</span>
                  <span className="font-mono font-bold text-slate-900">
                    -{formatCurrency(Math.min(selectedRecord.eligible_value, billAmount))}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-200">
                  <span>Customer Balance to Pay:</span>
                  <span className="font-mono text-blue-700 text-sm">
                    {formatCurrency(Math.max(0, billAmount - selectedRecord.eligible_value))}
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Remarks / Notes (Optional)
                </label>
                <input
                  type="text"
                  value={redemptionRemarks}
                  onChange={(e) => setRedemptionRemarks(e.target.value)}
                  placeholder="e.g. Sweet box handed over, festival gift voucher given"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsRedemptionDrawerOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <PackageCheck className="w-4 h-4" />
                  )}
                  <span>Complete Redemption</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
