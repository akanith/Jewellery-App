import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { colors, radius, shadows, spacing } from '../../theme';
import LogoutModal from '../../components/modals/LogoutModal';
import CustomerDataService from '../../services/customer/customer-data.service';
import {
  Pencil,
  CheckCircle,
  PiggyBank,
  MapPin,
  Calendar,
  UserPlus,
  Lock,
  BookOpen,
  Download,
  Phone,
  HelpCircle,
  Info,
  Star,
  LogOut,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react-native';

export default function ProfileScreen() {
  const router = useRouter();
  const { identity, signOut } = useAuthStore();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [profileData, setProfileData] = useState<{
    customerName: string;
    customerNumber: string;
    mobileNumber: string;
    schemeTitle: string;
    schemeAccNumber: string;
    paidCount: number;
    totalInstallments: number;
    monthlyAmount: number;
    nextDueDate: string;
  }>({
    customerName: identity?.fullName || 'Valued Customer',
    customerNumber: identity?.customerNumber || 'RJ-SCH-0050005',
    mobileNumber: identity?.mobileNumber ? `+91 ${identity.mobileNumber}` : '+91 87781 73681',
    schemeTitle: 'Diwali Savings Scheme',
    schemeAccNumber: identity?.customerNumber || 'RJ-SCH-0050005',
    paidCount: 2,
    totalInstallments: 12,
    monthlyAmount: 1000,
    nextDueDate: '28 Oct 2026',
  });

  useEffect(() => {
    loadProfileDetails();
  }, [identity]);

  const loadProfileDetails = async () => {
    if (!identity?.mobileNumber) return;
    try {
      const data = await CustomerDataService.fetchDashboard(identity as any);
      if (data) {
        const custName = data.customer?.full_name || identity.fullName || 'Valued Customer';
        const custNum = data.scheme?.scheme_account_number || identity.customerNumber || 'RJ-SCH-0050005';
        const title = data.schemePlanTitle || 'Diwali Savings Scheme';
        const paid = data.scheme?.paid_installments_count ?? 2;
        const total = data.scheme?.total_installments ?? 12;
        const monthly = data.scheme?.monthly_amount ?? 1000;

        // Find next due date
        const unpaid = data.installments?.find((i: any) => i.status !== 'PAID');
        let dueDate = '28 Oct 2026';
        if (unpaid?.due_date) {
          try {
            dueDate = new Date(unpaid.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
          } catch {
            dueDate = unpaid.due_date;
          }
        }

        setProfileData({
          customerName: custName,
          customerNumber: custNum,
          mobileNumber: `+91 ${data.customer?.mobile_number || identity.mobileNumber}`,
          schemeTitle: title,
          schemeAccNumber: custNum,
          paidCount: paid,
          totalInstallments: total,
          monthlyAmount: monthly,
          nextDueDate: dueDate,
        });
      }
    } catch {
      /* ignore */
    }
  };

  const handleLogoutConfirm = async () => {
    try {
      await signOut();
      setShowLogoutModal(false);
      router.replace('/(auth)/login');
    } catch {
      setShowLogoutModal(false);
    }
  };

  const progressPercent = Math.min(100, Math.round((profileData.paidCount / profileData.totalInstallments) * 100));

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header Bar */}
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>My Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* User Card Banner */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitial}>{profileData.customerName.charAt(0)}</Text>
            </View>
            <View style={styles.verifiedBadge}>
              <CheckCircle size={14} color="#854D0E" />
            </View>
          </View>

          <Text style={styles.userName}>{profileData.customerName}</Text>
          <Text style={styles.userIdText}>ACC: {profileData.schemeAccNumber}</Text>
          <Text style={styles.userMobileText}>{profileData.mobileNumber}</Text>

          <View style={styles.schemePill}>
            <Text style={styles.schemePillText}>🏆 {profileData.schemeTitle.toUpperCase()}</Text>
          </View>
        </View>

        {/* Current Scheme Card */}
        <View style={styles.schemeCard}>
          <View style={styles.schemeHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <PiggyBank size={18} color={colors.maroonPrimary} style={{ marginRight: 6 }} />
              <Text style={styles.cardSectionLabel}>CURRENT SCHEME</Text>
            </View>
            <Text style={styles.paidStatusText}>{profileData.paidCount}/{profileData.totalInstallments} Paid</Text>
          </View>

          <Text style={styles.schemeTitle}>{profileData.schemeTitle}</Text>
          <Text style={styles.schemeSub}>₹{profileData.monthlyAmount.toLocaleString('en-IN')} Monthly | {profileData.totalInstallments} Months</Text>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          </View>

          <Text style={styles.nextDueText}>Next payment due: {profileData.nextDueDate}</Text>
        </View>

        {/* Navigation / Action List */}
        <View style={styles.actionListCard}>
          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => router.push('/(tabs)/passbook')}
          >
            <View style={styles.actionIconBadge}>
              <BookOpen size={16} color={colors.maroonPrimary} />
            </View>
            <Text style={styles.actionTitle}>Digital Passbook</Text>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => router.push('/support/privacy')}
          >
            <View style={styles.actionIconBadge}>
              <ShieldCheck size={16} color={colors.maroonPrimary} />
            </View>
            <Text style={styles.actionTitle}>Privacy Policy</Text>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => router.push('/support/shop')}
          >
            <View style={styles.actionIconBadge}>
              <Phone size={16} color={colors.maroonPrimary} />
            </View>
            <Text style={styles.actionTitle}>Help & Support</Text>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => setShowLogoutModal(true)}
        >
          <LogOut size={18} color={colors.errorRed} style={{ marginRight: 8 }} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Logout Confirmation Modal */}
      <LogoutModal
        visible={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogoutConfirm}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bgLight,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.cardWhite,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textDark,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: colors.cardWhite,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.maroonPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: '#FFF',
    fontSize: 30,
    fontWeight: '800',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.goldLight,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textDark,
  },
  userIdText: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
    fontWeight: '600',
  },
  userMobileText: {
    fontSize: 13,
    color: colors.maroonPrimary,
    marginTop: 2,
    fontWeight: '700',
  },
  schemePill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.full,
    marginTop: spacing.md,
  },
  schemePillText: {
    color: '#92400E',
    fontSize: 11,
    fontWeight: '800',
  },
  schemeCard: {
    backgroundColor: colors.cardWhite,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.goldSecondary,
    ...shadows.sm,
  },
  schemeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  cardSectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  paidStatusText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.goldSecondary,
  },
  schemeTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textDark,
    marginTop: 4,
  },
  schemeSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    marginVertical: spacing.md,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.goldSecondary,
    borderRadius: 3,
  },
  nextDueText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
  },
  editButton: {
    padding: spacing.xs,
  },
  personalDetailsCard: {
    backgroundColor: colors.cardWhite,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  personalDetailsTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  dualDetailRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  detailIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FDF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textDark,
    marginTop: 2,
  },
  quickActionsTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.5,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
  },
  actionListCard: {
    backgroundColor: colors.cardWhite,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  actionIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FDF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  actionTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textDark,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: radius.lg,
    paddingVertical: 14,
    marginBottom: spacing.md,
  },
  logoutText: {
    color: colors.errorRed,
    fontSize: 15,
    fontWeight: '700',
  },
  versionText: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
});
