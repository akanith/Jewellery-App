import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Linking,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '@/i18n';
import { getStoredCustomerSession } from '@/services/customerAuthService';
import { getCustomerDashboard } from '@/services/customerDataService';

export type PaymentState = 'PENDING' | 'VERIFYING' | 'SUCCESS' | 'FAILED' | 'ALREADY_PAID';

export default function PayScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, language } = useLanguage();

  const [paymentState, setPaymentState] = useState<PaymentState>('PENDING');
  const [customerName, setCustomerName] = useState<string>('Anith');
  const [customerCode, setCustomerCode] = useState<string>('RJ-2026-8842');
  const [currentMonthStr, setCurrentMonthStr] = useState<string>('September 2026');

  useEffect(() => {
    async function loadData() {
      const session = await getStoredCustomerSession();
      if (session?.fullName) {
        setCustomerName(session.fullName);
      }
      if (session?.customerCode) {
        setCustomerCode(session.customerCode);
      }

      const dash = await getCustomerDashboard();
      if (dash?.currentInstallment?.calendarMonth) {
        setCurrentMonthStr(dash.currentInstallment.calendarMonth);
      }
      if (dash?.currentInstallment?.status === 'PAID') {
        setPaymentState('ALREADY_PAID');
      }
    }
    loadData();
  }, []);

  const localizedMonth = language === 'ta'
    ? currentMonthStr.replace('September', 'செப்டம்பர்').replace('October', 'அக்டோபர்').replace('November', 'நவம்பர்')
    : currentMonthStr;

  const handlePayViaUpi = () => {
    // Initiate UPI app chooser or simulate payment verification flow
    setPaymentState('VERIFYING');

    const upiUrl = 'upi://pay?pa=ramyasjeweller@bank&pn=Ramyas%20Jeweller&am=1000.00&cu=INR&tn=Monthly%20Installment';
    Linking.canOpenURL(upiUrl).then((supported) => {
      if (supported) {
        Linking.openURL(upiUrl);
      }
    });

    // Simulate verification state transition
    setTimeout(() => {
      setPaymentState('SUCCESS');
    }, 2800);
  };

  const handleVerifyStatus = () => {
    setPaymentState('VERIFYING');
    setTimeout(() => {
      setPaymentState('SUCCESS');
    }, 2000);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerIconBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#70001E" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{t('scanQrTitle')}</Text>

        <TouchableOpacity
          onPress={() => router.push('/help')}
          style={styles.headerIconBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="help-circle-outline" size={24} color="#70001E" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 120 + Math.max(insets.bottom, 16) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* CUSTOMER & SCHEME SUMMARY */}
        <View style={styles.customerSummaryCard}>
          <View style={styles.customerAvatar}>
            <Text style={styles.avatarText}>RJ</Text>
          </View>
          <View style={styles.customerDetails}>
            <Text style={styles.customerNameLabel}>
              {t('customerLabel')}: <Text style={styles.customerNameVal}>{customerName}</Text> ({customerCode})
            </Text>
            <Text style={styles.schemeNameVal}>{t('schemeName')}</Text>
          </View>
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={18} color="#70001E" />
          </View>
        </View>

        {/* STATE: ALREADY PAID */}
        {paymentState === 'ALREADY_PAID' && (
          <View style={styles.installmentCard}>
            <View style={styles.installmentHeader}>
              <Text style={styles.installmentMonthTitle}>
                {localizedMonth.toUpperCase()} {t('installmentLabel')}
              </Text>
              <View style={[styles.pendingBadge, { backgroundColor: '#E8F5E9', borderColor: '#16834B' }]}>
                <Ionicons name="checkmark-circle" size={14} color="#16834B" />
                <Text style={[styles.pendingBadgeText, { color: '#16834B', marginLeft: 4 }]}>✓ Paid</Text>
              </View>
            </View>

            <View style={{ alignItems: 'center', marginVertical: 20, gap: 10 }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="checkmark-done-circle" size={40} color="#16834B" />
              </View>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#70001E' }}>Payment Already Received</Text>
              <Text style={{ fontSize: 13, color: '#6F6870', textAlign: 'center', paddingHorizontal: 20 }}>
                Your monthly installment of ₹1,000 for {localizedMonth} has already been received and recorded in your digital passbook.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.payUpiButton, { marginTop: 10 }]}
              onPress={() => router.push('/(tabs)/passbook')}
              activeOpacity={0.85}
            >
              <Ionicons name="book-outline" size={20} color="#70001E" />
              <Text style={styles.payUpiBtnText}>View Passbook</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* STATE 1: PENDING PAYMENT */}
        {paymentState === 'PENDING' && (
          <>
            {/* CURRENT INSTALLMENT CARD */}
            <View style={styles.installmentCard}>
              <View style={styles.installmentHeader}>
                <Text style={styles.installmentMonthTitle}>
                  {localizedMonth.toUpperCase()} {t('installmentLabel')}
                </Text>
                <View style={styles.pendingBadge}>
                  <View style={styles.pendingDot} />
                  <Text style={styles.pendingBadgeText}>{t('pendingStatus')}</Text>
                </View>
              </View>

              <Text style={styles.amountToPayLabel}>{t('amountToPay')}</Text>
              <Text style={styles.mainAmountText}>₹1,000</Text>
              <Text style={styles.amountSubtext}>{t('fixedMonthlyInstallment')}</Text>

              {/* MAIN QR CARD */}
              <View style={styles.qrCardContainer}>
                <View style={styles.qrHeaderRow}>
                  <Ionicons name="qr-code" size={20} color="#70001E" />
                  <Text style={styles.qrCardTitle}>{t('scanToPay')}</Text>
                </View>
                <Text style={styles.qrCardSubtext}>{t('useAnotherPhone')}</Text>

                {/* QR MATRIX FRAME */}
                <View style={styles.qrFrame}>
                  {/* GOLD CORNER BRACKETS */}
                  <View style={[styles.cornerBracket, styles.bracketTL]} />
                  <View style={[styles.cornerBracket, styles.bracketTR]} />
                  <View style={[styles.cornerBracket, styles.bracketBL]} />
                  <View style={[styles.cornerBracket, styles.bracketBR]} />

                  {/* REAL GPAY UPI QR IMAGE */}
                  <Image
                    source={require('../../assets/images/pay_gpay_qr.png')}
                    style={styles.realQrImage}
                    resizeMode="contain"
                  />
                </View>

                <View style={styles.qrDeskFooter}>
                  <Ionicons name="lock-closed" size={14} color="#70001E" />
                  <Text style={styles.qrDeskFooterText}>{t('npciOfficialQr')}</Text>
                </View>
              </View>
            </View>

            {/* OR DIVIDER */}
            <View style={styles.orDividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.orText}>{t('orSeparator')}</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* PRIMARY BUTTON: PAY VIA UPI */}
            <TouchableOpacity
              style={styles.payUpiButton}
              onPress={handlePayViaUpi}
              activeOpacity={0.85}
            >
              <Ionicons name="card" size={22} color="#70001E" />
              <Text style={styles.payUpiBtnText}>{t('payViaUpi')}</Text>
            </TouchableOpacity>

            {/* PAYMENT METHOD CARD */}
            <View style={styles.paymentMethodCard}>
              <View style={styles.methodHeader}>
                <Text style={styles.methodTitle}>{t('paymentMethodTitle')}</Text>
                <View style={styles.gatewayBadge}>
                  <View style={styles.greenDot} />
                  <Text style={styles.gatewayText}>{t('upiGateway')}</Text>
                </View>
              </View>
              <View style={styles.noticeRow}>
                <Ionicons name="information-circle-outline" size={16} color="#70001E" />
                <Text style={styles.noticeText}>{t('verificationNotice')}</Text>
              </View>
            </View>

            {/* SECURITY CONFIRMATION NOTICE */}
            <View style={styles.securityBox}>
              <Ionicons name="shield-checkmark" size={18} color="#70001E" />
              <Text style={styles.securityBoxText}>{t('keepConfirmationNotice')}</Text>
            </View>

            {/* PAYMENT SUMMARY TABLE */}
            <View style={styles.summaryTableCard}>
              <View style={styles.tableRow}>
                <Text style={styles.tableLabel}>{t('monthlyLabel')} {t('installmentLabel')}</Text>
                <Text style={styles.tableValueBold}>₹1,000</Text>
              </View>
              <View style={styles.tableDivider} />
              <View style={styles.tableRow}>
                <Text style={styles.tableLabel}>{t('monthCol')}</Text>
                <Text style={styles.tableValue}>{localizedMonth}</Text>
              </View>
              <View style={styles.tableDivider} />
              <View style={styles.tableRow}>
                <Text style={styles.tableLabel}>{t('statusCol')}</Text>
                <Text style={styles.tableValuePending}>{t('pendingStatus')}</Text>
              </View>
            </View>

            {/* COMPLETION BONUS NOTE */}
            <View style={styles.bonusNoteRow}>
              <Text style={styles.bonusSparkle}>✨</Text>
              <Text style={styles.bonusNoteText}>{t('completeBonusText')}</Text>
            </View>

            {/* VERIFY STATUS ACTION */}
            <View style={styles.statusActionSection}>
              <Text style={styles.statusQuestionText}>{t('alreadyTransferred')}</Text>
              <TouchableOpacity
                style={styles.viewStatusButton}
                onPress={handleVerifyStatus}
                activeOpacity={0.8}
              >
                <Ionicons name="refresh" size={16} color="#70001E" />
                <Text style={styles.viewStatusBtnText}>{t('viewPaymentStatus')}</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* STATE 2: VERIFYING PAYMENT */}
        {paymentState === 'VERIFYING' && (
          <View style={styles.stateContainer}>
            <View style={styles.stateIconCircle}>
              <ActivityIndicator size="large" color="#70001E" />
            </View>
            <Text style={styles.stateTitle}>{t('checkingVerification')}</Text>
            <Text style={styles.stateSubtext}>{t('verifyingSubtext')}</Text>
          </View>
        )}

        {/* STATE 3: PAYMENT RECEIVED / SUCCESS */}
        {paymentState === 'SUCCESS' && (
          <View style={styles.stateContainer}>
            <View style={[styles.stateIconCircle, styles.successCircle]}>
              <Ionicons name="checkmark" size={42} color="#FFFFFF" />
            </View>
            <Text style={styles.stateTitle}>{t('paymentReceivedTitle')}</Text>
            <Text style={styles.successAmount}>₹1,000</Text>
            <Text style={styles.successMonth}>{localizedMonth}</Text>
            <Text style={styles.stateSubtext}>{t('paymentReceivedSubtext')}</Text>

            <TouchableOpacity
              style={styles.payUpiButton}
              onPress={() => router.push('/installment-receipt')}
              activeOpacity={0.85}
            >
              <Ionicons name="document-text-outline" size={20} color="#70001E" />
              <Text style={styles.payUpiBtnText}>{t('viewReceipt')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => router.replace('/(tabs)')}
              activeOpacity={0.8}
            >
              <Ionicons name="home-outline" size={18} color="#70001E" />
              <Text style={styles.secondaryBtnText}>{t('backToHome')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* STATE 4: PAYMENT FAILED / CANCELLED */}
        {paymentState === 'FAILED' && (
          <View style={styles.stateContainer}>
            <View style={[styles.stateIconCircle, styles.failedCircle]}>
              <Ionicons name="close" size={42} color="#FFFFFF" />
            </View>
            <Text style={styles.stateTitle}>{t('paymentNotCompleted')}</Text>
            <Text style={styles.stateSubtext}>{t('paymentFailedSubtext')}</Text>

            <TouchableOpacity
              style={styles.payUpiButton}
              onPress={() => setPaymentState('PENDING')}
              activeOpacity={0.85}
            >
              <Ionicons name="refresh" size={20} color="#70001E" />
              <Text style={styles.payUpiBtnText}>{t('tryAgain')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => setPaymentState('PENDING')}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back-outline" size={18} color="#70001E" />
              <Text style={styles.secondaryBtnText}>{t('backToPayment')}</Text>
            </TouchableOpacity>
          </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerIconBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#70001E',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  customerSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFDF7',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FEF08A',
    marginBottom: 16,
    gap: 12,
  },
  customerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FCE7F3',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#70001E',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#70001E',
  },
  customerDetails: {
    flex: 1,
  },
  customerNameLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  customerNameVal: {
    fontWeight: '700',
    color: '#1E293B',
  },
  schemeNameVal: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#70001E',
    marginTop: 1,
  },
  verifiedBadge: {
    padding: 4,
  },
  installmentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 3,
    shadowColor: '#70001E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  installmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  installmentMonthTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF08A',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 5,
  },
  pendingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EAB308',
  },
  pendingBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#70001E',
  },
  amountToPayLabel: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },
  mainAmountText: {
    fontSize: 40,
    fontWeight: '800',
    color: '#70001E',
    textAlign: 'center',
    marginVertical: 4,
  },
  amountSubtext: {
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 16,
  },
  qrCardContainer: {
    backgroundColor: '#FFFDF7',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FEF08A',
    alignItems: 'center',
  },
  qrHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  qrCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#70001E',
  },
  qrCardSubtext: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 10,
  },
  qrFrame: {
    width: 190,
    height: 190,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  realQrImage: {
    width: 170,
    height: 170,
    borderRadius: 12,
  },
  cornerBracket: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderColor: '#F59E0B',
  },
  bracketTL: {
    top: 8,
    left: 8,
    borderTopWidth: 2.5,
    borderLeftWidth: 2.5,
  },
  bracketTR: {
    top: 8,
    right: 8,
    borderTopWidth: 2.5,
    borderRightWidth: 2.5,
  },
  bracketBL: {
    bottom: 8,
    left: 8,
    borderBottomWidth: 2.5,
    borderLeftWidth: 2.5,
  },
  bracketBR: {
    bottom: 8,
    right: 8,
    borderBottomWidth: 2.5,
    borderRightWidth: 2.5,
  },
  qrDeskFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  qrDeskFooterText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#70001E',
  },
  orDividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
    paddingHorizontal: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  orText: {
    paddingHorizontal: 12,
    fontSize: 12,
    fontWeight: '800',
    color: '#94A3B8',
  },
  payUpiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FDE047',
    height: 54,
    borderRadius: 16,
    width: '100%',
    gap: 10,
    elevation: 4,
    shadowColor: '#EAB308',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    marginBottom: 16,
  },
  payUpiBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#70001E',
  },
  paymentMethodCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 12,
  },
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  methodTitle: {
    fontSize: 13,
    color: '#64748B',
  },
  gatewayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  gatewayText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  noticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  securityBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F7',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FCE7F3',
    gap: 10,
    marginBottom: 16,
  },
  securityBoxText: {
    flex: 1,
    fontSize: 12,
    color: '#70001E',
    fontWeight: '600',
  },
  summaryTableCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 16,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  tableLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  tableValueBold: {
    fontSize: 14,
    fontWeight: '800',
    color: '#70001E',
  },
  tableValue: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1E293B',
  },
  tableValuePending: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#EAB308',
  },
  tableDivider: {
    height: 1,
    backgroundColor: '#F8FAFC',
    marginVertical: 4,
  },
  bonusNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 20,
    paddingHorizontal: 12,
  },
  bonusSparkle: {
    fontSize: 14,
  },
  bonusNoteText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 16,
  },
  statusActionSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  statusQuestionText: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 8,
  },
  viewStatusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFDF7',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#70001E',
    gap: 8,
    width: '100%',
  },
  viewStatusBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#70001E',
  },
  stateContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginVertical: 16,
    elevation: 3,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  stateIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFF5F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successCircle: {
    backgroundColor: '#70001E',
  },
  failedCircle: {
    backgroundColor: '#EF4444',
  },
  stateTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#70001E',
    marginBottom: 8,
    textAlign: 'center',
  },
  stateSubtext: {
    fontSize: 13.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  successAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: '#70001E',
  },
  successMonth: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 12,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    gap: 6,
    width: '100%',
    backgroundColor: '#FFFFFF',
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#70001E',
  },
});
