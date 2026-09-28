import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy - Ramyas Jeweller',
  description: 'Official Privacy Policy for the Ramyas Jeweller Customer App and Savings Scheme Management System.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 sm:p-10">
        
        {/* Header Branding */}
        <header className="border-b border-slate-200 pb-6 mb-8 text-center sm:text-left">
          <div className="inline-block bg-blue-50 text-blue-700 text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full mb-3">
            Official Legal Document
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Privacy Policy
          </h1>
          <p className="mt-2 text-lg font-medium text-slate-600">
            Ramyas Jeweller Customer Application
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Effective Date: September 28, 2026
          </p>
        </header>

        {/* Business Identity Box */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-8">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            Showroom & Business Identity
          </h2>
          <p className="text-base font-bold text-slate-900">RAMYA&apos;S JEWELLER</p>
          <p className="text-sm text-slate-700">91, Main Road, Begambur,</p>
          <p className="text-sm text-slate-700">Dindigul, Tamil Nadu - 624001, India</p>
        </div>

        {/* Content Body */}
        <div className="space-y-8 text-slate-700 leading-relaxed text-sm sm:text-base">

          {/* Section 1 */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">1. Introduction</h2>
            <p>
              This Privacy Policy explains how <strong>RAMYA&apos;S JEWELLER</strong> (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) collects, uses, stores, and protects user information when you use the <strong>Ramyas Jeweller</strong> mobile application (the &quot;Customer App&quot;) or our associated digital passbook services.
            </p>
            <p className="mt-3">
              The Ramyas Jeweller application is designed as a digital passbook tool allowing members of our 12-month jewellery savings scheme to view their monthly installment status, savings progress, and showroom updates directly on their mobile devices.
            </p>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">2. Information We Collect</h2>
            <p>We collect only the essential information required to authenticate your account and display your savings scheme passbook:</p>
            <ul className="list-disc pl-5 mt-3 space-y-2 text-slate-600">
              <li>
                <strong className="text-slate-900">Full Name:</strong> Collected to identify your customer account and personalize your scheme passbook.
              </li>
              <li>
                <strong className="text-slate-900">Mobile Phone Number:</strong> Collected to establish customer account identity and authenticate login sessions.
              </li>
              <li>
                <strong className="text-slate-900">Customer ID &amp; Scheme Identifiers:</strong> Unique system codes used to link your app session to your 12-month savings scheme passbook.
              </li>
              <li>
                <strong className="text-slate-900">Savings Scheme &amp; Installment Records:</strong> Read-only payment history, installment due dates, contribution totals, and completion bonuses recorded by our showroom counter staff.
              </li>
              <li>
                <strong className="text-slate-900">Account Credentials:</strong> Passwords entered during login are transmitted securely and stored on our server as encrypted, salted password hashes (bcrypt).
              </li>
              <li>
                <strong className="text-slate-900">Push Notification Tokens:</strong> Optional device tokens used solely for delivering installment due reminders and payment receipt notifications.
              </li>
              <li>
                <strong className="text-slate-900">Language Preference:</strong> App language selection stored locally on your device for user interface display.
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">3. How We Use Your Information</h2>
            <p>Your information is used strictly for legitimate business and app operational purposes:</p>
            <ul className="list-disc pl-5 mt-3 space-y-2 text-slate-600">
              <li>Authenticating your login sessions securely.</li>
              <li>Displaying your digital savings passbook and installment status.</li>
              <li>Sending notifications regarding upcoming installment due dates and payment receipts.</li>
              <li>Providing customer support and responding to account inquiries at our showroom.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">4. Data Security &amp; Storage</h2>
            <p>
              We prioritize the security of your information:
            </p>
            <ul className="list-disc pl-5 mt-3 space-y-2 text-slate-600">
              <li>
                <strong className="text-slate-900">Encryption in Transit:</strong> All data transmitted between the Customer App and our backend services is encrypted using standard HTTPS / TLS 1.3 protocol.
              </li>
              <li>
                <strong className="text-slate-900">Password Hashing:</strong> Account passwords are never stored in plaintext. They are protected using Industry-standard salted cryptographic hashing algorithms.
              </li>
              <li>
                <strong className="text-slate-900">Secure Database Storage:</strong> Customer records are stored in managed, access-controlled database environments with Row Level Security (RLS) policies.
              </li>
            </ul>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">5. Third-Party Data Sharing</h2>
            <p>
              <strong>We do NOT sell, rent, trade, or share your personal information with third parties.</strong>
            </p>
            <p className="mt-3">
              The Ramyas Jeweller Customer App contains zero third-party advertising SDKs, zero social media tracking pixels, and zero third-party analytics services. All data is used exclusively by RAMYA&apos;S JEWELLER for managing your savings scheme passbook.
            </p>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">6. Account &amp; Data Deletion</h2>
            <p>
              Customers have the right to request the deletion of their account and associated non-financial digital records.
            </p>
            <p className="mt-3">
              To request account or data deletion, you may visit our showroom in person or contact showroom administration:
            </p>
            <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
              <p className="font-semibold text-slate-900">RAMYA&apos;S JEWELLER — Customer Service</p>
              <p className="text-sm text-slate-700">91, Main Road, Begambur, Dindigul, Tamil Nadu - 624001, India</p>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Note: In accordance with local statutory and financial regulations, transaction and scheme payment history records must be retained for audit compliance purposes.
            </p>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">7. Policy Updates</h2>
            <p>
              We may update this Privacy Policy from time to time to reflect improvements in our app functionality or legal requirements. Any updates will be posted on this page with a revised effective date.
            </p>
          </section>

          {/* Section 8 */}
          <section className="border-t border-slate-200 pt-6">
            <h2 className="text-xl font-bold text-slate-900 mb-3">8. Contact Us</h2>
            <p>If you have any questions or concerns regarding this Privacy Policy, please contact us at:</p>
            <div className="mt-3 text-sm text-slate-800 space-y-1">
              <p className="font-bold">RAMYA&apos;S JEWELLER</p>
              <p>91, Main Road, Begambur,</p>
              <p>Dindigul, Tamil Nadu - 624001, India</p>
            </div>
          </section>

        </div>

        {/* Footer Link */}
        <footer className="mt-10 border-t border-slate-200 pt-6 text-center text-xs text-slate-500">
          <p>&copy; 2026 RAMYA&apos;S JEWELLER. All rights reserved.</p>
        </footer>

      </div>
    </div>
  );
}
