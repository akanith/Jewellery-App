/**
 * RAMYAS JEWELLER - UI Formatting & Helper Utilities
 */

import { SchemeStatus, InstallmentStatus, PaymentMethod } from '@/types/database';

/**
 * Formats a number to Indian Rupee currency format (e.g. ₹1,000, ₹13,000.00)
 */
export function formatCurrency(amount: number | null | undefined, showDecimals = false): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '₹0';
  }

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: showDecimals ? 2 : 0,
    minimumFractionDigits: showDecimals ? 2 : 0,
  }).format(amount);
}

/**
 * Formats an ISO date/time string to readable display format (e.g. 15 Sep 2023)
 */
export function formatDate(dateString: string | null | undefined, format: 'short' | 'medium' | 'long' | 'month-year' = 'medium'): string {
  if (!dateString) return '—';

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '—';

  switch (format) {
    case 'short':
      return date.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    case 'month-year':
      return date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
    case 'long':
      return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    case 'medium':
    default:
      return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }
}

/**
 * Formats an ISO date/time string to Month Year display format (e.g. Jan 2023)
 */
export function formatMonthYear(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}


/**
 * Formats a time string (e.g. 10:45 AM)
 */
export function formatTime(dateString: string | null | undefined): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

/**
 * Formats 10-digit Indian phone number (e.g. +91 98765 43210)
 */
export function formatPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return '—';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return `+91 ${cleaned.slice(2, 7)} ${cleaned.slice(7)}`;
  }
  return phone;
}

/**
 * Returns badge styling for Scheme Status
 */
export function getSchemeStatusBadge(status: SchemeStatus): { label: string; className: string; dotClass: string } {
  switch (status) {
    case 'ACTIVE':
      return { label: 'Active', className: 'bg-emerald-50 text-emerald-700 border-emerald-200', dotClass: 'bg-emerald-500' };
    case 'MATURED':
      return { label: 'Matured (Bonus Ready)', className: 'bg-amber-50 text-amber-700 border-amber-200', dotClass: 'bg-amber-500' };
    case 'COMPLETED':
      return { label: 'Completed', className: 'bg-blue-50 text-blue-700 border-blue-200', dotClass: 'bg-blue-500' };
    case 'PARTIALLY_REDEEMED':
      return { label: 'Partially Redeemed', className: 'bg-purple-50 text-purple-700 border-purple-200', dotClass: 'bg-purple-500' };
    case 'FULLY_REDEEMED':
      return { label: 'Fully Redeemed', className: 'bg-slate-100 text-slate-700 border-slate-200', dotClass: 'bg-slate-400' };
    case 'EMERGENCY_REFUNDED':
      return { label: 'Refunded', className: 'bg-rose-50 text-rose-700 border-rose-200', dotClass: 'bg-rose-500' };
    case 'CANCELLED':
      return { label: 'Cancelled', className: 'bg-rose-50 text-rose-700 border-rose-200', dotClass: 'bg-rose-500' };
    default:
      return { label: status, className: 'bg-slate-50 text-slate-600 border-slate-200', dotClass: 'bg-slate-400' };
  }
}

/**
 * Returns badge styling for Installment Status
 */
export function getInstallmentStatusBadge(status: InstallmentStatus): { label: string; className: string } {
  switch (status) {
    case 'PAID':
      return { label: 'PAID', className: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold' };
    case 'PENDING':
      return { label: 'PENDING', className: 'bg-amber-50 text-amber-700 border-amber-200 font-medium' };
    default:
      return { label: status, className: 'bg-slate-50 text-slate-600 border-slate-200' };
  }
}

/**
 * Returns badge styling for Payment Method
 */
export function getPaymentMethodBadge(method: PaymentMethod): { label: string; className: string } {
  switch (method) {
    case 'GPAY':
      return { label: 'GPAY', className: 'bg-blue-50 text-blue-700 border-blue-200' };
    case 'PHONEPE':
      return { label: 'PHONEPE', className: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
    case 'CASH':
      return { label: 'CASH', className: 'bg-amber-50 text-amber-800 border-amber-200' };
    case 'BANK_TRANSFER':
      return { label: 'BANK TRANSFER', className: 'bg-sky-50 text-sky-700 border-sky-200' };
    case 'UPI':
      return { label: 'UPI', className: 'bg-teal-50 text-teal-700 border-teal-200' };
    case 'CARD':
      return { label: 'CARD', className: 'bg-violet-50 text-violet-700 border-violet-200' };
    default:
      return { label: method, className: 'bg-slate-50 text-slate-700 border-slate-200' };
  }
}
