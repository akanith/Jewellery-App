'use client';

import { useState } from 'react';
import { X, Printer, CheckCircle2, ShieldCheck, Award } from 'lucide-react';

interface CompleteRedemptionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CompleteRedemptionModal({ isOpen, onClose }: CompleteRedemptionModalProps) {
  const [billNumber, setBillNumber] = useState('INV-8829');
  const [billAmount, setBillAmount] = useState('28500');
  const [category, setCategory] = useState('Gold');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end">
      {/* Slide-over Drawer Panel */}
      <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-blue-950">Complete Redemption</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Finalize the customer's jewellery savings scheme.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 flex-1">
          {/* Customer Summary Card */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-900 text-white flex items-center justify-center font-bold text-base shadow-sm shrink-0">
                AS
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">Ananya Sharma</h3>
                <p className="text-[11px] text-slate-400 font-mono">ID: RJ-2023-441 • +91 98421 43307</p>
              </div>
            </div>

            <div className="h-px bg-slate-200/60" />

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">SCHEME</span>
                <p className="font-bold text-slate-900 mt-0.5">Diwali Savings Scheme</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">JOINED</span>
                <p className="font-bold text-slate-900 mt-0.5">Jan 05, 2023</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">STATUS</span>
                <p className="mt-0.5">
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-md">
                    Ready for Redemption
                  </span>
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">COMPLETED</span>
                <p className="font-bold text-slate-900 mt-0.5">Dec 24, 2023</p>
              </div>
            </div>
          </div>

          {/* Total Eligible Value Card (Dark Royal Blue Box matching Screenshot 2) */}
          <div className="p-6 rounded-2xl bg-blue-950 text-white shadow-lg space-y-4 relative overflow-hidden">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-[10px] font-extrabold text-blue-200/80 uppercase tracking-wider">TOTAL PAID AMOUNT</span>
                <p className="text-xl font-extrabold mt-0.5">₹12,000</p>
              </div>
              <div>
                <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-wider">SHOP BONUS</span>
                <p className="text-xl font-extrabold mt-0.5 text-amber-400">₹1,000</p>
              </div>
            </div>

            <div className="pt-2 border-t border-blue-900 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold text-blue-200/80 uppercase tracking-wider">NET ELIGIBLE VALUE</span>
                <h1 className="text-3xl font-black tracking-tight mt-0.5 text-amber-400">₹13,000</h1>
              </div>
              <ShieldCheck className="w-8 h-8 text-amber-400 stroke-1" />
            </div>
          </div>

          {/* Purchase Details Form */}
          <div className="space-y-4 pt-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">PURCHASE DETAILS</h4>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Bill Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. INV-8829"
                  value={billNumber}
                  onChange={(e) => setBillNumber(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Bill Amount (₹)
                </label>
                <input
                  type="text"
                  value={billAmount}
                  onChange={(e) => setBillAmount(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            {/* Category Pills */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Jewellery Category
              </label>
              <div className="grid grid-cols-4 gap-2">
                {['Gold', 'Silver', 'Diamond', 'Other'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`py-2 rounded-xl text-xs font-bold transition-all ${
                      category === cat
                        ? 'bg-blue-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t border-slate-100 space-y-3 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <button className="p-3 bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs">
              <Printer className="w-4 h-4" />
            </button>
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
              <span>Complete Redemption</span>
              <CheckCircle2 className="w-4 h-4" />
            </button>
          </div>

          <p className="text-[10px] text-center text-slate-400 font-semibold uppercase tracking-widest pt-1">
            AUTHORIZED BY RAMYAS JEWELLER MANAGEMENT SYSTEM
          </p>
        </div>
      </div>
    </div>
  );
}
