'use client';

/**
 * RAMYAS JEWELLER - Customers Directory Page
 * Step 9.2.2: Connected to live Supabase database with RLS authentication.
 */

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  PlusCircle,
  Phone,
  MapPin,
  Sparkles,
  ArrowRight,
  Loader2,
  AlertCircle,
  RefreshCw,
  UserX,
  Users
} from 'lucide-react';
import { formatCurrency, formatPhoneNumber } from '@/lib/formatters';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { SchemeStatus } from '@/types/database';

interface SchemeInstallmentRaw {
  id: string;
  installment_number: number;
  status: string;
  paid_amount: number;
}

interface SchemeRaw {
  id: string;
  scheme_code: string;
  status: SchemeStatus;
  monthly_installment_amount: number;
  total_installments: number;
  bonus_amount: number;
  maturity_amount: number;
  created_at: string;
  scheme_installments?: SchemeInstallmentRaw[];
}

interface CustomerRaw {
  id: string;
  customer_code: string;
  full_name: string;
  phone_number: string;
  city: string | null;
  created_at: string;
  schemes?: SchemeRaw[];
}

interface CustomerListItem {
  id: string;
  customer_code: string;
  full_name: string;
  phone_number: string;
  city: string;
  joined_date: string;
  active_scheme_code: string;
  paid_installments: number;
  total_installments: number;
  total_paid: number;
  scheme_status: string;
  has_scheme: boolean;
}

export default function CustomersPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'MATURED'>('ALL');

  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchCustomers = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const supabase = getSupabaseBrowserClient();

      const { data, error } = await supabase
        .from('customers')
        .select(`
          id,
          customer_code,
          full_name,
          phone_number,
          city,
          created_at,
          schemes (
            id,
            scheme_code,
            status,
            monthly_installment_amount,
            total_installments,
            bonus_amount,
            maturity_amount,
            created_at,
            scheme_installments (
              id,
              installment_number,
              status,
              paid_amount
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message || 'Failed to fetch customer records.');
      }

      const rawCustomers = (data || []) as unknown as CustomerRaw[];

      const mappedCustomers: CustomerListItem[] = rawCustomers.map((c) => {
        const schemes = c.schemes || [];
        
        // Find most relevant scheme: active first, then matured/completed, or latest
        const activeScheme = schemes.find((s) => s.status === 'ACTIVE');
        const maturedScheme = schemes.find((s) => s.status === 'MATURED' || s.status === 'COMPLETED');
        const latestScheme = schemes[0] || null;
        const primaryScheme = activeScheme || maturedScheme || latestScheme;

        if (primaryScheme) {
          const installments = primaryScheme.scheme_installments || [];
          const paidInstallments = installments.filter((inst) => inst.status === 'PAID');
          const paidCount = paidInstallments.length;
          const totalPaid = paidInstallments.reduce(
            (sum, inst) => sum + (Number(inst.paid_amount) || 0),
            0
          );

          return {
            id: c.id,
            customer_code: c.customer_code,
            full_name: c.full_name,
            phone_number: c.phone_number,
            city: c.city || 'Coimbatore',
            joined_date: c.created_at,
            active_scheme_code: primaryScheme.scheme_code,
            paid_installments: paidCount,
            total_installments: primaryScheme.total_installments || 12,
            total_paid: totalPaid,
            scheme_status: primaryScheme.status,
            has_scheme: true,
          };
        }

        // Customer without enrolled schemes
        return {
          id: c.id,
          customer_code: c.customer_code,
          full_name: c.full_name,
          phone_number: c.phone_number,
          city: c.city || 'Coimbatore',
          joined_date: c.created_at,
          active_scheme_code: 'No Scheme',
          paid_installments: 0,
          total_installments: 12,
          total_paid: 0,
          scheme_status: 'NONE',
          has_scheme: false,
        };
      });

      setCustomers(mappedCustomers);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to connect to Supabase.';
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data, error } = await supabase
          .from('customers')
          .select(`
            id,
            customer_code,
            full_name,
            phone_number,
            city,
            created_at,
            schemes (
              id,
              scheme_code,
              status,
              monthly_installment_amount,
              total_installments,
              bonus_amount,
              maturity_amount,
              created_at,
              scheme_installments (
                id,
                installment_number,
                status,
                paid_amount
              )
            )
          `)
          .order('created_at', { ascending: false });

        if (!isMounted) return;

        if (error) {
          setErrorMessage(error.message || 'Failed to fetch customer records.');
          setIsLoading(false);
          return;
        }

        const rawCustomers = (data || []) as unknown as CustomerRaw[];
        const mappedCustomers: CustomerListItem[] = rawCustomers.map((c) => {
          const schemes = c.schemes || [];
          const activeScheme = schemes.find((s) => s.status === 'ACTIVE');
          const maturedScheme = schemes.find((s) => s.status === 'MATURED' || s.status === 'COMPLETED');
          const latestScheme = schemes[0] || null;
          const primaryScheme = activeScheme || maturedScheme || latestScheme;

          if (primaryScheme) {
            const installments = primaryScheme.scheme_installments || [];
            const paidInstallments = installments.filter((inst) => inst.status === 'PAID');
            const paidCount = paidInstallments.length;
            const totalPaid = paidInstallments.reduce(
              (sum, inst) => sum + (Number(inst.paid_amount) || 0),
              0
            );

            return {
              id: c.id,
              customer_code: c.customer_code,
              full_name: c.full_name,
              phone_number: c.phone_number,
              city: c.city || 'Coimbatore',
              joined_date: c.created_at,
              active_scheme_code: primaryScheme.scheme_code,
              paid_installments: paidCount,
              total_installments: primaryScheme.total_installments || 12,
              total_paid: totalPaid,
              scheme_status: primaryScheme.status,
              has_scheme: true,
            };
          }

          return {
            id: c.id,
            customer_code: c.customer_code,
            full_name: c.full_name,
            phone_number: c.phone_number,
            city: c.city || 'Coimbatore',
            joined_date: c.created_at,
            active_scheme_code: 'No Scheme',
            paid_installments: 0,
            total_installments: 12,
            total_paid: 0,
            scheme_status: 'NONE',
            has_scheme: false,
          };
        });

        setCustomers(mappedCustomers);
      } catch (err: unknown) {
        if (!isMounted) return;
        const message = err instanceof Error ? err.message : 'Failed to connect to Supabase.';
        setErrorMessage(message);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredCustomers = customers.filter((c) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      c.full_name.toLowerCase().includes(query) ||
      c.phone_number.includes(query) ||
      c.customer_code.toLowerCase().includes(query) ||
      c.active_scheme_code.toLowerCase().includes(query);

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && c.scheme_status === 'ACTIVE') ||
      (statusFilter === 'MATURED' && (c.scheme_status === 'MATURED' || c.scheme_status === 'COMPLETED'));

    return matchesSearch && matchesStatus;
  });

  const activeCount = customers.filter((c) => c.scheme_status === 'ACTIVE').length;
  const maturedCount = customers.filter(
    (c) => c.scheme_status === 'MATURED' || c.scheme_status === 'COMPLETED'
  ).length;

  return (
    <div className="space-y-6">
      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif-luxury text-slate-900">
            Customers Directory
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage enrolled savings scheme customers, view passbooks, and issue receipts.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => fetchCustomers()}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs disabled:opacity-50"
            title="Refresh list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <Link
            href="/customers/new"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl royal-button text-xs font-semibold"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add New Customer</span>
          </Link>
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="luxury-card p-4 bg-rose-50 border-rose-200 text-rose-900 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-sm">Failed to load live customer data</div>
              <div className="text-xs text-rose-700 mt-0.5">{errorMessage}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => fetchCustomers()}
            className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="luxury-card p-4 sm:p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xs">
        <div className="relative w-full md:max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by customer name, mobile, or ID..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All ({customers.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('ACTIVE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              statusFilter === 'ACTIVE'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            Active Schemes ({activeCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('MATURED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              statusFilter === 'MATURED'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            Matured (Ready) ({maturedCount})
          </button>
        </div>
      </div>

      {/* Customers Data Table */}
      <div className="luxury-card overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <div className="text-sm font-medium text-slate-600">
              Loading live customer records from Supabase...
            </div>
          </div>
        ) : customers.length === 0 ? (
          /* Empty Database State */
          <div className="py-16 px-6 text-center flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <Users className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900 font-serif-luxury">
              No Customers Found
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-sm mt-1.5 mb-6">
              There are currently no customer accounts in the database. Get started by registering your first savings scheme customer.
            </p>
            <Link
              href="/customers/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl royal-button text-xs font-semibold"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Register First Customer</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm text-slate-700">
              <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider text-[11px] font-semibold border-b border-slate-200/80">
                <tr>
                  <th className="py-3.5 px-5">Customer</th>
                  <th className="py-3.5 px-5">Contact & Location</th>
                  <th className="py-3.5 px-5">Active Scheme</th>
                  <th className="py-3.5 px-5">Progress</th>
                  <th className="py-3.5 px-5">Total Paid</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <UserX className="w-6 h-6 text-slate-300" />
                        <div>No customers found matching your search or filters.</div>
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery('');
                            setStatusFilter('ALL');
                          }}
                          className="text-xs font-semibold text-blue-600 hover:underline mt-1"
                        >
                          Clear search and filters
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((c) => {
                    const progressPct = c.has_scheme
                      ? Math.min(100, Math.round((c.paid_installments / c.total_installments) * 100))
                      : 0;
                    const isMatured = c.scheme_status === 'MATURED' || c.scheme_status === 'COMPLETED';

                    return (
                      <tr
                        key={c.id}
                        className="hover:bg-slate-50/70 transition cursor-pointer"
                        onClick={() => router.push(`/customers/${c.id}`)}
                      >
                        {/* Customer Name & Code */}
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
                              {(c.full_name || 'C').slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900">{c.full_name}</div>
                              <div className="text-[11px] text-slate-500 font-mono">
                                {c.customer_code}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Contact & City */}
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-1.5 text-slate-800 font-medium">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span>{formatPhoneNumber(c.phone_number)}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span>{c.city}</span>
                          </div>
                        </td>

                        {/* Scheme Code & Badge */}
                        <td className="py-4 px-5">
                          <div className="font-mono text-xs font-semibold text-slate-800">
                            {c.active_scheme_code}
                          </div>
                          <div className="mt-1">
                            {!c.has_scheme ? (
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
                                Not Enrolled
                              </span>
                            ) : isMatured ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                                <Sparkles className="w-2.5 h-2.5" /> ₹13,000 Matured
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                ₹1,000 / Month
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Progress Bar */}
                        <td className="py-4 px-5 min-w-[140px]">
                          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 mb-1">
                            <span>
                              {c.has_scheme ? `${c.paid_installments} of ${c.total_installments}` : '—'}
                            </span>
                            <span>{c.has_scheme ? `${progressPct}%` : '0%'}</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                isMatured
                                  ? 'bg-amber-500'
                                  : 'bg-blue-600'
                              }`}
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        </td>

                        {/* Total Paid */}
                        <td className="py-4 px-5 font-mono font-bold text-slate-900">
                          {formatCurrency(c.total_paid)}
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-5 text-right">
                          <Link
                            href={`/customers/${c.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            <span>Passbook</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
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
    </div>
  );
}
