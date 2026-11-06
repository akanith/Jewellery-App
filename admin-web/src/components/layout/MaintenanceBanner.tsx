'use client';

/**
 * RAMYAS JEWELLER - Administrative Maintenance Mode Banner
 *
 * Displays a prominent, persistent warning banner across the admin portal
 * whenever database maintenance mode is active.
 * Informs staff that customer enrollments, payments, and writes are blocked.
 */

import React, { useEffect, useState } from 'react';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { isMaintenanceModeActive, getMaintenanceNotice } from '@/lib/maintenance';

export default function MaintenanceBanner() {
  const [isActive, setIsActive] = useState(() => isMaintenanceModeActive());

  useEffect(() => {
    // Listen to real-time changes
    const handleMaintenanceChange = () => {
      setIsActive(isMaintenanceModeActive());
    };

    window.addEventListener('ramyas:maintenance-change', handleMaintenanceChange);
    window.addEventListener('storage', handleMaintenanceChange);

    return () => {
      window.removeEventListener('ramyas:maintenance-change', handleMaintenanceChange);
      window.removeEventListener('storage', handleMaintenanceChange);
    };
  }, []);

  if (!isActive) {
    return null;
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-white px-4 py-2.5 sm:px-6 shadow-md border-b border-amber-700/30 flex items-center justify-between text-xs sm:text-sm font-medium z-40 relative"
    >
      <div className="flex items-center gap-2.5 max-w-7xl mx-auto w-full">
        <div className="p-1 rounded-md bg-amber-700/50 shrink-0 flex items-center justify-center">
          <AlertTriangle className="w-4 h-4 text-amber-100 animate-pulse" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="font-bold tracking-wide uppercase mr-2 text-[11px] bg-amber-900/40 px-2 py-0.5 rounded border border-amber-400/30">
            Maintenance Mode Active
          </span>
          <span className="text-amber-50">
            {getMaintenanceNotice()}
          </span>
        </div>
        <div className="hidden md:flex items-center gap-1.5 shrink-0 text-amber-100 text-xs font-semibold bg-amber-900/30 px-2.5 py-1 rounded-full border border-amber-400/20">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>WRITES LOCKED</span>
        </div>
      </div>
    </div>
  );
}
