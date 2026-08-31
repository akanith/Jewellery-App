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
import CustomerDataService from '../../services/customer/customer-data.service';
import { CustomerDashboardData } from '../../types';
import { Bell, Calendar, Store, Gift, CheckCircle2, Volume2 } from 'lucide-react-native';

export default function HomeScreen() {
  const router = useRouter();
  const { identity } = useAuthStore();
  const [dashboardData, setDashboardData] = useState<CustomerDashboardData | null>(null);
  const [recentInstallments, setRecentInstallments] = useState<any[]>([]);
  const [nextInstallment, setNextInstallment] = useState<any | null>(null);
  const [schemePlanTitle, setSchemePlanTitle] = useState<string>('Diwali Savings Scheme');
  const [maturityDateStr, setMaturityDateStr] = useState<string>('29 Aug 2027');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [identity]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);

      if (!identity?.mobileNumber) {
        setDashboardData(null);
        setRecentInstallments([]);
        return;
      }

      // Fetch live customer dashboard via CustomerDataService
      const { customer, scheme, schemePlanTitle: planTitle, installments: list } =
        await CustomerDataService.fetchDashboard(identity as any);

      if (planTitle) setSchemePlanTitle(planTitle);

      const custName = customer?.full_name || identity.fullName;
      const custNum = customer?.customer_number || identity.customerNumber || '';

      if (!scheme) {
        setDashboardData({
          customerId: customer?.id || identity.customerId,
          customerNumber: custNum,
          customerName: custName,
          mobileNumber: identity.mobileNumber,
        });
        setRecentInstallments([]);
        setNextInstallment(null);
        return;
      }

      // Format maturity date from live DB
      if (scheme.maturity_date) {
        setMaturityDateStr(formatDate(scheme.maturity_date));
      }

      let paidCount = 0;
      let totalPaid = 0;
      const paidItems: any[] = [];
      let unpaidNext: any = null;

      for (const item of list) {
        if (item.status === 'PAID') {
          paidCount++;
          totalPaid += Number(item.paid_amount || item.expected_amount || item.due_amount || 0);
          paidItems.push(item);
        } else if (!unpaidNext) {
          unpaidNext = item;
        }
      }

      setRecentInstallments(paidItems.slice(-3).reverse());
      setNextInstallment(unpaidNext);

      const totalInstallments = Number(scheme.total_installments || 12);
      const monthlyAmount = Number(scheme.monthly_amount || 1000);
      const totalSchemeValue = monthlyAmount * totalInstallments;
      const dbTotalPaid = scheme.total_amount_paid ? Number(scheme.total_amount_paid) : totalPaid;
      const dbPaidCount = scheme.paid_installments_count ? Number(scheme.paid_installments_count) : paidCount;
      const remainingAmount = Math.max(0, totalSchemeValue - dbTotalPaid);
      const progressPercentage = Math.min(100, (dbPaidCount / totalInstallments) * 100);

      setDashboardData({
        customerId: customer?.id || identity.customerId,
        customerNumber: custNum,
        customerName: custName,
        mobileNumber: identity.mobileNumber,
        schemeId: scheme.id,
        schemeAccountNumber: scheme.scheme_account_number,
        schemeStatus: scheme.status,
        monthlyAmount,
        totalInstallments,
        paidInstallmentsCount: dbPaidCount,
        totalAmountPaid: dbTotalPaid,
        totalSchemeValue,
        remainingAmount,
        progressPercentage,
      });
    } catch (err: any) {
      console.error('[Home] fetchDashboardData error:', err?.message);
    } finally {
      setIsLoading(false);
    }
  };

  const displayName = dashboardData?.customerName || identity?.fullName || 'Valued Customer';
  const displayId = dashboardData?.schemeAccountNumber || identity?.customerNumber || 'RJ-SCH-0050005';
  const paidCount = dashboardData?.paidInstallmentsCount ?? 0;
  const totalInst = dashboardData?.totalInstallments ?? 12;
  const totalPaidFormatted = `₹${(dashboardData?.totalAmountPaid || 0).toLocaleString('en-IN')}`;
  const remainingFormatted = `₹${(dashboardData?.remainingAmount || 0).toLocaleString('en-IN')}`;
  const progressPercent = dashboardData?.progressPercentage ?? 0;
  const nextDateFormatted = formatDate(nextInstallment?.due_date) || '28 Oct 2026';
  const nextAmountFormatted = `₹${(nextInstallment?.expected_amount || dashboardData?.monthlyAmount || 1000).toLocaleString('en-IN')}`;

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
            <Text style={styles.schemeLabel}>{schemePlanTitle.toUpperCase()}</Text>
            <View style={styles.idBadge}>
              <Text style={styles.idBadgeText}>ACC: {displayId}</Text>
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
              <Text style={styles.footerLabel}>Maturity Date</Text>
              <Text style={styles.footerValue}>{maturityDateStr}</Text>
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
              <Text style={styles.nextPaymentLabel}>Next Payment (Installment #{nextInstallment?.installment_number || 3})</Text>
              <Text style={styles.nextPaymentDate}>{nextDateFormatted}</Text>
              <Text style={styles.nextPaymentAmount}>{nextAmountFormatted}</Text>
            </View>
            <View style={styles.onTimeBadge}>
              <Text style={styles.onTimeText}>UPCOMING</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions Grid */}
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(tabs)/passbook')}>
            <View style={[styles.actionIconContainer, { backgroundColor: '#FDF2F2' }]}>
              <Gift size={24} color={colors.maroonPrimary} />
            </View>
            <Text style={styles.actionCardTitle}>Passbook</Text>
            <Text style={styles.actionCardSub}>View Installments</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/support/shop')}>
            <View style={[styles.actionIconContainer, { backgroundColor: '#FEF3C7' }]}>
              <Store size={24} color="#D97706" />
            </View>
            <Text style={styles.actionCardTitle}>Visit Store</Text>
            <Text style={styles.actionCardSub}>Showroom Info</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Activity Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Recent Payments</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/passbook')}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        {recentInstallments.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No recent payments recorded.</Text>
          </View>
        ) : (
          recentInstallments.map((inst, index) => (
            <View key={inst.id || index} style={styles.paymentRow}>
              <View style={styles.paymentCheckCircle}>
                <CheckCircle2 size={18} color="#166534" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.paymentTitle}>Installment #{inst.installment_number}</Text>
                <Text style={styles.paymentSub}>
                  {formatDate(inst.payment_date || inst.due_date)} • {inst.payment_method || 'Paid'}
                </Text>
              </View>
              <Text style={styles.paymentAmount}>
                +₹{(inst.paid_amount || inst.expected_amount || 1000).toLocaleString('en-IN')}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bgLight,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  greetingText: {
    fontSize: 14,
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
    gap: 12,
  },
  bellButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.cardWhite,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  bellBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.goldSecondary,
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.maroonPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  schemeCard: {
    backgroundColor: colors.maroonPrimary,
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  schemeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  schemeLabel: {
    color: colors.goldSecondary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  idBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  idBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing.lg,
  },
  amountMainText: {
    color: '#FFF',
    fontSize: 32,
    fontWeight: '800',
  },
  paidTag: {
    color: colors.goldLight,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  progressSection: {
    marginBottom: spacing.lg,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressText: {
    color: '#E5E7EB',
    fontSize: 12,
    fontWeight: '500',
  },
  percentText: {
    color: colors.goldSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.goldSecondary,
    borderRadius: 4,
  },
  schemeFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
  },
  footerLabel: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '500',
  },
  footerValue: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  nextPaymentCard: {
    backgroundColor: colors.cardWhite,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.goldSecondary,
    ...shadows.sm,
  },
  nextPaymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  calendarBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FDF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextPaymentLabel: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },
  nextPaymentDate: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textDark,
    marginTop: 2,
  },
  nextPaymentAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.maroonPrimary,
    marginTop: 2,
  },
  onTimeBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  onTimeText: {
    color: '#166534',
    fontSize: 10,
    fontWeight: '800',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  actionCard: {
    flex: 1,
    backgroundColor: colors.cardWhite,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
  actionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  actionCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textDark,
  },
  actionCardSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textDark,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.maroonPrimary,
  },
  emptyCard: {
    backgroundColor: colors.cardWhite,
    borderRadius: radius.md,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadows.sm,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardWhite,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  paymentCheckCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textDark,
  },
  paymentSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  paymentAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#166534',
  },
});
