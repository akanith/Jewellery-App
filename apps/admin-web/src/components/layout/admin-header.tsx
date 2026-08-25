'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Bell, Calendar, HelpCircle } from 'lucide-react';
import { NotificationService } from '@/features/notifications';
import { NotificationPopover } from './notification-popover';

export function AdminHeader() {
  const currentDate = 'AUGUST 25, 2026';
  const [unreadCount, setUnreadCount] = useState(0);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const count = await NotificationService.getUnreadNotificationCount();
      setUnreadCount(count);
    } catch (err) {
      // Fallback
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-20 font-sans">
      {/* Global Search Input */}
      <div className="relative w-96">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Global Search... (customers, schemes, bills)"
          className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
        />
      </div>

      {/* Right User Actions */}
      <div className="flex items-center gap-4">
        {/* Date Display */}
        <div className="hidden md:flex items-center gap-2 text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>{currentDate}</span>
        </div>

        {/* Help Button */}
        <button className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50 transition-all">
          <HelpCircle className="w-5 h-5" />
        </button>

        {/* Bell Notifications Button Container */}
        <div className="relative">
          <button
            onClick={() => setIsPopoverOpen(!isPopoverOpen)}
            className="relative p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50 transition-all cursor-pointer"
            title="System Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 px-1.5 py-0.5 bg-blue-900 text-white font-extrabold text-[9px] rounded-full ring-2 ring-white min-w-[16px] text-center">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notification Popover Dropdown */}
          <NotificationPopover
            isOpen={isPopoverOpen}
            onClose={() => setIsPopoverOpen(false)}
            onNotificationUpdated={fetchUnreadCount}
          />
        </div>

        <div className="h-6 w-px bg-slate-200" />

        {/* Admin User Profile */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs ring-2 ring-blue-100">
            AK
          </div>
          <div className="hidden lg:block text-left">
            <h4 className="text-xs font-bold text-slate-900 leading-tight">A.B.Kathiravven</h4>
            <p className="text-[11px] text-slate-500">Shop Owner</p>
          </div>
        </div>
      </div>
    </header>
  );
}
