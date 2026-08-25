'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Check, 
  CreditCard, 
  Gift, 
  Award, 
  Bell, 
  AlertCircle, 
  Loader2, 
  RefreshCw,
  X
} from 'lucide-react';
import { NotificationService } from '@/features/notifications';
import { Notification, NotificationType } from '@ramyas-jeweller/shared-types';
import { AppError } from '@/lib/errors/app-error';

interface NotificationPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onNotificationUpdated?: () => void;
}

export function NotificationPopover({
  isOpen,
  onClose,
  onNotificationUpdated,
}: NotificationPopoverProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionInProgress, setIsActionInProgress] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const popoverRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const list = await NotificationService.getNotifications(20);
      setNotifications(list);
    } catch (err) {
      if (err instanceof AppError) {
        setError(err.toUserMessage());
      } else {
        setError('Unable to load notifications. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  // Handle outside click to close popover
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleMarkAsRead = async (id: string, isRead: boolean) => {
    if (isRead || isActionInProgress) return;

    setIsActionInProgress(true);
    try {
      await NotificationService.markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      if (onNotificationUpdated) onNotificationUpdated();
    } catch (err) {
      // Silent error fallback
    } finally {
      setIsActionInProgress(false);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (isActionInProgress) return;

    setIsActionInProgress(true);
    try {
      await NotificationService.markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      if (onNotificationUpdated) onNotificationUpdated();
    } catch (err) {
      // Fallback
    } finally {
      setIsActionInProgress(false);
    }
  };

  const getTypeIcon = (type: NotificationType) => {
    switch (type) {
      case 'PAYMENT':
        return <CreditCard className="w-4 h-4 text-emerald-600" />;
      case 'SCHEME':
        return <Award className="w-4 h-4 text-blue-600" />;
      case 'REDEMPTION':
        return <Gift className="w-4 h-4 text-amber-600" />;
      default:
        return <Bell className="w-4 h-4 text-slate-500" />;
    }
  };

  const getTypeBg = (type: NotificationType) => {
    switch (type) {
      case 'PAYMENT':
        return 'bg-emerald-50';
      case 'SCHEME':
        return 'bg-blue-50';
      case 'REDEMPTION':
        return 'bg-amber-50';
      default:
        return 'bg-slate-100';
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div
      ref={popoverRef}
      className="absolute right-0 top-12 w-80 sm:w-96 bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 overflow-hidden font-sans animate-in fade-in zoom-in-95 duration-200"
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2">
          <h3 className="font-extrabold text-sm text-slate-900">Notifications</h3>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 bg-blue-900 text-white font-extrabold text-[10px] rounded-full">
              {unreadCount} new
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              disabled={isActionInProgress}
              className="text-[11px] font-bold text-blue-900 hover:underline flex items-center gap-1 disabled:opacity-50"
            >
              <Check className="w-3 h-3" />
              <span>Mark all read</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-3 bg-red-50 text-red-800 text-xs font-bold flex items-center justify-between border-b border-red-100">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span className="truncate">{error}</span>
          </div>
          <button
            onClick={fetchNotifications}
            className="p-1 bg-white rounded border border-red-200 text-red-900"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Body List */}
      <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="p-4 flex items-start gap-3 animate-pulse">
              <div className="w-8 h-8 rounded-xl bg-slate-100 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-slate-100 rounded w-2/3" />
                <div className="h-2.5 bg-slate-100 rounded w-full" />
              </div>
            </div>
          ))
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <Bell className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="font-bold text-xs text-slate-700">No notifications</p>
            <p className="text-[11px] text-slate-400">You're all caught up with system alerts.</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => handleMarkAsRead(n.id, n.isRead)}
              className={`p-4 flex items-start gap-3 transition-colors cursor-pointer relative ${
                n.isRead ? 'bg-white hover:bg-slate-50/60' : 'bg-blue-50/30 hover:bg-blue-50/60'
              }`}
            >
              {!n.isRead && (
                <span className="w-2 h-2 rounded-full bg-blue-600 absolute top-4 right-4" />
              )}

              <div className={`p-2 rounded-xl shrink-0 ${getTypeBg(n.type)}`}>
                {getTypeIcon(n.type)}
              </div>

              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-xs text-slate-900 truncate">{n.title}</h4>
                  <span className="text-[10px] text-slate-400 shrink-0">
                    {new Date(n.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5 leading-snug line-clamp-2">{n.message}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
