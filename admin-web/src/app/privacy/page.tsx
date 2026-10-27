import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ShieldCheck,
  Lock,
  Database,
  EyeOff,
  Clock,
  Phone,
  Mail,
  MapPin,
  MessageSquare,
  FileText,
  AlertTriangle,
  Server,
  UserCheck,
  Trash2,
  ChevronRight,
  ExternalLink,
  Smartphone,
  CheckCircle2,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy Policy | Ramya\'s Jeweller Customer App',
  description:
    'Official Privacy Policy for the Ramya\'s Jeweller Android Customer Application (com.ramyas.jewelleryapp) and Jewellery Savings Scheme Management System.',
  openGraph: {
    title: 'Privacy Policy - Ramya\'s Jeweller Customer App',
    description:
      'Official Privacy Policy for the Ramya\'s Jeweller Android Customer Application and Savings Scheme Management System.',
    type: 'website',
  },
};

export default function PrivacyPolicyPage() {
  const displayPhone = '+91 98421 43307';
  const rawPhone = '+919842143307';
  const whatsappUrl = 'https://wa.me/919842143307?text=Hello%20Ramyas%20Jeweller%2C%20I%20have%20an%20inquiry%20regarding%20my%20privacy%20and%20account%20data.';
  const email = 'contact@ramyasjeweller.com';
  const effectiveDate = 'September 28, 2026';
  const lastUpdated = 'October 17, 2026';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased selection:bg-amber-100 selection:text-amber-900">
      {/* Top Banner Bar */}
      <div className="bg-slate-900 text-slate-300 text-xs py-2 px-4 border-b border-slate-800">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Official Legal Notice • Ramya&apos;s Jeweller Customer Application</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Package: <code className="font-mono text-slate-200">com.ramyas.jewelleryapp</code></span>
            <span>•</span>
            <Link href="/account-deletion" className="text-amber-400 hover:underline inline-flex items-center gap-1 font-medium">
              <span>Account Deletion</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Document Card */}
        <article className="bg-white rounded-2xl shadow-sm border border-slate-200/90 overflow-hidden">

          {/* Header Section */}
          <header className="bg-gradient-to-b from-amber-50/60 via-slate-50/40 to-white border-b border-slate-200 p-6 sm:p-10">
            <div className="inline-flex items-center gap-2 bg-amber-100/80 text-amber-900 border border-amber-200 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-4">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-800" />
              <span>Verified App Privacy Policy</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Privacy Policy
            </h1>
            <p className="mt-3 text-lg sm:text-xl font-medium text-slate-700">
              Ramya&apos;s Jeweller Customer Mobile Application
            </p>
            <p className="mt-1 text-sm text-slate-500 font-mono">
              Android Application ID: com.ramyas.jewelleryapp
            </p>

            <div className="mt-6 pt-6 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-4 text-xs sm:text-sm text-slate-600">
              <div className="flex items-center gap-4">
                <span><strong>Effective:</strong> {effectiveDate}</span>
                <span>•</span>
                <span><strong>Last Revised:</strong> {lastUpdated}</span>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/account-deletion"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-800 border border-rose-200 rounded-lg font-semibold hover:bg-rose-100 transition-colors text-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Request Account Deletion</span>
                </Link>
              </div>
            </div>
          </header>

          {/* Business Entity Details Card */}
          <div className="m-6 sm:m-10 p-5 sm:p-6 bg-slate-50 rounded-xl border border-slate-200 text-sm">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
              Business &amp; Showroom Identity
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-base font-bold text-slate-900">RAMYA&apos;S JEWELLER</p>
                <p className="text-slate-600 mt-1 flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <span>91, Main Road, Begambur, Dindigul, Tamil Nadu - 624001, India</span>
                </p>
                <p className="text-slate-600 mt-1 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>Business Hours: 09:30 AM – 10:00 PM (Monday – Sunday)</span>
                </p>
              </div>
              <div className="space-y-1 text-slate-700 md:border-l md:border-slate-200 md:pl-6">
                <p className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>Phone: <a href={`tel:${rawPhone}`} className="font-semibold text-slate-900 hover:underline">{displayPhone}</a></span>
                </p>
                <p className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>WhatsApp: <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-emerald-700 hover:underline">{displayPhone}</a></span>
                </p>
                <p className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>Email: <a href={`mailto:${email}`} className="font-semibold text-slate-900 hover:underline">{email}</a></span>
                </p>
              </div>
            </div>
          </div>

          {/* Table of Contents Navigation */}
          <nav aria-label="Table of Contents" className="mx-6 sm:mx-10 mb-8 p-5 bg-amber-50/40 rounded-xl border border-amber-200/70 text-sm">
            <h2 className="font-bold text-slate-900 mb-3 text-xs uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-800" />
              <span>Policy Contents &amp; Quick Navigation</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs sm:text-sm">
              <a href="#section-1" className="text-slate-700 hover:text-amber-900 hover:underline">1. Introduction &amp; App Scope</a>
              <a href="#section-2" className="text-slate-700 hover:text-amber-900 hover:underline">2. Information We Collect</a>
              <a href="#section-3" className="text-slate-700 hover:text-amber-900 hover:underline">3. Information We Do NOT Collect</a>
              <a href="#section-4" className="text-slate-700 hover:text-amber-900 hover:underline">4. Purposes of Data Processing</a>
              <a href="#section-5" className="text-slate-700 hover:text-amber-900 hover:underline">5. Third-Party Service Providers</a>
              <a href="#section-6" className="text-slate-700 hover:text-amber-900 hover:underline">6. Security Safeguards &amp; Architecture</a>
              <a href="#section-7" className="text-slate-700 hover:text-amber-900 hover:underline">7. Data Retention Policy</a>
              <a href="#section-8" className="text-slate-700 hover:text-amber-900 hover:underline">8. Customer Privacy Rights</a>
              <a href="#section-9" className="text-slate-700 hover:text-amber-900 hover:underline">9. Account &amp; Data Deletion Requests</a>
              <a href="#section-10" className="text-slate-700 hover:text-amber-900 hover:underline">10. Children&apos;s Privacy</a>
              <a href="#section-11" className="text-slate-700 hover:text-amber-900 hover:underline">11. Policy Changes &amp; Revisions</a>
              <a href="#section-12" className="text-slate-700 hover:text-amber-900 hover:underline">12. Contact &amp; Grievance Redressal</a>
            </div>
          </nav>

          {/* Policy Body */}
          <div className="px-6 sm:px-10 pb-10 space-y-10 text-slate-700 leading-relaxed text-sm sm:text-base">

            {/* Section 1 */}
            <section id="section-1" className="scroll-mt-6 border-t border-slate-200 pt-8 first:border-0 first:pt-0">
              <div className="flex items-center gap-2 mb-3">
                <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-amber-100 text-amber-900 font-bold text-xs">1</span>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Introduction &amp; App Scope</h2>
              </div>
              <p>
                This Privacy Policy describes the policies and procedures of <strong>RAMYA&apos;S JEWELLER</strong> (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) regarding the collection, storage, processing, and protection of personal data when you install and use the <strong>Ramyas Jeweller Customer Application</strong> (Android Package: <code className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded">com.ramyas.jewelleryapp</code>) and our associated digital passbook services.
              </p>
              <p className="mt-3">
                The Ramyas Jeweller mobile app serves exclusively as a <strong>digital passbook and scheme progress viewer</strong> for registered customers participating in our showroom&apos;s 12-month jewellery savings scheme (&quot;Ramyas Jeweller Savings Scheme&quot; / 11+1 Scheme). Through the application, enrolled customers can view their verified monthly installment payment history, check upcoming due dates, monitor their accumulated gold savings, view showroom announcements, and view official showroom payment receipts.
              </p>
            </section>

            {/* Section 2 */}
            <section id="section-2" className="scroll-mt-6 border-t border-slate-200 pt-8">
              <div className="flex items-center gap-2 mb-3">
                <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-amber-100 text-amber-900 font-bold text-xs">2</span>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Personal &amp; Account Data We Collect and Process</h2>
              </div>
              <p>
                Based on our actual codebase architecture, we collect, store, display, and process only the minimal information strictly required to authenticate customer accounts and display accurate jewellery savings passbook ledgers:
              </p>

              <div className="mt-4 space-y-4">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2 text-base">
                    <UserCheck className="w-4 h-4 text-amber-800" />
                    <span>A. Customer Identification &amp; Contact Details</span>
                  </h3>
                  <ul className="list-disc pl-5 mt-2 space-y-1.5 text-slate-600 text-sm">
                    <li><strong>Full Name:</strong> Collected to identify your account and personalize your digital passbook.</li>
                    <li><strong>Primary Mobile Phone Number (10 digits):</strong> Required as your unique login identifier and to deliver scheme service notifications.</li>
                    <li><strong>Optional Alternate Phone Number:</strong> Recorded for secondary contact purposes if provided during enrollment.</li>
                    <li><strong>Residential / Showroom Postal Address:</strong> Street, city, and pincode recorded for showroom documentation and statutory retail compliance.</li>
                    <li><strong>Nominee Name &amp; Relationship:</strong> Recorded for scheme enrollment records and nominee reference in the event of unforeseen circumstances.</li>
                    <li><strong>Customer Code:</strong> Unique system-generated customer identifier (e.g., <code className="font-mono text-xs">RJ-2026-0001</code>).</li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2 text-base">
                    <Lock className="w-4 h-4 text-amber-800" />
                    <span>B. Authentication Credentials &amp; Session Tokens</span>
                  </h3>
                  <ul className="list-disc pl-5 mt-2 space-y-1.5 text-slate-600 text-sm">
                    <li><strong>Account Password:</strong> Securely created by the customer. Passwords are never stored in plain text; they are cryptographically salted and hashed using industry-standard bcrypt on our backend.</li>
                    <li><strong>Session Bearer Tokens:</strong> Cryptographically generated 32-byte session tokens issued by our Customer Backend-For-Frontend (BFF). Stored locally on the user&apos;s mobile device in encrypted asynchronous storage (<code className="font-mono text-xs">@ramyas_customer_session</code>) and verified via SHA-256 hash lookups on the backend.</li>
                    <li><strong>Security Lockout Counters:</strong> Number of consecutive failed password attempts and temporary lockout timestamps to prevent unauthorized brute-force account access.</li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2 text-base">
                    <Database className="w-4 h-4 text-amber-800" />
                    <span>C. Savings Scheme &amp; Installment Financial Records</span>
                  </h3>
                  <ul className="list-disc pl-5 mt-2 space-y-1.5 text-slate-600 text-sm">
                    <li><strong>Scheme Metadata:</strong> Scheme Name (&quot;Ramyas Jeweller Savings Scheme&quot;), Scheme Code, and Slot Assignment (supports slots 1 through 5 for multi-scheme members).</li>
                    <li><strong>Financial Metrics:</strong> Monthly installment commitment (₹1,000), total scheme term (12 months), cumulative contributions, remaining balance, showroom completion bonus (₹1,000 for 11 paid monthly installments), total maturity value (₹13,000), and scheme progress percentage.</li>
                    <li><strong>Installment Ledger Entries:</strong> Installment numbers (1–12), corresponding calendar months, due dates, installment payment status (<code className="font-mono text-xs">PAID</code>, <code className="font-mono text-xs">PENDING</code>, or <code className="font-mono text-xs">FUTURE</code>), payment collection dates, and official showroom receipt numbers.</li>
                    <li><strong>Payment Receipts:</strong> Payment method (<code className="font-mono text-xs">CASH</code> or showroom counter deposit), collection timestamp, collection location (Ramya&apos;s Jeweller Showroom), and collecting staff attribution.</li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2 text-base">
                    <Smartphone className="w-4 h-4 text-amber-800" />
                    <span>D. In-App Notifications &amp; Device Preferences</span>
                  </h3>
                  <ul className="list-disc pl-5 mt-2 space-y-1.5 text-slate-600 text-sm">
                    <li><strong>Service Notifications:</strong> In-app alerts confirming recorded showroom payments, monthly installment reminders, and scheme completion notices, including read status and delivery timestamp.</li>
                    <li><strong>Language Selection:</strong> App language preference (English or Tamil) stored locally on your device (<code className="font-mono text-xs">@ramyas_app_language</code>) to render your preferred interface.</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Section 3 */}
            <section id="section-3" className="scroll-mt-6 border-t border-slate-200 pt-8">
              <div className="flex items-center gap-2 mb-3">
                <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-amber-100 text-amber-900 font-bold text-xs">3</span>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Information We Do NOT Collect</h2>
              </div>
              <p>
                To provide complete transparency and align with Google Play User Data policies, our application explicitly does <strong>NOT</strong> collect, request, or process:
              </p>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-200 bg-slate-50">
                  <EyeOff className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                  <span><strong>No Payment Instrument Data:</strong> We do not collect credit card numbers, debit card numbers, CVVs, expiry dates, or bank net banking credentials.</span>
                </div>
                <div className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-200 bg-slate-50">
                  <EyeOff className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                  <span><strong>No UPI Secrets or PINs:</strong> Installment payments are made in-person at our showroom counter; the app processes no payment gateway or UPI secret credentials.</span>
                </div>
                <div className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-200 bg-slate-50">
                  <EyeOff className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                  <span><strong>No Device Location Tracking:</strong> We do not track or collect background or foreground GPS device location coordinates.</span>
                </div>
                <div className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-200 bg-slate-50">
                  <EyeOff className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                  <span><strong>No Intrusive Device Permissions:</strong> The app does not access your address book/contacts, camera, microphone, SMS inbox, call logs, or photos.</span>
                </div>
                <div className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-200 bg-slate-50 sm:col-span-2">
                  <EyeOff className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                  <span><strong>No Third-Party Advertising Trackers:</strong> Zero advertising SDKs, zero behavioral ad identifiers (AAID), and zero social media tracking pixels are integrated into the customer application.</span>
                </div>
              </div>
            </section>

            {/* Section 4 */}
            <section id="section-4" className="scroll-mt-6 border-t border-slate-200 pt-8">
              <div className="flex items-center gap-2 mb-3">
                <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-amber-100 text-amber-900 font-bold text-xs">4</span>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Purposes of Data Processing</h2>
              </div>
              <p>We use the personal and account data strictly for the following verified business purposes:</p>
              <div className="mt-3 space-y-2 text-sm text-slate-600">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Account Authentication &amp; Security:</strong> Authenticating member login sessions, verifying password credentials, managing session timeouts, and preventing unauthorized account takeover.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Digital Passbook Management:</strong> Displaying accurate, up-to-date monthly installment history, payment dates, due dates, and remaining balances for each enrolled scheme slot.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Scheme Maturity &amp; Bonus Fulfillment:</strong> Calculating eligibility for the 1-month showroom bonus (₹1,000 bonus on 11 completed monthly installments) and verifying customer/nominee identity when gold jewellery is redeemed at our showroom.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Payment Receipt Transparency:</strong> Providing verifiable digital receipts for showroom transactions showing receipt numbers, payment amounts, and collection timestamps.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Customer Support &amp; Identity Verification:</strong> Assisting customers with in-person or telephonic inquiries regarding passbook entries, password resets, and showroom visit assistance.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Statutory &amp; Accounting Compliance:</strong> Fulfilling mandatory tax, audit, accounting, and legal transaction record-keeping requirements under applicable Indian laws and financial regulations.</span>
                </div>
              </div>
            </section>

            {/* Section 5 */}
            <section id="section-5" className="scroll-mt-6 border-t border-slate-200 pt-8">
              <div className="flex items-center gap-2 mb-3">
                <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-amber-100 text-amber-900 font-bold text-xs">5</span>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Third-Party Service Providers &amp; Data Sharing</h2>
              </div>
              <p>
                <strong>We do NOT sell, rent, trade, monetize, or disclose your personal data to commercial data brokers, advertising networks, or third-party marketing entities.</strong>
              </p>
              <p className="mt-3">
                Data is shared strictly with the trusted technology infrastructure providers verified directly from our project architecture:
              </p>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="flex items-center gap-2 font-bold text-slate-900 mb-1">
                    <Server className="w-4 h-4 text-emerald-700" />
                    <span>Supabase Inc. (Backend &amp; Database)</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Provides managed PostgreSQL database infrastructure and serverless Edge Functions (Customer BFF). Customer records, hashed credentials, and scheme ledgers are processed on Supabase infrastructure under strict PostgreSQL Row Level Security (RLS) policies.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="flex items-center gap-2 font-bold text-slate-900 mb-1">
                    <Server className="w-4 h-4 text-blue-700" />
                    <span>Vercel Inc. (Web Hosting)</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Hosts the administrative web management portal and public web pages (including this public Privacy Policy and Account Deletion notice) over secure HTTPS/TLS.
                  </p>
                </div>
              </div>

              <p className="mt-4 text-xs text-slate-500">
                <strong>Legal Disclosures:</strong> We may disclose customer data only if required by law, court order, subpoena, or government authority under applicable Indian statutory laws, or when necessary to protect the legal rights, safety, or property of Ramya&apos;s Jeweller, our staff, or our customers.
              </p>
            </section>

            {/* Section 6 */}
            <section id="section-6" className="scroll-mt-6 border-t border-slate-200 pt-8">
              <div className="flex items-center gap-2 mb-3">
                <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-amber-100 text-amber-900 font-bold text-xs">6</span>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Data Security Safeguards &amp; Architecture</h2>
              </div>
              <p>
                We implement robust administrative, technical, and architectural security safeguards to protect customer data:
              </p>
              <ul className="list-disc pl-5 mt-3 space-y-2 text-sm text-slate-600">
                <li>
                  <strong className="text-slate-900">Encryption in Transit:</strong> All communications between the mobile application, web dashboard, and backend server are secured using HTTPS with Transport Layer Security (TLS 1.3/1.2).
                </li>
                <li>
                  <strong className="text-slate-900">Cryptographic Password Hashing:</strong> Passwords are never stored or transmitted in plain text. They are hashed using salted cryptographic algorithms (bcrypt) on server-side database functions.
                </li>
                <li>
                  <strong className="text-slate-900">Secure Session Management:</strong> Mobile sessions utilize 32-byte cryptographically random bearer tokens. Tokens are validated via SHA-256 hash checks and can be revoked on demand upon logout.
                </li>
                <li>
                  <strong className="text-slate-900">PostgreSQL Row Level Security (RLS):</strong> Multi-tenant isolation is enforced at the database kernel level. Customers are strictly restricted to reading and viewing their own profile and scheme records.
                </li>
                <li>
                  <strong className="text-slate-900">Brute-Force &amp; Rate-Limiting Protection:</strong> Automatic account lockout mechanisms temporarily freeze account access after repeated unsuccessful login attempts.
                </li>
                <li>
                  <strong className="text-slate-900">Role-Based Access Control (RBAC):</strong> Administrative ledger updates and installment entries can only be performed by authenticated, authorized showroom personnel.
                </li>
              </ul>
            </section>

            {/* Section 7 */}
            <section id="section-7" className="scroll-mt-6 border-t border-slate-200 pt-8">
              <div className="flex items-center gap-2 mb-3">
                <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-amber-100 text-amber-900 font-bold text-xs">7</span>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Data Retention Policy</h2>
              </div>
              <p>We retain customer personal data according to the following schedule:</p>
              <ul className="list-disc pl-5 mt-3 space-y-2 text-sm text-slate-600">
                <li>
                  <strong className="text-slate-900">Active Scheme Records:</strong> Maintained for the entire duration of the active 12-month savings scheme cycle until maturity redemption is completed.
                </li>
                <li>
                  <strong className="text-slate-900">Historical Transaction &amp; Tax Ledgers:</strong> In compliance with Indian commercial, accounting, tax, and retail audit regulations, transaction ledgers, payment receipt numbers, and gold redemption records are preserved for the minimum statutory period required by law (typically up to 8 financial years).
                </li>
                <li>
                  <strong className="text-slate-900">Session Tokens:</strong> Stored locally on the user&apos;s device until logout, token expiration, or manual application data clearing.
                </li>
                <li>
                  <strong className="text-slate-900">Temporary Security Logs:</strong> Failed login attempt counters reset automatically upon successful login or following lockout expiration.
                </li>
              </ul>
            </section>

            {/* Section 8 */}
            <section id="section-8" className="scroll-mt-6 border-t border-slate-200 pt-8">
              <div className="flex items-center gap-2 mb-3">
                <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-amber-100 text-amber-900 font-bold text-xs">8</span>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Customer Privacy Rights</h2>
              </div>
              <p>Under applicable data protection principles, customers possess the following rights regarding their information:</p>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50">
                  <h3 className="font-bold text-slate-900 mb-1">Right to Access</h3>
                  <p className="text-xs text-slate-600">You can view your complete personal profile, scheme installment ledger, bonus eligibility, and payment receipts directly inside the mobile app at any time.</p>
                </div>
                <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50">
                  <h3 className="font-bold text-slate-900 mb-1">Right to Rectification</h3>
                  <p className="text-xs text-slate-600">You may request updates or corrections to your registered name, phone numbers, address, or nominee details by contacting showroom personnel.</p>
                </div>
                <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50">
                  <h3 className="font-bold text-slate-900 mb-1">Right to Deletion</h3>
                  <p className="text-xs text-slate-600">You may request deletion of your customer app login credentials and account access subject to statutory transaction retention rules.</p>
                </div>
              </div>
            </section>

            {/* Section 9 */}
            <section id="section-9" className="scroll-mt-6 border-t border-slate-200 pt-8">
              <div className="flex items-center gap-2 mb-3">
                <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-rose-100 text-rose-900 font-bold text-xs">9</span>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Account &amp; Data Deletion Requests</h2>
              </div>
              <p>
                In compliance with Google Play Store Account Deletion requirements, registered users of the Ramyas Jeweller Customer Application can request complete deletion of their app account and associated credentials:
              </p>

              <div className="mt-4 p-5 rounded-xl border border-rose-200 bg-rose-50/50 space-y-3">
                <h3 className="font-bold text-slate-900 text-base">How to Request Account Deletion</h3>
                <p className="text-sm text-slate-700">
                  Because savings schemes represent customer financial assets, account deletion requests are processed manually with identity verification by authorized showroom staff to safeguard customer balances against unauthorized closure:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-sm">
                  <a
                    href={`tel:${rawPhone}`}
                    className="flex items-center gap-3 p-3 bg-white rounded-lg border border-rose-200 font-semibold text-rose-950 hover:bg-rose-100/50 transition-colors"
                  >
                    <Phone className="w-4 h-4 text-rose-700 shrink-0" />
                    <span>Call Support: {displayPhone}</span>
                  </a>
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 bg-white rounded-lg border border-rose-200 font-semibold text-emerald-950 hover:bg-emerald-50 transition-colors"
                  >
                    <MessageSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>WhatsApp: {displayPhone}</span>
                  </a>
                  <a
                    href={`mailto:${email}?subject=Account%20Deletion%20Request`}
                    className="flex items-center gap-3 p-3 bg-white rounded-lg border border-rose-200 font-semibold text-slate-900 hover:bg-rose-100/50 transition-colors"
                  >
                    <Mail className="w-4 h-4 text-rose-700 shrink-0" />
                    <span>Email: {email}</span>
                  </a>
                  <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-rose-200 font-medium text-slate-700">
                    <MapPin className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>In-person at our Begambur showroom</span>
                  </div>
                </div>

                <div className="pt-2">
                  <Link
                    href="/account-deletion"
                    className="inline-flex items-center gap-1.5 text-rose-800 hover:underline font-bold text-xs uppercase tracking-wider"
                  >
                    <span>View Dedicated Account Deletion Page</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              <div className="mt-4 p-4 rounded-xl border border-amber-200 bg-amber-50/70 text-xs sm:text-sm text-slate-700 space-y-1.5">
                <p className="font-bold text-slate-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-800" />
                  <span>Statutory Record Retention Notice:</span>
                </p>
                <p>
                  Upon verification, your app login credentials, password hash, and active bearer sessions are permanently removed. However, historical payment receipts, tax ledgers, and scheme completion records must be retained in our secure offline business records where mandated by Indian commercial, tax, and retail accounting statutory laws.
                </p>
              </div>
            </section>

            {/* Section 10 */}
            <section id="section-10" className="scroll-mt-6 border-t border-slate-200 pt-8">
              <div className="flex items-center gap-2 mb-3">
                <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-amber-100 text-amber-900 font-bold text-xs">10</span>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Children&apos;s Privacy</h2>
              </div>
              <p>
                Our services and mobile application are designed strictly for adult customers who are legally eligible to enter into commercial savings schemes under applicable Indian contract law (18 years of age or older). We do not knowingly solicit, collect, or store personal information directly from individuals under 18 years of age. If a parent or guardian discovers that a minor has provided information without consent, please contact us immediately to have such data verified and removed.
              </p>
            </section>

            {/* Section 11 */}
            <section id="section-11" className="scroll-mt-6 border-t border-slate-200 pt-8">
              <div className="flex items-center gap-2 mb-3">
                <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-amber-100 text-amber-900 font-bold text-xs">11</span>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Policy Changes &amp; Updates</h2>
              </div>
              <p>
                We may revise this Privacy Policy periodically to reflect enhancements to our digital services, updates to application features, or evolving statutory legal requirements. Any modifications will be posted directly to this public webpage with an updated &quot;Last Revised&quot; date. We encourage customers to review this page periodically to stay informed of our privacy protections.
              </p>
            </section>

            {/* Section 12 */}
            <section id="section-12" className="scroll-mt-6 border-t border-slate-200 pt-8">
              <div className="flex items-center gap-2 mb-3">
                <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-amber-100 text-amber-900 font-bold text-xs">12</span>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Contact Us &amp; Grievance Redressal</h2>
              </div>
              <p>
                For questions, concerns, updates to customer records, or grievance redressal regarding this Privacy Policy or our data handling practices, please contact our showroom management:
              </p>

              <div className="mt-4 p-5 rounded-xl border border-slate-200 bg-slate-50 space-y-2 text-sm text-slate-800">
                <p className="font-extrabold text-base text-slate-900">RAMYA&apos;S JEWELLER</p>
                <p className="text-slate-600">Attn: Privacy &amp; Customer Support Team</p>
                <p>91, Main Road, Begambur, Dindigul, Tamil Nadu - 624001, India</p>
                <p>Telephone: <a href={`tel:${rawPhone}`} className="font-bold text-slate-900 hover:underline">{displayPhone}</a></p>
                <p>WhatsApp: <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="font-bold text-emerald-700 hover:underline">{displayPhone}</a></p>
                <p>Email: <a href={`mailto:${email}`} className="font-bold text-slate-900 hover:underline">{email}</a></p>
                <p className="pt-2 text-xs text-slate-500">
                  Standard response time for customer privacy and data inquiries: Within 7 business days.
                </p>
              </div>
            </section>

          </div>

          {/* Footer */}
          <footer className="bg-slate-50 border-t border-slate-200 p-6 sm:p-8 text-center text-xs text-slate-500 space-y-2">
            <p>&copy; {new Date().getFullYear()} RAMYA&apos;S JEWELLER. All rights reserved.</p>
            <div className="flex items-center justify-center gap-4 text-slate-600 font-medium pt-1">
              <Link href="/privacy" className="hover:text-amber-900 hover:underline">Privacy Policy</Link>
              <span>•</span>
              <Link href="/account-deletion" className="hover:text-amber-900 hover:underline">Account Deletion</Link>
              <span>•</span>
              <a href={`tel:${rawPhone}`} className="hover:text-amber-900 hover:underline">Contact Support</a>
            </div>
          </footer>

        </article>
      </main>
    </div>
  );
}
