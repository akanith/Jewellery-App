'use client';

/**
 * RAMYAS JEWELLER / AURELIA JEWELERS - Main Top Header Bar
 * Features global search, notification triggers, calendar shortcut, and user status profile.
 */

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Search,
  Bell,
  Calendar,
  LogOut,
  User,
  Shield,
  Menu
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

interface HeaderProps {
  onToggleMobileMenu?: () => void;
}

export default function Header({ onToggleMobileMenu }: HeaderProps) {
  const { user, profile, adminProfile, signOut } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Extract name and initials
  let fullName = profile?.full_name;
  if (!fullName) {
    if (user?.email === 'admin1@gmail.com') {
      fullName = 'A.B.Kathiravven';
    } else if (user?.email === 'admin2@gmail.com') {
      fullName = 'A.K.Anith';
    } else {
      fullName = user?.email?.split('@')[0] || 'Admin User';
    }
  }

  const roleTitle = adminProfile?.role_title || (adminProfile?.is_super_admin || user?.email === 'admin1@gmail.com' ? 'Store Owner' : 'Administrator');
  const initials = fullName
    .replace(/\./g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'AD';

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-3 sm:px-6 flex items-center justify-between sticky top-0 z-30 min-w-0 w-full">
      {/* Mobile Menu Toggle Button */}
      {onToggleMobileMenu && (
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors mr-2 lg:hidden shrink-0 cursor-pointer"
          title="Open Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}

      {/* Omni-search bar */}
      <div className="flex-1 max-w-xs sm:max-w-lg min-w-0">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search customers, schemes..."
            className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-royal-blue-500/20 focus:border-royal-blue-500 transition-all text-slate-900 placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Right Action Icons & User Profile */}
      <div className="flex items-center gap-4">
        {/* Notification Bell / Reset Requests Inbox */}
        <Link
          href="/password-reset-requests"
          title="Password Reset Requests Inbox"
          className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors relative flex items-center justify-center"
        >
          <Bell className="w-4 h-4" />
          <span className="w-2 h-2 rounded-full bg-amber-500 absolute top-1.5 right-1.5 animate-pulse"></span>
        </Link>

        {/* Calendar / Date */}
        <button
          title="Calendar Schedule"
          className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
        >
          <Calendar className="w-4 h-4" />
        </button>

        <div className="h-6 w-px bg-slate-200"></div>

        {/* User Profile Info Chip */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-3 p-1 rounded-xl hover:bg-slate-50 transition-colors text-left"
          >
            <div className="text-right hidden sm:block">
              <span className="font-heading font-bold text-xs text-slate-900 block leading-tight">
                {fullName}
              </span>
              <span className="text-[11px] text-slate-500 font-medium block">
                {roleTitle}
              </span>
            </div>

            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white font-heading font-bold text-xs flex items-center justify-center shadow-xs">
              {initials}
            </div>
          </button>

          {/* Profile Dropdown Menu */}
          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-4 py-2.5 border-b border-slate-100">
                <span className="font-bold text-xs text-slate-900 block">{fullName}</span>
                <span className="text-[11px] text-slate-500 block truncate">
                  {user?.email || 'admin@ramyasjeweller.com'}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md mt-1.5 border border-emerald-200">
                  <Shield className="w-3 h-3 text-emerald-600" />
                  Authenticated Admin
                </span>
              </div>

              <div className="py-1 text-xs">
                <Link
                  href="/settings"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-slate-700 hover:bg-slate-50 hover:text-blue-600"
                >
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  Account Settings
                </Link>
              </div>

              <div className="border-t border-slate-100 pt-1">
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    signOut();
                  }}
                  className="flex items-center gap-2.5 w-full text-left px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 font-medium"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-500" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
