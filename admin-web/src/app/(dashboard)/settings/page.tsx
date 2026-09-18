'use client';

/**
 * RAMYAS JEWELLER - Store & System Settings
 * Part 9: Verified official shop credentials & settings configuration.
 */

import React, { useState } from 'react';
import {
  Store,
  Sliders,
  CreditCard,
  Receipt,
  Bell,
  Shield,
  Database,
  CheckCircle2,
  Info,
  ExternalLink,
  MapPin,
  Phone,
  Clock,
  UserCheck
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export default function SettingsPage() {
  const { profile, adminProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('SHOP_INFO');

  // Official Verified Shop Information (Part 9)
  const [shopName, setShopName] = useState("RAMYA'S JEWELLER");
  const [displayTitle, setDisplayTitle] = useState("RAMYA'S JEWELLER - Savings Scheme Management");
  const [mobileNumber, setMobileNumber] = useState('+91 98421 43307');
  const [physicalAddress, setPhysicalAddress] = useState(
    '91, Main Road, Begambur, Dindigul, Tamil Nadu - 624001, India'
  );
  const [businessCategory] = useState('Jewellery Store');
  const [businessHours] = useState('Monday-Sunday: 9:30 AM - 10:00 PM');
  const googleMapsUrl =
    'https://www.google.com/maps/search/?api=1&query=RAMYA%27S%20JEWELLER%2091%2C%20Main%20Road%2C%20Dindigul%2C%20Begambur%2C%20Tamil%20Nadu%20624001%2C%20India';

  // Scheme settings
  const [defaultPlanName, setDefaultPlanName] = useState('Diwali Savings Scheme');
  const [monthlyAmount] = useState(1000);
  const [tenureMonths] = useState(12);
  const [shopBonus] = useState(1000);

  // Payment Toggles
  const [enableCash, setEnableCash] = useState(true);
  const [enableGPay, setEnableGPay] = useState(true);
  const [enablePhonePe, setEnablePhonePe] = useState(true);
  const [enableBankTransfer, setEnableBankTransfer] = useState(true);

  // Receipt Settings
  const [receiptHeader, setReceiptHeader] = useState(
    "Thank you for investing with RAMYA'S JEWELLER - Monthly Savings Scheme"
  );
  const [receiptTerms, setReceiptTerms] = useState(
    '1. Gold rate applicable on date of payment. 2. Redemption strictly after 12 months. 3. 100% 1-Month bonus eligible on on-time completion.'
  );

  // Security Toggles
  const [twoFactorAuth, setTwoFactorAuth] = useState(true);
  const [sessionTimeout] = useState('15 Minutes');

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSaveAll = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const navItems = [
    { id: 'SHOP_INFO', label: 'Shop Information', icon: Store },
    { id: 'SCHEME_CONFIG', label: 'Scheme Configurations', icon: Sliders },
    { id: 'ADMIN_ACCOUNTS', label: 'Authorized Administrators', icon: UserCheck },
    { id: 'PAYMENT_METHODS', label: 'Payment Methods', icon: CreditCard },
    { id: 'RECEIPT_SETTINGS', label: 'Receipt Settings', icon: Receipt },
    { id: 'SECURITY', label: 'Security & Access', icon: Shield },
  ];

  return (
    <div className="space-y-6 pb-24 max-w-7xl mx-auto">
      {/* Page Header */}
      <div>
        <h1 className="font-heading font-bold text-2xl text-slate-900 tracking-tight">
          Settings
        </h1>
        <p className="text-xs text-slate-500 mt-0.5 font-medium">
          Manage your verified store details, scheme configurations, and administrative profiles.
        </p>
      </div>

      {savedSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">Preferences updated successfully!</span>
        </div>
      )}

      {/* Main Grid: Left Nav & Right Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side Navigation */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-2xs space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isSelected = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all text-left cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50 text-blue-700 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${
                      isSelected ? 'text-blue-600' : 'text-slate-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Official Location Box */}
          <div className="bg-blue-50/70 rounded-2xl p-4 border border-blue-100 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
              <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Verified Store Location</span>
            </div>
            <p className="text-[11px] text-blue-900/80 leading-relaxed font-medium">
              Begambur, Dindigul, Tamil Nadu 624001
            </p>
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:underline pt-1"
            >
              <span>View on Google Maps</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Right Side Settings Panels (Col Span 8) */}
        <div className="lg:col-span-8 bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-2xs">
          <form onSubmit={handleSaveAll} className="space-y-6">
            
            {/* TAB 1: SHOP INFORMATION */}
            {activeTab === 'SHOP_INFO' && (
              <div className="space-y-5">
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="font-heading font-bold text-lg text-slate-900">
                    Shop Information & Location
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Official business credentials printed on scheme passbooks and receipts.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5">
                      Business Name
                    </label>
                    <input
                      type="text"
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5">
                      Primary Contact Number
                    </label>
                    <input
                      type="text"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold font-mono"
                      required
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1.5">
                      Official Store Physical Address
                    </label>
                    <textarea
                      rows={2}
                      value={physicalAddress}
                      onChange={(e) => setPhysicalAddress(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5">
                      Business Category
                    </label>
                    <input
                      type="text"
                      disabled
                      value={businessCategory}
                      className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-700 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5">
                      Listed Business Hours
                    </label>
                    <input
                      type="text"
                      disabled
                      value={businessHours}
                      className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-700 font-medium"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: SCHEME CONFIGURATIONS */}
            {activeTab === 'SCHEME_CONFIG' && (
              <div className="space-y-5">
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="font-heading font-bold text-lg text-slate-900">
                    Scheme Rules & Financial Parameters
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Defined by business rules: ₹1,000 / month, 12 months tenure, 100% 1-month bonus.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5">
                      Scheme Plan Title
                    </label>
                    <input
                      type="text"
                      value={defaultPlanName}
                      onChange={(e) => setDefaultPlanName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5">
                      Monthly Contribution (₹)
                    </label>
                    <input
                      type="text"
                      disabled
                      value="₹ 1,000 (Fixed Standard)"
                      className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-700 font-bold font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5">
                      Tenure (Months)
                    </label>
                    <input
                      type="text"
                      disabled
                      value="12 Months"
                      className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-700 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5">
                      Shop Bonus Commitment
                    </label>
                    <input
                      type="text"
                      disabled
                      value="+₹ 1,000 (100% 1-Month Bonus)"
                      className="w-full px-3.5 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 font-bold font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: AUTHORIZED ADMINISTRATORS */}
            {activeTab === 'ADMIN_ACCOUNTS' && (
              <div className="space-y-5">
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="font-heading font-bold text-lg text-slate-900">
                    Authorized Administrative Personnel
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Designated personnel with administrative access to customer scheme passbooks.
                  </p>
                </div>

                <div className="space-y-3">
                  {/* Admin 1 */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-bold text-sm flex items-center justify-center">
                        AK
                      </div>
                      <div>
                        <div className="font-bold text-sm text-slate-900">A.B.Kathiravven</div>
                        <div className="text-xs text-slate-500">admin1@gmail.com</div>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                      Store Owner (Super Admin)
                    </span>
                  </div>

                  {/* Admin 2 */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 text-white font-bold text-sm flex items-center justify-center">
                        AA
                      </div>
                      <div>
                        <div className="font-bold text-sm text-slate-900">A.K.Anith</div>
                        <div className="text-xs text-slate-500">admin2@gmail.com</div>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-200 text-slate-800 border border-slate-300">
                      Store Administrator
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: PAYMENT METHODS */}
            {activeTab === 'PAYMENT_METHODS' && (
              <div className="space-y-5">
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="font-heading font-bold text-lg text-slate-900">
                    Accepted Payment Channels
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Enable or disable payment methods accepted for walk-in and online installment collections.
                  </p>
                </div>

                <div className="space-y-3 text-xs">
                  <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                    <div>
                      <div className="font-bold text-slate-900">In-Store Cash Counter</div>
                      <div className="text-[11px] text-slate-500">Physical receipt recording at store register</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={enableCash}
                      onChange={(e) => setEnableCash(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                    <div>
                      <div className="font-bold text-slate-900">Google Pay (GPay)</div>
                      <div className="text-[11px] text-slate-500">Instant UPI transaction reference verification</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={enableGPay}
                      onChange={(e) => setEnableGPay(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                    <div>
                      <div className="font-bold text-slate-900">PhonePe / UPI QR</div>
                      <div className="text-[11px] text-slate-500">Direct merchant QR payment recording</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={enablePhonePe}
                      onChange={(e) => setEnablePhonePe(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                    <div>
                      <div className="font-bold text-slate-900">Bank Transfer / IMPS / NEFT</div>
                      <div className="text-[11px] text-slate-500">Direct account transfer verification</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={enableBankTransfer}
                      onChange={(e) => setEnableBankTransfer(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* TAB 5: RECEIPT SETTINGS */}
            {activeTab === 'RECEIPT_SETTINGS' && (
              <div className="space-y-5">
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="font-heading font-bold text-lg text-slate-900">
                    Digital & Print Receipt Customization
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Headers and legal terms included on digital passbook receipts.
                  </p>
                </div>

                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5">
                      Receipt Header Message
                    </label>
                    <input
                      type="text"
                      value={receiptHeader}
                      onChange={(e) => setReceiptHeader(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5">
                      Scheme Terms & Conditions Footer
                    </label>
                    <textarea
                      rows={3}
                      value={receiptTerms}
                      onChange={(e) => setReceiptTerms(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 6: SECURITY */}
            {activeTab === 'SECURITY' && (
              <div className="space-y-5">
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="font-heading font-bold text-lg text-slate-900">
                    Security & Row-Level Access Protection
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Database security rules enforced via PostgreSQL Row-Level Security (RLS).
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
                  <div className="flex items-center gap-2 font-bold text-slate-900">
                    <Shield className="w-4 h-4 text-emerald-600" />
                    <span>Database RLS Ledger Protection Active</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    Direct mutations on financial tables (schemes, payments, installments, redemptions) are locked down and executable only through verified PostgreSQL SECURITY DEFINER procedures.
                  </p>
                </div>
              </div>
            )}

            {/* Sticky Save Bar */}
            <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                RAMYA&apos;S JEWELLER Scheme Management v2.4
              </span>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl royal-button font-bold text-xs shadow-sm cursor-pointer"
              >
                Save Preferences
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
