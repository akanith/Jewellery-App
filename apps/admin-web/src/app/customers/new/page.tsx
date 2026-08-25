'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  User, 
  Camera, 
  Calendar, 
  CreditCard, 
  Info, 
  Save, 
  Diamond,
  FileText
} from 'lucide-react';

export default function AddNewCustomerPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    mobile: '',
    altMobile: '',
    gender: 'Female',
    dob: '',
    address: '',
    locality: '',
    pincode: '',
    aadhaar: '',
    schemeName: 'Diwali Savings Scheme',
    monthlyInstallment: '1000',
    totalInstallments: '12',
    shopBonus: '1000',
    joiningDate: '2026-08-25',
    firstDueDate: '2026-09-25',
    nomineeName: '',
    relationship: 'Spouse',
    nomineeMobile: '',
    remarks: '',
  });

  return (
    <div className="space-y-6 pb-16 max-w-6xl mx-auto">
      {/* Back Link */}
      <Link
        href="/customers"
        className="inline-flex items-center gap-2 text-xs font-bold text-blue-600 hover:underline"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Customers</span>
      </Link>

      {/* Page Heading */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Add New Customer</h1>
        <p className="text-xs text-slate-500 mt-1">
          Register a customer for the Jewellery Savings Scheme.
        </p>
      </div>

      {/* 2-Column Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Form Column (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Card 1: Customer Information */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <User className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-slate-900">Customer Information</h3>
            </div>

            <div className="space-y-4">
              {/* Photo Upload + Name & Mobile */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
                <div className="sm:col-span-4 flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer text-slate-400 hover:text-slate-600 min-h-[120px]">
                  <Camera className="w-8 h-8 mb-1 stroke-1" />
                  <span className="text-xs font-semibold">Photo</span>
                </div>

                <div className="sm:col-span-8 space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      FULL NAME*
                    </label>
                    <input
                      type="text"
                      placeholder="Enter customer full name"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                        MOBILE NUMBER*
                      </label>
                      <input
                        type="text"
                        placeholder="+91 00000 00000"
                        value={formData.mobile}
                        onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                        ALT MOBILE
                      </label>
                      <input
                        type="text"
                        placeholder="Alternative number"
                        value={formData.altMobile}
                        onChange={(e) => setFormData({ ...formData, altMobile: e.target.value })}
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Gender & Date of Birth */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    GENDER
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    DATE OF BIRTH
                  </label>
                  <input
                    type="date"
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  ADDRESS
                </label>
                <textarea
                  rows={2}
                  placeholder="Full residential address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              {/* Village/Town & Pincode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    VILLAGE/TOWN
                  </label>
                  <input
                    type="text"
                    placeholder="Enter locality"
                    value={formData.locality}
                    onChange={(e) => setFormData({ ...formData, locality: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    PINCODE
                  </label>
                  <input
                    type="text"
                    placeholder="6-digit code"
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              {/* Aadhaar Number */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  AADHAAR NUMBER (OPTIONAL)
                </label>
                <input
                  type="text"
                  placeholder="0000 0000 0000"
                  value={formData.aadhaar}
                  onChange={(e) => setFormData({ ...formData, aadhaar: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Scheme Information */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <CreditCard className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-slate-900">Scheme Information</h3>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    SCHEME NAME
                  </label>
                  <select
                    value={formData.schemeName}
                    onChange={(e) => setFormData({ ...formData, schemeName: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  >
                    <option value="Diwali Savings Scheme">Diwali Savings Scheme</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    MONTHLY INSTALLMENT (₹)
                  </label>
                  <input
                    type="text"
                    value={formData.monthlyInstallment}
                    onChange={(e) => setFormData({ ...formData, monthlyInstallment: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    TOTAL INSTALLMENTS
                  </label>
                  <input
                    type="text"
                    value={formData.totalInstallments}
                    onChange={(e) => setFormData({ ...formData, totalInstallments: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    SHOP BONUS (₹)
                  </label>
                  <input
                    type="text"
                    value={formData.shopBonus}
                    onChange={(e) => setFormData({ ...formData, shopBonus: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    JOINING DATE
                  </label>
                  <input
                    type="date"
                    value={formData.joiningDate}
                    onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    FIRST DUE DATE
                  </label>
                  <input
                    type="date"
                    value={formData.firstDueDate}
                    onChange={(e) => setFormData({ ...formData, firstDueDate: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              {/* Status Pill */}
              <div className="p-3 bg-emerald-50 border border-emerald-200/60 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                <span>Scheme Status: Active</span>
              </div>
            </div>
          </div>

          {/* Card 3: Additional Details */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-slate-900">Additional Details</h3>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    NOMINEE NAME
                  </label>
                  <input
                    type="text"
                    placeholder="Full name of nominee"
                    value={formData.nomineeName}
                    onChange={(e) => setFormData({ ...formData, nomineeName: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    RELATIONSHIP
                  </label>
                  <select
                    value={formData.relationship}
                    onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  >
                    <option value="Spouse">Spouse</option>
                    <option value="Parent">Parent</option>
                    <option value="Child">Child</option>
                    <option value="Sibling">Sibling</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  NOMINEE MOBILE
                </label>
                <input
                  type="text"
                  placeholder="+91 00000 00000"
                  value={formData.nomineeMobile}
                  onChange={(e) => setFormData({ ...formData, nomineeMobile: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  REMARKS/NOTES
                </label>
                <textarea
                  rows={2}
                  placeholder="Any special instructions or observations..."
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Registration Summary Column (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden sticky top-24 space-y-6">
            {/* Top Dark Royal Blue Header Box (from Screenshot 1) */}
            <div className="p-4 bg-blue-950 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm tracking-wide">Registration Summary</h3>
              <Diamond className="w-5 h-5 text-amber-400" />
            </div>

            <div className="p-6 pt-0 space-y-6">
              {/* Summary Details */}
              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1 text-slate-500">
                  <span>Customer</span>
                  <span className="font-bold text-slate-900">{formData.fullName || '—'}</span>
                </div>
                <div className="flex justify-between py-1 text-slate-500">
                  <span>Scheme</span>
                  <span className="font-bold text-slate-900 text-right">{formData.schemeName}</span>
                </div>

                <div className="h-px bg-slate-100" />

                <div className="flex justify-between py-1 text-slate-500">
                  <span>Installment</span>
                  <span className="font-bold text-slate-900">₹{formData.monthlyInstallment}</span>
                </div>
                <div className="flex justify-between py-1 text-slate-500">
                  <span>Shop Bonus</span>
                  <span className="font-bold text-emerald-600">₹{formData.shopBonus}</span>
                </div>

                <div className="h-px bg-slate-100" />

                <div className="flex justify-between py-2 text-xs font-bold text-slate-900">
                  <span>Expected Maturity</span>
                  <span>May 2025</span>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3 pt-2">
                <button className="w-full py-3 bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-900/20">
                  <Save className="w-4 h-4" />
                  <span>Save & Record First Pay</span>
                </button>

                <button className="w-full py-3 bg-white border border-blue-900 text-blue-900 font-bold text-xs rounded-xl hover:bg-blue-50 transition-all shadow-2xs">
                  Save Customer Profile
                </button>

                <div className="text-center">
                  <Link href="/customers" className="text-xs text-slate-500 hover:text-slate-900 font-medium">
                    Cancel & Return
                  </Link>
                </div>
              </div>

              {/* Callout Box */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3 text-slate-600 text-xs">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed text-[11px]">
                  Recording the first installment immediately activates the digital passbook for the customer.
                </p>
              </div>
            </div>
          </div>

          {/* Jewellery Showroom Preview Card (from Screenshot 1 Bottom Right) */}
          <div className="h-36 rounded-2xl overflow-hidden bg-slate-900 shadow-sm relative group">
            <img
              src="https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=500&auto=format&fit=crop&q=80"
              alt="Showroom Gold Jewellery"
              className="w-full h-full object-cover opacity-70 group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-4 flex items-end">
              <span className="text-xs font-bold text-white tracking-wide">
                Ramyas Jeweller Premium Gold Collection
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
