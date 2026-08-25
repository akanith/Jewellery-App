'use client';

import { useState } from 'react';
import { 
  Store, 
  Settings, 
  CreditCard, 
  Printer, 
  Bell, 
  Shield, 
  Database, 
  Save, 
  Info,
  Upload,
  Key,
  Download,
  FileSpreadsheet,
  History,
  Lock,
  Check
} from 'lucide-react';

export default function SystemSettingsPage() {
  const [activeSection, setActiveSection] = useState('Shop Information');
  const [cashEnabled, setCashEnabled] = useState(true);
  const [upiEnabled, setUpiEnabled] = useState(true);
  const [bankEnabled, setBankEnabled] = useState(false);
  const [printAuto, setPrintAuto] = useState(true);
  const [dueReminders, setDueReminders] = useState(true);
  const [paymentAlerts, setPaymentAlerts] = useState(false);
  const [redemptionAlerts, setRedemptionAlerts] = useState(true);
  const [twoFactor, setTwoFactor] = useState(true);

  return (
    <div className="space-y-8 pb-28 max-w-6xl mx-auto">
      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-extrabold text-blue-950 tracking-tight">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage your jewellery scheme application and operational preferences.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Navigation Pills (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm space-y-1 sticky top-24">
            {[
              { label: 'Shop Information', icon: Store },
              { label: 'Scheme Configuration', icon: Settings },
              { label: 'Payment Methods', icon: CreditCard },
              { label: 'Receipt Settings', icon: Printer },
              { label: 'Notification Settings', icon: Bell },
              { label: 'Security', icon: Shield },
              { label: 'Data & Backup', icon: Database },
            ].map((item) => {
              const Icon = item.icon;
              const isSelected = activeSection === item.label;

              return (
                <button
                  key={item.label}
                  onClick={() => setActiveSection(item.label)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all text-left ${
                    isSelected
                      ? 'bg-blue-50 text-blue-900 shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-blue-900' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}

            {/* Pro Tip Box (from Settings Screenshot) */}
            <div className="p-4 mt-4 rounded-xl bg-blue-50/60 border border-blue-100 text-xs space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-blue-900">
                <Info className="w-4 h-4" /> Pro Tip
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Changes in Scheme Configuration will only apply to new enrollments. Existing active schemes will retain their original terms.
              </p>
            </div>
          </div>
        </div>

        {/* Right Configuration Stack Cards (8 cols) */}
        <div className="lg:col-span-8 space-y-8">
          {/* Card 1: Shop Information */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-900">
                  <Store className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-slate-900">Shop Information</h3>
              </div>
              <button className="px-4 py-2 bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-blue-900/20">
                Save Changes
              </button>
            </div>

            {/* Shop Logo Avatar Box */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="w-16 h-16 rounded-xl bg-amber-400 text-slate-950 font-black text-2xl flex items-center justify-center shadow-md">
                RJ
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-xs text-slate-900">Ramyas Jeweller Logo</h4>
                <p className="text-[11px] text-slate-400">100x100 PNG, SVG or JPG format.</p>
                <button className="text-xs font-bold text-blue-900 hover:underline inline-flex items-center gap-1">
                  <Upload className="w-3.5 h-3.5" /> Change Logo
                </button>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">SHOP NAME</label>
                  <input type="text" defaultValue="Ramyas Jeweller" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">OWNER NAME</label>
                  <input type="text" defaultValue="A.B.Kathiravven" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">MOBILE NUMBER</label>
                  <input type="text" defaultValue="+91 9842143307" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">EMAIL ADDRESS</label>
                  <input type="text" defaultValue="ramyasjeweller@gmail.com" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">SHOP ADDRESS</label>
                  <input type="text" defaultValue="91 Main Road Dindigul 624001" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">WEEKLY HOLIDAY</label>
                  <input type="text" defaultValue="Sunday" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold" />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">GST NUMBER</label>
                <input type="text" defaultValue="33AAAAA0000A1Z5" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-semibold" />
              </div>
            </div>
          </div>

          {/* Card 2: Scheme Configuration */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-900">
                <Settings className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-slate-900">Scheme Configuration</h3>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">DEFAULT SCHEME NAME</label>
                  <input type="text" defaultValue="Diwali Savings Scheme" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">MONTHLY INSTALLMENT (₹)</label>
                  <input type="text" defaultValue="1000" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">TOTAL INSTALLMENTS</label>
                  <input type="text" defaultValue="12" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">SHOP BONUS (₹)</label>
                  <input type="text" defaultValue="1000" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold text-emerald-600" />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">SCHEME DURATION</label>
                <input type="text" defaultValue="12 Months" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold" />
              </div>
            </div>
          </div>

          {/* Card 3: Payment Methods */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-900">
                <CreditCard className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-slate-900">Payment Methods</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900">Cash Payments</h4>
                  <p className="text-[11px] text-slate-400">Allow over-the-counter cash receipts</p>
                </div>
                <input
                  type="checkbox"
                  checked={cashEnabled}
                  onChange={(e) => setCashEnabled(e.target.checked)}
                  className="w-5 h-5 accent-blue-900 rounded cursor-pointer"
                />
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900">GPay / PhonePe UPI</h4>
                  <p className="text-[11px] text-slate-400">Enable instant QR/UPI QR code generators</p>
                </div>
                <input
                  type="checkbox"
                  checked={upiEnabled}
                  onChange={(e) => setUpiEnabled(e.target.checked)}
                  className="w-5 h-5 accent-blue-900 rounded cursor-pointer"
                />
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900">Bank Transfer (NEFT/RTGS)</h4>
                  <p className="text-[11px] text-slate-400">Allow direct deposits into shop bank account</p>
                </div>
                <input
                  type="checkbox"
                  checked={bankEnabled}
                  onChange={(e) => setBankEnabled(e.target.checked)}
                  className="w-5 h-5 accent-blue-900 rounded cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Card 4: Receipt Settings */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-900">
                <Printer className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-slate-900">Receipt Settings</h3>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-4 bg-slate-100 rounded-xl text-center">
                <span className="font-bold text-slate-700">Ramyas Jeweller Receipt Logo Preview</span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">RECEIPT FOOTER TEXT</label>
                <input
                  type="text"
                  defaultValue="Thank you for investing with Ramyas Jeweller. Have a sparkling day!"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">TERMS & CONDITIONS</label>
                <textarea
                  rows={2}
                  defaultValue="1. Gold rate applicable on date of payment. 2. Redemption strictly after 12 months. 3. GST Extra as per govt rules."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold"
                />
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900">Print Automatically</h4>
                  <p className="text-[11px] text-slate-400">Trigger thermal printer immediately after payment recording</p>
                </div>
                <input
                  type="checkbox"
                  checked={printAuto}
                  onChange={(e) => setPrintAuto(e.target.checked)}
                  className="w-5 h-5 accent-blue-900 rounded cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Card 5: Notification Settings */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-900">
                <Bell className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-slate-900">Notification Settings</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900">Customer Reminders</h4>
                  <p className="text-[11px] text-slate-400">Send WhatsApp/SMS reminders before due dates</p>
                </div>
                <input
                  type="checkbox"
                  checked={dueReminders}
                  onChange={(e) => setDueReminders(e.target.checked)}
                  className="w-5 h-5 accent-blue-900 rounded cursor-pointer"
                />
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900">Payment Recorded Alert</h4>
                  <p className="text-[11px] text-slate-400">Notify admin when cash payments are logged</p>
                </div>
                <input
                  type="checkbox"
                  checked={paymentAlerts}
                  onChange={(e) => setPaymentAlerts(e.target.checked)}
                  className="w-5 h-5 accent-blue-900 rounded cursor-pointer"
                />
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900">Redemption Eligibility Alerts</h4>
                  <p className="text-[11px] text-slate-400">Notify admin when customer completes 12th installment</p>
                </div>
                <input
                  type="checkbox"
                  checked={redemptionAlerts}
                  onChange={(e) => setRedemptionAlerts(e.target.checked)}
                  className="w-5 h-5 accent-blue-900 rounded cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Card 6: Security */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-900">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-slate-900">Security</h3>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900">Admin Account Password</h4>
                  <p className="text-[11px] text-slate-400">Last changed 45 days ago</p>
                </div>
                <button 
                  onClick={() => {
                    alert('Password Change request sent. A password reset link has been sent to ramyasjeweller@gmail.com.');
                  }}
                  className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 font-bold text-slate-900 rounded-xl transition-all shadow-2xs"
                >
                  Change Password
                </button>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900">Two-Factor Authentication (2FA)</h4>
                  <p className="text-[11px] text-slate-400">Require OTP code for admin sign in</p>
                </div>
                <input
                  type="checkbox"
                  checked={twoFactor}
                  onChange={(e) => setTwoFactor(e.target.checked)}
                  className="w-5 h-5 accent-blue-900 rounded cursor-pointer"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">SESSION TIMEOUT</label>
                <select className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none">
                  <option value="15">15 Minutes</option>
                  <option value="30">30 Minutes</option>
                  <option value="60">1 Hour</option>
                </select>
              </div>
            </div>
          </div>

          {/* Card 7: Data & Backup */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-900">
                <Database className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-slate-900">Data & Backup</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <button className="p-4 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-all text-center space-y-2 group">
                <Download className="w-5 h-5 mx-auto text-blue-900 group-hover:scale-110 transition-transform" />
                <h4 className="font-bold text-slate-900">Download Backup</h4>
              </button>

              <button className="p-4 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-all text-center space-y-2 group">
                <FileSpreadsheet className="w-5 h-5 mx-auto text-blue-900 group-hover:scale-110 transition-transform" />
                <h4 className="font-bold text-slate-900">Export All Data</h4>
              </button>

              <button className="p-4 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-all text-center space-y-2 group">
                <History className="w-5 h-5 mx-auto text-blue-900 group-hover:scale-110 transition-transform" />
                <h4 className="font-bold text-slate-900">Audit Logs</h4>
              </button>
            </div>
          </div>

          {/* Card 8: Ramyas Jeweller ERP Footer Card */}
          <div className="bg-slate-900 text-white p-6 rounded-2xl space-y-4 shadow-sm border border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base">Ramyas Jeweller ERP</h3>
                <p className="text-xs text-slate-400">Enterprise Jewellery Scheme Management</p>
              </div>
              <span className="px-2.5 py-1 bg-amber-400 text-slate-950 font-black text-[10px] rounded-md uppercase tracking-wider">
                v2.4.0
              </span>
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-medium">
              <a href="#" className="hover:text-white">Contact Support</a>
              <a href="#" className="hover:text-white">Privacy Policy</a>
              <a href="#" className="hover:text-white">Terms of Service</a>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Save All Changes Footer Bar (from Settings Screenshot) */}
      <div className="fixed bottom-0 left-64 right-0 bg-white border-t border-slate-200 p-4 flex items-center justify-between px-8 z-30 shadow-2xl">
        <span className="text-xs text-slate-500 font-semibold">Auto-save is disabled. Please save manually.</span>
        <div className="flex items-center gap-3">
          <button className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all">
            Reset Settings
          </button>
          <button className="px-6 py-2.5 bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-900/20 transition-all flex items-center gap-2">
            <Save className="w-4 h-4" />
            <span>Save All Changes</span>
          </button>
        </div>
      </div>
    </div>
  );
}
