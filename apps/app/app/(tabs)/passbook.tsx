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
import {
  ArrowLeft,
  HelpCircle,
  Award,
  CheckCircle2,
  Clock,
  Download,
  Trophy,
  AlertCircle,
  RefreshCw,
} from 'lucide-react-native';

interface LiveInstallment {
  id: string;
  installmentNumber: number;
  dueDate: string;
  expectedAmount: number;
  paidAmount: number | null;
  paymentDate: string | null;
  paymentMethod: string | null;
  paymentReference: string | null;
  status: 'PAID' | 'PENDING' | 'WAITING' | 'FUTURE';
}

interface SchemeDetails {
  id: string;
  accountNumber: string;
  status: string;
  monthlyAmount: number;
  totalInstallments: number;
  paidCount: number;
  totalPaid: number;
  progressPercent: number;
}

export default function PassbookScreen() {
  const router = useRouter();
  const { identity } = useAuthStore();

  const [scheme, setScheme] = useState<SchemeDetails | null>(null);
  const [installments, setInstallments] = useState<LiveInstallment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPassbookData();
  }, [identity]);

  const fetchPassbookData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!identity?.mobileNumber) {
        setScheme(null);
        setInstallments([]);
        setIsLoading(false);
        return;
      }

      // Fetch via server-side Edge Function (service role) — RLS-safe
      const { scheme: schemeData, installments: rawList } =
        await CustomerDataService.fetchPassbook(identity as any);

      if (!schemeData) {
        setScheme(null);
        setInstallments([]);
        setIsLoading(false);
        return;
      }

      let paidCount = 0;
      let totalPaid = 0;

      const mappedList: LiveInstallment[] = rawList.map((item: any, idx: number) => {
        const isPaid = item.status === 'PAID';
        if (isPaid) {
          paidCount++;
          totalPaid += Number(item.paid_amount || item.due_amount || 0);
        }

        let displayStatus: 'PAID' | 'PENDING' | 'WAITING' | 'FUTURE' = 'FUTURE';
        if (isPaid) {
          displayStatus = 'PAID';
        } else if (idx === paidCount) {
          displayStatus = 'WAITING';
        }

        return {
          id: item.id,
          installmentNumber: Number(item.installment_number || idx + 1),
          dueDate: item.due_date ? String(item.due_date) : `Month ${idx + 1}`,
          expectedAmount: Number(item.due_amount || schemeData.monthly_amount || 1000),
          paidAmount: item.paid_amount ? Number(item.paid_amount) : null,
          paymentDate: item.payment_date ? String(item.payment_date) : null,
          paymentMethod: item.payment_method ? String(item.payment_method) : null,
          paymentReference: item.payment_reference ? String(item.payment_reference) : null,
          status: displayStatus,
        };
      });

      const totalInst = Number(schemeData.total_installments || mappedList.length || 12);
      const monthlyAmount = Number(schemeData.monthly_amount || 1000);
      const progressPercent = Math.min(100, Math.round((paidCount / totalInst) * 100));

      setScheme({
        id: schemeData.id,
        accountNumber: schemeData.scheme_account_number || identity.customerNumber || '',
        status: schemeData.status || 'ACTIVE',
        monthlyAmount,
        totalInstallments: totalInst,
        paidCount,
        totalPaid,
        progressPercent,
      });

      setInstallments(mappedList);
    } catch (err: any) {
      console.error('[Passbook] fetchPassbookData error:', err?.message);
      setError(err.message || 'Unable to load your passbook. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const displayName = identity?.fullName || 'Valued Customer';
  const displayId = identity?.customerNumber || 'CUST-001';

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={20} color={colors.maroonPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Digital Passbook</Text>
        <TouchableOpacity onPress={fetchPassbookData}>
          <HelpCircle size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Loading State */}
        {isLoading && (
          <View style={styles.stateCard}>
            <ActivityIndicator size="large" color={colors.maroonPrimary} />
            <Text style={styles.stateText}>Loading your passbook...</Text>
          </View>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <View style={styles.stateCard}>
            <AlertCircle size={36} color={colors.errorRed} />
            <Text style={styles.errorText}>Unable to load your passbook.</Text>
            <Text style={styles.errorSubText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchPassbookData}>
              <RefreshCw size={16} color={colors.cardWhite} style={{ marginRight: 6 }} />
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Empty State */}
        {!isLoading && !error && !scheme && (
          <View style={styles.stateCard}>
            <Trophy size={36} color={colors.goldPrimary} />
            <Text style={styles.stateText}>No active scheme or installment records found.</Text>
            <Text style={styles.errorSubText}>Please contact shop to enroll in a savings plan.</Text>
          </View>
        )}

        {/* Success Live Data View */}
        {!isLoading && !error && scheme && (
          <>
            {/* Passbook Card Header */}
            <View style={styles.passbookHeaderCard}>
              <View style={styles.cardTopRow}>
                <View>
                  <Text style={styles.schemeTag}>Gold Savings Scheme</Text>
                  <Text style={styles.customerName}>{displayName}</Text>
                  <Text style={styles.customerIdText}>ID: {displayId}</Text>
                </View>
                <View style={styles.awardBadge}>
                  <Award size={24} color={colors.cardWhite} />
                </View>
              </View>

              <View style={styles.dividerDashed} />

              <View style={styles.cardBottomRow}>
                <View>
                  <Text style={styles.depositLabel}>MONTHLY DEPOSIT</Text>
                  <Text style={styles.depositAmount}>₹{scheme.monthlyAmount.toLocaleString('en-IN')}</Text>
                  <View style={styles.activePill}>
                    <Text style={styles.activePillText}>✓ {scheme.status}</Text>
                  </View>
                </View>

                <View style={styles.circleProgressContainer}>
                  <Text style={styles.circleProgressText}>
                    {scheme.paidCount}/{scheme.totalInstallments}
                  </Text>
                  <Text style={styles.circleProgressSub}>Months</Text>
                </View>
              </View>
            </View>

            {/* Completion Status Bar Card */}
            <View style={styles.completionCard}>
              <View style={styles.completionHeaderRow}>
                <View>
                  <Text style={styles.completionLabel}>COMPLETION STATUS</Text>
                  <Text style={styles.completionValue}>
                    {scheme.paidCount} / {scheme.totalInstallments} Months
                  </Text>
                </View>
                <Text style={styles.completionPercent}>{scheme.progressPercent}% Paid</Text>
              </View>

              <View style={styles.progressBarTrack}>
                <View style={[styles.progressBarFill, { width: `${scheme.progressPercent}%` }]} />
              </View>
            </View>

            {/* Payment Ledger Section */}
            <View style={styles.ledgerHeaderRow}>
              <Text style={styles.ledgerTitle}>PAYMENT LEDGER</Text>
              <Text style={styles.ledgerFyText}>Account: {scheme.accountNumber}</Text>
            </View>

            {/* Live Installments Ledger List */}
            <View style={styles.ledgerListCard}>
              {installments.map((inst, index) => {
                const isLast = index === installments.length - 1;
                const dateDisplay = inst.paymentDate
                  ? new Date(inst.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                  : inst.dueDate;

                return (
                  <View
                    key={inst.id}
                    style={[styles.ledgerRow, isLast && { borderBottomWidth: 0 }]}
                  >
                    {/* Number Badge */}
                    <View
                      style={[
                        styles.numberBadge,
                        inst.status === 'WAITING' && styles.numberBadgeWaiting,
                        inst.status === 'FUTURE' && styles.numberBadgeFuture,
                      ]}
                    >
                      <Text
                        style={[
                          styles.numberText,
                          inst.status === 'FUTURE' && styles.numberTextFuture,
                        ]}
                      >
                        {inst.installmentNumber}
                      </Text>
                    </View>

                    {/* Details Column */}
                    <View style={styles.rowDetailsCol}>
                      <Text style={styles.installmentTitle}>Installment {inst.installmentNumber}</Text>
                      <Text style={styles.installmentSub}>
                        {inst.status === 'PAID' ? `Paid on ${dateDisplay}` : `Due: ${dateDisplay}`}
                      </Text>

                      {inst.paymentReference && (
                        <Text style={styles.refText}>Ref: {inst.paymentReference}</Text>
                      )}
                    </View>

                    {/* Status Badge */}
                    {inst.status === 'PAID' && (
                      <View style={styles.paidBadge}>
                        <CheckCircle2 size={14} color={colors.successGreen} style={{ marginRight: 4 }} />
                        <Text style={styles.paidBadgeText}>₹{inst.paidAmount || inst.expectedAmount}</Text>
                      </View>
                    )}

                    {inst.status === 'WAITING' && (
                      <View style={styles.waitingBadge}>
                        <Trophy size={14} color="#854D0E" style={{ marginRight: 4 }} />
                        <Text style={styles.waitingBadgeText}>Due Next</Text>
                      </View>
                    )}

                    {inst.status === 'FUTURE' && (
                      <View style={styles.futureBadge}>
                        <Clock size={14} color={colors.textMuted} style={{ marginRight: 4 }} />
                        <Text style={styles.futureBadgeText}>Future</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            {/* Refresh Button */}
            <TouchableOpacity style={styles.downloadButton} onPress={fetchPassbookData} activeOpacity={0.85}>
              <RefreshCw size={20} color={colors.cardWhite} style={{ marginRight: 8 }} />
              <Text style={styles.downloadButtonText}>Refresh Passbook</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.creamBackground,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.cardWhite,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.maroonPrimary,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  stateCard: {
    backgroundColor: colors.cardWhite,
    borderRadius: radius.xxl,
    padding: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.xxl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...shadows.soft,
  },
  stateText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textDark,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.errorRed,
    marginTop: spacing.md,
  },
  errorSubText: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.maroonPrimary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    marginTop: spacing.lg,
  },
  retryText: {
    color: colors.cardWhite,
    fontWeight: '700',
    fontSize: 14,
  },
  passbookHeaderCard: {
    backgroundColor: '#6B1D2F',
    borderRadius: radius.xxl,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    ...shadows.card,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  schemeTag: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
  },
  customerName: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.cardWhite,
  },
  customerIdText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  awardBadge: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dividerDashed: {
    height: 1,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderStyle: 'dashed',
    marginVertical: spacing.lg,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  depositLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 1,
  },
  depositAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.cardWhite,
    marginTop: 2,
  },
  activePill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 6,
  },
  activePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.cardWhite,
  },
  circleProgressContainer: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    borderWidth: 4,
    borderColor: colors.goldLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleProgressText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.cardWhite,
  },
  circleProgressSub: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  completionCard: {
    backgroundColor: colors.cardWhite,
    borderRadius: radius.xxl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: spacing.xl,
    ...shadows.soft,
  },
  completionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: spacing.md,
  },
  completionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 1,
  },
  completionValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textDark,
    marginTop: 2,
  },
  completionPercent: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.maroonPrimary,
  },
  progressBarTrack: {
    height: 10,
    backgroundColor: colors.borderInput,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.maroonPrimary,
    borderRadius: radius.full,
  },
  ledgerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  ledgerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.maroonPrimary,
    letterSpacing: 1,
  },
  ledgerFyText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  ledgerListCard: {
    backgroundColor: colors.cardWhite,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: spacing.xl,
    overflow: 'hidden',
    ...shadows.soft,
  },
  ledgerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  numberBadge: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: '#FCE7F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  numberBadgeWaiting: {
    backgroundColor: colors.goldLight,
  },
  numberBadgeFuture: {
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.borderInput,
    borderStyle: 'dashed',
  },
  numberText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.maroonPrimary,
  },
  numberTextFuture: {
    color: colors.textMuted,
  },
  rowDetailsCol: {
    flex: 1,
  },
  installmentTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textDark,
  },
  installmentSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  refText: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successBg,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  paidBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.successGreen,
  },
  waitingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEFCE8',
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  waitingBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#854D0E',
  },
  futureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBackground,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  futureBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  downloadButton: {
    flexDirection: 'row',
    height: 52,
    backgroundColor: colors.maroonPrimary,
    borderRadius: radius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  downloadButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.cardWhite,
  },
});
