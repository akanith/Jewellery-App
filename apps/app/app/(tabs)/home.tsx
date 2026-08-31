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
import { CustomerDashboardData } from '../../types';
import { Bell, Calendar, Store, Gift, CheckCircle2, Volume2 } from 'lucide-react-native';

export default function HomeScreen() {
  const router = useRouter();
  const { identity } = useAuthStore();
  const [dashboardData, setDashboardData] = useState<CustomerDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [identity]);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      if (!identity?.customerId) {
        setDashboardData(null);
        return;
      }

      // Fetch customer scheme
      const { data: scheme } = await supabase
        .from('customer_schemes')
        .select('*')
        .eq('customer_id', identity.customerId)
        .eq('status', 'ACTIVE')
        .maybeSingle();

      if (!scheme) {
        setDashboardData({
          customerId: identity.customerId,
          customerNumber: identity.customerNumber || '',
          customerName: identity.fullName,
          mobileNumber: identity.mobileNumber,
        });
        return;
      }

      // Fetch installments
      const { data: installments } = await supabase
        .from('installments')
        .select('*')
        .eq('customer_scheme_id', scheme.id)
        .order('installment_number', { ascending: true });

      const list = installments || [];
      let paidCount = 0;
      let totalPaid = 0;

      for (const item of list) {
        if (item.status === 'PAID') {
          paidCount++;
          totalPaid += Number(item.paid_amount || 0);
        }
      }

      const totalInstallments = Number(scheme.total_installments || 12);
      const monthlyAmount = Number(scheme.monthly_amount || 1000);
      const totalSchemeValue = monthlyAmount * totalInstallments;
      const remainingAmount = Math.max(0, totalSchemeValue - totalPaid);
      const progressPercentage = Math.min(100, (paidCount / totalInstallments) * 100);

      setDashboardData({
        customerId: identity.customerId,
        customerNumber: identity.customerNumber || '',
        customerName: identity.fullName,
        mobileNumber: identity.mobileNumber,
        schemeId: scheme.id,
        schemeAccountNumber: scheme.scheme_account_number,
        schemeStatus: scheme.status,
        monthlyAmount,
        totalInstallments,
        paidInstallmentsCount: paidCount,
        totalAmountPaid: totalPaid,
        totalSchemeValue,
        remainingAmount,
        progressPercentage,
      });
    } catch {
      // Fallback state
    } finally {
      setIsLoading(false);
    }
  };

  const displayName = identity?.fullName || 'Valued Customer';
  const displayId = identity?.customerNumber || 'CUST-001';
  const paidCount = dashboardData?.paidInstallmentsCount ?? 8;
  const totalInst = dashboardData?.totalInstallments ?? 12;
  const totalPaidFormatted = dashboardData?.totalAmountPaid ? `₹${dashboardData.totalAmountPaid.toLocaleString('en-IN')}` : '₹8,000';
  const remainingFormatted = dashboardData?.remainingAmount ? `₹${dashboardData.remainingAmount.toLocaleString('en-IN')}` : '₹4,000';
  const progressPercent = dashboardData?.progressPercentage ?? 66;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header Row */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greetingText}>Good Morning 👋</Text>
            <Text style={styles.customerNameText}>{displayName}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.bellButton} onPress={() => router.push('/(tabs)/notifications')}>
              <Bell size={20} color={colors.maroonPrimary} />
              <View style={styles.bellBadge} />
            </TouchableOpacity>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{displayName.charAt(0)}</Text>
            </View>
          </View>
        </View>

        {/* Gold Savings Scheme Gradient Card */}
        <View style={styles.schemeCard}>
          <View style={styles.schemeHeaderRow}>
            <Text style={styles.schemeLabel}>GOLD SAVINGS SCHEME</Text>
            <View style={styles.idBadge}>
              <Text style={styles.idBadgeText}>ID: {displayId}</Text>
            </View>
          </View>

          <View style={styles.amountRow}>
            <Text style={styles.amountMainText}>{totalPaidFormatted}</Text>
            <Text style={styles.paidTag}>Paid</Text>
          </View>

          {/* Progress Bar Section */}
          <View style={styles.progressSection}>
            <View style={styles.progressLabelRow}>
              <Text style={styles.progressText}>{paidCount} of {totalInst} Months Completed</Text>
              <Text style={styles.percentText}>{Math.round(progressPercent)}%</Text>
            </View>
            <View style={styles.progressBarTrack}>
              <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
            </View>
          </View>

          {/* Footer Info Row */}
          <View style={styles.schemeFooterRow}>
            <View>
              <Text style={styles.footerLabel}>Next Maturity</Text>
              <Text style={styles.footerValue}>May 2027</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.footerLabel}>Remaining</Text>
              <Text style={styles.footerValue}>{remainingFormatted}</Text>
            </View>
          </View>
        </View>

        {/* Next Payment Alert Card */}
        <View style={styles.nextPaymentCard}>
          <View style={styles.nextPaymentHeader}>
            <View style={styles.calendarBadge}>
              <Calendar size={22} color={colors.maroonPrimary} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.nextPaymentLabel}>Next Payment</Text>
              <Text style={styles.nextPaymentDate}>05 August 2026</Text>
              <Text style={styles.nextPaymentAmount}>₹1,000</Text>
            </View>
            <View style={styles.onTimeBadge}>
              <Text style={styles.onTimeText}>ON TIME</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.payAtShopButton} activeOpacity={0.85}>
            <Store size={20} color={colors.maroonPrimary} style={{ marginRight: 8 }} />
            <Text style={styles.payAtShopText}>Pay at Shop</Text>
          </TouchableOpacity>
        </View>

        {/* Bonus Benefit Dotted Card */}
        <View style={styles.bonusCard}>
          <View style={styles.giftBadge}>
            <Gift size={22} color={colors.maroonPrimary} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.bonusTitle}>You will receive ₹13,000</Text>
            <Text style={styles.bonusSub}>Includes ₹1,000 Shop Bonus at maturity.</Text>
          </View>
        </View>

        {/* Recent Payments Section */}
        <View style={styles.recentSectionHeader}>
          <Text style={styles.sectionTitle}>Recent Payments</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/passbook')}>
            <Text style={styles.viewFullText}>View Full Passbook →</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Payments Table Card */}
        <View style={styles.tableCard}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.colHeader, { flex: 1.2 }]}>MONTH</Text>
            <Text style={[styles.colHeader, { flex: 1, textAlign: 'center' }]}>AMOUNT</Text>
            <Text style={[styles.colHeader, { flex: 1, textAlign: 'right' }]}>STATUS</Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={[styles.cellTextBold, { flex: 1.2 }]}>July 2026</Text>
            <Text style={[styles.cellTextBold, { flex: 1, textAlign: 'center' }]}>₹1,000</Text>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <CheckCircle2 size={20} color={colors.successGreen} />
            </View>
          </View>

          <View style={styles.tableRow}>
            <Text style={[styles.cellTextBold, { flex: 1.2 }]}>June 2026</Text>
            <Text style={[styles.cellTextBold, { flex: 1, textAlign: 'center' }]}>₹1,000</Text>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <CheckCircle2 size={20} color={colors.successGreen} />
            </View>
          </View>

          <View style={styles.tableRowNoBorder}>
            <Text style={[styles.cellTextBold, { flex: 1.2 }]}>May 2026</Text>
            <Text style={[styles.cellTextBold, { flex: 1, textAlign: 'center' }]}>₹1,000</Text>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <CheckCircle2 size={20} color={colors.successGreen} />
            </View>
          </View>
        </View>

        {/* Notice Banner */}
        <View style={styles.noticeBox}>
          <Volume2 size={18} color={colors.textMuted} style={{ marginRight: 10 }} />
          <Text style={styles.noticeText}>Shop closed on Sunday. Happy Holidays!</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.creamBackground,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  greetingText: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '500',
  },
  customerNameText: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.maroonPrimary,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bellButton: {
    width: 42,
    height: 42,
    borderRadius: radius.full,
    backgroundColor: colors.cardWhite,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginRight: spacing.sm,
  },
  bellBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.errorRed,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.maroonPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: colors.cardWhite,
    fontSize: 18,
    fontWeight: '700',
  },
  schemeCard: {
    backgroundColor: '#6B1D2F',
    borderRadius: radius.xxl,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    ...shadows.card,
  },
  schemeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  schemeLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.goldLight,
    letterSpacing: 1.2,
  },
  idBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  idBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.cardWhite,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing.lg,
  },
  amountMainText: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.cardWhite,
  },
  paidTag: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    marginLeft: 8,
  },
  progressSection: {
    marginBottom: spacing.xl,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
  },
  percentText: {
    fontSize: 13,
    color: colors.goldLight,
    fontWeight: '700',
  },
  progressBarTrack: {
    height: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.goldLight,
    borderRadius: radius.full,
  },
  schemeFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
    paddingTop: spacing.md,
  },
  footerLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  footerValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.cardWhite,
    marginTop: 2,
  },
  nextPaymentCard: {
    backgroundColor: colors.cardWhite,
    borderRadius: radius.xxl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: spacing.xl,
    ...shadows.soft,
  },
  nextPaymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  calendarBadge: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextPaymentLabel: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
  },
  nextPaymentDate: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textDark,
    marginTop: 2,
  },
  nextPaymentAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.maroonPrimary,
    marginTop: 2,
  },
  onTimeBadge: {
    backgroundColor: colors.successBg,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  onTimeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.successGreen,
  },
  payAtShopButton: {
    flexDirection: 'row',
    height: 50,
    backgroundColor: colors.goldLight,
    borderRadius: radius.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  payAtShopText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.maroonPrimary,
  },
  bonusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEFCE8',
    borderRadius: radius.xxl,
    padding: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.goldPrimary,
    borderStyle: 'dashed',
    marginBottom: spacing.xl,
  },
  giftBadge: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.goldLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bonusTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textDark,
  },
  bonusSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  recentSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textDark,
  },
  viewFullText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.maroonPrimary,
  },
  tableCard: {
    backgroundColor: colors.cardWhite,
    borderRadius: radius.xxl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: spacing.xl,
    ...shadows.soft,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderInput,
  },
  colHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMuted,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  tableRowNoBorder: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.md,
  },
  cellTextBold: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textDark,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  noticeText: {
    fontSize: 12.5,
    color: colors.textMuted,
  },
});
