'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Phone, 
  MapPin, 
  Calendar, 
  CreditCard, 
  Edit, 
  Printer, 
  Gift, 
  CheckCircle2, 
  Clock, 
  FileText,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { CompleteRedemptionModal } from '@/components/redemption/redemption-modal';
import { RecordInstallmentModal } from '@/components/payments/record-installment-modal';
import { EditCustomerModal } from '@/components/customers/edit-customer-modal';

export default function CustomerDetailsPage() {
  const [isRedemptionOpen, setIsRedemptionOpen] = useState(false);
  const [isInstallmentOpen, setIsInstallmentOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [customer, setCustomer] = useState({
    name: 'Ananya Sharma',
    mobile: '+91 98421 43307',
    altMobile: '+91 98765 43210',
    address: '91 Main Road, Dindigul - 624001',
    nomineeName: 'Suresh Sharma',
    relationship: 'Spouse',
    status: 'Active Member',
  });

  return (
    <div className="space-y-8 pb-16">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
        <Link href="/customers" className="hover:text-blue-600">Customers</Link>
        <span>/</span>
        <span className="text-slate-900 font-bold">{customer.name}</span>
      </div>

      {/* Top Header Row: 2 Cards Side-by-Side */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Card 1: Customer Profile Card (5 cols) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-xl shadow-md ring-4 ring-blue-50 shrink-0">
              AS
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-slate-900">{customer.name}</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {customer.status}
                </span>
              </div>
              <p className="text-xs font-mono text-slate-400 font-semibold">ID: RJ-2023-441</p>
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-3 text-slate-600">
              <Phone className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="font-semibold text-slate-900">{customer.mobile}</span>
            </div>
            <div className="flex items-center gap-3 text-slate-600">
              <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
              <span>{customer.address}</span>
            </div>
            <div className="flex items-center gap-3 text-slate-600">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <span>Scheme Joined: <strong className="text-slate-900">Diwali Savings Scheme • Jan 05, 2023</strong></span>
            </div>
          </div>
        </div>

        {/* Card 2: Scheme Progress Card (7 cols) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-bold text-lg text-slate-900">Scheme Progress</h3>
              <p className="text-xs text-slate-400">12-Month Gold Accumulation Plan</p>
            </div>
            <div className="text-right">
              <h2 className="text-2xl font-extrabold text-blue-600">₹13,000</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">TOTAL ELIGIBLE VALUE</p>
            </div>
          </div>

          {/* Progress Bar & Month Count */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-slate-700">8 of 12 Months Completed</span>
              <span className="text-blue-600 font-extrabold">66.7%</span>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 rounded-full transition-all w-[66.7%]" />
            </div>
            <div className="flex justify-between text-[11px] text-slate-400 font-medium pt-1">
              <span>Started Jan 2023</span>
              <span>Matures Dec 2023</span>
            </div>
          </div>

          {/* 4 Stat Box Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Paid Amount</span>
              <p className="text-base font-bold text-slate-900 mt-0.5">₹8,000</p>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Remaining</span>
              <p className="text-base font-bold text-slate-900 mt-0.5">₹4,000</p>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Bonus Credit</span>
              <p className="text-base font-bold text-slate-900 mt-0.5">₹1,000</p>
            </div>
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-center">
              <span className="text-[10px] font-bold text-blue-600 uppercase">Next Payment</span>
              <p className="text-base font-bold text-blue-700 mt-0.5">AUGUST</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Button Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => setIsInstallmentOpen(true)}
          className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-md shadow-blue-500/20 transition-all"
        >
          <CreditCard className="w-4 h-4" />
          <span>Record Installment</span>
        </button>

        <button
          onClick={() => setIsEditModalOpen(true)}
          className="px-5 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-2 shadow-2xs transition-all"
        >
          <Edit className="w-4 h-4 text-slate-500" />
          <span>Edit Customer</span>
        </button>

        <button className="px-5 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-2 shadow-2xs transition-all">
          <Printer className="w-4 h-4 text-slate-500" />
          <span>Print Passbook</span>
        </button>

        <button 
          onClick={() => setIsRedemptionOpen(true)}
          className="px-5 py-3 bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-800 font-bold text-xs rounded-xl flex items-center gap-2 shadow-2xs transition-all ml-auto"
        >
          <Gift className="w-4 h-4 text-amber-600" />
          <span>Redeem Scheme</span>
        </button>
      </div>

      {/* Main Grid: Left Timeline (8 cols) & Right Actions (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Installment Timeline */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="font-bold text-lg text-slate-900">Installment Timeline</h3>
              <span className="text-xs font-semibold text-slate-400">2026 Payment Schedule</span>
            </div>

            <div className="space-y-4 relative pl-6 border-l-2 border-slate-100">
              {/* Item 1 */}
              <div className="relative group">
                <span className="w-3 h-3 rounded-full bg-emerald-500 absolute -left-[31px] top-4 ring-4 ring-white" />
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">January 2026</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">Jan 05 • Cash Payment</p>
                  </div>
                  <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-md">
                    PAID
                  </span>
                </div>
              </div>

              {/* Item 2 */}
              <div className="relative group">
                <span className="w-3 h-3 rounded-full bg-emerald-500 absolute -left-[31px] top-4 ring-4 ring-white" />
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">February 2026</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">Feb 02 • GPay (Ref: 99281)</p>
                  </div>
                  <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-md">
                    PAID
                  </span>
                </div>
              </div>

              {/* Item 3 */}
              <div className="relative group">
                <span className="w-3 h-3 rounded-full bg-emerald-500 absolute -left-[31px] top-4 ring-4 ring-white" />
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">March 2026</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">Mar 04 • Cash Payment</p>
                  </div>
                  <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-md">
                    PAID
                  </span>
                </div>
              </div>

              {/* Summary Collapsed Row */}
              <div className="p-3 rounded-xl bg-slate-50/50 border border-dashed border-slate-200 text-center text-xs font-semibold text-slate-500 flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>April — July Payments Completed</span>
              </div>

              {/* Item Pending */}
              <div className="relative group">
                <span className="w-3 h-3 rounded-full bg-amber-500 absolute -left-[31px] top-4 ring-4 ring-white" />
                <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-amber-950">August 2026</h4>
                    <p className="text-[11px] text-amber-700 mt-0.5">Due by Aug 25 • Recurring ₹1,000</p>
                  </div>
                  <span className="px-2.5 py-0.5 bg-amber-200 text-amber-900 text-[10px] font-extrabold rounded-md">
                    PENDING
                  </span>
                </div>
              </div>

              {/* Upcoming */}
              <div className="relative group opacity-60">
                <span className="w-3 h-3 rounded-full bg-slate-300 absolute -left-[31px] top-4 ring-4 ring-white" />
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <h4 className="text-xs font-bold text-slate-500">Sept — Dec 2026</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 uppercase tracking-wider">UPCOMING CYCLES</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Quick Actions & Recent Activity */}
        <div className="lg:col-span-4 space-y-6">
          {/* Quick Actions Box */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-xs uppercase text-slate-400 tracking-wider">QUICK ACTIONS</h3>
            <div className="space-y-2">
              <button
                onClick={() => setIsInstallmentOpen(true)}
                className="w-full p-3 rounded-xl bg-slate-50 hover:bg-blue-50 hover:text-blue-600 text-left text-xs font-bold text-slate-700 flex items-center gap-3 transition-colors"
              >
                <CreditCard className="w-4 h-4 text-blue-600" />
                <span>Record Installment</span>
              </button>
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="w-full p-3 rounded-xl bg-slate-50 hover:bg-blue-50 hover:text-blue-600 text-left text-xs font-bold text-slate-700 flex items-center gap-3 transition-colors"
              >
                <Edit className="w-4 h-4 text-slate-500" />
                <span>Edit Customer</span>
              </button>
              <button 
                onClick={() => setIsRedemptionOpen(true)}
                className="w-full p-3 rounded-xl bg-slate-50 hover:bg-amber-50 hover:text-amber-800 text-left text-xs font-bold text-slate-700 flex items-center gap-3 transition-colors"
              >
                <Gift className="w-4 h-4 text-amber-600" />
                <span>Redeem Scheme</span>
              </button>
              <button className="w-full p-3 rounded-xl bg-slate-50 hover:bg-blue-50 hover:text-blue-600 text-left text-xs font-bold text-slate-700 flex items-center gap-3 transition-colors">
                <Printer className="w-4 h-4 text-slate-500" />
                <span>Print Passbook</span>
              </button>
            </div>
          </div>

          {/* Recent Activity Box */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-xs uppercase text-slate-400 tracking-wider">RECENT ACTIVITY</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Installment Recorded</h4>
                  <p className="text-[10px] text-slate-400">August 25, 2026 • 10:20 AM</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Customer Registered</h4>
                  <p className="text-[10px] text-slate-400">Jan 05, 2023 • 03:45 PM</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Card: Customer Notes */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-base text-slate-900">Customer Notes</h3>
          </div>
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="text-xs font-bold text-blue-600 hover:underline"
          >
            Edit Notes
          </button>
        </div>
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 italic">
          "Customer requested reminder via WhatsApp 2 days before the due date. Interested in the Diwali 2026 limited collection. Prefers antique finish jewelry."
        </div>
      </div>

      {/* Edit Customer Drawer Modal */}
      <EditCustomerModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        customerData={customer}
        onSave={(updated) => setCustomer({ ...customer, ...updated })}
      />

      {/* Record Installment Drawer Modal */}
      <RecordInstallmentModal
        isOpen={isInstallmentOpen}
        onClose={() => setIsInstallmentOpen(false)}
      />

      {/* Slide-over Redemption Modal */}
      <CompleteRedemptionModal
        isOpen={isRedemptionOpen}
        onClose={() => setIsRedemptionOpen(false)}
      />
    </div>
  );
}
