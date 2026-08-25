'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  Search, 
  Download, 
  UserPlus, 
  ChevronLeft, 
  ChevronRight, 
  TrendingUp, 
  AlertTriangle, 
  Gift, 
  BarChart2, 
  Sparkles,
  HelpCircle,
  ArrowRight
} from 'lucide-react';

const filterTabs = [
  'All Customers',
  'Active',
  'Completed',
  'Pending Installment',
  'Ready for Redemption',
  'Inactive'
];

const customerData = [
  {
    id: 'RJ-2023-441',
    initials: 'AS',
    avatarColor: 'bg-blue-600',
    name: 'Ananya Sharma',
    mobile: '+91 98421 43307',
    scheme: 'Diwali Savings Scheme',
    installmentsPaid: 8,
    totalInstallments: 12,
    percent: 66,
    barColor: 'bg-blue-600',
  },
  {
    id: 'RJ-2023-512',
    initials: 'RK',
    avatarColor: 'bg-slate-500',
    name: 'Rajesh Kumar',
    mobile: '+91 99001 22334',
    scheme: 'Diwali Savings Scheme',
    installmentsPaid: 12,
    totalInstallments: 12,
    percent: 100,
    barColor: 'bg-slate-800',
  },
  {
    id: 'RJ-2023-102',
    initials: 'VP',
    avatarColor: 'bg-amber-700',
    name: 'Vikram Patil',
    mobile: '+91 91234 56789',
    scheme: 'Diwali Savings Scheme',
    installmentsPaid: 3,
    totalInstallments: 12,
    percent: 25,
    barColor: 'bg-red-500',
  },
  {
    id: 'RJ-2023-009',
    initials: 'ML',
    avatarColor: 'bg-slate-400',
    name: 'Meera Lakshmi',
    mobile: '+91 97765 11223',
    scheme: 'Diwali Savings Scheme',
    installmentsPaid: 12,
    totalInstallments: 12,
    percent: 100,
    barColor: 'bg-slate-800',
  },
];

export default function CustomersListPage() {
  const [activeTab, setActiveTab] = useState('All Customers');

  return (
    <div className="space-y-8 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Customers</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage all jewellery savings scheme customers.
          </p>
        </div>

        {/* Top Action Buttons */}
        <div className="flex items-center gap-3">
          <button className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl flex items-center gap-2 transition-all shadow-2xs">
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export Customers</span>
          </button>
          <Link
            href="/customers/new"
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl flex items-center gap-2 transition-all shadow-md shadow-blue-500/20"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Add Customer</span>
          </Link>
        </div>
      </div>

      {/* Main Content Layout: Table Left (8 cols) & Quick Summary Right (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Search, Filters, and Table */}
        <div className="lg:col-span-8 space-y-6">
          {/* Filter Container */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            {/* Search Input Box */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, mobile, or ID..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            {/* Filter Tabs (Pills) */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {filterTabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    activeTab === tab
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/60'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Customer Data Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
            <div>
              <div className="bg-slate-50 border-b border-slate-200 px-6 py-3.5 grid grid-cols-12 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <span className="col-span-3">Customer ID</span>
                <span className="col-span-3">Customer Name</span>
                <span className="col-span-3">Mobile</span>
                <span className="col-span-2">Scheme</span>
                <span className="col-span-1 text-right">Installments</span>
              </div>

              <div className="divide-y divide-slate-100">
                {customerData.map((cust) => (
                  <Link
                    key={cust.id}
                    href={`/customers/${cust.id}`}
                    className="px-6 py-4 grid grid-cols-12 items-center text-xs hover:bg-slate-50 transition-colors group cursor-pointer"
                  >
                    {/* Customer ID */}
                    <div className="col-span-3 font-mono font-semibold text-slate-600 group-hover:text-blue-600">
                      {cust.id}
                    </div>

                    {/* Customer Name + Avatar */}
                    <div className="col-span-3 flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full ${cust.avatarColor} text-white flex items-center justify-center font-bold text-xs shadow-2xs`}>
                        {cust.initials}
                      </div>
                      <span className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {cust.name}
                      </span>
                    </div>

                    {/* Mobile */}
                    <div className="col-span-3 text-slate-600 font-medium">
                      {cust.mobile}
                    </div>

                    {/* Scheme */}
                    <div className="col-span-2 text-slate-700 font-semibold truncate">
                      {cust.scheme}
                    </div>

                    {/* Installment Progress */}
                    <div className="col-span-1 text-right space-y-1">
                      <div className="flex items-center justify-end gap-2 text-[11px] font-bold text-slate-700">
                        <span>{cust.installmentsPaid}/{cust.totalInstallments}</span>
                        <span className="text-[10px] text-slate-400 font-semibold">{cust.percent}%</span>
                      </div>
                      <div className="w-20 ml-auto h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${cust.barColor} rounded-full transition-all`}
                          style={{ width: `${cust.percent}%` }}
                        />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Table Pagination Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
              <span>Showing 1 to 4 of 284 customers</span>
              <div className="flex items-center gap-1.5">
                <button className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold hover:bg-slate-50 disabled:opacity-50">
                  Previous
                </button>
                <button className="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-900 font-bold">1</button>
                <button className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold hover:bg-slate-50">2</button>
                <button className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold hover:bg-slate-50">3</button>
                <button className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold hover:bg-slate-50">
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Quick Summary Widget & Need Assistance Card */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-lg text-slate-900 leading-tight">Quick Summary</h3>
                <p className="text-xs text-slate-400 mt-0.5">As of today, Sep 15</p>
              </div>
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <BarChart2 className="w-5 h-5" />
              </div>
            </div>

            {/* Stat Item 1 */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Total Customers</span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  <TrendingUp className="w-3 h-3" /> ↑12%
                </span>
              </div>
              <h2 className="text-3xl font-extrabold text-slate-900">1,284</h2>
            </div>

            <div className="h-px bg-slate-100" />

            {/* Stat Item 2 */}
            <div className="space-y-1">
              <span className="text-xs text-slate-500">Active Schemes</span>
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900">842</h2>
                <TrendingUp className="w-5 h-5 text-blue-500" />
              </div>
            </div>

            <div className="h-px bg-slate-100" />

            {/* Stat Item 3 */}
            <div className="space-y-1">
              <span className="text-xs text-slate-500">Pending Installments</span>
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-red-600">42</h2>
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
            </div>

            <div className="h-px bg-slate-100" />

            {/* Stat Item 4 */}
            <div className="space-y-1">
              <span className="text-xs text-slate-500">Ready for Redemption</span>
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900">18</h2>
                <Gift className="w-5 h-5 text-amber-500" />
              </div>
            </div>

            {/* Premium Insights Banner Box */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-3">
              <div className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 uppercase tracking-widest">
                <Sparkles className="w-3.5 h-3.5" /> PREMIUM INSIGHTS
              </div>
              <button className="w-full py-2 bg-white border border-blue-600 hover:bg-blue-50 text-blue-600 font-bold text-xs rounded-xl transition-all shadow-2xs">
                View Analytics
              </button>
            </div>
          </div>

          {/* Need Assistance Documentation Card (Dark Royal Blue Card from Screenshot 4) */}
          <div className="bg-blue-950 p-6 rounded-2xl text-white space-y-4 shadow-lg border border-blue-900">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-blue-400" />
              <h4 className="font-bold text-sm">Need Assistance?</h4>
            </div>
            <p className="text-xs text-blue-200/80 leading-relaxed">
              Check our updated documentation for new scheme redemption policies effective Oct 2023.
            </p>
            <Link
              href="/reports"
              className="inline-flex items-center gap-2 text-xs font-bold text-blue-400 hover:text-white uppercase tracking-wider transition-colors pt-2"
            >
              <span>READ DOCS</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
