'use client';

import { useState } from 'react';
import { 
  Calendar, 
  Wallet, 
  DollarSign, 
  CreditCard, 
  Search, 
  Download, 
  Plus, 
  Filter, 
  ChevronLeft, 
  ChevronRight,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { RecordInstallmentModal } from '@/components/payments/record-installment-modal';

export default function InstallmentsHistoryPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dateRange, setDateRange] = useState('Last 30 Days');
  const [activeFilter, setActiveFilter] = useState('Recorded');

  return (
    <div className="space-y-8 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Installment History</h1>
          <p className="text-sm text-slate-500 mt-1">
            View and manage all recorded customer installments.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-5 py-2.5 bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-md shadow-blue-900/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Payment</span>
        </button>
      </div>

      {/* 4 Metric Cards Row with bottom indicator lines (from Screenshot 1) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Today's Installments */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Calendar className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold tracking-widest uppercase">TODAY</span>
          </div>
          <div className="mt-4 space-y-1">
            <h2 className="text-3xl font-black text-slate-900">24</h2>
            <p className="text-xs text-slate-500 font-medium">Today's Installments</p>
          </div>
          <div className="w-16 h-1 bg-blue-600 rounded-full mt-4" />
        </div>

        {/* Card 2: Today's Collection */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Wallet className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold tracking-widest uppercase text-emerald-600">COLLECTED</span>
          </div>
          <div className="mt-4 space-y-1">
            <h2 className="text-3xl font-black text-slate-900">₹48,000</h2>
            <p className="text-xs text-slate-500 font-medium">Today's Collection</p>
          </div>
          <div className="w-20 h-1 bg-emerald-600 rounded-full mt-4" />
        </div>

        {/* Card 3: Hard Cash Collection */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <div className="p-2 bg-slate-100 text-slate-700 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold tracking-widest uppercase">HARD CASH</span>
          </div>
          <div className="mt-4 space-y-1">
            <h2 className="text-3xl font-black text-slate-900">₹12,000</h2>
            <p className="text-xs text-slate-500 font-medium">Cash Collection</p>
          </div>
          <div className="w-16 h-1 bg-slate-800 rounded-full mt-4" />
        </div>

        {/* Card 4: Digital Collection */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <CreditCard className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold tracking-widest uppercase text-blue-600">ONLINE</span>
          </div>
          <div className="mt-4 space-y-1">
            <h2 className="text-3xl font-black text-slate-900">₹36,000</h2>
            <p className="text-xs text-slate-500 font-medium">Digital Collection</p>
          </div>
          <div className="w-20 h-1 bg-blue-600 rounded-full mt-4" />
        </div>
      </div>

      {/* Filter Box Container */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        {/* Search & Export Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Customer Name, ID, or Mobile..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          <button className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-2 transition-all shadow-2xs">
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export Report</span>
          </button>
        </div>

        {/* Filter Pills Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none"
            >
              <option value="Last 30 Days">Date Range: Last 30 Days</option>
              <option value="Today">Today</option>
              <option value="This Month">This Month</option>
              <option value="Custom">Custom Range</option>
            </select>

            <button className="px-3.5 py-1.5 bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-100 transition-colors">
              Method: All
            </button>

            <button className="px-3.5 py-1.5 bg-blue-50 border border-blue-200 text-blue-900 font-bold rounded-xl">
              Status: Recorded
            </button>

            <button className="px-3.5 py-1.5 bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-100 transition-colors">
              Customer: Active
            </button>
          </div>

          <button className="text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors">
            Clear All Filters
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
        <div>
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-3.5 grid grid-cols-12 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            <span className="col-span-2">RECEIPT NO.</span>
            <span className="col-span-2">DATE</span>
            <span className="col-span-3">CUSTOMER</span>
            <span className="col-span-1 text-center">INSTALLMENT</span>
            <span className="col-span-1 text-right">AMOUNT</span>
            <span className="col-span-1 text-center">METHOD</span>
            <span className="col-span-1 text-center">RECORDED BY</span>
            <span className="col-span-1 text-right">STATUS</span>
          </div>

          <div className="divide-y divide-slate-100">
            {/* Row 1 */}
            <div className="px-6 py-4 grid grid-cols-12 items-center text-xs hover:bg-slate-50 transition-colors">
              <div className="col-span-2 font-mono font-extrabold text-blue-900">#RJ-8821</div>
              <div className="col-span-2 text-slate-600 font-medium">
                25 Aug 2026
              </div>
              <div className="col-span-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-900 font-bold flex items-center justify-center text-xs shrink-0">
                  AS
                </div>
                <div>
                  <p className="font-bold text-slate-900">Aditi Sharma</p>
                  <p className="text-[10px] text-slate-400 font-mono">ID: 44920</p>
                </div>
              </div>
              <div className="col-span-1 text-center font-bold text-slate-700">8/12</div>
              <div className="col-span-1 text-right font-extrabold text-slate-900">₹1,000</div>
              <div className="col-span-1 text-center">
                <span className="px-2.5 py-1 bg-amber-100 text-amber-900 font-extrabold text-[10px] rounded-md tracking-wider">
                  GPAY
                </span>
              </div>
              <div className="col-span-1 text-center text-slate-600 font-semibold">Rajesh Kumar</div>
              <div className="col-span-1 text-right">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  RECORDED
                </span>
              </div>
            </div>

            {/* Row 2 */}
            <div className="px-6 py-4 grid grid-cols-12 items-center text-xs hover:bg-slate-50 transition-colors">
              <div className="col-span-2 font-mono font-extrabold text-blue-900">#RJ-8820</div>
              <div className="col-span-2 text-slate-600 font-medium">
                24 Aug 2026
              </div>
              <div className="col-span-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-800 font-bold flex items-center justify-center text-xs shrink-0">
                  VS
                </div>
                <div>
                  <p className="font-bold text-slate-900">Vikram Singh</p>
                  <p className="text-[10px] text-slate-400 font-mono">ID: 44815</p>
                </div>
              </div>
              <div className="col-span-1 text-center font-bold text-slate-700">2/10</div>
              <div className="col-span-1 text-right font-extrabold text-slate-900">₹5,000</div>
              <div className="col-span-1 text-center">
                <span className="px-2.5 py-1 bg-slate-200 text-slate-800 font-extrabold text-[10px] rounded-md tracking-wider">
                  CASH
                </span>
              </div>
              <div className="col-span-1 text-center text-slate-600 font-semibold">Meera Iyer</div>
              <div className="col-span-1 text-right">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  RECORDED
                </span>
              </div>
            </div>

            {/* Row 3 */}
            <div className="px-6 py-4 grid grid-cols-12 items-center text-xs hover:bg-slate-50 transition-colors">
              <div className="col-span-2 font-mono font-extrabold text-blue-900">#RJ-8819</div>
              <div className="col-span-2 text-slate-600 font-medium">
                24 Aug 2026
              </div>
              <div className="col-span-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 font-bold flex items-center justify-center text-xs shrink-0">
                  RJ
                </div>
                <div>
                  <p className="font-bold text-slate-900">Rohan Joshi</p>
                  <p className="text-[10px] text-slate-400 font-mono">ID: 44782</p>
                </div>
              </div>
              <div className="col-span-1 text-center font-bold text-slate-700">12/12</div>
              <div className="col-span-1 text-right font-extrabold text-slate-900">₹2,500</div>
              <div className="col-span-1 text-center">
                <span className="px-2.5 py-1 bg-blue-100 text-blue-900 font-extrabold text-[10px] rounded-md tracking-wider">
                  BANK TRANSFER
                </span>
              </div>
              <div className="col-span-1 text-center text-slate-600 font-semibold">Rajesh Kumar</div>
              <div className="col-span-1 text-right">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  RECORDED
                </span>
              </div>
            </div>

            {/* Row 4: Cancelled */}
            <div className="px-6 py-4 grid grid-cols-12 items-center text-xs hover:bg-slate-50 transition-colors opacity-60">
              <div className="col-span-2 font-mono font-bold text-slate-400 line-through">#RJ-8818</div>
              <div className="col-span-2 text-slate-400 font-medium">
                23 Aug 2026
              </div>
              <div className="col-span-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 font-bold flex items-center justify-center text-xs shrink-0">
                  SR
                </div>
                <div>
                  <p className="font-bold text-slate-700 line-through">Sneha Reddy</p>
                  <p className="text-[10px] text-slate-400 font-mono">ID: 44102</p>
                </div>
              </div>
              <div className="col-span-1 text-center font-bold text-slate-500">5/12</div>
              <div className="col-span-1 text-right font-bold text-slate-500 line-through">₹1,500</div>
              <div className="col-span-1 text-center">
                <span className="px-2.5 py-1 bg-slate-100 text-slate-500 font-extrabold text-[10px] rounded-md tracking-wider">
                  PHONEPE
                </span>
              </div>
              <div className="col-span-1 text-center text-slate-500 font-semibold">Meera Iyer</div>
              <div className="col-span-1 text-right">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                  CANCELLED
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
          <span>Showing 1-10 of 480</span>
          <div className="flex items-center gap-1.5">
            <button className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold hover:bg-slate-50 disabled:opacity-50">
              Previous
            </button>
            <button className="px-3 py-1.5 rounded-lg bg-blue-900 text-white font-bold">1</button>
            <button className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold hover:bg-slate-50">2</button>
            <button className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold hover:bg-slate-50">3</button>
            <span className="px-1 text-slate-400">...</span>
            <button className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold hover:bg-slate-50">48</button>
            <button className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold hover:bg-slate-50">
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Record Installment Slide-over Drawer Modal */}
      <RecordInstallmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
