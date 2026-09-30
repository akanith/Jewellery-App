import type { Metadata } from 'next';
import Link from 'next/link';
import { Phone, MessageSquare, Clock, MapPin, Shield, ChevronLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Request Account Deletion - Ramyas Jeweller',
  description: 'Information and contact details for requesting account deletion for the Ramyas Jeweller Customer Application.',
};

export default function AccountDeletionPage() {
  const phoneNumber = '+919842143307';
  const displayPhone = '+91 98421 43307';
  const whatsappUrl = `https://wa.me/919842143307?text=${encodeURIComponent(
    'Hello Ramyas Jeweller, I would like to request deletion of my customer app account.'
  )}`;

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="max-w-xl w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-10 space-y-8">
        
        {/* Header */}
        <header className="text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-800 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-rose-100">
            <Shield className="w-3.5 h-3.5" />
            <span>Account Management &amp; Privacy</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Request Account Deletion
          </h1>
          <p className="text-sm font-medium text-slate-600">
            Ramyas Jeweller Customer Application
          </p>
        </header>

        {/* Informational Message */}
        <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-5 text-sm text-slate-700 leading-relaxed space-y-3">
          <p className="font-semibold text-slate-900">
            To request deletion of your Ramyas Jeweller Customer App account, please contact Ramyas Jeweller.
          </p>
          <p className="text-xs text-slate-600">
            For security and identity verification, account deletion requests are processed manually by our showroom staff. Certain financial scheme transaction records may be retained as required by law.
          </p>
        </div>

        {/* Contact Details Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="border-b border-slate-200 pb-3">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Showroom Information
            </h2>
            <p className="text-lg font-extrabold text-slate-900 mt-1">RAMYAS JEWELLER</p>
          </div>

          <div className="space-y-3 text-sm text-slate-700">
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-rose-800 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-slate-900">91, Main Road, Begambur</p>
                <p className="text-slate-600">Dindigul, Tamil Nadu - 624001, India</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-rose-800 shrink-0" />
              <div>
                <span className="text-xs font-semibold text-slate-500 block">Phone:</span>
                <span className="font-mono font-bold text-slate-900">{displayPhone}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-rose-800 shrink-0" />
              <div>
                <span className="text-xs font-semibold text-slate-500 block">Business Hours:</span>
                <span className="font-semibold text-slate-900">9:30 AM – 10:00 PM (Daily)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Action Buttons */}
        <div className="space-y-3 pt-2">
          <a
            href={`tel:${phoneNumber}`}
            className="w-full py-3.5 px-6 bg-rose-800 hover:bg-rose-900 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-rose-900/10 flex items-center justify-center gap-2.5 text-center"
          >
            <Phone className="w-4 h-4" />
            <span>Call Ramyas Jeweller</span>
          </a>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3.5 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-emerald-700/10 flex items-center justify-center gap-2.5 text-center"
          >
            <MessageSquare className="w-4 h-4" />
            <span>WhatsApp Ramyas Jeweller</span>
          </a>
        </div>

        {/* Footer */}
        <footer className="border-t border-slate-200 pt-6 text-center text-xs text-slate-500 space-y-2">
          <p>&copy; 2026 RAMYAS JEWELLER. All rights reserved.</p>
          <div className="flex items-center justify-center gap-4 pt-1 font-semibold">
            <Link href="/privacy" className="text-rose-800 hover:underline">
              Privacy Policy
            </Link>
          </div>
        </footer>

      </div>
    </div>
  );
}
