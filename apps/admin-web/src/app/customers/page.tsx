'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  Search, 
  Download, 
  UserPlus, 
  TrendingUp, 
  AlertTriangle, 
  Gift, 
  BarChart2, 
  Sparkles,
  HelpCircle,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  UserCheck
} from 'lucide-react';
import { CustomerService } from '@/features/customers';
import { Customer } from '@ramyas-jeweller/shared-types';
import { AppError } from '@/lib/errors/app-error';

const filterTabs = [
  'All Customers',
  'Active',
  'Inactive',
  'Suspended',
];

export default function CustomersListPage() {
  const [activeTab, setActiveTab] = useState('All Customers');
  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let statusParam = 'ALL';
      if (activeTab === 'Active') statusParam = 'ACTIVE';
      if (activeTab === 'Inactive') statusParam = 'INACTIVE';
      if (activeTab === 'Suspended') statusParam = 'SUSPENDED';

      const data = await CustomerService.getCustomers({
        search: searchQuery,
        status: statusParam,
      });

      setCustomers(data);
    } catch (err) {
      if (err instanceof AppError) {
        setError(err.toUserMessage());
      } else {
        setError('Failed to load customers from database. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, searchQuery]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Generate initials and avatar background for a customer name
  const getAvatarMeta = (name: string) => {
    const parts = name.trim().split(' ');
    const initials = parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}` : name.slice(0, 2).toUpperCase();
    const colors = ['bg-blue-600', 'bg-slate-700', 'bg-amber-700', 'bg-indigo-600', 'bg-emerald-700'];
    const charCode = name.charCodeAt(0) || 0;
    const avatarColor = colors[charCode % colors.length];
    return { initials, avatarColor };
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Error Banner with Retry */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs font-bold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchCustomers}
            className="px-3 py-1.5 bg-white border border-red-200 hover:bg-red-100 text-red-900 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      )}

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
          <button
            onClick={fetchCustomers}
            className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl flex items-center gap-2 transition-all shadow-2xs"
          >
            <RefreshCw className={`w-4 h-4 text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
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
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, mobile, or Customer ID..."
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
                <span className="col-span-4">Customer Name</span>
                <span className="col-span-3">Mobile</span>
                <span className="col-span-2 text-right">Status</span>
              </div>

              <div className="divide-y divide-slate-100">
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="px-6 py-4 grid grid-cols-12 items-center text-xs animate-pulse">
                      <div className="col-span-3 h-4 bg-slate-100 rounded w-24" />
                      <div className="col-span-4 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100" />
                        <div className="h-4 bg-slate-100 rounded w-32" />
                      </div>
                      <div className="col-span-3 h-4 bg-slate-100 rounded w-24" />
                      <div className="col-span-2 h-4 bg-slate-100 rounded w-16 ml-auto" />
                    </div>
                  ))
                ) : customers.length === 0 ? (
                  <div className="p-12 text-center space-y-3">
                    <UserCheck className="w-10 h-10 text-slate-300 mx-auto" />
                    <p className="font-bold text-slate-700 text-sm">No customers found</p>
                    <p className="text-xs text-slate-400">
                      {searchQuery ? `No customer records match "${searchQuery}".` : 'No customer records currently exist in the database.'}
                    </p>
                  </div>
                ) : (
                  customers.map((cust) => {
                    const { initials, avatarColor } = getAvatarMeta(cust.fullName);
                    return (
                      <Link
                        key={cust.id}
                        href={`/customers/${cust.id}`}
                        className="px-6 py-4 grid grid-cols-12 items-center text-xs hover:bg-slate-50 transition-colors group cursor-pointer"
                      >
                        {/* Customer ID */}
                        <div className="col-span-3 font-mono font-bold text-slate-600 group-hover:text-blue-600">
                          {cust.customerNumber}
                        </div>

                        {/* Customer Name + Avatar */}
                        <div className="col-span-4 flex items-center gap-3 min-w-0">
                          <div className={`w-8 h-8 rounded-full ${avatarColor} text-white flex items-center justify-center font-bold text-xs shadow-2xs shrink-0`}>
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                              {cust.fullName}
                            </p>
                            {cust.city && <p className="text-[10px] text-slate-400 truncate">{cust.city}</p>}
                          </div>
                        </div>

                        {/* Mobile */}
                        <div className="col-span-3 text-slate-600 font-medium">
                          {cust.mobileNumber}
                        </div>

                        {/* Status Badge */}
                        <div className="col-span-2 text-right">
                          <span className={`px-2.5 py-1 text-[10px] font-extrabold rounded-md uppercase tracking-wider ${
                            cust.status === 'ACTIVE' 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                              : cust.status === 'INACTIVE'
                              ? 'bg-slate-100 text-slate-600 border border-slate-200'
                              : 'bg-red-50 text-red-700 border border-red-200'
                          }`}>
                            {cust.status}
                          </span>
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
            </div>

            {/* Table Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
              <span>Showing {customers.length} customer record{customers.length === 1 ? '' : 's'}</span>
              <span className="font-mono text-[11px] text-slate-400">PostgreSQL Live Data</span>
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
                <p className="text-xs text-slate-400 mt-0.5">Database Summary</p>
              </div>
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <BarChart2 className="w-5 h-5" />
              </div>
            </div>

            {/* Stat Item 1 */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Total Registered Customers</span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  <TrendingUp className="w-3 h-3" /> Live
                </span>
              </div>
              <h2 className="text-3xl font-extrabold text-slate-900">
                {isLoading ? '...' : customers.length}
              </h2>
            </div>

            <div className="h-px bg-slate-100" />

            {/* Stat Item 2 */}
            <div className="space-y-1">
              <span className="text-xs text-slate-500">Active Status Customers</span>
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900">
                  {isLoading ? '...' : customers.filter(c => c.status === 'ACTIVE').length}
                </h2>
                <TrendingUp className="w-5 h-5 text-blue-500" />
              </div>
            </div>

            {/* Premium Insights Banner Box */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-3">
              <div className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 uppercase tracking-widest">
                <Sparkles className="w-3.5 h-3.5" /> SYSTEM METRICS
              </div>
              <Link
                href="/reports"
                className="w-full py-2 bg-white border border-blue-600 hover:bg-blue-50 text-blue-600 font-bold text-xs rounded-xl transition-all shadow-2xs block text-center"
              >
                View Analytics
              </Link>
            </div>
          </div>

          {/* Need Assistance Documentation Card (Dark Royal Blue Card) */}
          <div className="bg-blue-950 p-6 rounded-2xl text-white space-y-4 shadow-lg border border-blue-900">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-blue-400" />
              <h4 className="font-bold text-sm">Need Assistance?</h4>
            </div>
            <p className="text-xs text-blue-200/80 leading-relaxed">
              Check our documentation for customer onboarding & scheme management policies.
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
