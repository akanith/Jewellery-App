'use client';

import { useState } from 'react';
import { 
  Download, 
  Plus, 
  Users, 
  Calendar, 
  CheckCircle2, 
  DollarSign, 
  ShieldCheck, 
  ArrowUpRight,
  ExternalLink,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { CompleteRedemptionModal } from '@/components/redemption/redemption-modal';

const filterTabs = [
  'All',
  'Ready for Redemption',
  'Redeemed',
  'Pending Verification'
];

const redemptionData = [
  {
    id: 'RJ-2023-441',
    initials: 'AS',
    avatarColor: 'bg-blue-600',
    name: 'Ananya Sharma',
    mobile: '+91 98421 43307',
    scheme: 'Diwali Savings Scheme',
    paidAmount: '₹12,000',
    bonus: '+ ₹1,000',
    eligibleValue: '₹13,000',
    status: 'Ready',
    statusStyle: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  {
    id: 'RJ-2023-512',
    initials: 'RK',
    avatarColor: 'bg-slate-600',
    name: 'Rajesh Kumar',
    mobile: '+91 99001 22334',
    scheme: 'Diwali Savings Scheme',
    paidAmount: '₹24,000',
    bonus: '+ ₹2,000',
    eligibleValue: '₹26,000',
    status: 'Redeemed',
    statusStyle: 'bg-slate-100 text-slate-700 border-slate-200',
  },
  {
    id: 'RJ-2023-602',
    initials: 'PM',
    avatarColor: 'bg-amber-600',
    name: 'Priya Mehta',
    mobile: '+91 91223 34455',
    scheme: 'Diwali Savings Scheme',
    paidAmount: '₹60,000',
    bonus: '+ ₹5,000',
    eligibleValue: '₹65,000',
    status: 'Pending Verification',
    statusStyle: 'bg-amber-50 text-amber-900 border-amber-200',
  },
  {
    id: 'RJ-2023-388',
    initials: 'SV',
    avatarColor: 'bg-blue-800',
    name: 'Suresh Varma',
    mobile: '+91 95566 77889',
    scheme: 'Diwali Savings Scheme',
    paidAmount: '₹12,000',
    bonus: '+ ₹1,000',
    eligibleValue: '₹13,000',
    status: 'Ready',
    statusStyle: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
];

export default function RedemptionPage() {
  const [activeTab, setActiveTab] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="space-y-8 pb-12">
      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Redemption</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage customers eligible to redeem their jewellery savings scheme.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-2 transition-all shadow-2xs">
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export List</span>
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-5 py-2.5 bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-md shadow-blue-900/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Redemption</span>
          </button>
        </div>
      </div>

      {/* 4 Summary Stat Cards Row (from Screenshot 3) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1 */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 relative">
          <div className="flex items-center justify-between">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              +12%^
            </span>
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">CUSTOMERS READY</span>
            <div className="flex items-baseline gap-2 mt-1">
              <h2 className="text-3xl font-black text-slate-900">18</h2>
              <span className="text-xs text-slate-500 font-semibold">Eligible now</span>
            </div>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 relative">
          <div className="flex items-center justify-between">
            <div className="p-2.5 bg-amber-50 text-amber-700 rounded-xl">
              <Calendar className="w-5 h-5" />
            </div>
            <span className="text-[10px] text-slate-400 font-semibold">Daily Goal: 5</span>
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">TODAY'S REDEMPTION</span>
            <div className="flex items-baseline gap-2 mt-1">
              <h2 className="text-3xl font-black text-slate-900">3</h2>
              <span className="text-xs text-slate-500 font-semibold">Processed</span>
            </div>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 relative">
          <div className="flex items-center justify-between">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              +5^
            </span>
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">COMPLETED THIS MONTH</span>
            <div className="flex items-baseline gap-2 mt-1">
              <h2 className="text-3xl font-black text-slate-900">42</h2>
              <span className="text-xs text-slate-500 font-semibold">Total</span>
            </div>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 relative">
          <div className="flex items-center justify-between">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </div>
            <span className="text-[10px] text-slate-400 font-semibold">This Month</span>
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">TOTAL REDEEMED VALUE</span>
            <div className="flex items-baseline gap-2 mt-1">
              <h2 className="text-3xl font-black text-blue-900">₹5.4L</h2>
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

          {/* Table */}
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-3.5 grid grid-cols-12 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            <span className="col-span-2">CUSTOMER ID</span>
            <span className="col-span-3">CUSTOMER NAME</span>
            <span className="col-span-2">SCHEME NAME</span>
            <span className="col-span-1 text-right">PAID AMOUNT</span>
            <span className="col-span-1 text-right">BONUS</span>
            <span className="col-span-1 text-right">ELIGIBLE VALUE</span>
            <span className="col-span-2 text-right">STATUS</span>
          </div>

          <div className="divide-y divide-slate-100">
            {redemptionData.map((row) => (
              <div
                key={row.id}
                onClick={() => setIsModalOpen(true)}
                className="px-6 py-4 grid grid-cols-12 items-center text-xs hover:bg-slate-50 transition-colors cursor-pointer group"
              >
                <div className="col-span-2 font-mono font-bold text-slate-600 group-hover:text-blue-600">
                  {row.id}
                </div>
                <div className="col-span-3 flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full ${row.avatarColor} text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-2xs`}>
                    {row.initials}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{row.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{row.mobile}</p>
                  </div>
                </div>
                <div className="col-span-2 font-semibold text-slate-700 truncate">
                  {row.scheme}
                </div>
                <div className="col-span-1 text-right font-extrabold text-slate-900">{row.paidAmount}</div>
                <div className="col-span-1 text-right font-extrabold text-emerald-600">{row.bonus}</div>
                <div className="col-span-1 text-right font-extrabold text-blue-900">{row.eligibleValue}</div>
                <div className="col-span-2 text-right">
                  <span className={`px-2.5 py-1 text-[10px] font-extrabold rounded-md border ${row.statusStyle}`}>
                    • {row.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Table Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
          <span>Showing 1-10 of 42 customers</span>
          <div className="flex items-center gap-1.5">
            <button className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold hover:bg-slate-50 disabled:opacity-50">
              Previous
            </button>
            <button className="px-3 py-1.5 rounded-lg bg-blue-900 text-white font-bold">1</button>
            <button className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold hover:bg-slate-50">2</button>
            <button className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold hover:bg-slate-50">3</button>
            <button className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold hover:bg-slate-50">4</button>
            <button className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold hover:bg-slate-50">
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Pre-Redemption Checklist Box (from Screenshot 3) */}
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
      />
    </div>
  );
}
