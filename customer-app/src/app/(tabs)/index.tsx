import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CustomerHeader } from '@/components/CustomerHeader';
import { CustomerHomeData, SchemeSummary } from '@/types/dashboard';
import { formatCurrency } from '../../lib/formatters';
import { useLanguage, TranslationKey } from '@/i18n';
import { getStoredCustomerSession } from '@/services/customerAuthService';
import { getCustomerDashboard } from '@/services/customerDataService';
import { useResponsiveMetrics } from '@/constants/responsive';

// Isolated fallback structure if network is offline before first sync
const initialHomeData: CustomerHomeData = {
  customerName: 'Customer',
  customerCode: '',
  unreadNotificationsCount: 0,
  scheme: null,
  schemes: [],
  currentInstallment: null,
  recentPayments: [],
  announcement: 'Shop closed on Sunday. Happy Holidays!',
};

const MONTH_KEYS: TranslationKey[] = ['sep', 'oct', 'nov', 'dec', 'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug'];

export default function CustomerHomeScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const responsive = useResponsiveMetrics();
  const [data, setData] = useState<CustomerHomeData>(initialHomeData);
  const [selectedSchemeId, setSelectedSchemeId] = useState<string | null>(null);
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

      // Pre-seed customer information from active session for immediate display
      if (session.customerCode && isMounted) {
        setData((prev) => ({
          ...prev,
          customerName: session.fullName || prev.customerName,
          customerCode: session.customerCode || prev.customerCode,
        }));
      }

      const realData = await getCustomerDashboard();
      if (isMounted) {
        if (realData) {
          setData(realData);
          if (realData.schemes && realData.schemes.length > 0) {
            setSelectedSchemeId(realData.schemes[0].schemeId);
          } else if (realData.scheme) {
            setSelectedSchemeId(realData.scheme.schemeId);
          }
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

  // Resolve all schemes list (supporting multiple schemes)
  const schemesList: SchemeSummary[] =
    data.schemes && data.schemes.length > 0
      ? data.schemes
      : data.scheme
      ? [data.scheme]
      : [];

  // Active focused scheme
  const activeScheme: SchemeSummary | null =
    schemesList.find((s) => s.schemeId === selectedSchemeId) ||
    schemesList[0] ||
    data.scheme ||
    null;

  // Active scheme metrics
  const paidCount = activeScheme?.paidInstallments ?? 0;
  const totalCount = activeScheme?.totalInstallments ?? 12;
  const monthlyAmount =
    activeScheme?.monthlyInstallmentAmount ??
    activeScheme?.monthlyInstallment ??
    data.currentInstallment?.amount ??
    0;
  const paidAmount = activeScheme?.paidAmount ?? 0;
  const totalTargetAmount = activeScheme
    ? (activeScheme.paidAmount || 0) + (activeScheme.remainingContribution || 0) ||
      monthlyAmount * totalCount
    : 0;

  // Combined Portfolio Summary
  const summary = data.summary || {
    totalSchemesCount: schemesList.length,
    activeSchemesCount: schemesList.filter((s) => s.status === 'ACTIVE').length,
    totalPaidAmount: schemesList.reduce((acc, s) => acc + (s.paidAmount || 0), 0),
    totalTargetContribution: schemesList.reduce(
      (acc, s) => acc + ((s.paidAmount || 0) + (s.remainingContribution || 0)),
      0
    ),
    totalMaturityAmount: schemesList.reduce((acc, s) => acc + (s.maturityAmount || 0), 0),
    totalPaidInstallments: schemesList.reduce((acc, s) => acc + (s.paidInstallments || 0), 0),
    totalInstallmentsCount: schemesList.reduce((acc, s) => acc + (s.totalInstallments || 12), 0),
    overallProgressPercentage:
      schemesList.length > 0
        ? Math.min(
            100,
            Math.round(
              (schemesList.reduce((acc, s) => acc + (s.paidInstallments || 0), 0) /
                Math.max(
                  1,
                  schemesList.reduce((acc, s) => acc + (s.totalInstallments || 12), 0)
                )) *
                100
            )
          )
        : 0,
  };

  const currentInst = activeScheme?.currentInstallment || data.currentInstallment;

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
        {/* 1. COMBINED PORTFOLIO SUMMARY CARD */}
        {schemesList.length > 0 && (
          <View style={styles.portfolioCard}>
            <View style={styles.portfolioHeaderRow}>
              <View>
                <Text style={styles.portfolioEyebrow}>RAMYAS JEWELLER</Text>
                <Text style={styles.portfolioTitle}>SAVINGS PORTFOLIO</Text>
              </View>
              <View style={styles.portfolioBadge}>
                <Ionicons name="sparkles" size={12} color="#70001E" />
                <Text style={styles.portfolioBadgeText}>
                  {summary.activeSchemesCount} {t('active')} {t('scheme')}
                </Text>
              </View>
            </View>

            <View style={styles.portfolioMetricsGrid}>
              <View style={styles.portfolioMetricCol}>
                <Text style={styles.portfolioMetricLabel}>{t('contributed').toUpperCase()}</Text>
                <Text style={styles.portfolioMetricValue}>
                  {formatCurrency(summary.totalPaidAmount)}
                </Text>
                <Text style={styles.portfolioMetricSub}>
                  {summary.totalTargetContribution > 0
                    ? `${t('ofLabel')} ${formatCurrency(summary.totalTargetContribution)}`
                    : '—'}
                </Text>
              </View>

              <View style={styles.portfolioMetricDivider} />

              <View style={styles.portfolioMetricCol}>
                <Text style={styles.portfolioMetricLabel}>{t('maturityValueLabel')}</Text>
                <Text style={styles.portfolioMetricValueGold}>
                  {summary.totalMaturityAmount > 0
                    ? formatCurrency(summary.totalMaturityAmount)
                    : '—'}
                </Text>
                <Text style={styles.portfolioMetricSub}>
                  {summary.totalPaidInstallments} / {summary.totalInstallmentsCount} {t('installmentLabel')}
                </Text>
              </View>
            </View>

            {/* Combined Progress Bar */}
            <View style={styles.portfolioProgressBarTrack}>
              <View
                style={[
                  styles.portfolioProgressBarFill,
                  { width: `${summary.overallProgressPercentage}%` },
                ]}
              />
            </View>
          </View>
        )}

        {/* 2. MULTI-SCHEME SELECTOR CARDS (When customer has 2+ schemes) */}
        {schemesList.length > 1 && (
          <View style={styles.schemesSection}>
            <View style={styles.schemesSectionHeader}>
              <Text style={styles.schemesSectionTitle}>
                YOUR SAVINGS SCHEMES ({schemesList.length})
              </Text>
              <Text style={styles.schemesSectionSub}>Tap to view details & passbook</Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.schemeCardsScrollContent}
            >
              {schemesList.map((s, idx) => {
                const isSelected = s.schemeId === selectedSchemeId;
                const slotLabel = s.slotNumber ? `${t('scheme')} #${s.slotNumber}` : `${t('scheme')} #${idx + 1}`;

                return (
                  <TouchableOpacity
                    key={s.schemeId}
                    style={[
                      styles.individualSchemeCard,
                      isSelected && styles.individualSchemeCardSelected,
                    ]}
                    onPress={() => setSelectedSchemeId(s.schemeId)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.individualSchemeCardHeader}>
                      <View style={styles.slotTagBadge}>
                        <Text style={styles.slotTagBadgeText}>{slotLabel}</Text>
                      </View>
                      <View
                        style={[
                          styles.statusPill,
                          s.status === 'ACTIVE'
                            ? styles.statusPillActive
                            : s.status === 'COMPLETED'
                            ? styles.statusPillCompleted
                            : styles.statusPillClosed,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusPillText,
                            s.status === 'ACTIVE'
                              ? styles.statusPillTextActive
                              : s.status === 'COMPLETED'
                              ? styles.statusPillTextCompleted
                              : styles.statusPillTextClosed,
                          ]}
                        >
                          {s.status}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.individualSchemeCode}>{s.schemeCode}</Text>

                    <View style={styles.individualSchemeNumbersRow}>
                      <View>
                        <Text style={styles.miniMetricLabel}>{t('schemeProgress')}</Text>
                        <Text style={styles.miniMetricVal}>
                          {s.paidInstallments} / {s.totalInstallments} {t('monthsLabel')}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.miniMetricLabel}>{t('paid')}</Text>
                        <Text style={styles.miniMetricVal}>{formatCurrency(s.paidAmount)}</Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.openPassbookLinkBtn}
                      onPress={() =>
                        router.push({
                          pathname: '/passbook',
                          params: { schemeId: s.schemeId || s.id },
                        } as any)
                      }
                      activeOpacity={0.7}
                    >
                      <Text style={styles.openPassbookLinkText}>{t('viewPassbookAction')}</Text>
                      <Ionicons name="arrow-forward" size={12} color="#70001E" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* 3. DIGITAL SAVINGS SCHEME PASS HERO CARD (Focused Scheme) */}
        {activeScheme && (
          <View style={styles.schemePassCard}>
            {/* Card Brand Header */}
            <View style={styles.cardBrandRow}>
              <View>
                <Text style={styles.cardBrandTitle}>RAMYAS JEWELLER</Text>
                <Text style={styles.cardBrandSub}>
                  {schemesList.length > 1
                    ? `SAVINGS SCHEME PASS (SLOT #${activeScheme.slotNumber || 1})`
                    : t('savingsSchemePass')}
                </Text>
              </View>
              <View style={styles.cardEmblemCircle}>
                <Ionicons name="diamond-outline" size={16} color="#70001E" />
              </View>
            </View>

            {/* Customer & Customer ID Row */}
            <View style={styles.cardCustomerRow}>
              <View>
                <Text style={styles.cardFieldLabel}>{t('customerLabel')}</Text>
                <Text style={styles.cardCustomerName}>{data.customerName.toUpperCase()}</Text>
              </View>
              <View style={styles.alignRight}>
                <Text style={styles.cardFieldLabel}>{t('customerIdLabel')}</Text>
                <Text style={styles.cardPassId}>
                  {data.customerCode?.trim() || '—'}
                </Text>
              </View>
            </View>

            {/* 3-Column Stats Grid */}
            <View style={styles.cardStatsBar}>
              <View style={styles.statCol}>
                <Text style={styles.statLabel}>{t('monthlyLabel')}</Text>
                <Text style={styles.statValue}>
                  {monthlyAmount > 0 ? formatCurrency(monthlyAmount) : '—'}
                </Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statCol}>
                <Text style={styles.statLabel}>{t('journeyLabel')}</Text>
                <Text style={styles.statValue}>
                  {paidCount} / {totalCount}
                </Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statCol}>
                <Text style={styles.statLabel}>{t('installmentLabel')}</Text>
                <View style={styles.statusDotRow}>
                  <View style={styles.statusDot} />
                  <Text style={styles.statusDotText}>{t('upToDate')}</Text>
                </View>
              </View>
            </View>

            {/* Maturity Value Row */}
            <View style={styles.cardMaturityRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardMaturityLabel}>{t('maturityValueLabel')}</Text>
                <Text style={styles.cardMaturityValue}>
                  {activeScheme?.maturityAmount ? formatCurrency(activeScheme.maturityAmount) : '—'}
                </Text>
                <Text style={styles.cardMaturitySub}>{t('maturityAvailableSub')}</Text>
              </View>
              <TouchableOpacity
                style={styles.qrCodeBadge}
                onPress={() =>
                  router.push({
                    pathname: '/passbook',
                    params: { schemeId: activeScheme?.schemeId || activeScheme?.id },
                  } as any)
                }
                activeOpacity={0.8}
              >
                <Ionicons name="receipt-outline" size={20} color="#70001E" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* 4. NEXT PAYMENT CARD */}
        {activeScheme && (
          <View style={styles.nextPaymentCard}>
            <View style={styles.nextPaymentHeader}>
              <View style={styles.calendarIconWrapper}>
                <Ionicons name="calendar-outline" size={24} color="#70001E" />
              </View>

              <View style={styles.nextPaymentDetails}>
                <Text style={styles.nextPaymentSub}>{t('nextPayment')}</Text>
                <Text style={styles.nextPaymentDate}>
                  {currentInst?.calendarMonth || '—'}
                </Text>
                <Text style={styles.nextPaymentAmount}>
                  {currentInst?.amount
                    ? formatCurrency(currentInst.amount)
                    : monthlyAmount > 0
                    ? formatCurrency(monthlyAmount)
                    : '—'}
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
        )}

        {/* 5. YOUR JOURNEY TIMELINE CARD */}
        {activeScheme && (
          <View style={styles.journeyCard}>
            <View style={styles.journeyHeaderRow}>
              <Text style={styles.journeyTitle}>{t('yourJourney')}</Text>
              <Text style={styles.journeyBadge}>
                {paidCount} / {totalCount} {t('completedTag')}
              </Text>
            </View>
            <Text style={styles.journeySubtext}>
              {t('contributed')}: {formatCurrency(paidAmount)} {t('ofLabel')}{' '}
              {totalTargetAmount > 0 ? formatCurrency(totalTargetAmount) : '—'}
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
        )}

        {/* 6. MATURITY / BONUS REWARD BANNER */}
        {activeScheme && (
          <View style={styles.maturityBonusCard}>
            <View style={styles.giftIconWrapper}>
              <Ionicons name="gift-outline" size={24} color="#70001E" />
            </View>
            <View style={styles.maturityBonusTextCol}>
              <Text style={styles.maturityBonusTitle}>
                {activeScheme.maturityAmount
                  ? `${t('youWillReceive')} ${formatCurrency(activeScheme.maturityAmount)}`
                  : t('includesBonus')}
              </Text>
              <Text style={styles.maturityBonusSubtitle}>{t('includesBonus')}</Text>
            </View>
          </View>
        )}

        {/* 7. ANNOUNCEMENT CARD */}
        {Boolean(data.announcement) && (
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 36,
    gap: 18,
  },

  /* 1. COMBINED PORTFOLIO CARD */
  portfolioCard: {
    backgroundColor: '#520018',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E7C86E',
    shadowColor: '#520018',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  portfolioHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  portfolioEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: '#E7C86E',
    letterSpacing: 1.5,
  },
  portfolioTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
    marginTop: 2,
  },
  portfolioBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF3C4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  portfolioBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#70001E',
  },
  portfolioMetricsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  portfolioMetricCol: {
    flex: 1,
  },
  portfolioMetricDivider: {
    width: 1,
    height: 38,
    backgroundColor: 'rgba(231, 200, 110, 0.25)',
    marginHorizontal: 12,
  },
  portfolioMetricLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#E7C86E',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  portfolioMetricValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  portfolioMetricValueGold: {
    fontSize: 18,
    fontWeight: '900',
    color: '#E7C86E',
  },
  portfolioMetricSub: {
    fontSize: 10.5,
    color: '#F8EDEF',
    marginTop: 2,
  },
  portfolioProgressBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    overflow: 'hidden',
  },
  portfolioProgressBarFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#E7C86E',
  },

  /* 2. MULTI-SCHEME SECTION */
  schemesSection: {
    gap: 10,
  },
  schemesSectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  schemesSectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#25232A',
    letterSpacing: 1,
  },
  schemesSectionSub: {
    fontSize: 11,
    color: '#6F6870',
  },
  schemeCardsScrollContent: {
    gap: 12,
    paddingVertical: 2,
  },
  individualSchemeCard: {
    width: 220,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#E8DED8',
    shadowColor: '#70001E',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  individualSchemeCardSelected: {
    borderColor: '#70001E',
    backgroundColor: '#FFFBFD',
  },
  individualSchemeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  slotTagBadge: {
    backgroundColor: '#F7EFF1',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  slotTagBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#70001E',
  },
  statusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusPillActive: {
    backgroundColor: '#E7F6ED',
  },
  statusPillCompleted: {
    backgroundColor: '#E8F0FE',
  },
  statusPillClosed: {
    backgroundColor: '#F3F0ED',
  },
  statusPillText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  statusPillTextActive: {
    color: '#16834B',
  },
  statusPillTextCompleted: {
    color: '#1A73E8',
  },
  statusPillTextClosed: {
    color: '#6F6870',
  },
  individualSchemeCode: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: 'monospace',
    color: '#25232A',
    marginBottom: 10,
  },
  individualSchemeNumbersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3EDE9',
  },
  miniMetricLabel: {
    fontSize: 9.5,
    color: '#6F6870',
    fontWeight: '600',
  },
  miniMetricVal: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#25232A',
    marginTop: 1,
  },
  openPassbookLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F7EFF1',
  },
  openPassbookLinkText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#70001E',
  },

  /* 3. HERO SCHEME PASS CARD */
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

  /* 4. NEXT PAYMENT CARD */
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

  /* 5. JOURNEY TIMELINE CARD */
  journeyCard: {
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
  journeyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  journeyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#25232A',
  },
  journeyBadge: {
    fontSize: 12,
    fontWeight: '800',
    color: '#70001E',
    backgroundColor: '#F9EEF1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  journeySubtext: {
    fontSize: 12,
    color: '#6F6870',
    marginBottom: 16,
  },
  bubblesContainer: {
    gap: 12,
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
    backgroundColor: '#F0ECE9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  bubbleCircleCurrent: {
    backgroundColor: '#FFF7D6',
    borderWidth: 2,
    borderColor: '#D4AF37',
  },
  bubbleCircleCompleted: {
    backgroundColor: '#16834B',
  },
  bubbleCircleMaturity: {
    backgroundColor: '#FFF3C4',
    borderWidth: 1,
    borderColor: '#E7C86E',
  },
  bubbleNumberText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6F6870',
  },
  bubbleNumberTextCurrent: {
    color: '#70001E',
    fontWeight: '900',
  },
  bubbleMonthLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#8A828B',
  },
  bubbleMonthLabelCurrent: {
    color: '#70001E',
    fontWeight: '800',
  },
  journeyTrackBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E8DED8',
    overflow: 'hidden',
  },
  journeyTrackFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#16834B',
  },

  /* 6. MATURITY / BONUS REWARD BANNER */
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

  /* 7. ANNOUNCEMENT CARD */
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
