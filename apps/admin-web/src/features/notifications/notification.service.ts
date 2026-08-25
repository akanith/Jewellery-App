import { createClient } from '@/lib/supabase/client';
import { AppError, ErrorCode } from '@/lib/errors/app-error';
import { normalizeError } from '@/lib/errors/error-handler';
import { Notification, NotificationType, NotificationMetadata } from '@ramyas-jeweller/shared-types';

export interface CreateNotificationPayload {
  customerId?: string;
  title: string;
  message: string;
  type: NotificationType;
  metadata?: NotificationMetadata;
}

export class NotificationService {
  private static getSupabase() {
    return createClient();
  }

  /**
   * Helper to map database notification row to Notification interface
   */
  private static mapRowToNotification(row: Record<string, unknown>): Notification {
    return {
      id: String(row.id),
      customerId: row.customer_id ? String(row.customer_id) : null,
      title: String(row.title ?? ''),
      message: String(row.message ?? ''),
      type: (row.type as NotificationType) ?? 'ANNOUNCEMENT',
      isRead: Boolean(row.is_read ?? false),
      metadata: (row.metadata as NotificationMetadata) ?? null,
      createdAt: String(row.created_at ?? new Date().toISOString()),
    };
  }

  /**
   * Fetch recent notifications from public.notifications
   */
  static async getNotifications(limit: number = 20): Promise<Notification[]> {
    const supabase = this.getSupabase();

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw normalizeError(error);
      }

      return (data ?? []).map((row) => this.mapRowToNotification(row));
    } catch (error) {
      throw normalizeError(error);
    }
  }

  /**
   * Get unread notification count
   */
  static async getUnreadNotificationCount(): Promise<number> {
    const supabase = this.getSupabase();

    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false);

      if (error) {
        throw normalizeError(error);
      }

      return count ?? 0;
    } catch (error) {
      throw normalizeError(error);
    }
  }

  /**
   * Mark a single notification as read
   */
  static async markNotificationAsRead(id: string): Promise<Notification> {
    const supabase = this.getSupabase();

    try {
      if (!id) {
        throw new AppError('Notification ID is required.', ErrorCode.VALIDATION_ERROR, 400);
      }

      const { data, error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        throw normalizeError(error);
      }

      return this.mapRowToNotification(data);
    } catch (error) {
      throw normalizeError(error);
    }
  }

  /**
   * Mark all unread notifications as read
   */
  static async markAllNotificationsAsRead(): Promise<boolean> {
    const supabase = this.getSupabase();

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('is_read', false);

      if (error) {
        throw normalizeError(error);
      }

      return true;
    } catch (error) {
      throw normalizeError(error);
    }
  }

  /**
   * Create a new in-app system notification
   */
  static async createNotification(payload: CreateNotificationPayload): Promise<Notification> {
    const supabase = this.getSupabase();

    try {
      if (!payload.title || !payload.message) {
        throw new AppError('Title and message are required for notification.', ErrorCode.VALIDATION_ERROR, 400);
      }

      const { data, error } = await supabase
        .from('notifications')
        .insert({
          customer_id: payload.customerId || null,
          title: payload.title.trim(),
          message: payload.message.trim(),
          type: payload.type || 'ANNOUNCEMENT',
          metadata: payload.metadata || {},
          is_read: false,
        })
        .select('*')
        .single();

      if (error) {
        const msg = error.message;
        if (msg.includes('row-level security') || msg.includes('violates row-level security')) {
          throw new AppError('Access denied. Owner, Admin, or Staff role required to create notifications.', ErrorCode.FORBIDDEN, 403);
        }
        throw normalizeError(error);
      }

      return this.mapRowToNotification(data);
    } catch (error) {
      throw normalizeError(error);
    }
  }
}
