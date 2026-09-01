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
  const displayId = dashboardData?.schemeAccountNumber || identity?.customerNumber || '';
  const paidCount = dashboardData?.paidInstallmentsCount ?? 0;
  const totalInst = dashboardData?.totalInstallments ?? 12;
  const totalPaidFormatted = `₹${(dashboardData?.totalAmountPaid || 0).toLocaleString('en-IN')}`;
  const remainingFormatted = `₹${(dashboardData?.remainingAmount || 0).toLocaleString('en-IN')}`;
  const progressPercent = dashboardData?.progressPercentage ?? 0;
  const nextDateFormatted = formatDate(nextInstallment?.due_date) || '-';
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
              <Text style={styles.footerValue}>{maturityDateStr}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.footerLabel}>Remaining</Text>
              <Text style={styles.footerValue}>{remainingFormatted}</Text>
            </View>
          </View>
        </View>

        {/* Next Payment Card */}
        <View style={styles.nextPaymentCard}>
          <View style={styles.nextPaymentHeader}>
            <View style={styles.calendarBadge}>
              <Calendar size={22} color={colors.maroonPrimary} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.nextPaymentLabel}>Next Payment</Text>
              <Text style={styles.nextPaymentDate}>{nextDateFormatted}</Text>
              <Text style={styles.nextPaymentAmount}>{nextAmountFormatted}</Text>
            </View>
            <View style={styles.onTimeBadge}>
              <Text style={styles.onTimeText}>ON TIME</Text>
            </View>
          </View>

          {/* Pay at Shop Button */}
          <TouchableOpacity style={styles.payAtShopButton} activeOpacity={0.85}>
            <Store size={20} color="#7A0C2E" style={{ marginRight: 8 }} />
            <Text style={styles.payAtShopText}>Pay at Shop</Text>
          </TouchableOpacity>
        </View>

        {/* Maturity Benefit Card */}
        <View style={styles.maturityBenefitCard}>
          <View style={styles.giftBadge}>
            <Gift size={24} color="#B45309" />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.benefitTitle}>You will receive ₹{(dashboardData?.totalSchemeValue ? dashboardData.totalSchemeValue + 1000 : 13000).toLocaleString('en-IN')}</Text>
            <Text style={styles.benefitSub}>Includes ₹1,000 Shop Bonus at maturity.</Text>
          </View>
        </View>

        {/* Recent Payments Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Recent Payments</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/passbook')} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.viewAllText}>View Full Passbook</Text>
            <Text style={[styles.viewAllText, { marginLeft: 4 }]}>→</Text>
          </TouchableOpacity>
        </View>

        {/* Payments Table Container */}
        <View style={styles.tableCard}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableColHeader, { flex: 1.5 }]}>MONTH</Text>
            <Text style={[styles.tableColHeader, { flex: 1.5, textAlign: 'center' }]}>AMOUNT</Text>
            <Text style={[styles.tableColHeader, { flex: 1, textAlign: 'right' }]}>STATUS</Text>
          </View>

          {recentInstallments.length === 0 ? (
            <View style={styles.emptyTableBody}>
              <Text style={styles.emptyText}>No recent payments recorded.</Text>
            </View>
          ) : (
            recentInstallments.map((inst, index) => (
              <View key={inst.id || index} style={[styles.tableRow, index === recentInstallments.length - 1 && { borderBottomWidth: 0 }]}>
                <Text style={[styles.tableCellMonth, { flex: 1.5 }]}>
                  {formatDate(inst.payment_date || inst.due_date) || `Installment #${inst.installment_number}`}
                </Text>
                <Text style={[styles.tableCellAmount, { flex: 1.5, textAlign: 'center' }]}>
                  ₹{(inst.paid_amount || inst.expected_amount || 1000).toLocaleString('en-IN')}
                </Text>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <CheckCircle2 size={20} color="#16A34A" />
                </View>
              </View>
            ))
          )}
        </View>

        {/* Announcement Pill */}
        <View style={styles.announcementPill}>
          <Volume2 size={18} color="#4B5563" style={{ marginRight: 10 }} />
          <Text style={styles.announcementText}>Shop closed on Sunday. Happy Holidays!</Text>
        </View>
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
  payAtShopButton: {
    backgroundColor: '#F9C041',
    borderRadius: radius.md,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  payAtShopText: {
    color: '#7A0C2E',
    fontSize: 15,
    fontWeight: '800',
  },
  maturityBenefitCard: {
    backgroundColor: '#FFFDF0',
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderWidth: 1.5,
    borderColor: '#FACC15',
    borderStyle: 'dashed',
    flexDirection: 'row',
    alignItems: 'center',
  },
  giftBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  benefitTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textDark,
  },
  benefitSub: {
    fontSize: 12,
    color: '#78350F',
    marginTop: 2,
    fontWeight: '500',
  },
  tableCard: {
    backgroundColor: colors.cardWhite,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...shadows.sm,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tableColHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 0.5,
  },
  emptyTableBody: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tableCellMonth: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textDark,
  },
  tableCellAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.maroonPrimary,
  },
  announcementPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  announcementText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
  },
});
