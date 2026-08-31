import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { colors, radius, shadows, spacing } from '../../theme';
import { supabase } from '../../services/supabase/client';
import { NotificationItem } from '../../types';
import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  TrendingUp,
  Clock,
  Sparkles,
  Store,
  AlertCircle,
  RefreshCw,
} from 'lucide-react-native';

export default function NotificationsScreen() {
  const router = useRouter();
  const { identity } = useAuthStore();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchNotifications();
  }, [identity]);

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      setError(null);

      let query = supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (identity?.customerId) {
        query = query.or(`customer_id.eq.${identity.customerId},customer_id.is.null`);
      } else {
        query = query.is('customer_id', null);
      }

      const { data, error: fetchErr } = await query;

      if (fetchErr) {
        throw new Error(fetchErr.message);
      }

      const mapped: NotificationItem[] = (data || []).map((row) => ({
        id: String(row.id),
        customerId: row.customer_id ? String(row.customer_id) : null,
        title: String(row.title ?? 'Notification'),
        message: String(row.message ?? ''),
        type: row.type || 'ANNOUNCEMENT',
        isRead: Boolean(row.is_read),
        metadata: row.metadata || null,
        createdAt: String(row.created_at ?? new Date().toISOString()),
      }));

      setNotifications(mapped);
    } catch (err: any) {
      setError(err.message || 'Unable to load notifications.');
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await supabase.from('notifications').update({ is_read: true }).eq('id', id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch {
      // Ignore update failure
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const renderNotificationIcon = (type: string) => {
    switch (type) {
      case 'PAYMENT':
        return (
          <View style={[styles.iconCircle, { backgroundColor: colors.successBg }]}>
            <CheckCircle2 size={20} color={colors.successGreen} />
          </View>
        );
      case 'SCHEME':
      case 'REDEMPTION':
        return (
          <View style={[styles.iconCircle, { backgroundColor: '#FEF08A' }]}>
            <Sparkles size={20} color={colors.maroonPrimary} />
          </View>
        );
      case 'REMINDER':
        return (
          <View style={[styles.iconCircle, { backgroundColor: '#FFEDD5' }]}>
            <Clock size={20} color="#C2410C" />
          </View>
        );
      case 'ANNOUNCEMENT':
      default:
        return (
          <View style={[styles.iconCircle, { backgroundColor: colors.inputBackground }]}>
            <Store size={20} color={colors.textMuted} />
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header Bar */}
      <View style={styles.headerBar}>
        <View style={styles.headerTitleRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={20} color={colors.maroonPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
        </View>

        <TouchableOpacity style={styles.bellIconButton} onPress={fetchNotifications}>
          <Bell size={20} color={colors.maroonPrimary} />
          {unreadCount > 0 && (
            <View style={styles.bellBadge}>
              <Text style={styles.bellBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Hero Arrival Banner Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroOverlay}>
            <Text style={styles.heroTitle}>Ramya's Jeweller</Text>
            <Text style={styles.heroSub}>
              Notifications, Scheme Updates & Special Offers
            </Text>
          </View>
        </View>

        {/* Loading State */}
        {isLoading && (
          <View style={styles.stateCard}>
            <ActivityIndicator size="large" color={colors.maroonPrimary} />
            <Text style={styles.stateText}>Loading notifications...</Text>
          </View>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <View style={styles.stateCard}>
            <AlertCircle size={36} color={colors.errorRed} />
            <Text style={styles.errorText}>Unable to load notifications.</Text>
            <Text style={styles.errorSubText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchNotifications}>
              <RefreshCw size={16} color={colors.cardWhite} style={{ marginRight: 6 }} />
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Empty State */}
        {!isLoading && !error && notifications.length === 0 && (
          <View style={styles.stateCard}>
            <Bell size={36} color={colors.textMuted} />
            <Text style={styles.stateText}>No notifications yet.</Text>
            <Text style={styles.errorSubText}>You will receive alerts here for payments and scheme updates.</Text>
          </View>
        )}

        {/* Live Notifications List */}
        {!isLoading && !error && notifications.length > 0 && (
          <View style={styles.listContainer}>
            {notifications.map((item, index) => {
              const isLast = index === notifications.length - 1;
              const dateStr = new Date(item.createdAt).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.itemRow, isLast && { borderBottomWidth: 0 }]}
                  onPress={() => markAsRead(item.id)}
                  activeOpacity={0.8}
                >
                  {renderNotificationIcon(item.type)}
                  <View style={styles.itemContent}>
                    <View style={styles.itemHeader}>
                      <Text style={styles.itemTitle}>{item.title}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.itemTime}>{dateStr}</Text>
                        {!item.isRead && <View style={styles.unreadDot} />}
                      </View>
                    </View>
                    <Text style={styles.itemDesc}>{item.message}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.creamBackground,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.cardWhite,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.maroonPrimary,
  },
  bellIconButton: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    backgroundColor: colors.creamBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bellBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: radius.full,
    backgroundColor: colors.errorRed,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bellBadgeText: {
    color: colors.cardWhite,
    fontSize: 10,
    fontWeight: '800',
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  heroCard: {
    height: 120,
    backgroundColor: '#520C25',
    borderRadius: radius.xxl,
    overflow: 'hidden',
    marginBottom: spacing.xl,
    justifyContent: 'flex-end',
    ...shadows.card,
  },
  heroOverlay: {
    padding: spacing.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.cardWhite,
  },
  heroSub: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
  },
  stateCard: {
    backgroundColor: colors.cardWhite,
    borderRadius: radius.xxl,
    padding: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...shadows.soft,
  },
  stateText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textDark,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.errorRed,
    marginTop: spacing.md,
  },
  errorSubText: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.maroonPrimary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    marginTop: spacing.lg,
  },
  retryText: {
    color: colors.cardWhite,
    fontWeight: '700',
    fontSize: 14,
  },
  listContainer: {
    backgroundColor: colors.cardWhite,
    borderRadius: radius.xxl,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...shadows.soft,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  itemContent: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textDark,
  },
  itemTime: {
    fontSize: 12,
    color: colors.textMuted,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: '#3B82F6',
    marginLeft: 6,
  },
  itemDesc: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  },
});
