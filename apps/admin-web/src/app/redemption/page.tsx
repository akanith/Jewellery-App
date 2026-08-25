'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Download, 
  Plus, 
  Users, 
  Calendar, 
  CheckCircle2, 
  DollarSign, 
  ShieldCheck, 
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Loader2,
  Gift
} from 'lucide-react';
import { CompleteRedemptionModal } from '@/components/redemption/redemption-modal';
import { RedemptionService, RedemptionCandidate, RedemptionStats } from '@/features/redemptions';
import { Redemption } from '@ramyas-jeweller/shared-types';
import { AppError } from '@/lib/errors/app-error';

const filterTabs = [
  'All',
  'Ready for Redemption',
  'Redeemed',
  'Pending Verification'
];

export default function RedemptionPage() {
  const [activeTab, setActiveTab] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSchemeId, setSelectedSchemeId] = useState<string | undefined>(undefined);

  const [stats, setStats] = useState<RedemptionStats | null>(null);
  const [candidates, setCandidates] = useState<RedemptionCandidate[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [statsData, candidatesData, redemptionsData] = await Promise.all([
        RedemptionService.getRedemptionStats(),
        RedemptionService.getRedemptionCandidates(),
        RedemptionService.getRedemptions(),
      ]);

      setStats(statsData);
      setCandidates(candidatesData);
      setRedemptions(redemptionsData);
    } catch (err) {
      if (err instanceof AppError) {
        setError(err.toUserMessage());
      } else {
        setError('Unable to load redemption data. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenRedemptionModal = (schemeId?: string) => {
    if (schemeId) {
      setSelectedSchemeId(schemeId);
    } else if (candidates.length > 0) {
      setSelectedSchemeId(candidates[0].customerSchemeId);
    } else {
      setSelectedSchemeId(undefined);
    }
    setIsModalOpen(true);
  };

  const getAvatarColor = (name: string) => {
    const colors = ['bg-blue-600', 'bg-slate-700', 'bg-amber-700', 'bg-indigo-600', 'bg-emerald-700'];
    const charCode = name.charCodeAt(0) || 0;
    return colors[charCode % colors.length];
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}` : name.slice(0, 2).toUpperCase();
  };

  // Filtered rows for display
  const displayedCandidates = candidates.filter((item) => {
    if (activeTab === 'All') return true;
    if (activeTab === 'Ready for Redemption') return item.status === 'Ready for Redemption';
    if (activeTab === 'Pending Verification') return item.status === 'Pending Verification';
    return true;
  });

  return (
    <div className="space-y-8 pb-12 font-sans">
      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs font-bold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchData}
            className="px-3 py-1.5 bg-white border border-red-200 hover:bg-red-100 text-red-900 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Redemption</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage customers eligible to redeem their jewellery savings scheme.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-2 transition-all shadow-2xs"
          >
            <RefreshCw className={`w-4 h-4 text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => handleOpenRedemptionModal()}
            className="px-5 py-2.5 bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-md shadow-blue-900/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Redemption</span>
          </button>
        </div>
      </div>

      {/* 4 Summary Stat Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Customers Ready */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 relative">
          <div className="flex items-center justify-between">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              Live
            </span>
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">CUSTOMERS READY</span>
            <div className="flex items-baseline gap-2 mt-1">
              <h2 className="text-3xl font-black text-slate-900">
                {isLoading ? '...' : (stats?.customersReady ?? 0)}
              </h2>
              <span className="text-xs text-slate-500 font-semibold">Eligible now</span>
            </div>
          </div>
        </div>

        {/* Card 2: Today's Redemption */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 relative">
          <div className="flex items-center justify-between">
            <div className="p-2.5 bg-amber-50 text-amber-700 rounded-xl">
              <Calendar className="w-5 h-5" />
            </div>
            <span className="text-[10px] text-slate-400 font-semibold">Today</span>
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">TODAY'S REDEMPTION</span>
            <div className="flex items-baseline gap-2 mt-1">
              <h2 className="text-3xl font-black text-slate-900">
                {isLoading ? '...' : (stats?.todaysRedemptions ?? 0)}
              </h2>
              <span className="text-xs text-slate-500 font-semibold">Processed</span>
            </div>
          </div>
        </div>

        {/* Card 3: Completed This Month */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 relative">
          <div className="flex items-center justify-between">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              Monthly
            </span>
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">COMPLETED THIS MONTH</span>
            <div className="flex items-baseline gap-2 mt-1">
              <h2 className="text-3xl font-black text-slate-900">
                {isLoading ? '...' : (stats?.completedThisMonth ?? 0)}
              </h2>
              <span className="text-xs text-slate-500 font-semibold">Total</span>
            </div>
          </div>
        </div>

        {/* Card 4: Total Redeemed Value */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 relative">
          <div className="flex items-center justify-between">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </div>
            <span className="text-[10px] text-slate-400 font-semibold">Total</span>
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">TOTAL REDEEMED VALUE</span>
            <div className="flex items-baseline gap-2 mt-1">
              <h2 className="text-3xl font-black text-blue-900">
                ₹{isLoading ? '...' : (stats?.totalRedeemedValue ?? 0).toLocaleString('en-IN')}
              </h2>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
        <div>
          {/* Table Filter Tabs */}
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-x-auto">
              {filterTabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeTab === tab
                      ? 'bg-blue-900 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Table Header */}
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-3.5 grid grid-cols-12 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            <span className="col-span-2">CUSTOMER ID</span>
            <span className="col-span-3">CUSTOMER NAME</span>
            <span className="col-span-2">SCHEME NAME</span>
            <span className="col-span-1 text-right">PAID AMOUNT</span>
            <span className="col-span-1 text-right">BONUS</span>
            <span className="col-span-1 text-right">ELIGIBLE VALUE</span>
            <span className="col-span-2 text-right">STATUS</span>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-slate-100">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="px-6 py-4 grid grid-cols-12 items-center text-xs animate-pulse">
                  <div className="col-span-2 h-4 bg-slate-100 rounded w-20" />
                  <div className="col-span-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100" />
                    <div className="h-4 bg-slate-100 rounded w-28" />
                  </div>
                  <div className="col-span-2 h-4 bg-slate-100 rounded w-24" />
                  <div className="col-span-1 h-4 bg-slate-100 rounded w-12 ml-auto" />
                  <div className="col-span-1 h-4 bg-slate-100 rounded w-12 ml-auto" />
                  <div className="col-span-1 h-4 bg-slate-100 rounded w-14 ml-auto" />
                  <div className="col-span-2 h-4 bg-slate-100 rounded w-20 ml-auto" />
                </div>
              ))
            ) : activeTab === 'Redeemed' ? (
              redemptions.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <Gift className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="font-bold text-slate-700 text-sm">No completed redemptions</p>
                  <p className="text-xs text-slate-400">No scheme redemption records found in the database.</p>
                </div>
              ) : (
                redemptions.map((red) => (
                  <div
                    key={red.id}
                    className="px-6 py-4 grid grid-cols-12 items-center text-xs hover:bg-slate-50 transition-colors"
                  >
                    <div className="col-span-2 font-mono font-bold text-slate-600">
                      {red.redemptionNumber}
                    </div>
                    <div className="col-span-3 font-bold text-slate-900">
                      Customer Scheme #{red.customerSchemeId.slice(0, 8)}
                    </div>
                    <div className="col-span-2 font-semibold text-slate-700 truncate">
                      Completed Redemption
                    </div>
                    <div className="col-span-1 text-right font-extrabold text-slate-900">₹{red.totalPaidAmount.toLocaleString('en-IN')}</div>
                    <div className="col-span-1 text-right font-extrabold text-emerald-600">+ ₹{red.bonusAmount.toLocaleString('en-IN')}</div>
                    <div className="col-span-1 text-right font-extrabold text-blue-900">₹{red.finalRedeemedValue.toLocaleString('en-IN')}</div>
                    <div className="col-span-2 text-right">
                      <span className="px-2.5 py-1 text-[10px] font-extrabold rounded-md border bg-slate-100 text-slate-700 border-slate-200">
                        • {red.status}
                      </span>
                    </div>
                  </div>
                ))
              )
            ) : displayedCandidates.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <Gift className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="font-bold text-slate-700 text-sm">No redemption candidates found</p>
                <p className="text-xs text-slate-400">No customer schemes currently match "{activeTab}".</p>
              </div>
            ) : (
              displayedCandidates.map((row) => (
                <div
                  key={row.customerSchemeId}
                  onClick={() => handleOpenRedemptionModal(row.customerSchemeId)}
                  className="px-6 py-4 grid grid-cols-12 items-center text-xs hover:bg-slate-50 transition-colors cursor-pointer group"
                >
                  <div className="col-span-2 font-mono font-bold text-slate-600 group-hover:text-blue-600">
                    {row.customerNumber}
                  </div>
                  <div className="col-span-3 flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full ${getAvatarColor(row.customerName)} text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-2xs`}>
                      {getInitials(row.customerName)}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{row.customerName}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{row.mobileNumber}</p>
                    </div>
                  </div>
                  <div className="col-span-2 font-semibold text-slate-700 truncate">
                    {row.schemeName}
                  </div>
                  <div className="col-span-1 text-right font-extrabold text-slate-900">₹{row.totalPaidAmount.toLocaleString('en-IN')}</div>
                  <div className="col-span-1 text-right font-extrabold text-emerald-600">+ ₹{row.bonusAmount.toLocaleString('en-IN')}</div>
                  <div className="col-span-1 text-right font-extrabold text-blue-900">₹{row.finalRedeemedValue.toLocaleString('en-IN')}</div>
                  <div className="col-span-2 text-right">
                    <span className={`px-2.5 py-1 text-[10px] font-extrabold rounded-md border ${
                      row.status === 'Ready for Redemption'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        : 'bg-amber-50 text-amber-900 border-amber-200'
                    }`}>
                      • {row.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Table Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing {activeTab === 'Redeemed' ? redemptions.length : displayedCandidates.length} customer record(s)
          </span>
          <span className="font-mono text-[11px] text-slate-400">PostgreSQL Live Data</span>
        </div>
      </div>

      {/* Pre-Redemption Checklist Box */}
      <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xs">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-950 text-white flex items-center justify-center shrink-0 shadow-md">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-slate-900">Pre-Redemption Checklist</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 mt-3 text-xs text-slate-600 font-medium">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Original scheme passbook collected.</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Verified government photo identification.</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Calculation of weight-based or value-based bonus.</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Managerial sign-off for premium diamond schemes.</span>
              </div>
            </div>
          </div>
        </div>

        <button className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-900 font-bold text-xs rounded-xl flex items-center gap-2 transition-all self-start md:self-auto shrink-0 shadow-2xs">
          <span>Read Policy Manual</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Complete Redemption Modal Drawer */}
      <CompleteRedemptionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        customerSchemeId={selectedSchemeId}
        onSuccess={fetchData}
      />
    </div>
  );
}
