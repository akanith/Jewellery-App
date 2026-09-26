'use client';

/**
 * RAMYAS JEWELLER - Main Navigation Sidebar Shell
 * Production sidebar with persistent app-shell alignment, active route highlights,
 * high-contrast "+ New Scheme" button, and synchronized admin profile chip.
 */

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Gift,
  BarChart3,
  Settings,
  Plus,
  Gem,
  KeyRound,
  X,
  LucideIcon
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

interface SidebarProps {
  onAddCustomer?: () => void;
  onOpenNewScheme?: () => void;
  isMobile?: boolean;
  onCloseMobile?: () => void;
}

interface NavItemConfig {
  name: string;
  href: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItemConfig[] = [
  { name: 'Home', href: '/', icon: LayoutDashboard },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Reset Requests', href: '/password-reset-requests', icon: KeyRound },
  { name: 'Payments', href: '/payments', icon: CreditCard },
  { name: 'Redemption', href: '/redemption', icon: Gift },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function Sidebar({ onAddCustomer, onOpenNewScheme, isMobile, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const { user, profile, adminProfile } = useAuth();
  const handleAction = () => {
    if (onAddCustomer) onAddCustomer();
    else if (onOpenNewScheme) onOpenNewScheme();
    if (isMobile && onCloseMobile) onCloseMobile();
  };

  // Route matching logic
  const isRouteActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  // Derive admin profile details
  let fullName = profile?.full_name;
  if (!fullName) {
    if (user?.email === 'admin1@gmail.com') {
      fullName = 'A.B.Kathiravven';
    } else if (user?.email === 'admin2@gmail.com') {
      fullName = 'A.K.Anith';
    } else {
      fullName = user?.email?.split('@')[0] || 'Owner Profile';
    }
  }

  const roleTitle = adminProfile?.role_title || (
    adminProfile?.is_super_admin || user?.email === 'admin1@gmail.com'
      ? 'Store Owner'
      : 'Store Administrator'
  );

  const initials = fullName
    .replace(/\./g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'AK';

  return (
    <aside
      className={
        isMobile
          ? 'flex flex-col justify-between h-full select-none w-72 max-w-[85vw] bg-white border-r border-slate-200 z-50 shadow-2xl'
          : 'hidden lg:flex w-64 bg-[#f8fafc] border-r border-slate-200/80 flex-col justify-between shrink-0 h-full select-none z-20'
      }
    >
      {/* TOP SECTION: BRAND HEADER & NAVIGATION */}
      <div className="flex flex-col flex-1 min-h-0">
        {/* Brand Header */}
        <div className="p-6 pb-5 shrink-0 flex items-center justify-between">
          <Link href="/" onClick={() => isMobile && onCloseMobile?.()} className="flex items-start gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-700 to-blue-900 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform shrink-0">
              <Gem className="w-5 h-5 text-amber-300" />
            </div>
            <div className="min-w-0">
              <span className="font-heading font-bold text-base text-blue-950 tracking-tight block leading-tight truncate">
                RAMYA&apos;S JEWELLER
              </span>
              <span className="text-[11px] text-slate-500 font-medium tracking-wide block">
                Premium Management
              </span>
            </div>
          </Link>
          {isMobile && onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Close Menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation Items (Perfect Vertical Alignment) */}
        <nav className="px-3.5 space-y-1.5 mt-1 flex-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const active = isRouteActive(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => isMobile && onCloseMobile?.()}
                className={`group flex items-center gap-3.5 h-11 px-3 transition-all duration-150 relative ${
                  active
                    ? 'bg-blue-50 text-blue-900 font-bold border-l-4 border-blue-600 rounded-r-xl rounded-l-none pl-2.5 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 rounded-xl border-l-4 border-transparent'
                }`}
              >
                <div className="w-5 h-5 flex items-center justify-center shrink-0">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      active
                        ? 'text-blue-600 stroke-[2.2]'
                        : 'text-slate-400 group-hover:text-slate-600 stroke-[1.8]'
                    }`}
                  />
                </div>
                <span
                  className={`text-xs transition-colors ${
                    active
                      ? 'font-bold text-blue-900'
                      : 'font-semibold text-slate-600 group-hover:text-slate-900'
                  }`}
                >
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* BOTTOM SECTION: ADD CUSTOMER BUTTON, LEDGER STATUS & USER PROFILE */}
      <div className="p-4 border-t border-slate-200/60 space-y-3 shrink-0 bg-[#f8fafc]">
        {/* + Add Customer Solid High-Contrast Action Button */}
        {onAddCustomer || onOpenNewScheme ? (
          <button
            type="button"
            onClick={handleAction}
            className="w-full h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          >
            <Plus className="w-4 h-4 text-white stroke-[2.5]" />
            <span className="text-white font-bold tracking-wide">Add Customer</span>
          </button>
        ) : (
          <Link
            href="/customers/new"
            onClick={() => isMobile && onCloseMobile?.()}
            className="w-full h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          >
            <Plus className="w-4 h-4 text-white stroke-[2.5]" />
            <span className="text-white font-bold tracking-wide">Add Customer</span>
          </Link>
        )}

        {/* User Profile Chip at Bottom Left (Linked to Settings) */}
        <Link
          href="/settings"
          onClick={() => isMobile && onCloseMobile?.()}
          className="flex items-center gap-3 p-1.5 -mx-1 rounded-xl hover:bg-slate-200/60 transition-colors group cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-heading font-bold text-xs flex items-center justify-center shadow-2xs shrink-0 group-hover:scale-105 transition-transform">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <span className="font-heading font-bold text-xs text-slate-900 block leading-tight truncate">
              {fullName}
            </span>
            <span className="text-[10px] text-slate-500 font-medium block truncate">
              {roleTitle}
            </span>
          </div>
        </Link>
      </div>
    </aside>
  );
}
