'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  X, 
  Calendar, 
  CreditCard, 
  DollarSign, 
  Smartphone, 
  Landmark, 
  Check, 
  AlertCircle, 
  Loader2,
  Search,
  User,
  ShieldCheck
} from 'lucide-react';
import { PaymentService } from '@/features/payments';
import { CustomerService } from '@/features/customers';
import { SchemeService } from '@/features/schemes';
import { PaymentMethod, Customer, CustomerScheme, Installment } from '@ramyas-jeweller/shared-types';
import { AppError } from '@/lib/errors/app-error';

interface RecordInstallmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerSchemeId?: string;
  installmentId?: string;
  customerName?: string;
  customerNumber?: string;
  mobileNumber?: string;
  schemeTitle?: string;
  defaultAmount?: number;
  paidCount?: number;
  totalInstallments?: number;
  onSuccess?: () => void;
}

export function RecordInstallmentModal({
  isOpen,
  onClose,
  customerSchemeId: initialSchemeId,
  installmentId: initialInstallmentId,
  customerName: initialCustomerName,
  customerNumber: initialCustomerNumber,
  mobileNumber: initialMobileNumber,
  schemeTitle: initialSchemeTitle,
  defaultAmount: initialAmount,
  paidCount: initialPaidCount,
  totalInstallments: initialTotalInstallments,
  onSuccess,
}: RecordInstallmentModalProps) {
  // Selected Customer & Scheme State
  const [selectedSchemeId, setSelectedSchemeId] = useState<string | undefined>(initialSchemeId);
  const [selectedInstallmentId, setSelectedInstallmentId] = useState<string | undefined>(initialInstallmentId);
  const [customerName, setCustomerName] = useState<string>(initialCustomerName || '');
  const [customerNumber, setCustomerNumber] = useState<string>(initialCustomerNumber || '');
  const [mobileNumber, setMobileNumber] = useState<string>(initialMobileNumber || '');
  const [schemeTitle, setSchemeTitle] = useState<string>(initialSchemeTitle || '');
  const [paidCount, setPaidCount] = useState<number>(initialPaidCount || 0);
  const [totalInstallments, setTotalInstallments] = useState<number>(initialTotalInstallments || 12);

  // Search Customer State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingScheme, setIsLoadingScheme] = useState(false);

  // Form Fields
  const [amount, setAmount] = useState(initialAmount ? String(initialAmount) : '');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Reset or Sync when modal opens or initial props change
  useEffect(() => {
    if (isOpen) {
      setSelectedSchemeId(initialSchemeId);
      setSelectedInstallmentId(initialInstallmentId);
      setCustomerName(initialCustomerName || '');
      setCustomerNumber(initialCustomerNumber || '');
      setMobileNumber(initialMobileNumber || '');
      setSchemeTitle(initialSchemeTitle || '');
      setAmount(initialAmount ? String(initialAmount) : '');
      setPaidCount(initialPaidCount || 0);
      setTotalInstallments(initialTotalInstallments || 12);
      setSearchQuery('');
      setSearchResults([]);
      setErrorMessage(null);
      setSuccessMessage(null);

      // If initialSchemeId is provided but initialInstallmentId is missing, resolve next pending installment
      if (initialSchemeId && !initialInstallmentId) {
        setIsLoadingScheme(true);
        PaymentService.getCustomerSchemeInstallments(initialSchemeId)
          .then((installments) => {
            const pendingInst = installments.find((inst) => inst.status === 'PENDING');
            if (pendingInst) {
              setSelectedInstallmentId(pendingInst.id);
              setAmount(String(pendingInst.expectedAmount));
            } else {
              setSelectedInstallmentId(undefined);
              setErrorMessage('All installments for this customer scheme have been completed.');
            }
          })
          .catch(() => {
            setErrorMessage('Unable to load pending installment details for this scheme.');
          })
          .finally(() => {
            setIsLoadingScheme(false);
          });
      }
    }
  }, [
    isOpen, 
    initialSchemeId, 
    initialInstallmentId, 
    initialCustomerName, 
    initialCustomerNumber, 
    initialMobileNumber, 
    initialSchemeTitle, 
    initialAmount, 
    initialPaidCount, 
    initialTotalInstallments
  ]);

  // Handle Customer Search Input Change
  const handleSearchCustomers = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await CustomerService.getCustomers({ search: query.trim() });
      setSearchResults(results);
    } catch (err) {
      // Fallback
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Handle Customer Selection from Search Results
  const handleSelectCustomer = async (cust: Customer) => {
    setCustomerName(cust.fullName);
    setCustomerNumber(cust.customerNumber);
    setMobileNumber(cust.mobileNumber);
    setSearchResults([]);
    setSearchQuery('');
    setErrorMessage(null);
    setIsLoadingScheme(true);

    try {
      // 1. Fetch customer's active schemes
      const customerSchemes = await SchemeService.getCustomerSchemes(cust.id);
      const activeScheme = customerSchemes.find((s) => s.status === 'ACTIVE') || customerSchemes[0];

      if (!activeScheme) {
        setSelectedSchemeId(undefined);
        setSelectedInstallmentId(undefined);
        setSchemeTitle('');
        setErrorMessage(`Customer "${cust.fullName}" is not enrolled in any active scheme.`);
        return;
      }

      setSelectedSchemeId(activeScheme.id);
      setPaidCount(activeScheme.paidInstallmentsCount);
      setTotalInstallments(activeScheme.totalInstallments);

      // Fetch scheme plan title if available
      try {
        const plan = await SchemeService.getSchemePlanById(activeScheme.schemePlanId);
        setSchemeTitle(plan.title);
      } catch (e) {
        setSchemeTitle('Gold Savings Scheme');
      }

      // 2. Fetch pending installments for this customer scheme
      const installments = await PaymentService.getCustomerSchemeInstallments(activeScheme.id);
      const pendingInstallment = installments.find((inst) => inst.status === 'PENDING');

      if (!pendingInstallment) {
        setSelectedInstallmentId(undefined);
        setErrorMessage(`Customer "${cust.fullName}" has completed all installments for this scheme.`);
        return;
      }

      setSelectedInstallmentId(pendingInstallment.id);
      setAmount(String(pendingInstallment.expectedAmount));
    } catch (err) {
      if (err instanceof AppError) {
        setErrorMessage(err.toUserMessage());
      } else {
        setErrorMessage('Failed to load customer scheme details.');
      }
    } finally {
      setIsLoadingScheme(false);
    }
  };

  if (!isOpen) return null;

  const handleRecordPayment = async () => {
    if (isSubmitting) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage('Payment amount must be a positive number greater than zero.');
      return;
    }

    if (!selectedSchemeId || !selectedInstallmentId) {
      if (customerName && !selectedSchemeId) {
        setErrorMessage(`Customer "${customerName}" is not enrolled in any active scheme.`);
      } else if (selectedSchemeId && !selectedInstallmentId) {
        setErrorMessage('All installments for this customer scheme have been completed.');
      } else {
        setErrorMessage('Please search and select a customer with an active scheme to record payment.');
      }
      return;
    }

    setIsSubmitting(true);

    try {
      await PaymentService.recordInstallmentPayment({
        customerSchemeId: selectedSchemeId,
        installmentId: selectedInstallmentId,
        amount: parsedAmount,
        paymentMethod,
        paymentReference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      setSuccessMessage('Payment recorded successfully in database!');
      if (onSuccess) {
        onSuccess();
      }

      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
      }, 1200);
    } catch (err) {
      if (err instanceof AppError) {
        setErrorMessage(err.toUserMessage());
      } else {
        setErrorMessage('Failed to record payment in database. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'RJ';
    const parts = name.trim().split(' ');
    return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}` : name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end font-sans">
      {/* Slide-over Drawer Panel */}
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
          <div>
            <h2 className="text-xl font-extrabold text-blue-950">Record Installment</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Search customer and record monthly scheme installment.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-6 flex-1">
          {successMessage && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Customer Search Bar (Required when not pre-selected) */}
          <div className="space-y-2 relative">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Search Customer <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchCustomers(e.target.value)}
                placeholder="Search by customer name, mobile or RJ-CUST-ID..."
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
              />
              {isSearching && (
                <Loader2 className="w-4 h-4 animate-spin absolute right-3.5 top-1/2 -translate-y-1/2 text-blue-600" />
              )}
            </div>

            {/* Search Dropdown Results */}
            {searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl border border-slate-200 shadow-xl max-h-48 overflow-y-auto z-50 divide-y divide-slate-100">
                {searchResults.map((cust) => (
                  <button
                    key={cust.id}
                    type="button"
                    onClick={() => handleSelectCustomer(cust)}
                    className="w-full px-4 py-3 text-left hover:bg-blue-50/60 transition-colors flex items-center justify-between group"
                  >
                    <div>
                      <p className="font-extrabold text-xs text-slate-900 group-hover:text-blue-900">{cust.fullName}</p>
                      <p className="text-[11px] text-slate-500">MOB: {cust.mobileNumber} • ID: {cust.customerNumber}</p>
                    </div>
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md">Select</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Customer Summary & Active Scheme Card */}
          {isLoadingScheme ? (
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto" />
              <p className="text-xs font-bold text-slate-600">Loading active scheme details...</p>
            </div>
          ) : customerName ? (
            <div className="p-4 rounded-2xl bg-slate-50 border border-blue-200 flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-900 text-white font-extrabold text-sm flex items-center justify-center shadow-sm shrink-0">
                {getInitials(customerName)}
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <h3 className="font-extrabold text-slate-900 text-sm truncate">{customerName}</h3>
                <p className="text-[11px] text-slate-500 font-mono truncate">ID: {customerNumber} • MOB: {mobileNumber}</p>
                {schemeTitle ? (
                  <div className="pt-1 flex items-center justify-between">
                    <span className="inline-block px-2.5 py-0.5 bg-blue-100 text-blue-900 font-bold text-[10px] rounded-md truncate">
                      {schemeTitle}
                    </span>
                    <span className="text-[11px] font-bold text-slate-600">
                      ({paidCount + 1} of {totalInstallments} Months)
                    </span>
                  </div>
                ) : (
                  <p className="text-[11px] font-bold text-amber-700">No active scheme found</p>
                )}
              </div>
            </div>
          ) : null}

          {/* Amount & Date Input Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Amount (₹) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-xs text-slate-400">₹</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="1000"
                  className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Payment Date
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Payment Method <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'CASH', label: 'Cash', icon: DollarSign },
                { id: 'GPAY', label: 'GPay', icon: Smartphone },
                { id: 'PHONEPE', label: 'PhonePe', icon: Smartphone },
                { id: 'PAYTM', label: 'Paytm', icon: Smartphone },
                { id: 'NETBANKING', label: 'NetBank', icon: Landmark },
                { id: 'CARD', label: 'Card', icon: CreditCard },
              ].map((m) => {
                const IconComp = m.icon;
                const isSelected = paymentMethod === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id as PaymentMethod)}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-xs ring-1 ring-blue-500/20'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <IconComp className={`w-4 h-4 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Payment Reference Number */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Payment Reference (UPI / UTR / Check No)
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. UPI/328104810294 or Cash Receipt #"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
            />
          </div>

          {/* Notes Input */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Add any internal transaction notes..."
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium resize-none"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl transition-all disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleRecordPayment}
            disabled={isSubmitting || !selectedSchemeId || !selectedInstallmentId}
            className="px-6 py-2.5 bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-900/20 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Recording...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4 text-white" />
                <span>Confirm & Record Payment</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
