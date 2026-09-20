import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { useLanguage } from '@/i18n';
import { CustomerHeader } from '@/components/CustomerHeader';
import { CustomerPassbookData, PassbookInstallment } from '@/types/passbook';
import { formatCurrency } from '@/lib/formatters';
import { getCustomerPassbook } from '@/services/customerDataService';
import { getStoredCustomerSession } from '@/services/customerAuthService';
import { OFFICIAL_SCHEME_NAME } from '@/constants/shopData';
import { useResponsiveMetrics } from '@/constants/responsive';

// Default 12 calendar-month installment fixture list (Month + Year format, no specific days)
const defaultInstallments: PassbookInstallment[] = [
  { installmentNumber: 1, installmentLabel: '#01', calendarMonth: 'March 2026', installmentAmount: 1000, paidAmount: 1000, status: 'PAID', paidDateFormatted: 'March 2026' },
  { installmentNumber: 2, installmentLabel: '#02', calendarMonth: 'April 2026', installmentAmount: 1000, paidAmount: 1000, status: 'PAID', paidDateFormatted: 'April 2026' },
  { installmentNumber: 3, installmentLabel: '#03', calendarMonth: 'May 2026', installmentAmount: 1000, paidAmount: 1000, status: 'PAID', paidDateFormatted: 'May 2026' },
  { installmentNumber: 4, installmentLabel: '#04', calendarMonth: 'June 2026', installmentAmount: 1000, paidAmount: 1000, status: 'PAID', paidDateFormatted: 'June 2026' },
  { installmentNumber: 5, installmentLabel: '#05', calendarMonth: 'July 2026', installmentAmount: 1000, paidAmount: 1000, status: 'PAID', paidDateFormatted: 'July 2026' },
  { installmentNumber: 6, installmentLabel: '#06', calendarMonth: 'August 2026', installmentAmount: 1000, paidAmount: 1000, status: 'PAID', paidDateFormatted: 'August 2026' },
  { installmentNumber: 7, installmentLabel: '#07', calendarMonth: 'September 2026', installmentAmount: 1000, paidAmount: 1000, status: 'PAID', paidDateFormatted: 'September 2026' },
  { installmentNumber: 8, installmentLabel: '#08', calendarMonth: 'October 2026', installmentAmount: 1000, paidAmount: 1000, status: 'PAID', paidDateFormatted: 'October 2026' },
  { installmentNumber: 9, installmentLabel: '#09', calendarMonth: 'November 2026', installmentAmount: 1000, paidAmount: 0, status: 'PENDING', dueDateFormatted: 'November 2026' },
  { installmentNumber: 10, installmentLabel: '#10', calendarMonth: 'December 2026', installmentAmount: 1000, paidAmount: 0, status: 'FUTURE' },
  { installmentNumber: 11, installmentLabel: '#11', calendarMonth: 'January 2027', installmentAmount: 1000, paidAmount: 0, status: 'FUTURE' },
  { installmentNumber: 12, installmentLabel: '#12', calendarMonth: 'February 2027', installmentAmount: 1000, paidAmount: 0, status: 'FUTURE' },
];

const initialPassbookData: CustomerPassbookData = {
  customerName: 'Anith Kumar',
  customerCode: 'RJ-88234',
  schemeName: OFFICIAL_SCHEME_NAME,
  schemeCode: 'DSS-12M',
  financialYear: 'FY 2026-27',
  monthlyInstallment: 1000,
  paidAmount: 8000,
  totalContribution: 12000,
  paidInstallments: 8,
  totalInstallments: 12,
  status: 'ACTIVE',
  progressPercentage: 66,
  installments: defaultInstallments,
};

/**
 * Computes maturity month string (Month after installment 12).
 */
const getMaturityMonthStr = (installments: PassbookInstallment[]): string => {
  if (!installments || installments.length === 0) return 'March 2027';
  const lastInst = installments[installments.length - 1];
  if (!lastInst?.calendarMonth) return 'March 2027';

  const parts = lastInst.calendarMonth.trim().split(' ');
  if (parts.length < 2) return 'March 2027';

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const mIndex = monthNames.findIndex(
    (m) => m.toLowerCase() === parts[0].toLowerCase()
  );
  let year = parseInt(parts[1], 10);

  if (mIndex === -1 || isNaN(year)) return 'March 2027';

  let nextMIndex = mIndex + 1;
  if (nextMIndex >= 12) {
    nextMIndex = 0;
    year += 1;
  }

  return `${monthNames[nextMIndex]} ${year}`;
};

export default function CustomerPassbookScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const responsive = useResponsiveMetrics();
  const [data, setData] = useState<CustomerPassbookData>(initialPassbookData);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadPassbook = async () => {
      setIsLoading(true);
      const session = await getStoredCustomerSession();
      if (!session) {
        if (isMounted) {
          setIsLoading(false);
          router.replace('/login');
        }
        return;
      }

      const realData = await getCustomerPassbook();
      if (isMounted) {
        if (realData) {
          const mergedData: CustomerPassbookData = {
            ...initialPassbookData,
            ...realData,
            customerName: realData.customerName || session.fullName || 'Anith Kumar',
            customerCode: realData.customerCode || session.customerCode || 'RJ-88234',
            installments:
              realData.installments && realData.installments.length > 0
                ? realData.installments
                : defaultInstallments,
          };
          setData(mergedData);
        }
        setIsLoading(false);
      }
    };

    loadPassbook();
    return () => {
      isMounted = false;
    };
  }, [router]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#70001E" />
        </View>
      </SafeAreaView>
    );
  }

  const handleDownloadPassbook = () => {
    const title = t('downloadPassbook');
    const msg = t('passbookPdfFuture');
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${msg}`);
    } else {
      Alert.alert(title, msg, [{ text: t('ok') }]);
    }
  };

  // Calculate SVG progress ring parameters (80px x 80px, 7.5px stroke width)
  const ringSize = 80;
  const strokeWidth = 7.5;
  const center = ringSize / 2;
  const radius = center - strokeWidth / 2; // 36.25px
  const circumference = 2 * Math.PI * radius;
  const paidCount = Math.min(
    data.totalInstallments || 12,
    Math.max(0, data.paidInstallments || 0)
  );
  const totalCount = data.totalInstallments || 12;
  const progressRatio = paidCount / totalCount;
  const strokeDashoffset = circumference - circumference * progressRatio;

  // Active / Due installment info
  const dueInstallment =
    data.installments.find((i) => i.status === 'PENDING') || data.installments[8];
  const dueInstallmentNum = dueInstallment
    ? String(dueInstallment.installmentNumber).padStart(2, '0')
    : '09';
  const dueInstallmentMonth = dueInstallment?.calendarMonth || 'November 2026';

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
        {/* HERO / CUSTOMER SUMMARY CARD */}
        <View style={styles.vaultCard}>
          {/* Middle Flex Row: Customer Info + 80x80 Progress Ring */}
          <View style={styles.vaultMiddleRow}>
            {/* Left Column: Customer Details & Monthly Deposit */}
            <View style={styles.vaultMainInfoCol}>
              <Text style={styles.vaultCustomerName}>{data.customerName}</Text>
              <Text style={styles.vaultCustomerId}>
                ID: #{data.customerCode}
              </Text>

              <View style={styles.vaultDepositSection}>
                <Text style={styles.vaultHoldingsLabel}>
                  {t('monthlyDeposit')}
                </Text>
                <View style={styles.vaultAmountRow}>
                  <Text style={styles.vaultAmountPaid}>
                    {formatCurrency(data.paidAmount)}
                  </Text>
                  <Text style={styles.vaultAmountTotal}>
                    / {formatCurrency(data.totalContribution)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Right Column: 80x80 Progress Circle */}
            <View style={styles.progressRingWrapper}>
              <Svg width={ringSize} height={ringSize} style={styles.svgRing}>
                {/* Track */}
                <Circle
                  cx={center}
                  cy={center}
                  r={radius}
                  stroke="rgba(255, 255, 255, 0.16)"
                  strokeWidth={strokeWidth}
                  fill="transparent"
                />
                {/* Progress Arc */}
                <Circle
                  cx={center}
                  cy={center}
                  r={radius}
                  stroke="#E7C86E"
                  strokeWidth={strokeWidth}
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  transform={`rotate(-90 ${center} ${center})`}
                />
              </Svg>
              <View style={styles.progressRingCenter}>
                <Text style={styles.progressRingCount}>
                  {paidCount} / {totalCount}
                </Text>
                <Text style={styles.progressRingLabel}>COMPLETED</Text>
              </View>
            </View>
          </View>
        </View>

        {/* DUE INSTALLMENT ALERT CARD */}
        <View style={styles.dueAlertCard}>
          <View style={styles.dueAlertTopRow}>
            {/* Clock Icon Circle */}
            <View style={styles.clockIconCircle}>
              <Ionicons name="time-outline" size={20} color="#FFFFFF" />
            </View>

            {/* Middle Details */}
            <View style={styles.dueAlertMiddle}>
              <View style={styles.dueAlertTitleRow}>
                <Text style={styles.dueAlertTitle}>
                  {t('installmentDueLabel')} {dueInstallmentNum} Due
                </Text>
                <View style={styles.dueTagBadge}>
                  <Text style={styles.dueTagBadgeText}>DUE {dueInstallmentMonth.toUpperCase()}</Text>
                </View>
              </View>
              <Text style={styles.dueAlertSubtext}>
                {t('depositToKeepBonus')}
              </Text>
            </View>

            {/* Amount */}
            <Text style={styles.dueAlertAmount}>
              {formatCurrency(data.monthlyInstallment)}
            </Text>
          </View>

          {/* CTA Buttons Row */}
          <View style={styles.dueCtaButtonsRow}>
            <TouchableOpacity
              style={styles.payShowroomBtn}
              onPress={() => router.push('/shop')}
              activeOpacity={0.8}
            >
              <Ionicons name="storefront-outline" size={16} color="#70001E" />
              <Text style={styles.payShowroomBtnText}>{t('payAtShowroom')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.scanQrBtn}
              onPress={() => router.push('/pay')}
              activeOpacity={0.8}
            >
              <Ionicons name="qr-code-outline" size={16} color="#E7C86E" />
              <Text style={styles.scanQrBtnText}>{t('scanQrCode')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 12-MONTH INSTALLMENT LEDGER GRID (READ-ONLY RECORD) */}
        <View style={styles.ledgerSection}>
          <View style={styles.ledgerHeaderRow}>
            <View style={styles.ledgerHeaderTitleRow}>
              <View style={styles.ledgerRedDot} />
              <Text style={styles.ledgerHeaderTitle}>
                {t('installmentLedgerHeader')}
              </Text>
            </View>
            <Text style={styles.ledgerHeaderSub}>{t('monthsTotal')}</Text>
          </View>

          {/* Outer Grid Container Card */}
          <View style={styles.ledgerGridOuterCard}>
            <View style={styles.ledgerGridContainer}>
              {data.installments.map((inst, index) => {
                const isPaid = inst.status === 'PAID' || index < paidCount;
                const isDue = !isPaid && index === paidCount;
                const instNumFormatted = `#${String(inst.installmentNumber).padStart(2, '0')}`;

                if (isPaid) {
                  return (
                    <View
                      key={inst.installmentNumber}
                      style={styles.paidGridCard}
                    >
                      <View style={styles.gridCardTopRow}>
                        <Text style={styles.paidInstNum}>{instNumFormatted}</Text>
                        <View style={styles.checkCircle}>
                          <Ionicons name="checkmark" size={12} color="#16834B" />
                        </View>
                      </View>
                      <Text style={styles.gridCardAmount}>
                        {formatCurrency(inst.installmentAmount || 1000)}
                      </Text>
                      <View style={styles.gridCardBottomRow}>
                        <Text style={styles.gridCardDate}>
                          {inst.paidDateFormatted || inst.calendarMonth}
                        </Text>
                        <Text style={styles.paidDoneText}>✓ PAID</Text>
                      </View>
                    </View>
                  );
                }

                if (isDue) {
                  return (
                    <View
                      key={inst.installmentNumber}
                      style={styles.dueGridCard}
                    >
                      <View style={styles.gridCardTopRow}>
                        <Text style={styles.dueInstNum}>{instNumFormatted}</Text>
                        <View style={styles.duePillBadge}>
                          <Text style={styles.duePillBadgeText}>DUE</Text>
                        </View>
                      </View>
                      <Text style={styles.dueGridCardAmount}>
                        {formatCurrency(inst.installmentAmount || 1000)}
                      </Text>
                      <Text style={styles.dueInstDate}>
                        {inst.calendarMonth}
                      </Text>
                      <Text style={styles.duePendingSubtext}>Payment pending</Text>
                    </View>
                  );
                }

                // Future / Pending Installments
                return (
                  <View
                    key={inst.installmentNumber}
                    style={styles.futureGridCard}
                  >
                    <View style={styles.gridCardTopRow}>
                      <Text style={styles.futureInstNum}>{instNumFormatted}</Text>
                      <View style={styles.pendingPillBadge}>
                        <Text style={styles.pendingPillBadgeText}>PENDING</Text>
                      </View>
                    </View>
                    <Text style={styles.futureCardAmount}>
                      {formatCurrency(inst.installmentAmount || 1000)}
                    </Text>
                    <Text style={styles.futureCardMonth}>{inst.calendarMonth}</Text>
                  </View>
                );
              })}

              {/* MATURITY BONUS CARD */}
              <View style={styles.bonusGridCard}>
                <View style={styles.bonusBadgeTopRight}>
                  <Text style={styles.bonusBadgeText}>{t('bonusTag')}</Text>
                </View>

                <View style={styles.bonusHeaderRow}>
                  <Text style={styles.bonusTitleText}>
                    🏆 {t('maturity')}
                  </Text>
                </View>

                <Text style={styles.bonusAmountText}>
                  +{formatCurrency(data.monthlyInstallment || 1000)} {t('freeText')}
                </Text>

                <Text style={styles.bonusDateText}>
                  {getMaturityMonthStr(data.installments)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* DOWNLOAD PASSBOOK CTA BUTTON */}
        <TouchableOpacity
          style={styles.downloadButton}
          onPress={handleDownloadPassbook}
          activeOpacity={0.88}
        >
          <Ionicons name="download-outline" size={20} color="#FFFFFF" />
          <Text style={styles.downloadButtonText}>{t('downloadPassbook')}</Text>
        </TouchableOpacity>
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 16,
  },

  /* HERO / CUSTOMER SUMMARY CARD */
  vaultCard: {
    backgroundColor: '#70001E',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#520018',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  vaultCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  schemeBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: '#E7C86E',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  schemeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#E7C86E',
    letterSpacing: 0.5,
  },
  vaultMiddleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  vaultMainInfoCol: {
    flex: 1,
    paddingRight: 8,
  },
  vaultCustomerName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  vaultCustomerId: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E7C86E',
    marginTop: 2,
  },
  vaultDepositSection: {
    marginTop: 14,
  },
  vaultHoldingsLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#E7C86E',
    letterSpacing: 1,
  },
  vaultAmountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 2,
  },
  vaultAmountPaid: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  vaultAmountTotal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E7C86E',
    marginLeft: 6,
  },
  progressRingWrapper: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginLeft: 8,
    alignSelf: 'center',
  },
  svgRing: {
    position: 'absolute',
  },
  progressRingCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRingCount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  progressRingLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#E7C86E',
    marginTop: -1,
    letterSpacing: 0.8,
  },

  /* CURRENT INSTALLMENT ALERT CARD */
  dueAlertCard: {
    backgroundColor: '#FFFDF8',
    borderWidth: 1,
    borderColor: '#E9D9C4',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#70001E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  dueAlertTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  clockIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#D4AF37',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dueAlertMiddle: {
    flex: 1,
  },
  dueAlertTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  dueAlertTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#25232A',
  },
  dueTagBadge: {
    backgroundColor: '#E7C86E',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  dueTagBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#70001E',
  },
  dueAlertSubtext: {
    fontSize: 11,
    color: '#6F6870',
    marginTop: 2,
  },
  dueAlertAmount: {
    fontSize: 18,
    fontWeight: '900',
    color: '#70001E',
  },
  dueCtaButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  },
  payShowroomBtn: {
    flex: 1,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E9D9C4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  payShowroomBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#70001E',
  },
  scanQrBtn: {
    flex: 1,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#70001E',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#70001E',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  scanQrBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  /* 12-MONTH INSTALLMENT LEDGER GRID */
  ledgerSection: {
    gap: 10,
  },
  ledgerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  ledgerHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ledgerRedDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#70001E',
  },
  ledgerHeaderTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#25232A',
    letterSpacing: 1,
  },
  ledgerHeaderSub: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6F6870',
  },
  ledgerGridOuterCard: {
    backgroundColor: '#FFFDF8',
    borderWidth: 1,
    borderColor: '#E9D9C4',
    borderRadius: 22,
    padding: 10,
    shadowColor: '#70001E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  ledgerGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },

  /* Grid Card Types */
  paidGridCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E9D9C4',
    padding: 12,
    justifyContent: 'space-between',
  },
  dueGridCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#FFF7D6',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#D4AF37',
    padding: 12,
    position: 'relative',
    justifyContent: 'space-between',
  },
  goldHandleDot: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#D4AF37',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  futureGridCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#FFFDF8',
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#E9D9C4',
    padding: 12,
    justifyContent: 'space-between',
  },
  bonusGridCard: {
    width: '100%',
    backgroundColor: '#FFF7D6',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E7C86E',
    padding: 12,
    position: 'relative',
    marginTop: 2,
  },

  /* Card Inner Elements */
  gridCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paidInstNum: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6F6870',
  },
  checkCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridCardAmount: {
    fontSize: 16,
    fontWeight: '900',
    color: '#25232A',
    marginVertical: 4,
  },
  gridCardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  gridCardDate: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6F6870',
  },
  paidDoneText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#16834B',
  },

  dueInstNum: {
    fontSize: 11,
    fontWeight: '800',
    color: '#70001E',
  },
  duePillBadge: {
    backgroundColor: '#E7C86E',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  duePillBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#70001E',
  },
  dueGridCardAmount: {
    fontSize: 16,
    fontWeight: '900',
    color: '#70001E',
    marginVertical: 4,
  },
  dueInstDate: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6F6870',
  },
  duePendingSubtext: {
    fontSize: 10,
    fontWeight: '600',
    color: '#70001E',
    marginTop: 2,
  },

  futureInstNum: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6F6870',
  },
  pendingPillBadge: {
    backgroundColor: '#F3F0ED',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pendingPillBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#6F6870',
  },
  futureCardAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6F6870',
    marginVertical: 4,
  },
  futureCardStatus: {
    fontSize: 10,
    fontWeight: '600',
    color: '#8A7D84',
  },
  futureCardMonth: {
    fontSize: 10,
    color: '#8A7D84',
    marginTop: 2,
  },

  bonusBadgeTopRight: {
    position: 'absolute',
    top: 10,
    right: 12,
    backgroundColor: '#F7E7A8',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  bonusBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#70001E',
  },
  bonusHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bonusTitleText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#70001E',
  },
  bonusAmountText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#70001E',
    marginVertical: 4,
  },
  bonusDateText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6F6870',
  },

  /* DOWNLOAD PASSBOOK BUTTON */
  downloadButton: {
    backgroundColor: '#70001E',
    borderRadius: 16,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#520018',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 4,
  },
  downloadButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
