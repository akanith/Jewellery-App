import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CustomerHeader } from '@/components/CustomerHeader';
import { CustomerHomeData } from '@/types/dashboard';
import { formatCurrency } from '../../lib/formatters';
import { useLanguage, TranslationKey } from '@/i18n';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getStoredCustomerSession } from '@/services/customerAuthService';
import { getCustomerDashboard } from '@/services/customerDataService';

// Isolated fallback structure if network is offline before first sync
const initialHomeData: CustomerHomeData = {
  customerName: 'Customer',
  customerCode: '',
  unreadNotificationsCount: 0,
  scheme: null,
  currentInstallment: null,
  recentPayments: [],
  announcement: 'Shop closed on Sunday. Happy Holidays!',
};

const MONTH_KEYS: TranslationKey[] = ['sep', 'oct', 'nov', 'dec', 'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug'];

export default function CustomerHomeScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<CustomerHomeData>(initialHomeData);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadDashboard = async () => {
      setIsLoading(true);
      const session = await getStoredCustomerSession();
      if (!session) {
        if (isMounted) {
          setIsLoading(false);
          router.replace('/login');
        }
        return;
      }

      const realData = await getCustomerDashboard();
      if (isMounted) {
        if (realData) {
          setData(realData);
        } else {
          const currentSession = await getStoredCustomerSession();
          if (!currentSession) {
            router.replace('/login');
          }
        }
        setIsLoading(false);
      }
    };

    loadDashboard();
    return () => {
      isMounted = false;
    };
  }, [router]);

  const scheme = data.scheme;
  const currentInst = data.currentInstallment;
  const paidCount = scheme?.paidInstallments ?? 8;
  const totalCount = scheme?.totalInstallments ?? 12;
  const monthlyAmount = (scheme as any)?.monthlyInstallmentAmount || (currentInst?.amount ?? 1000);
  const paidAmount = scheme?.paidAmount ?? 8000;
  const totalTargetAmount = monthlyAmount * totalCount;

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
      <StatusBar barStyle="dark-content" backgroundColor="#FFFDF8" />

      {/* GLOBAL TOP HEADER */}
      <CustomerHeader
        customerName={data.customerName}
        unreadCount={data.unreadNotificationsCount}
        avatarUri={data.avatarUri}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 120 + Math.max(insets.bottom, 16) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* DIGITAL SAVINGS SCHEME PASS HERO CARD */}
        <View style={styles.schemePassCard}>
          {/* Card Brand Header */}
          <View style={styles.cardBrandRow}>
            <View>
              <Text style={styles.cardBrandTitle}>RAMYAS JEWELLER</Text>
              <Text style={styles.cardBrandSub}>{t('savingsSchemePass')}</Text>
            </View>
            <View style={styles.cardEmblemCircle}>
              <Ionicons name="diamond-outline" size={16} color="#70001E" />
            </View>
          </View>

          {/* Customer & Pass ID Row */}
          <View style={styles.cardCustomerRow}>
            <View>
              <Text style={styles.cardFieldLabel}>{t('customerLabel')}</Text>
              <Text style={styles.cardCustomerName}>{data.customerName.toUpperCase()}</Text>
            </View>
            <View style={styles.alignRight}>
              <Text style={styles.cardFieldLabel}>{t('passIdLabel')}</Text>
              <Text style={styles.cardPassId}>{scheme?.schemeCode || data.customerCode || 'RJ-2026-8842'}</Text>
            </View>
          </View>

          {/* 3-Column Stats Grid */}
          <View style={styles.cardStatsBar}>
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>{t('monthlyLabel')}</Text>
              <Text style={styles.statValue}>{formatCurrency(monthlyAmount)}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>{t('journeyLabel')}</Text>
              <Text style={styles.statValue}>{paidCount} / {totalCount}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>{t('installmentLabel')}</Text>
              <View style={styles.statusDotRow}>
                <View style={styles.statusDot} />
                <Text style={styles.statusDotText}>
                  {t('upToDate')}
                </Text>
              </View>
            </View>
          </View>

          {/* Maturity Value Row */}
          <View style={styles.cardMaturityRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardMaturityLabel}>{t('maturityValueLabel')}</Text>
              <Text style={styles.cardMaturityValue}>
                {formatCurrency(scheme?.maturityAmount ?? 13000)}
              </Text>
              <Text style={styles.cardMaturitySub}>
                {t('maturityAvailableSub')}
              </Text>
            </View>
            <View style={styles.qrCodeBadge}>
              <Ionicons name="grid-outline" size={20} color="#70001E" />
            </View>
          </View>
        </View>

        {/* NEXT PAYMENT CARD */}
        <View style={styles.nextPaymentCard}>
          <View style={styles.nextPaymentHeader}>
            <View style={styles.calendarIconWrapper}>
              <Ionicons name="calendar-outline" size={24} color="#70001E" />
            </View>

            <View style={styles.nextPaymentDetails}>
              <Text style={styles.nextPaymentSub}>{t('nextPayment')}</Text>
              <Text style={styles.nextPaymentDate}>
                {currentInst?.calendarMonth || 'November 2026'}
              </Text>
              <Text style={styles.nextPaymentAmount}>
                {formatCurrency(currentInst?.amount ?? monthlyAmount)}
              </Text>
            </View>

            <View style={styles.onTimeBadge}>
              <Text style={styles.onTimeBadgeText}>{t('onTime')}</Text>
            </View>
          </View>

          {/* Pay at Shop Action Button */}
          <TouchableOpacity
            style={styles.payAtShopButton}
            onPress={() => router.push('/shop')}
            activeOpacity={0.85}
          >
            <Ionicons name="storefront-outline" size={22} color="#70001E" />
            <Text style={styles.payAtShopButtonText}>{t('payAtShop')}</Text>
          </TouchableOpacity>
        </View>

        {/* YOUR JOURNEY TIMELINE CARD */}
        <View style={styles.journeyCard}>
          <View style={styles.journeyHeaderRow}>
            <Text style={styles.journeyTitle}>{t('yourJourney')}</Text>
            <Text style={styles.journeyBadge}>{paidCount} / {totalCount} {t('completedTag')}</Text>
          </View>
          <Text style={styles.journeySubtext}>
            {t('contributed')}: {formatCurrency(paidAmount)} {t('ofLabel')} {formatCurrency(totalTargetAmount)}
          </Text>

          {/* Month Bubbles Grid */}
          <View style={styles.bubblesContainer}>
            {/* Row 1: Months 1 to 6 */}
            <View style={styles.bubbleRow}>
              {MONTH_KEYS.slice(0, 6).map((monthKey, idx) => {
                const stepNum = idx + 1;
                const isCompleted = stepNum <= paidCount;
                const isCurrent = stepNum === paidCount + 1;
                const monthLabel = t(monthKey);
                return (
                  <View key={monthKey} style={styles.bubbleCol}>
                    <View
                      style={[
                        styles.bubbleCircle,
                        isCurrent && styles.bubbleCircleCurrent,
                        isCompleted && styles.bubbleCircleCompleted,
                      ]}
                    >
                      {isCompleted ? (
                        <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                      ) : (
                        <Text
                          style={[
                            styles.bubbleNumberText,
                            isCurrent && styles.bubbleNumberTextCurrent,
                          ]}
                        >
                          {stepNum}
                        </Text>
                      )}
                    </View>
                    <Text
                      style={[
                        styles.bubbleMonthLabel,
                        isCurrent && styles.bubbleMonthLabelCurrent,
                      ]}
                    >
                      {monthLabel}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* Row 2: Months 7 to 12 */}
            <View style={styles.bubbleRow}>
              {MONTH_KEYS.slice(6, 12).map((monthKey, idx) => {
                const stepNum = idx + 7;
                const isCompleted = stepNum <= paidCount;
                const isCurrent = stepNum === paidCount + 1;
                const isMaturityStep = stepNum === 12;
                const monthLabel = t(monthKey);

                return (
                  <View key={monthKey} style={styles.bubbleCol}>
                    <View
                      style={[
                        styles.bubbleCircle,
                        isMaturityStep && !isCompleted && !isCurrent && styles.bubbleCircleMaturity,
                        isCurrent && styles.bubbleCircleCurrent,
                        isCompleted && styles.bubbleCircleCompleted,
                      ]}
                    >
                      {isMaturityStep && !isCompleted ? (
                        <Ionicons name="ribbon" size={18} color="#70001E" />
                      ) : isCompleted ? (
                        <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                      ) : (
                        <Text
                          style={[
                            styles.bubbleNumberText,
                            isCurrent && styles.bubbleNumberTextCurrent,
                          ]}
                        >
                          {stepNum}
                        </Text>
                      )}
                    </View>
                    <Text
                      style={[
                        styles.bubbleMonthLabel,
                        isCurrent && styles.bubbleMonthLabelCurrent,
                      ]}
                    >
                      {monthLabel}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Progress Track Line */}
          <View style={styles.journeyTrackBar}>
            <View
              style={[
                styles.journeyTrackFill,
                { width: `${Math.min(100, Math.max(0, (paidCount / totalCount) * 100))}%` },
              ]}
            />
          </View>
        </View>

        {/* MATURITY / BONUS REWARD BANNER */}
        <View style={styles.maturityBonusCard}>
          <View style={styles.giftIconWrapper}>
            <Ionicons name="gift-outline" size={24} color="#70001E" />
          </View>
          <View style={styles.maturityBonusTextCol}>
            <Text style={styles.maturityBonusTitle}>
              {t('youWillReceive')} {formatCurrency(scheme?.maturityAmount ?? 13000)}
            </Text>
            <Text style={styles.maturityBonusSubtitle}>
              {t('includesBonus')}
            </Text>
          </View>
        </View>

        {/* ANNOUNCEMENT CARD */}
        {data.announcement && (
          <View style={styles.announcementCard}>
            <Ionicons
              name="megaphone-outline"
              size={20}
              color="#70001E"
              style={styles.announcementIcon}
            />
            <Text style={styles.announcementText}>{data.announcement}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFDF8',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: '#FFFDF8',
    borderBottomWidth: 1,
    borderBottomColor: '#E8DED8',
  },
  headerGreetingGroup: {
    flex: 1,
  },
  headerGreetingSub: {
    fontSize: 12.5,
    color: '#6F6870',
    fontWeight: '600',
  },
  headerCustomerName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#70001E',
    marginTop: 2,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F9EEF1',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notificationBadgeDot: {
    position: 'absolute',
    top: 9,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#70001E',
  },
  avatarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#D4AF37',
    backgroundColor: '#F9EEF1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 36,
    gap: 20,
  },
  schemePassCard: {
    backgroundColor: '#70001E',
    borderRadius: 22,
    padding: 22,
    shadowColor: '#520018',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#D4AF37',
  },
  cardBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardBrandTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#E7C86E',
    letterSpacing: 1.5,
  },
  cardBrandSub: {
    fontSize: 10,
    fontWeight: '700',
    color: '#F7E7A8',
    letterSpacing: 1.2,
    marginTop: 2,
  },
  cardEmblemCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF3C4',
    borderWidth: 1,
    borderColor: '#E7C86E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardCustomerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  alignRight: {
    alignItems: 'flex-end',
  },
  cardFieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#E7C86E',
    letterSpacing: 1,
    marginBottom: 3,
  },
  cardCustomerName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  cardPassId: {
    fontSize: 14,
    fontWeight: '800',
    color: '#E7C86E',
    letterSpacing: 0.5,
  },
  cardStatsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#520018',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: 'rgba(231, 200, 110, 0.25)',
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(231, 200, 110, 0.25)',
  },
  statLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#E7C86E',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  statusDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#E7F6ED',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16834B',
  },
  statusDotText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16834B',
  },
  cardMaturityRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(231, 200, 110, 0.25)',
  },
  cardMaturityLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#E7C86E',
    letterSpacing: 1,
    marginBottom: 4,
  },
  cardMaturityValue: {
    fontSize: 26,
    fontWeight: '800',
    color: '#E7C86E',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  cardMaturitySub: {
    fontSize: 11,
    color: '#F8EDEF',
    fontWeight: '400',
  },
  qrCodeBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FFF3C4',
    borderWidth: 1,
    borderColor: '#E7C86E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextPaymentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E8DED8',
    shadowColor: '#70001E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  nextPaymentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 16,
  },
  calendarIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#F9EEF1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextPaymentDetails: {
    flex: 1,
  },
  nextPaymentSub: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6F6870',
    marginBottom: 2,
  },
  nextPaymentDate: {
    fontSize: 20,
    fontWeight: '800',
    color: '#25232A',
    marginBottom: 2,
  },
  nextPaymentAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#70001E',
  },
  onTimeBadge: {
    backgroundColor: '#E7F6ED',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  onTimeBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#16834B',
    letterSpacing: 0.5,
  },
  payAtShopButton: {
    backgroundColor: '#F7DE72',
    borderRadius: 14,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#D4AF37',
  },
  payAtShopButtonText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#70001E',
  },
  journeyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E8DED8',
    shadowColor: '#70001E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  journeyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  journeyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#25232A',
  },
  journeyBadge: {
    fontSize: 13,
    fontWeight: '700',
    color: '#70001E',
  },
  journeySubtext: {
    fontSize: 13,
    color: '#6F6870',
    fontWeight: '500',
    marginBottom: 18,
  },
  bubblesContainer: {
    gap: 16,
    marginBottom: 16,
  },
  bubbleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bubbleCol: {
    alignItems: 'center',
    width: 44,
  },
  bubbleCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F3F0ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  bubbleCircleCurrent: {
    backgroundColor: '#F7DE72',
    borderWidth: 1.5,
    borderColor: '#D4AF37',
  },
  bubbleCircleCompleted: {
    backgroundColor: '#70001E',
  },
  bubbleCircleMaturity: {
    backgroundColor: '#FFF3C4',
    borderWidth: 1,
    borderColor: '#E7C86E',
  },
  bubbleNumberText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8A8387',
  },
  bubbleNumberTextCurrent: {
    color: '#70001E',
    fontWeight: '800',
  },
  bubbleMonthLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8A8387',
  },
  bubbleMonthLabelCurrent: {
    color: '#70001E',
    fontWeight: '800',
  },
  journeyTrackBar: {
    height: 6,
    backgroundColor: '#EDE5DF',
    borderRadius: 3,
    overflow: 'hidden',
  },
  journeyTrackFill: {
    height: '100%',
    backgroundColor: '#70001E',
    borderRadius: 3,
  },
  maturityBonusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#E7C86E',
    borderStyle: 'dashed',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  giftIconWrapper: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFF3C4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  maturityBonusTextCol: {
    flex: 1,
  },
  maturityBonusTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#25232A',
    marginBottom: 3,
  },
  maturityBonusSubtitle: {
    fontSize: 13,
    color: '#70001E',
    fontWeight: '600',
  },
  announcementCard: {
    backgroundColor: '#FFF3C4',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#E7C86E',
  },
  announcementIcon: {},
  announcementText: {
    flex: 1,
    fontSize: 13,
    color: '#25232A',
    fontWeight: '600',
  },
});
