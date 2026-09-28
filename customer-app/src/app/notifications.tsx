import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '@/i18n';
import {
  CustomerNotificationsData,
  NotificationCategory,
} from '@/types/notification';
import {
  getCustomerNotifications,
  markNotificationAsRead,
} from '@/services/customerDataService';
import { getStoredCustomerSession } from '@/services/customerAuthService';
import { OFFICIAL_SCHEME_NAME } from '@/constants/shopData';

const initialNotificationsData: CustomerNotificationsData = {
  unreadCount: 0,
  featuredBanner: {
    id: 'b1',
    title: OFFICIAL_SCHEME_NAME,
    subtitle: 'Pay ₹1,000 monthly for 12 months & receive your ₹1,000 completion bonus at maturity!',
  },
  notifications: [],
};

import { useResponsiveMetrics } from '@/constants/responsive';

export default function NotificationsScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const responsive = useResponsiveMetrics();
  const [data, setData] = useState<CustomerNotificationsData>(initialNotificationsData);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadNotifications = async () => {
      setIsLoading(true);
      const session = await getStoredCustomerSession();
      if (!session) {
        if (isMounted) {
          setIsLoading(false);
          router.replace('/login');
        }
        return;
      }

      const realData = await getCustomerNotifications();
      if (isMounted) {
        if (realData) {
          setData(realData);
        }
        setIsLoading(false);
      }
    };

    loadNotifications();
    return () => {
      isMounted = false;
    };
  }, [router]);

  const handleMarkAsRead = async (id: string) => {
    // Optimistic UI update
    setData((prev) => ({
      ...prev,
      unreadCount: Math.max(0, prev.unreadCount - 1),
      notifications: prev.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n
      ),
    }));

    await markNotificationAsRead(id);
  };

  const handleNotificationPress = (item: (typeof data.notifications)[0]) => {
    handleMarkAsRead(item.id);

    // Extract receipt number from message if present
    const receiptMatch = item.message.match(/RJ-RCP-[A-Z0-9-]+/i);
    if (receiptMatch) {
      router.push({
        pathname: '/installment-receipt' as any,
        params: {
          receiptId: receiptMatch[0],
        },
      });
    }
  };

  const renderCategoryIcon = (category: NotificationCategory) => {
    switch (category) {
      case 'PAYMENT_RECORDED':
        return (
          <View style={[styles.iconCircle, styles.iconCircleGreen]}>
            <Ionicons name="checkmark-circle-outline" size={22} color="#16A34A" />
          </View>
        );
      case 'GOLD_RATE_UPDATE':
        return (
          <View style={[styles.iconCircle, styles.iconCircleYellow]}>
            <Ionicons name="trending-up-outline" size={20} color="#D97706" />
          </View>
        );
      case 'PAYMENT_REMINDER':
        return (
          <View style={[styles.iconCircle, styles.iconCircleAmber]}>
            <Ionicons name="time-outline" size={20} color="#EA580C" />
          </View>
        );
      case 'FESTIVAL_OFFER':
        return (
          <View style={[styles.iconCircle, styles.iconCirclePink]}>
            <Ionicons name="megaphone-outline" size={20} color="#DB2777" />
          </View>
        );
      case 'SHOP_ANNOUNCEMENT':
      default:
        return (
          <View style={[styles.iconCircle, styles.iconCircleGrey]}>
            <Ionicons name="storefront-outline" size={20} color="#475569" />
          </View>
        );
    }
  };

  const sections: { title: string; key: 'TODAY' | 'THIS_WEEK' | 'EARLIER' }[] = [
    { title: t('today'), key: 'TODAY' },
    { title: t('thisWeek'), key: 'THIS_WEEK' },
    { title: t('earlier'), key: 'EARLIER' },
  ];

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#70001E" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* HEADER */}
      <View style={styles.headerContainer}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.7}
          accessibilityLabel={t('back')}
        >
          <Ionicons name="arrow-back" size={22} color="#70001E" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{t('notifications')}</Text>

        <View style={styles.headerRightBadgeWrapper}>
          <Ionicons name="notifications" size={22} color="#70001E" />
          {data.unreadCount > 0 && (
            <View style={styles.unreadBadgeNumberContainer}>
              <Text style={styles.unreadBadgeNumberText}>{data.unreadCount}</Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: responsive.pageHorizontalPadding,
            paddingBottom: responsive.bottomClearance,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* FEATURED ANNOUNCEMENT BANNER */}
        {data.featuredBanner && (
          <View style={styles.bannerCard}>
            <Image
              source={require('@/assets/images/gold_temple_collection_banner.jpg')}
              style={styles.bannerImage}
              resizeMode="cover"
            />
            <View style={styles.bannerOverlay}>
              <Text style={styles.bannerTitle}>{data.featuredBanner.title}</Text>
              <Text style={styles.bannerSubtitle}>{data.featuredBanner.subtitle}</Text>
            </View>
          </View>
        )}

        {/* NOTIFICATION SECTIONS */}
        {data.notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="notifications-off-outline" size={32} color="#94A3B8" />
            </View>
            <Text style={styles.emptyTitle}>{t('noNotifications')}</Text>
            <Text style={styles.emptySubtitle}>
              {t('noNotificationsSub')}
            </Text>
          </View>
        ) : (
          sections.map((sec) => {
            const items = data.notifications.filter((n) => n.section === sec.key);
            if (items.length === 0) return null;

            return (
              <View key={sec.key} style={styles.sectionContainer}>
                {/* Section Header Bar */}
                <View style={styles.sectionHeaderBar}>
                  <Text style={styles.sectionHeaderTitle}>{sec.title}</Text>
                </View>

                {/* Items */}
                <View style={styles.sectionItemsList}>
                  {items.map((item, idx) => (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.notificationRow,
                        idx < items.length - 1 && styles.notificationRowBorder,
                      ]}
                      onPress={() => handleNotificationPress(item)}
                      activeOpacity={0.8}
                    >
                      {renderCategoryIcon(item.category)}

                      <View style={styles.notificationContent}>
                        <View style={styles.notificationRowHeader}>
                          <Text style={styles.notificationTitle}>{item.title}</Text>
                          <View style={styles.timeDotRow}>
                            <Text style={styles.notificationTime}>{item.timestamp}</Text>
                            {!item.isRead && <View style={styles.unreadBlueDot} />}
                          </View>
                        </View>
                        <Text style={styles.notificationMessage}>{item.message}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  headerContainer: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 6,
    marginLeft: -4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#70001E',
  },
  headerRightBadgeWrapper: {
    position: 'relative',
    padding: 4,
    marginRight: 4,
  },
  unreadBadgeNumberContainer: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#70001E',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  unreadBadgeNumberText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  scrollContent: {
    paddingBottom: 32,
  },
  bannerCard: {
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    height: 160,
    position: 'relative',
    shadowColor: '#70001E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(112, 0, 30, 0.55)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  bannerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  bannerSubtitle: {
    fontSize: 13.5,
    color: '#FCE7F3',
    marginTop: 4,
    lineHeight: 18,
    fontWeight: '500',
  },
  sectionContainer: {
    marginBottom: 8,
  },
  sectionHeaderBar: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  sectionHeaderTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
  },
  sectionItemsList: {
    backgroundColor: '#FFFFFF',
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 14,
  },
  notificationRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  iconCircleGreen: {
    backgroundColor: '#DCFCE7',
  },
  iconCircleYellow: {
    backgroundColor: '#FEF08A',
  },
  iconCircleAmber: {
    backgroundColor: '#FFEDD5',
  },
  iconCirclePink: {
    backgroundColor: '#FCE7F3',
  },
  iconCircleGrey: {
    backgroundColor: '#F1F5F9',
  },
  notificationContent: {
    flex: 1,
  },
  notificationRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
    marginRight: 8,
  },
  timeDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  notificationTime: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  unreadBlueDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
  },
  notificationMessage: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 19,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
    marginTop: 20,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
});
