'use client';

/**
 * RAMYAS JEWELLER - Dashboard Layout Shell
 * Houses the Sidebar, Header, page content area, and routing protection.
 */

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { Gem } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-700 to-blue-500 flex items-center justify-center shadow-xl shadow-blue-500/20 animate-pulse">
            <Gem className="w-7 h-7 text-white" />
          </div>
          <div className="text-center">
            <div className="font-heading font-bold text-lg text-slate-800">RAMYA&apos;S JEWELLER</div>
            <div className="text-xs text-slate-500 tracking-wider uppercase mt-0.5">Loading Dashboard...</div>
          </div>
        </div>
      </div>
    );
  }

  // If unauthenticated, return null while redirect triggers
  if (!user) {
    return null;
  }

  return (
    <div className="h-screen w-full flex overflow-hidden bg-[#f8fafc]">
      {/* Sidebar Navigation (Fixed Height & Stable Shell) */}
      <Sidebar />

      {/* Main Content Area (Scrolls independently) */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 sm:p-8 lg:p-10">
          <div className="max-w-7xl w-full mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
