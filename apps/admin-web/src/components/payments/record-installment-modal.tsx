'use client';

import { useState } from 'react';
import { X, Calendar, CreditCard, DollarSign, Smartphone, Landmark, Check } from 'lucide-react';

interface RecordInstallmentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RecordInstallmentModal({ isOpen, onClose }: RecordInstallmentModalProps) {
  const [amount, setAmount] = useState('1000');
  const [paymentDate, setPaymentDate] = useState('2026-08-25');
  const [paymentMethod, setPaymentMethod] = useState('Cash');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end">
      {/* Slide-over Drawer Panel */}
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-blue-950">Record Installment</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Record this month's installment for the selected customer.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-6 flex-1">
          {/* Customer Summary Card (from Screenshot 2) */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-blue-900 text-white font-extrabold text-lg flex items-center justify-center shadow-md shrink-0">
              AS
            </div>
            <div className="space-y-1">
              <h3 className="font-extrabold text-slate-900 text-base">Ananya Sharma</h3>
              <p className="text-[11px] text-slate-500 font-mono">ID: RJ-2023-441 • MOB: +91 98421 43307</p>
              <span className="inline-block px-2.5 py-0.5 bg-amber-100 text-amber-900 font-bold text-[10px] rounded-md">
                Scheme: Diwali Savings Scheme
              </span>
            </div>
          </div>

          {/* Scheme Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-500 uppercase tracking-wider text-[11px]">SCHEME PROGRESS</span>
              <span className="text-blue-900">8 / 12 Months</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-900 rounded-full w-[66.7%]" />
            </div>
          </div>

          {/* 4 Stat Cards Grid (2x2 Grid from Screenshot 2) */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Paid</span>
              <h3 className="text-lg font-extrabold text-slate-900">₹8,000</h3>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Remaining</span>
              <h3 className="text-lg font-extrabold text-slate-900">₹4,000</h3>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[10px] text-amber-600 font-bold uppercase">Bonus</span>
              <h3 className="text-lg font-extrabold text-amber-600">₹1,000</h3>
            </div>

            <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 space-y-1">
              <span className="text-[10px] text-blue-900 font-bold uppercase">Eligible</span>
              <h3 className="text-lg font-extrabold text-blue-900">₹13,000</h3>
            </div>
          </div>

          {/* Current Installment Box */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 text-xs font-extrabold text-blue-950 uppercase tracking-wider border-b border-slate-100 pb-3">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>CURRENT INSTALLMENT</span>
            </div>

            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span>Installment 9 of 12</span>
              <span className="text-slate-900">September 2023</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-900 text-xs">₹</span>
                  <input
                    type="text"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Payment Date
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Payment Method Selector Grid (2x2 Grid from Screenshot 2) */}
          <div className="space-y-2">
            <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
              PAYMENT METHOD
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'Cash', label: 'Cash', icon: DollarSign },
                { id: 'GPay', label: 'GPay', icon: CreditCard },
                { id: 'PhonePe', label: 'PhonePe', icon: Smartphone },
                { id: 'Transfer', label: 'Transfer', icon: Landmark },
              ].map((m) => {
                const Icon = m.icon;
                const isSelected = paymentMethod === m.id;

                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id)}
                    className={`p-3.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all relative ${
                      isSelected
                        ? 'border-blue-900 bg-blue-50/50 text-blue-950 font-bold shadow-2xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {isSelected && (
                      <span className="w-4 h-4 bg-blue-900 text-white rounded-full flex items-center justify-center absolute top-2 right-2">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </span>
                    )}
                    <Icon className={`w-5 h-5 ${isSelected ? 'text-blue-900' : 'text-slate-400'}`} />
                    <span className="text-xs">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-100 flex items-center gap-3 bg-slate-50/50">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition-all shadow-2xs"
          >
            Cancel
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-900/20"
          >
            <CreditCard className="w-4 h-4" />
            <span>Record Installment</span>
          </button>
        </div>
      </div>
    </div>
  );
}
