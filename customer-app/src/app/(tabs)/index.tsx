import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CustomerHomeData } from '@/types/dashboard';
import { formatCurrency } from '../../lib/formatters';

// Default initial view-model structure for initial render (UI preview)
const initialHomeData: CustomerHomeData = {
  customerName: 'Ramya Krishnan',
  customerCode: 'RJ-CUST-4421',
  avatarUri: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
  unreadNotificationsCount: 1,
  scheme: {
    schemeId: 'sch_4421',
    schemeName: 'GOLD SAVINGS SCHEME',
    schemeCode: '4421',
    paidAmount: 8000,
    remainingContribution: 4000,
    paidInstallments: 8,
    totalInstallments: 12,
    maturityAmount: 13000,
    bonusAmount: 1000,
    maturityDate: 'May 2027',
    progressPercentage: 66,
    status: 'ACTIVE',
  },
  currentInstallment: {
    installmentNumber: 9,
    calendarMonth: 'August 2026',
    dueDateFormatted: '05 August 2026',
    amount: 1000,
    status: 'ON_TIME',
  },
  recentPayments: [
    { id: 'pay_1', calendarMonth: 'July 2026', amount: 1000, paymentDate: '2026-07-05', status: 'PAID' },
    { id: 'pay_2', calendarMonth: 'June 2026', amount: 1000, paymentDate: '2026-06-04', status: 'PAID' },
    { id: 'pay_3', calendarMonth: 'May 2026', amount: 1000, paymentDate: '2026-05-02', status: 'PAID' },
  ],
  announcement: 'Shop closed on Sunday. Happy Holidays!',
};

export default function CustomerHomeScreen() {
  const router = useRouter();
  const [data] = useState<CustomerHomeData>(initialHomeData);

  const scheme = data.scheme;
  const currentInst = data.currentInstallment;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* TOP HEADER */}
      <View style={styles.headerContainer}>
        <View style={styles.headerGreetingGroup}>
          <Text style={styles.headerGreetingSub}>Good Morning 👋</Text>
          <Text style={styles.headerCustomerName}>{data.customerName}</Text>
        </View>

        <View style={styles.headerRightActions}>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => router.push('/notifications')}
            activeOpacity={0.7}
            accessibilityLabel="Notifications"
          >
            <Ionicons name="notifications-outline" size={22} color="#70001E" />
            {data.unreadNotificationsCount > 0 && <View style={styles.notificationBadgeDot} />}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.avatarButton}
            onPress={() => router.push('/profile')}
            activeOpacity={0.8}
            accessibilityLabel="Profile"
          >
            {data.avatarUri ? (
              <Image source={{ uri: data.avatarUri }} style={styles.avatarImage} />
            ) : (
              <Ionicons name="person-circle" size={40} color="#70001E" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* MAIN SCHEME SAVINGS CARD */}
        {scheme && (
          <View style={styles.schemeCard}>
            {/* Top row */}
            <View style={styles.schemeCardHeader}>
              <Text style={styles.schemeCardType}>{scheme.schemeName}</Text>
              <View style={styles.schemeIdBadge}>
                <Text style={styles.schemeIdBadgeText}>ID: {scheme.schemeCode}</Text>
              </View>
            </View>

            {/* Paid Amount Display */}
            <View style={styles.paidAmountRow}>
              <Text style={styles.paidAmountValue}>
                {formatCurrency(scheme.paidAmount)}
              </Text>
              <Text style={styles.paidAmountLabel}>Paid</Text>
            </View>

            {/* Months Progress */}
            <View style={styles.progressTextRow}>
              <Text style={styles.progressTextLeft}>
                {scheme.paidInstallments} of {scheme.totalInstallments} Months Completed
              </Text>
              <Text style={styles.progressTextRight}>{scheme.progressPercentage}%</Text>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${Math.min(100, Math.max(0, scheme.progressPercentage))}%` },
                ]}
              />
            </View>

            {/* Bottom Maturity / Remaining Info */}
            <View style={styles.schemeCardFooter}>
              <View>
                <Text style={styles.schemeFooterSub}>Next Maturity</Text>
                <Text style={styles.schemeFooterVal}>{scheme.maturityDate}</Text>
              </View>
              <View style={styles.alignRight}>
                <Text style={styles.schemeFooterSub}>Remaining</Text>
                <Text style={styles.schemeFooterVal}>
                  {formatCurrency(scheme.remainingContribution)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* NEXT PAYMENT CARD */}
        {currentInst && (
          <View style={styles.nextPaymentCard}>
            <View style={styles.nextPaymentHeader}>
              <View style={styles.calendarIconWrapper}>
                <Ionicons name="calendar-outline" size={24} color="#70001E" />
              </View>

              <View style={styles.nextPaymentDetails}>
                <Text style={styles.nextPaymentSub}>Next Payment</Text>
                <Text style={styles.nextPaymentDate}>{currentInst.dueDateFormatted}</Text>
                <Text style={styles.nextPaymentAmount}>
                  {formatCurrency(currentInst.amount)}
                </Text>
              </View>

              <View style={styles.onTimeBadge}>
                <Text style={styles.onTimeBadgeText}>ON TIME</Text>
              </View>
            </View>

            {/* Pay at Shop Action */}
            <TouchableOpacity
              style={styles.payAtShopButton}
              onPress={() => router.push('/shop')}
              activeOpacity={0.85}
            >
              <Ionicons name="storefront-outline" size={20} color="#1E293B" />
              <Text style={styles.payAtShopButtonText}>Pay at Shop</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* MATURITY / BONUS CARD */}
        {scheme && (
          <View style={styles.maturityCard}>
            <View style={styles.giftIconWrapper}>
              <Ionicons name="gift-outline" size={22} color="#854D0E" />
            </View>
            <View style={styles.maturityTextContainer}>
              <Text style={styles.maturityTitle}>
                You will receive {formatCurrency(scheme.maturityAmount)}
              </Text>
              <Text style={styles.maturitySubtitle}>
                Includes {formatCurrency(scheme.bonusAmount)} Shop Bonus at maturity.
              </Text>
            </View>
          </View>
        )}

        {/* RECENT PAYMENTS SECTION */}
        <View style={styles.recentSection}>
          <View style={styles.recentSectionHeader}>
            <Text style={styles.recentSectionTitle}>Recent Payments</Text>
            <TouchableOpacity
              onPress={() => router.push('/passbook')}
              activeOpacity={0.7}
            >
              <Text style={styles.viewFullPassbookText}>View Full Passbook →</Text>
            </TouchableOpacity>
          </View>

          {/* Table Container */}
          <View style={styles.paymentsTableCard}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.tableHeaderCol, styles.colMonth]}>MONTH</Text>
              <Text style={[styles.tableHeaderCol, styles.colAmount]}>AMOUNT</Text>
              <Text style={[styles.tableHeaderCol, styles.colStatus]}>STATUS</Text>
            </View>

            <View style={styles.tableBody}>
              {data.recentPayments.length === 0 ? (
                <View style={styles.emptyTableRow}>
                  <Text style={styles.emptyTableText}>No recent payments recorded.</Text>
                </View>
              ) : (
                data.recentPayments.map((p, idx) => (
                  <View
                    key={p.id}
                    style={[
                      styles.tableRow,
                      idx < data.recentPayments.length - 1 && styles.tableRowBorder,
                    ]}
                  >
                    <Text style={[styles.tableRowMonth, styles.colMonth]}>
                      {p.calendarMonth}
                    </Text>
                    <Text style={[styles.tableRowAmount, styles.colAmount]}>
                      {formatCurrency(p.amount)}
                    </Text>
                    <View style={styles.colStatus}>
                      <Ionicons name="checkmark-circle" size={22} color="#16A34A" />
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>
        </View>

        {/* ANNOUNCEMENT CARD */}
        {data.announcement && (
          <View style={styles.announcementCard}>
            <Ionicons
              name="megaphone-outline"
              size={20}
              color="#475569"
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
    backgroundColor: '#FAFAFA',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerGreetingGroup: {
    flex: 1,
  },
  headerGreetingSub: {
    fontSize: 12.5,
    color: '#64748B',
    fontWeight: '500',
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
    backgroundColor: '#FFF5F5',
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
    backgroundColor: '#EF4444',
  },
  avatarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
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
  schemeCard: {
    backgroundColor: '#70001E',
    borderRadius: 22,
    padding: 22,
    shadowColor: '#70001E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  schemeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  schemeCardType: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#FECDD3',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  schemeIdBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  schemeIdBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  paidAmountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 16,
  },
  paidAmountValue: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  paidAmountLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FCE7F3',
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressTextLeft: {
    fontSize: 12.5,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  progressTextRight: {
    fontSize: 12.5,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  progressBarTrack: {
    height: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 18,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FDE047',
    borderRadius: 5,
  },
  schemeCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
  },
  schemeFooterSub: {
    fontSize: 11,
    color: '#FECDD3',
    fontWeight: '500',
    marginBottom: 2,
  },
  schemeFooterVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  alignRight: {
    alignItems: 'flex-end',
  },
  nextPaymentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
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
    backgroundColor: '#FFF5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextPaymentDetails: {
    flex: 1,
  },
  nextPaymentSub: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 2,
  },
  nextPaymentDate: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 2,
  },
  nextPaymentAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#70001E',
  },
  onTimeBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  onTimeBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#166534',
    letterSpacing: 0.5,
  },
  payAtShopButton: {
    backgroundColor: '#FDE047',
    borderRadius: 14,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  payAtShopButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },
  maturityCard: {
    backgroundColor: '#FFFDF0',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#FACC15',
    borderStyle: 'dashed',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  giftIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEF08A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  maturityTextContainer: {
    flex: 1,
  },
  maturityTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 2,
  },
  maturitySubtitle: {
    fontSize: 12,
    color: '#854D0E',
    fontWeight: '500',
  },
  recentSection: {
    gap: 12,
  },
  recentSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recentSectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
  },
  viewFullPassbookText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#70001E',
  },
  paymentsTableCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tableHeaderCol: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.8,
  },
  colMonth: {
    flex: 2,
  },
  colAmount: {
    flex: 2,
  },
  colStatus: {
    width: 50,
    alignItems: 'center',
  },
  tableBody: {},
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  tableRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tableRowMonth: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  tableRowAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#70001E',
  },
  emptyTableRow: {
    padding: 20,
    alignItems: 'center',
  },
  emptyTableText: {
    fontSize: 13,
    color: '#94A3B8',
  },
  announcementCard: {
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  announcementIcon: {},
  announcementText: {
    fontSize: 12.5,
    color: '#475569',
    flex: 1,
    fontWeight: '500',
  },
});
