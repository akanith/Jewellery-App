import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { useLanguage } from '@/i18n';
import { CustomerHeader } from '@/components/CustomerHeader';
import { CustomerPassbookData, PassbookInstallment } from '@/types/passbook';
import { SchemeSummary } from '@/types/dashboard';
import { formatCurrency } from '@/lib/formatters';
import {
  getCustomerPassbook,
  getCustomerDashboard,
  checkOnlinePaymentStatus,
} from '@/services/customerDataService';
import { getStoredCustomerSession } from '@/services/customerAuthService';
import { OFFICIAL_SCHEME_NAME } from '@/constants/shopData';
import { useResponsiveMetrics } from '@/constants/responsive';
import { CashPaymentModal } from '@/components/CashPaymentModal';
import {
  openRazorpayHostedCheckout,
  getPersistedPendingPaymentAttempt,
  clearPersistedPendingPaymentAttempt,
} from '@/services/paymentService';
import { exportPassbookPdf } from '@/services/passbookPdfService';


const initialPassbookData: CustomerPassbookData = {
  customerName: '',
  customerCode: '',
  schemeName: OFFICIAL_SCHEME_NAME,
  schemeCode: '',
  financialYear: '',
  monthlyInstallment: 1000,
  paidAmount: 0,
  totalContribution: 12000,
  paidInstallments: 0,
  totalInstallments: 12,
  status: 'ACTIVE',
  progressPercentage: 0,
  installments: [],
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
  const params = useLocalSearchParams<{ schemeId?: string }>();
  const { t, language } = useLanguage();
  const responsive = useResponsiveMetrics();
  const [data, setData] = useState<CustomerPassbookData>(initialPassbookData);
  const [selectedSchemeId, setSelectedSchemeId] = useState<string | null>(params.schemeId || null);
  const [customerSchemes, setCustomerSchemes] = useState<SchemeSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [session, setSession] = useState<any>(null);
  const [isCashModalOpen, setIsCashModalOpen] = useState(false);
  const [isOpeningOnline, setIsOpeningOnline] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const customerSchemesRef = useRef<SchemeSummary[]>([]);
  const currentRequestIdRef = useRef(0);
  const prevParamSchemeIdRef = useRef<string | undefined>(params.schemeId);
  const activeCustomerIdRef = useRef<string | null>(null);

  // Synchronize route parameter changes (e.g., navigated from Dashboard scheme card) via effect
  useEffect(() => {
    if (params.schemeId && params.schemeId !== prevParamSchemeIdRef.current) {
      prevParamSchemeIdRef.current = params.schemeId;
      setSelectedSchemeId(params.schemeId);
      setErrorMessage(null);
      setData(initialPassbookData);
      setIsLoading(true);
    }
  }, [params.schemeId]);

  // Handle screen focus & detect customer profile switch
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      getStoredCustomerSession()
        .then((currSession) => {
          if (!isMounted) return;
          if (!currSession || !currSession.token) {
            router.replace('/login');
            return;
          }

          setSession(currSession);

          if (activeCustomerIdRef.current && activeCustomerIdRef.current !== currSession.customerId) {
            // Active customer has switched! Purge all cached scheme data from previous customer
            activeCustomerIdRef.current = currSession.customerId || null;
            customerSchemesRef.current = [];
            setCustomerSchemes([]);
            setSelectedSchemeId(null);
            setData(initialPassbookData);
            setRetryKey((k) => k + 1);
          } else {
            activeCustomerIdRef.current = currSession.customerId || null;

            // Auto-reconcile check if returning with an active pending payment attempt
            getPersistedPendingPaymentAttempt(currSession.customerId)
              .then((persistedAttempt) => {
                const attemptIdToCheck = persistedAttempt?.attemptId;
                if (attemptIdToCheck) {
                  checkOnlinePaymentStatus(attemptIdToCheck)
                    .then((statusRes) => {
                      if (statusRes?.isPaid) {
                        clearPersistedPendingPaymentAttempt(currSession.customerId);
                        setRetryKey((k) => k + 1);
                      } else if (statusRes?.status === 'FAILED') {
                        clearPersistedPendingPaymentAttempt(currSession.customerId);
                      }
                    })
                    .catch(() => {});
                }
              })
              .catch(() => {});
          }
        })
        .catch(() => {});

      return () => {
        isMounted = false;
      };
    }, [router])
  );

  useEffect(() => {
    let isMounted = true;
    const requestId = ++currentRequestIdRef.current;

    const loadPassbook = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const session = await getStoredCustomerSession();
        if (!session) {
          if (isMounted) {
            setIsLoading(false);
            router.replace('/login');
          }
          return;
        }

        // Discover customer schemes for multi-scheme switcher only once (avoid redundant roundtrips)
        if (customerSchemesRef.current.length === 0) {
          try {
            const dashboardData = await getCustomerDashboard();
            if (isMounted && dashboardData?.schemes && dashboardData.schemes.length > 0) {
              customerSchemesRef.current = dashboardData.schemes;
              setCustomerSchemes(dashboardData.schemes);
            }
          } catch (dashErr) {
            console.warn('Non-blocking dashboard fetch error in passbook:', dashErr);
          }
        }

        const targetSchemeId = selectedSchemeId || params.schemeId;
        const realData = await getCustomerPassbook(targetSchemeId || undefined);

        // Guard against unmount or superseding requests (race conditions from rapid switching)
        if (!isMounted || requestId !== currentRequestIdRef.current) {
          return;
        }

        if (realData) {
          const mergedData: CustomerPassbookData = {
            ...initialPassbookData,
            ...realData,
            customerName: realData.customerName || session.fullName || '',
            customerCode: realData.customerCode || session.customerCode || '',
            installments: Array.isArray(realData.installments)
              ? realData.installments
              : [],
          };
          setData(mergedData);
          if (!selectedSchemeId && realData.schemeId) {
            setSelectedSchemeId(realData.schemeId);
          }
        } else {
          setData(initialPassbookData);
          setErrorMessage('Unable to load passbook records. Please check your connection and try again.');
        }
      } catch (err) {
        console.error('Passbook loading error:', err);
        if (isMounted && requestId === currentRequestIdRef.current) {
          setData(initialPassbookData);
          setErrorMessage('Unable to connect to service. Please check your network connection and try again.');
        }
      } finally {
        if (isMounted && requestId === currentRequestIdRef.current) {
          setIsLoading(false);
        }
      }
    };

    loadPassbook();
    return () => {
      isMounted = false;
    };
  }, [router, selectedSchemeId, params.schemeId, retryKey]);

  const handleSchemeSelect = (sId: string) => {
    if (sId !== selectedSchemeId) {
      prevParamSchemeIdRef.current = sId;
      setSelectedSchemeId(sId);
      setErrorMessage(null);
      setData(initialPassbookData);
      setIsLoading(true);
      try {
        router.setParams({ schemeId: sId });
      } catch {
        // Safe fallback for test environments
      }
    }
  };

  const handleRetry = () => {
    setErrorMessage(null);
    setRetryKey((k) => k + 1);
  };

  // Prevent displaying previous scheme's financial data while loading a newly selected scheme
  const isDataStale = Boolean(
    selectedSchemeId &&
    data.schemeId &&
    data.schemeId !== selectedSchemeId
  );

  if (isLoading || isDataStale) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#70001E" />
        </View>
      </SafeAreaView>
    );
  }

  // Calculate SVG progress ring parameters (80px x 80px, 7.5px stroke width)
  const ringSize = 80;
  const strokeWidth = 7.5;
  const center = ringSize / 2;
  const radius = center - strokeWidth / 2; // 36.25px
  const circumference = 2 * Math.PI * radius;
  // Paid count derived authoritatively from installment records when available
  const actualPaidCount = Array.isArray(data.installments) && data.installments.length > 0
    ? data.installments.filter((i) => i.status === 'PAID').length
    : (data.paidInstallments || 0);
  const totalCount = data.totalInstallments || 12;
  const paidCount = Math.min(totalCount, Math.max(0, actualPaidCount));
  const progressRatio = paidCount / totalCount;
  const strokeDashoffset = circumference - circumference * progressRatio;
  const isSchemeCompleted = totalCount === 12 && paidCount === 12;

  const handleDownloadPassbook = async () => {
    if (!isSchemeCompleted) {
      const msg = t('passbookPdfIneligibleMsg').replace('{paid}', String(paidCount));
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert(t('passbookPdfNotCompleteTitle'), msg, [{ text: t('ok') }]);
      }
      return;
    }

    setIsDownloadingPdf(true);
    try {
      const result = await exportPassbookPdf(data.schemeId || undefined, language);
      if (!result.success) {
        const errorMsg = result.message || t('passbookPdfFailed');
        if (Platform.OS === 'web') {
          window.alert(errorMsg);
        } else {
          Alert.alert(t('passbookPdfNotCompleteTitle'), errorMsg, [{ text: t('ok') }]);
        }
      }
    } catch (err: any) {
      const failMsg = err?.message || t('passbookPdfFailed');
      if (Platform.OS === 'web') {
        window.alert(failMsg);
      } else {
        Alert.alert(t('passbookPdfNotCompleteTitle'), failMsg, [{ text: t('ok') }]);
      }
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Derive due installment from authoritative installment status and installment number:
  // Never infer payment or due state from array position or paid counts.
  // Earliest unpaid installment (status !== 'PAID') is the current due installment.
  const unpaidInstallments = (data.installments || [])
    .filter((inst) => inst.status !== 'PAID')
    .sort((a, b) => a.installmentNumber - b.installmentNumber);
  const dueInstallment = unpaidInstallments.length > 0 ? unpaidInstallments[0] : null;
  const dueInstallmentNum = dueInstallment
    ? String(dueInstallment.installmentNumber).padStart(2, '0')
    : '01';
  const dueInstallmentMonth = dueInstallment?.calendarMonth || '—';
  const dueInstAmount = dueInstallment?.installmentAmount || data.monthlyInstallment || 1000;
  const dueInstNum = dueInstallment?.installmentNumber;

  const handleOpenCashModal = () => {
    setIsCashModalOpen(true);
  };

  const handlePayOnline = async () => {
    if (isOpeningOnline) return;
    setIsOpeningOnline(true);
    try {
      await openRazorpayHostedCheckout(
        dueInstAmount,
        dueInstallmentMonth,
        dueInstNum,
        selectedSchemeId || data.schemeId || undefined,
        session?.customerId
      );
    } finally {
      setIsOpeningOnline(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFDF8" />

      {/* GLOBAL TOP HEADER */}
      <CustomerHeader
        customerName={data.customerName}
        unreadCount={data.unreadNotificationsCount}
        avatarUri={data.avatarUri}
        hasMultipleProfiles={Boolean(
          session?.authorizedProfiles && session.authorizedProfiles.length > 1
        )}
        onSwitchProfile={() => router.push('/select-customer' as any)}
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
        {/* MULTI-SCHEME SWITCHER BAR (shown when customer has multiple schemes) */}
        {customerSchemes.length > 1 ? (
          <View style={styles.schemeSwitcherContainer}>
            <Text style={styles.schemeSwitcherHeaderLabel}>SELECT ACTIVE SCHEME</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.schemeSwitcherScroll}
            >
              {customerSchemes.map((s, idx) => {
                const sId = s.schemeId || s.id || '';
                const isSelected = selectedSchemeId ? sId === selectedSchemeId : (data.schemeId ? sId === data.schemeId : idx === 0);
                const slotNum = s.slotNumber ?? (idx + 1);
                return (
                  <TouchableOpacity
                    key={sId || idx}
                    style={[
                      styles.schemeSwitchPill,
                      isSelected && styles.schemeSwitchPillActive,
                    ]}
                    onPress={() => handleSchemeSelect(sId)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.schemeSwitchSlotBadge, isSelected && styles.schemeSwitchSlotBadgeActive]}>
                      <Text style={[styles.schemeSwitchSlotText, isSelected && styles.schemeSwitchSlotTextActive]}>
                        Slot #{slotNum}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.schemeSwitchTitle,
                        isSelected && styles.schemeSwitchTitleActive,
                      ]}
                      numberOfLines={1}
                    >
                      {s.schemeName || OFFICIAL_SCHEME_NAME}
                    </Text>
                    <Text
                      style={[
                        styles.schemeSwitchMeta,
                        isSelected && styles.schemeSwitchMetaActive,
                      ]}
                    >
                      ₹{s.monthlyInstallmentAmount || s.monthlyInstallment || 1000}/mo
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        {errorMessage ? (
          <View style={styles.errorContainer}>
            <View style={styles.errorIconWrapper}>
              <Ionicons name="alert-circle-outline" size={36} color="#70001E" />
            </View>
            <Text style={styles.errorTitle}>Unable to Load Passbook</Text>
            <Text style={styles.errorSubtext}>{errorMessage}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={handleRetry}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh-outline" size={16} color="#FFFFFF" />
              <Text style={styles.retryButtonText}>{t('retry') || 'Retry'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* HERO / CUSTOMER SUMMARY CARD */}
            <View style={styles.vaultCard}>
              {customerSchemes.length > 1 ? (
                <View style={styles.vaultCardTopRow}>
                  <View style={styles.schemeBadge}>
                    <Text style={styles.schemeBadgeText}>
                      {data.slotNumber ? `SLOT #${data.slotNumber} • ` : ''}{data.schemeName || OFFICIAL_SCHEME_NAME}
                    </Text>
                  </View>
                  <Text style={styles.vaultSchemeCodeText}>{data.schemeCode || 'DSS-12M'}</Text>
                </View>
              ) : null}

          {/* Middle Flex Row: Customer Info + 80x80 Progress Ring */}
          <View style={styles.vaultMiddleRow}>
            {/* Left Column: Customer Details & Monthly Deposit */}
            <View style={styles.vaultMainInfoCol}>
              <Text style={styles.vaultCustomerName}>{data.customerName || '—'}</Text>
              <Text style={styles.vaultCustomerId}>
                ID: #{data.customerCode || '—'}
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
                <Text style={styles.progressRingLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                  {t('completedTag')}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* DUE INSTALLMENT ALERT CARD */}
        {dueInstallment ? (
          <View style={styles.dueAlertCard}>
          <View style={styles.dueAlertTopRow}>
            {/* Clock Icon Circle */}
            <View style={styles.clockIconCircle}>
              <Ionicons name="time-outline" size={20} color="#FFFFFF" />
            </View>

            {/* Middle Details */}
            <View style={styles.dueAlertMiddle}>
              <View style={styles.dueAlertTitleRow}>
                <Text style={styles.dueAlertTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
                  {t('installmentDueLabel')} {dueInstallmentNum} {t('dueTag')}
                </Text>
                <View style={styles.dueTagBadge}>
                  <Text style={styles.dueTagBadgeText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
                    {t('dueTag')} {dueInstallmentMonth.toUpperCase()}
                  </Text>
                </View>
              </View>
              <Text style={styles.dueAlertSubtext}>
                {t('depositToKeepBonus')}
              </Text>
            </View>

            {/* Amount */}
            <Text style={styles.dueAlertAmount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
              {formatCurrency(dueInstallment?.installmentAmount || data.monthlyInstallment)}
            </Text>
          </View>

          {/* Dual Payment Options: Pay by Cash & Pay Online */}
          <View
            style={[
              styles.dueCtaButtonsRow,
              { flexDirection: responsive.width < 375 ? 'column' : 'row' },
            ]}
          >
            {/* Pay by Cash */}
            <TouchableOpacity
              style={styles.payCashBtn}
              onPress={handleOpenCashModal}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Pay by Cash at Showroom"
            >
              <Ionicons name="cash-outline" size={17} color="#70001E" />
              <Text style={styles.payCashBtnText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82}>
                {t('payByCash')}
              </Text>
            </TouchableOpacity>

            {/* Pay Online */}
            <TouchableOpacity
              style={styles.payOnlineBtn}
              onPress={handlePayOnline}
              activeOpacity={0.85}
              disabled={isOpeningOnline}
              accessibilityRole="button"
              accessibilityLabel="Pay Online using Razorpay"
            >
              {isOpeningOnline ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="card-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.payOnlineBtnText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82}>
                    {t('payOnline')}
                  </Text>
                  <Ionicons name="open-outline" size={14} color="#D4AF37" />
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Secure Checkout & UPI Caption / Unavailable Notice */}
          <View style={styles.paymentCaptionRow}>
            <Ionicons
              name={data.onlinePaymentConfigured ? 'shield-checkmark' : 'information-circle-outline'}
              size={12}
              color={data.onlinePaymentConfigured ? '#16834B' : '#854D0E'}
            />
            <Text
              style={[
                styles.paymentCaptionText,
                !data.onlinePaymentConfigured && styles.paymentCaptionTextUnavailable,
              ]}
            >
              {data.onlinePaymentConfigured ? t('secureRazorpayCaption') : t('onlinePaymentsUnavailableCaption')}
            </Text>
          </View>
        </View>
      ) : null}

      {/* CASH PAYMENT INSTRUCTIONS MODAL */}
      <CashPaymentModal
        visible={isCashModalOpen}
        onClose={() => setIsCashModalOpen(false)}
        dueAmount={dueInstAmount}
        calendarMonth={dueInstallmentMonth}
        installmentNumber={dueInstNum}
        customerName={data.customerName}
        customerCode={session?.customerCode || (data as any)?.customerCode}
      />

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
              {data.installments.length === 0 ? (
                <View style={styles.emptyInstallmentsBox}>
                  <Ionicons name="calendar-outline" size={32} color="#70001E" />
                  <Text style={styles.emptyInstallmentsText}>
                    {t('noInstallmentRecords')}
                  </Text>
                </View>
              ) : (
                data.installments.map((inst) => {
                  const isPaid = inst.status === 'PAID';
                  const isDue =
                    !isPaid &&
                    dueInstallment !== null &&
                    inst.installmentNumber === dueInstallment.installmentNumber;
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
                      <Text style={styles.gridCardAmount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
                        {formatCurrency(inst.installmentAmount || data.monthlyInstallment || 1000)}
                      </Text>
                      <View style={styles.gridCardBottomRow}>
                        <Text style={styles.gridCardDate} numberOfLines={1}>
                          {inst.paidDateFormatted || inst.calendarMonth}
                        </Text>
                        <Text style={styles.paidDoneText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82}>
                          ✓ {t('paidTag')}
                        </Text>
                      </View>
                      {inst.receiptNumber ? (
                        <View style={styles.receiptTagRow}>
                          <Ionicons name="receipt-outline" size={10} color="#70001E" />
                          <Text style={styles.receiptTagText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82}>
                            {t('receiptShort')}{inst.receiptNumber}
                          </Text>
                        </View>
                      ) : null}
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
                          <Text style={styles.duePillBadgeText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82}>
                            {t('dueTag')}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.dueGridCardAmount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
                        {formatCurrency(inst.installmentAmount || data.monthlyInstallment || 1000)}
                      </Text>
                      <Text style={styles.dueInstDate} numberOfLines={1}>
                        {inst.calendarMonth}
                      </Text>
                      <Text style={styles.duePendingSubtext} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82}>
                        {t('paymentPending')}
                      </Text>
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
                        <Text style={styles.pendingPillBadgeText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82}>
                          {inst.status === 'FUTURE' ? t('future') : t('pendingStatus')}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.futureCardAmount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
                      {formatCurrency(inst.installmentAmount || data.monthlyInstallment || 1000)}
                    </Text>
                    <Text style={styles.futureCardMonth} numberOfLines={1}>{inst.calendarMonth}</Text>
                  </View>
                );
              })
            )}

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
            <View style={styles.downloadSection}>
              <TouchableOpacity
                style={[
                  styles.downloadButton,
                  !isSchemeCompleted && styles.downloadButtonDisabled,
                ]}
                onPress={handleDownloadPassbook}
                activeOpacity={isSchemeCompleted ? 0.88 : 0.6}
                disabled={isDownloadingPdf}
              >
                {isDownloadingPdf ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons
                      name={isSchemeCompleted ? "download-outline" : "lock-closed-outline"}
                      size={20}
                      color={isSchemeCompleted ? "#FFFFFF" : "#64748B"}
                    />
                    <Text
                      style={[
                        styles.downloadButtonText,
                        !isSchemeCompleted && styles.downloadButtonTextDisabled,
                      ]}
                    >
                      {isDownloadingPdf ? t('generatingPassbookPdf') : t('downloadPassbook')}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {!isSchemeCompleted && (
                <View style={styles.ineligibleNoticeBox}>
                  <Ionicons name="information-circle-outline" size={15} color="#92400E" />
                  <Text style={styles.ineligibleNoticeText}>
                    {t('passbookPdfIneligibleMsg').replace('{paid}', String(paidCount))}
                  </Text>
                </View>
              )}
            </View>
          </>
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
    gap: 10,
    marginTop: 14,
  },
  payCashBtn: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFDF8',
    borderWidth: 1.5,
    borderColor: '#D4AF37',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 12,
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 1,
  },
  payCashBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#70001E',
    letterSpacing: 0.2,
  },
  payOnlineBtn: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#70001E',
    borderWidth: 1.5,
    borderColor: '#9E1B42',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 12,
    shadowColor: '#70001E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  payOnlineBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  paymentCaptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 10,
    paddingHorizontal: 4,
  },
  paymentCaptionText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#6F6870',
    textAlign: 'center',
  },
  paymentCaptionTextUnavailable: {
    color: '#854D0E',
    fontWeight: '600',
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
  downloadSection: {
    marginTop: 4,
    gap: 8,
  },
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
  },
  downloadButtonDisabled: {
    backgroundColor: '#F1F5F9',
    shadowOpacity: 0,
    elevation: 0,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  downloadButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  downloadButtonTextDisabled: {
    color: '#64748B',
  },
  ineligibleNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  ineligibleNoticeText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '600',
    flex: 1,
    lineHeight: 16,
  },

  /* MULTI-SCHEME SWITCHER */
  schemeSwitcherContainer: {
    marginBottom: 4,
  },
  schemeSwitcherHeaderLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#70001E',
    letterSpacing: 1,
    marginBottom: 8,
  },
  schemeSwitcherScroll: {
    gap: 10,
  },
  schemeSwitchPill: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E9D9C4',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 140,
  },
  schemeSwitchPillActive: {
    borderColor: '#70001E',
    backgroundColor: '#FFF7D6',
  },
  schemeSwitchSlotBadge: {
    backgroundColor: '#F3F0ED',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4,
  },
  schemeSwitchSlotBadgeActive: {
    backgroundColor: '#70001E',
  },
  schemeSwitchSlotText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#6F6870',
  },
  schemeSwitchSlotTextActive: {
    color: '#FFFFFF',
  },
  schemeSwitchTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#25232A',
  },
  schemeSwitchTitleActive: {
    fontWeight: '800',
    color: '#70001E',
  },
  schemeSwitchMeta: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6F6870',
    marginTop: 2,
  },
  schemeSwitchMetaActive: {
    color: '#70001E',
    fontWeight: '700',
  },
  vaultSchemeCodeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#E7C86E',
  },
  receiptTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF7D6',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 6,
    borderWidth: 0.5,
    borderColor: '#E7C86E',
  },
  receiptTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#70001E',
  },

  /* ERROR & EMPTY STATES */
  errorContainer: {
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8DED8',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
    shadowColor: '#70001E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  errorIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FDECEF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#25232A',
    marginBottom: 6,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 13,
    color: '#6F6870',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
    paddingHorizontal: 8,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#70001E',
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 12,
    shadowColor: '#70001E',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  emptyInstallmentsBox: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
    gap: 10,
  },
  emptyInstallmentsText: {
    fontSize: 13,
    color: '#6F6870',
    fontWeight: '600',
    textAlign: 'center',
  },
});
