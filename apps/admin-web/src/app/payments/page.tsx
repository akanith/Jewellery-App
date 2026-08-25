'use client';

import { useState, useEffect, useCallback } from 'react';
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
  XCircle,
  RefreshCw,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { RecordInstallmentModal } from '@/components/payments/record-installment-modal';
import { PaymentService } from '@/features/payments';
import { Payment } from '@ramyas-jeweller/shared-types';
import { AppError } from '@/lib/errors/app-error';

export default function InstallmentsHistoryPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dateRange, setDateRange] = useState('Last 30 Days');
  const [searchQuery, setSearchQuery] = useState('');

  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPayments = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await PaymentService.getPaymentHistory();
      setPayments(data);
    } catch (err) {
      if (err instanceof AppError) {
        setError(err.toUserMessage());
      } else {
        setError('Failed to load payment transaction history.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const totalCollected = payments.reduce((acc, p) => acc + p.amount, 0);
  const cashTotal = payments.filter(p => p.paymentMethod === 'CASH').reduce((acc, p) => acc + p.amount, 0);
  const digitalTotal = payments.filter(p => p.paymentMethod !== 'CASH').reduce((acc, p) => acc + p.amount, 0);

  const filteredPayments = payments.filter((p) => {
    if (!searchQuery.trim()) return true;
    const term = searchQuery.toLowerCase();
    return (
      p.paymentNumber.toLowerCase().includes(term) ||
      p.paymentMethod.toLowerCase().includes(term) ||
      p.id.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-8 pb-12 font-sans">
      <RecordInstallmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchPayments}
      />

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Installment History</h1>
          <p className="text-sm text-slate-500 mt-1">
            View and manage all recorded customer installments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchPayments}
            className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl flex items-center gap-2 transition-all shadow-2xs"
          >
            <RefreshCw className={`w-4 h-4 text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-5 py-2.5 bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-md shadow-blue-900/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Payment</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs font-bold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchPayments}
            className="px-3 py-1.5 bg-white border border-red-200 hover:bg-red-100 text-red-900 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* 4 Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Total Payments */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Calendar className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold tracking-widest uppercase">TRANSACTIONS</span>
          </div>
          <div className="mt-4 space-y-1">
            <h2 className="text-3xl font-black text-slate-900">
              {isLoading ? '...' : payments.length}
            </h2>
            <p className="text-xs text-slate-500 font-medium">Total Payments Recorded</p>
          </div>
          <div className="w-16 h-1 bg-blue-600 rounded-full mt-4" />
        </div>

        {/* Card 2: Total Collection */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Wallet className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold tracking-widest uppercase text-emerald-600">COLLECTED</span>
          </div>
          <div className="mt-4 space-y-1">
            <h2 className="text-3xl font-black text-slate-900">
              ₹{isLoading ? '...' : totalCollected.toLocaleString('en-IN')}
            </h2>
            <p className="text-xs text-slate-500 font-medium">Total Amount Collected</p>
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
            <h2 className="text-3xl font-black text-slate-900">
              ₹{isLoading ? '...' : cashTotal.toLocaleString('en-IN')}
            </h2>
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
            <h2 className="text-3xl font-black text-slate-900">
              ₹{isLoading ? '...' : digitalTotal.toLocaleString('en-IN')}
            </h2>
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
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Receipt No, Payment Method, or ID..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          <button className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-2 transition-all shadow-2xs">
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
        <div>
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-3.5 grid grid-cols-12 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            <span className="col-span-3">RECEIPT NO.</span>
            <span className="col-span-3">DATE</span>
            <span className="col-span-2 text-right">AMOUNT</span>
            <span className="col-span-2 text-center">METHOD</span>
            <span className="col-span-2 text-right">STATUS</span>
          </div>

          <div className="divide-y divide-slate-100">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="px-6 py-4 grid grid-cols-12 items-center text-xs animate-pulse">
                  <div className="col-span-3 h-4 bg-slate-100 rounded w-24" />
                  <div className="col-span-3 h-4 bg-slate-100 rounded w-28" />
                  <div className="col-span-2 h-4 bg-slate-100 rounded w-16 ml-auto" />
                  <div className="col-span-2 h-4 bg-slate-100 rounded w-16 mx-auto" />
                  <div className="col-span-2 h-4 bg-slate-100 rounded w-16 ml-auto" />
                </div>
              ))
            ) : filteredPayments.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <Wallet className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="font-bold text-slate-700 text-sm">No payment transactions found</p>
                <p className="text-xs text-slate-400">
                  {searchQuery ? `No transactions match "${searchQuery}".` : 'No installment payments recorded in database yet.'}
                </p>
              </div>
            ) : (
              filteredPayments.map((p) => (
                <div key={p.id} className="px-6 py-4 grid grid-cols-12 items-center text-xs hover:bg-slate-50 transition-colors">
                  <div className="col-span-3 font-mono font-extrabold text-blue-900">
                    {p.paymentNumber || `#PAY-${p.id.slice(0, 8).toUpperCase()}`}
                  </div>
                  <div className="col-span-3 text-slate-600 font-medium">
                    {new Date(p.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>
                  <div className="col-span-2 text-right font-extrabold text-slate-900">
                    ₹{p.amount.toLocaleString('en-IN')}
                  </div>
                  <div className="col-span-2 text-center">
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-bold rounded-md uppercase text-[10px]">
                      {p.paymentMethod}
                    </span>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 font-extrabold rounded-md uppercase text-[10px]">
                      {p.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
          <span>Showing {filteredPayments.length} transaction{filteredPayments.length === 1 ? '' : 's'}</span>
          <span className="font-mono text-[11px] text-slate-400">PostgreSQL Financial Ledger</span>
        </div>
      </div>
    </div>
  );
}
