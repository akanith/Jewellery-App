'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AdminSidebar } from './admin-sidebar';
import { AdminHeader } from './admin-header';
import { AuthService } from '@/features/auth';
import { createClient } from '@/lib/supabase/client';

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function checkAuthStatus() {
      const adminUser = await AuthService.getCurrentAdminUser();

      if (!isMounted) return;

      if (adminUser) {
        setIsAuthenticated(true);
        if (pathname === '/login') {
          router.replace('/');
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

    // Listen for auth state changes across all browser tabs
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || (!session && pathname !== '/login')) {
        if (isMounted) {
          setIsAuthenticated(false);
          if (pathname !== '/login') {
            router.replace('/login');
          }
        }
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        checkAuthStatus();
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [pathname, router]);

  // If on login route, render login page full-width without Sidebar & Header
  if (pathname === '/login') {
    return <>{children}</>;
  }

  // Prevent flash of protected content before auth check completes
  if (!isAuthChecked) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold tracking-wider text-slate-300">Verifying Admin Authentication...</p>
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
