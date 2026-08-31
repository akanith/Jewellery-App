import React, { useState } from 'react';
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
} from 'lucide-react-native';

export default function ProfileScreen() {
  const router = useRouter();
  const { identity, signOut, isLoading } = useAuthStore();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const displayName = identity?.fullName || 'Anith Kumar';
  const displayId = identity?.customerNumber || 'GS-2024-089';
  const displayMobile = identity?.mobileNumber ? `+91 ${identity.mobileNumber}` : '+91 98765 43210';

  const handleLogoutConfirm = async () => {
    try {
      await signOut();
      setShowLogoutModal(false);
      router.replace('/(auth)/login');
    } catch {
      setShowLogoutModal(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header Bar */}
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>My Profile</Text>
        <TouchableOpacity style={styles.editButton}>
          <Pencil size={18} color={colors.maroonPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* User Card Banner */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitial}>{displayName.charAt(0)}</Text>
            </View>
            <View style={styles.verifiedBadge}>
              <CheckCircle size={14} color="#854D0E" />
            </View>
          </View>

          <Text style={styles.userName}>{displayName}</Text>
          <Text style={styles.userIdText}>ID: {displayId}</Text>
          <Text style={styles.userMobileText}>{displayMobile}</Text>

          <View style={styles.schemePill}>
            <Text style={styles.schemePillText}>🏆 SWARNA LAKSHMI SCHEME</Text>
          </View>
        </View>

        {/* Current Scheme Card */}
        <View style={styles.schemeCard}>
          <View style={styles.schemeHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <PiggyBank size={18} color={colors.maroonPrimary} style={{ marginRight: 6 }} />
              <Text style={styles.cardSectionLabel}>CURRENT SCHEME</Text>
            </View>
            <Text style={styles.paidStatusText}>8/12 Paid</Text>
          </View>

          <Text style={styles.schemeTitle}>Gold Savings</Text>
          <Text style={styles.schemeSub}>₹1,000 Monthly | 12 Months</Text>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: '66%' }]} />
          </View>

          <Text style={styles.nextDueText}>Next payment due: 15 Oct 2024</Text>
        </View>

        {/* Personal Details Card */}
        <View style={styles.detailsCard}>
          <Text style={styles.cardSectionLabel}>PERSONAL DETAILS</Text>

          <View style={styles.detailRow}>
            <View style={styles.detailIconBadge}>
              <MapPin size={16} color={colors.maroonPrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.detailLabel}>ADDRESS</Text>
              <Text style={styles.detailValue}>
                No. 45, Gandhi Street, T. Nagar, Chennai - 600017
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', marginTop: spacing.md }}>
            <View style={{ flex: 1, flexDirection: 'row' }}>
              <View style={styles.detailIconBadge}>
                <Calendar size={16} color={colors.maroonPrimary} />
              </View>
              <View>
                <Text style={styles.detailLabel}>JOIN DATE</Text>
                <Text style={styles.detailValue}>15 Jan 2024</Text>
              </View>
            </View>

            <View style={{ flex: 1, flexDirection: 'row' }}>
              <View style={styles.detailIconBadge}>
                <UserPlus size={16} color={colors.maroonPrimary} />
              </View>
              <View>
                <Text style={styles.detailLabel}>NOMINEE</Text>
                <Text style={styles.detailValue}>S. Meena (Wife)</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Quick Actions List */}
        <Text style={[styles.cardSectionLabel, { marginBottom: spacing.sm, marginLeft: spacing.xs }]}>
          QUICK ACTIONS
        </Text>

        <View style={styles.actionsCard}>
          <TouchableOpacity style={styles.actionRow}>
            <View style={styles.actionIconBadge}>
              <Lock size={16} color={colors.maroonPrimary} />
            </View>
            <Text style={styles.actionTitle}>Change Password</Text>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionRow} onPress={() => router.push('/(tabs)/passbook')}>
            <View style={styles.actionIconBadge}>
              <BookOpen size={16} color={colors.maroonPrimary} />
            </View>
            <Text style={styles.actionTitle}>View Passbook</Text>
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
            <Text style={styles.actionTitle}>Contact Shop</Text>
            <Phone size={16} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => router.push('/support/help')}
          >
            <View style={styles.actionIconBadge}>
              <HelpCircle size={16} color={colors.maroonPrimary} />
            </View>
            <Text style={styles.actionTitle}>Help & Support</Text>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionRow}>
            <View style={styles.actionIconBadge}>
              <Info size={16} color={colors.maroonPrimary} />
            </View>
            <Text style={styles.actionTitle}>About Ramyas Jeweller</Text>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionRow, { borderBottomWidth: 0 }]}>
            <View style={styles.actionIconBadge}>
              <Star size={16} color={colors.maroonPrimary} />
            </View>
            <Text style={styles.actionTitle}>Rate App</Text>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Soft Pink Logout Button */}
        <TouchableOpacity
          style={styles.softLogoutButton}
          onPress={() => setShowLogoutModal(true)}
          activeOpacity={0.85}
        >
          <LogOut size={18} color={colors.maroonPrimary} style={{ marginRight: 8 }} />
          <Text style={styles.softLogoutText}>Logout</Text>
        </TouchableOpacity>

        {/* Footer App Version */}
        <Text style={styles.footerVersion}>App Version 2.4.1 • Made in India</Text>
      </ScrollView>

      {/* Logout Confirmation Modal */}
      <LogoutModal
        visible={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogoutConfirm}
        isLoading={isLoading}
      />
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
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.maroonPrimary,
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.creamBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  profileCard: {
    backgroundColor: colors.cardWhite,
    borderRadius: radius.xxl,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...shadows.soft,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: radius.full,
    backgroundColor: colors.maroonPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.maroonPrimary,
  },
  avatarInitial: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.cardWhite,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: radius.full,
    backgroundColor: colors.goldLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: 22,
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
    fontSize: 14,
    fontWeight: '700',
    color: colors.textDark,
    marginTop: 4,
  },
  schemePill: {
    backgroundColor: colors.goldLight,
    borderRadius: radius.full,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginTop: spacing.md,
  },
  schemePillText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.maroonPrimary,
  },
  schemeCard: {
    backgroundColor: colors.cardWhite,
    borderRadius: radius.xxl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: spacing.lg,
    ...shadows.soft,
  },
  schemeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cardSectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.maroonPrimary,
    letterSpacing: 1,
  },
  paidStatusText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.maroonPrimary,
  },
  schemeTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textDark,
  },
  schemeSub: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: spacing.md,
  },
  progressTrack: {
    height: 10,
    backgroundColor: colors.borderInput,
    borderRadius: radius.full,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.maroonPrimary,
    borderRadius: radius.full,
  },
  nextDueText: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginTop: 4,
  },
  detailsCard: {
    backgroundColor: colors.cardWhite,
    borderRadius: radius.xxl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: spacing.lg,
    ...shadows.soft,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  detailIconBadge: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    backgroundColor: colors.creamBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.8,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textDark,
    marginTop: 2,
    lineHeight: 18,
  },
  actionsCard: {
    backgroundColor: colors.cardWhite,
    borderRadius: radius.xxl,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: spacing.xl,
    ...shadows.soft,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  actionIconBadge: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.creamBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  actionTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: colors.textDark,
  },
  softLogoutButton: {
    flexDirection: 'row',
    height: 52,
    backgroundColor: '#FCE7F3',
    borderRadius: radius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  softLogoutText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.maroonPrimary,
  },
  footerVersion: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    fontWeight: '600',
  },
});
