import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CustomerPassbookData } from '@/types/passbook';
import { formatCurrency } from '@/lib/formatters';

// Sample view-model structure for initial UI rendering
const initialPassbookData: CustomerPassbookData = {
  customerName: 'Anith Kumar',
  customerCode: 'RJ-88234',
  schemeName: 'Gold Savings Scheme',
  schemeCode: 'RJ-88234',
  financialYear: 'FY 2024-25',
  monthlyInstallment: 1000,
  paidAmount: 8000,
  totalContribution: 12000,
  paidInstallments: 8,
  totalInstallments: 12,
  status: 'ACTIVE',
  progressPercentage: 66,
  installments: [
    { installmentNumber: 1, installmentLabel: 'Installment 1', calendarMonth: 'March 2024', installmentAmount: 1000, paidAmount: 1000, status: 'PAID', paidDateFormatted: 'Paid on 05 Mar, 2024' },
    { installmentNumber: 2, installmentLabel: 'Installment 2', calendarMonth: 'April 2024', installmentAmount: 1000, paidAmount: 1000, status: 'PAID', paidDateFormatted: 'Paid on 05 Apr, 2024' },
    { installmentNumber: 3, installmentLabel: 'Installment 3', calendarMonth: 'May 2024', installmentAmount: 1000, paidAmount: 1000, status: 'PAID', paidDateFormatted: 'Paid on 05 May, 2024' },
    { installmentNumber: 4, installmentLabel: 'Installment 4', calendarMonth: 'June 2024', installmentAmount: 1000, paidAmount: 1000, status: 'PAID', paidDateFormatted: 'Paid on 05 Jun, 2024' },
    { installmentNumber: 5, installmentLabel: 'Installment 5', calendarMonth: 'July 2024', installmentAmount: 1000, paidAmount: 1000, status: 'PAID', paidDateFormatted: 'Paid on 05 Jul, 2024' },
    { installmentNumber: 6, installmentLabel: 'Installment 6', calendarMonth: 'August 2024', installmentAmount: 1000, paidAmount: 1000, status: 'PAID', paidDateFormatted: 'Paid on 05 Aug, 2024' },
    { installmentNumber: 7, installmentLabel: 'Installment 7', calendarMonth: 'September 2024', installmentAmount: 1000, paidAmount: 1000, status: 'PAID', paidDateFormatted: 'Paid on 05 Sep, 2024' },
    { installmentNumber: 8, installmentLabel: 'Installment 8', calendarMonth: 'October 2024', installmentAmount: 1000, paidAmount: 1000, status: 'PAID', paidDateFormatted: 'Paid on 05 Oct, 2024' },
    { installmentNumber: 9, installmentLabel: 'Installment 9', calendarMonth: 'November 2024', installmentAmount: 1000, paidAmount: 0, status: 'PENDING', dueDateFormatted: 'Due by 05 Nov, 2024' },
    { installmentNumber: 10, installmentLabel: 'Installment 10', calendarMonth: 'December 2024', installmentAmount: 1000, paidAmount: 0, status: 'FUTURE' },
    { installmentNumber: 11, installmentLabel: 'Installment 11', calendarMonth: 'January 2025', installmentAmount: 1000, paidAmount: 0, status: 'FUTURE' },
    { installmentNumber: 12, installmentLabel: 'Installment 12', calendarMonth: 'February 2025', installmentAmount: 1000, paidAmount: 0, status: 'FUTURE' },
  ],
};

export default function CustomerPassbookScreen() {
  const router = useRouter();
  const [data] = useState<CustomerPassbookData>(initialPassbookData);

  const handleInstallmentPress = (inst: (typeof data.installments)[0]) => {
    if (inst.status === 'PAID') {
      router.push({
        pathname: '/installment-receipt' as any,
        params: {
          installmentNumber: String(inst.installmentNumber),
          receiptId: `rec_00${inst.installmentNumber}`,
        },
      });
    } else if (inst.status === 'PENDING') {
      const title = `Installment ${inst.installmentNumber} Pending`;
      const msg = `Payment for ${inst.calendarMonth} has not been received yet. Please visit Ramyas Jeweller or contact shop to record your payment.`;
      if (Platform.OS === 'web') {
        window.alert(`${title}\n\n${msg}`);
      } else {
        Alert.alert(title, msg, [{ text: 'OK' }]);
      }
    } else {
      const title = `Installment ${inst.installmentNumber} Upcoming`;
      const msg = `This installment will be payable in ${inst.calendarMonth}. No payment receipt is available yet.`;
      if (Platform.OS === 'web') {
        window.alert(`${title}\n\n${msg}`);
      } else {
        Alert.alert(title, msg, [{ text: 'OK' }]);
      }
    }
  };

  const handleDownloadPassbook = () => {
    Alert.alert(
      'Download Passbook',
      'Digital Passbook PDF export will be available upon completing backend connection.',
      [{ text: 'OK' }]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* HEADER */}
      <View style={styles.headerContainer}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.7}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={22} color="#70001E" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Digital Passbook</Text>

        <TouchableOpacity
          onPress={() => Alert.alert('Help', 'Contact shop for passbook assistance.')}
          style={styles.helpButton}
          activeOpacity={0.7}
          accessibilityLabel="Help"
        >
          <Ionicons name="help-circle-outline" size={24} color="#70001E" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* SCHEME SUMMARY CARD */}
        <View style={styles.schemeCard}>
          <View style={styles.schemeCardTop}>
            <View>
              <Text style={styles.schemeName}>{data.schemeName}</Text>
              <Text style={styles.customerName}>{data.customerName}</Text>
              <Text style={styles.customerCode}>ID: {data.customerCode}</Text>
            </View>

            <View style={styles.ribbonBadge}>
              <Ionicons name="ribbon-outline" size={24} color="#FFFFFF" />
            </View>
          </View>

          <View style={styles.dottedDivider} />

          <View style={styles.schemeCardBottom}>
            <View>
              <Text style={styles.depositLabel}>MONTHLY DEPOSIT</Text>
              <Text style={styles.depositValue}>
                {formatCurrency(data.monthlyInstallment)}
              </Text>

              <View style={styles.activeBadge}>
                <Ionicons name="checkmark-circle" size={14} color="#FFFFFF" />
                <Text style={styles.activeBadgeText}>Active</Text>
              </View>
            </View>

            <View style={styles.monthsRingContainer}>
              <View style={styles.monthsRing}>
                <Text style={styles.monthsRingNumber}>
                  {data.paidInstallments}/{data.totalInstallments}
                </Text>
              </View>
              <Text style={styles.monthsRingLabel}>Months</Text>
            </View>
          </View>
        </View>

        {/* COMPLETION STATUS CARD */}
        <View style={styles.completionCard}>
          <Text style={styles.completionHeader}>COMPLETION STATUS</Text>

          <View style={styles.completionMainRow}>
            <Text style={styles.completionMonthsText}>
              {data.paidInstallments} / {data.totalInstallments} Months
            </Text>
            <Text style={styles.completionPercentText}>
              {data.progressPercentage}% Paid
            </Text>
          </View>

          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${Math.min(100, Math.max(0, data.progressPercentage))}%` },
              ]}
            />
          </View>
        </View>

        {/* PAYMENT LEDGER */}
        <View style={styles.ledgerCard}>
          <View style={styles.ledgerHeader}>
            <Text style={styles.ledgerTitle}>PAYMENT LEDGER</Text>
            <Text style={styles.ledgerYear}>{data.financialYear}</Text>
          </View>

          <View style={styles.ledgerList}>
            {data.installments.map((inst, index) => {
              const isPaid = inst.status === 'PAID';
              const isPending = inst.status === 'PENDING';
              const isFuture = inst.status === 'FUTURE';
              const isLast = index === data.installments.length - 1;

              return (
                <TouchableOpacity
                  key={inst.installmentNumber}
                  style={[
                    styles.installmentRow,
                    isPending && styles.installmentRowPending,
                    !isLast && !isPending && styles.installmentRowBorder,
                  ]}
                  onPress={() => handleInstallmentPress(inst)}
                  activeOpacity={0.7}
                >
                  {/* Number Circle Badge */}
                  <View
                    style={[
                      styles.numberBadge,
                      isPaid && styles.numberBadgePaid,
                      isPending && styles.numberBadgePending,
                      isFuture && styles.numberBadgeFuture,
                    ]}
                  >
                    <Text
                      style={[
                        styles.numberBadgeText,
                        isPaid && styles.numberBadgeTextPaid,
                        isPending && styles.numberBadgeTextPending,
                        isFuture && styles.numberBadgeTextFuture,
                      ]}
                    >
                      {inst.installmentNumber}
                    </Text>
                  </View>

                  {/* Middle Info */}
                  <View style={styles.installmentInfo}>
                    <Text
                      style={[
                        styles.installmentTitle,
                        isFuture && styles.installmentTitleFuture,
                      ]}
                    >
                      {inst.installmentLabel}
                    </Text>
                    <Text
                      style={[
                        styles.installmentSubtitle,
                        isFuture && styles.installmentSubtitleFuture,
                      ]}
                    >
                      {isPaid
                        ? inst.paidDateFormatted
                        : isPending
                        ? inst.dueDateFormatted
                        : 'Upcoming Payment'}
                    </Text>
                  </View>

                  {/* Right Status Badge */}
                  <View style={styles.statusBadgeWrapper}>
                    {isPaid && (
                      <View style={styles.paidStatusBadge}>
                        <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
                        <Text style={styles.paidStatusText}>Paid</Text>
                      </View>
                    )}

                    {isPending && (
                      <View style={styles.pendingStatusBadge}>
                        <Ionicons name="hourglass-outline" size={16} color="#854D0E" />
                        <Text style={styles.pendingStatusText}>Waiting</Text>
                      </View>
                    )}

                    {isFuture && (
                      <View style={styles.futureStatusBadge}>
                        <Ionicons name="time-outline" size={16} color="#94A3B8" />
                        <Text style={styles.futureStatusText}>Future</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* DOWNLOAD PASSBOOK BUTTON */}
        <TouchableOpacity
          style={styles.downloadButton}
          onPress={handleDownloadPassbook}
          activeOpacity={0.9}
        >
          <Ionicons name="download-outline" size={20} color="#FFFFFF" />
          <Text style={styles.downloadButtonText}>Download Passbook</Text>
        </TouchableOpacity>
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
  helpButton: {
    padding: 6,
    marginRight: -4,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 36,
    gap: 20,
  },
  schemeCard: {
    backgroundColor: '#70001E',
    borderRadius: 22,
    padding: 22,
    shadowColor: '#70001E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  schemeCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  schemeName: {
    fontSize: 12,
    color: '#FECDD3',
    fontWeight: '600',
    marginBottom: 4,
  },
  customerName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  customerCode: {
    fontSize: 13,
    color: '#FCE7F3',
    fontWeight: '600',
  },
  ribbonBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dottedDivider: {
    borderStyle: 'dashed',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    marginBottom: 16,
  },
  schemeCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  depositLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FECDD3',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  depositValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  activeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  monthsRingContainer: {
    alignItems: 'center',
  },
  monthsRing: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  monthsRingNumber: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  monthsRingLabel: {
    fontSize: 11,
    color: '#FECDD3',
    fontWeight: '500',
  },
  completionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#FCE7F3',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  completionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  completionMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  completionMonthsText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E293B',
  },
  completionPercentText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#70001E',
  },
  progressBarTrack: {
    height: 10,
    backgroundColor: '#F1F5F9',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#70001E',
    borderRadius: 5,
  },
  ledgerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FCE7F3',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  ledgerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFF8F8',
    borderBottomWidth: 1,
    borderBottomColor: '#FCE7F3',
  },
  ledgerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#70001E',
    letterSpacing: 0.8,
  },
  ledgerYear: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  ledgerList: {},
  installmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 14,
  },
  installmentRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  installmentRowPending: {
    backgroundColor: '#FFFDF0',
  },
  numberBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberBadgePaid: {
    backgroundColor: '#FFF1F2',
  },
  numberBadgePending: {
    backgroundColor: '#FDE047',
  },
  numberBadgeFuture: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
  },
  numberBadgeText: {
    fontSize: 14,
    fontWeight: '800',
  },
  numberBadgeTextPaid: {
    color: '#70001E',
  },
  numberBadgeTextPending: {
    color: '#854D0E',
  },
  numberBadgeTextFuture: {
    color: '#94A3B8',
  },
  installmentInfo: {
    flex: 1,
  },
  installmentTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  installmentTitleFuture: {
    color: '#64748B',
  },
  installmentSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  installmentSubtitleFuture: {
    color: '#94A3B8',
  },
  statusBadgeWrapper: {},
  paidStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  paidStatusText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#16A34A',
  },
  pendingStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pendingStatusText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#854D0E',
  },
  futureStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  futureStatusText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  downloadButton: {
    backgroundColor: '#70001E',
    borderRadius: 30,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#70001E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  downloadButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
});
