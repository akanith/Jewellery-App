'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AdminSidebar } from './admin-sidebar';
import { AdminHeader } from './admin-header';
import { AuthService } from '@/features/auth';

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function checkAuthStatus() {
      // 1. Check Supabase Auth
      const adminUser = await AuthService.getCurrentAdminUser();

      // 2. Check local session & cookies
      let hasLocalAdmin = false;
      if (typeof window !== 'undefined') {
        const localUser = localStorage.getItem('admin_user');
        const hasCookie = document.cookie.includes('admin_user') || document.cookie.includes('admin_access_token');
        if (localUser || hasCookie) {
          hasLocalAdmin = true;
        }
      }

      if (!isMounted) return;

      const isAuthed = !!adminUser || hasLocalAdmin;

      if (isAuthed) {
        setIsAuthenticated(true);
        if (pathname === '/login') {
          router.replace('/customers');
        }
      } else {
        setIsAuthenticated(false);
        if (pathname !== '/login') {
          router.replace('/login');
        }
      }

      setIsAuthChecked(true);
    }

    checkAuthStatus();
  }, [pathname, router]);

  // If on login route, render login page full-width without Sidebar & Header
  if (pathname === '/login') {
    return <>{children}</>;
  }

  // Prevent flash of protected content before auth check completes
  if (!isAuthChecked) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold tracking-wider text-amber-400">Opening Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900 antialiased">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader />
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
