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
import ChangePasswordModal from '../../components/modals/ChangePasswordModal';
import RateAppModal from '../../components/modals/RateAppModal';
import CustomerDataService from '../../services/customer/customer-data.service';
import {
  Pencil,
  PiggyBank,
  MapPin,
  Calendar,
  UserPlus,
  Lock,
  BookOpen,
  Image as ImageIcon,
  Download,
  Store,
  Phone,
  HelpCircle,
  Info,
  Star,
  LogOut,
  ChevronRight,
  Check,
} from 'lucide-react-native';

export default function ProfileScreen() {
  const router = useRouter();
  const { identity, signOut } = useAuthStore();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showRateAppModal, setShowRateAppModal] = useState(false);

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
    address: string;
    joinDate: string;
    nominee: string;
  }>({
    customerName: identity?.fullName || 'Customer',
    customerNumber: identity?.customerNumber || '',
    mobileNumber: identity?.mobileNumber ? `+91 ${identity.mobileNumber}` : '',
    schemeTitle: 'Diwali Savings Scheme',
    schemeAccNumber: identity?.customerNumber || '',
    paidCount: 0,
    totalInstallments: 12,
    monthlyAmount: 1000,
    nextDueDate: '',
    address: '',
    joinDate: '',
    nominee: '',
  });

  useEffect(() => {
    loadProfileDetails();
  }, [identity]);

  const loadProfileDetails = async () => {
    if (!identity?.mobileNumber) return;
    try {
      const data = await CustomerDataService.fetchDashboard(identity as any);
      if (data) {
        const custName = data.customer?.full_name || identity.fullName || 'Customer';
        const custNum = data.customer?.customer_number || identity.customerNumber || '';
        const rawMobile = data.customer?.mobile_number || identity.mobileNumber || '';
        const title = data.schemePlanTitle || 'Diwali Savings Scheme';
        const paid = data.scheme?.paid_installments_count ?? 0;
        const total = data.scheme?.total_installments ?? 12;
        const monthly = data.scheme?.monthly_amount ?? 1000;

        // REAL DATABASE VALUES ONLY - NO HARDCODED DEMO DATA
        const custAddr = data.customer?.address || '';
        const custNominee = data.customer?.nominee_name
          ? `${data.customer.nominee_name}${data.customer.nominee_relationship ? ` (${data.customer.nominee_relationship})` : ''}`
          : '';

        const custJoinDate = data.customer?.created_at
          ? new Date(data.customer.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
          : '';

        // Find next due date
        const unpaid = data.installments?.find((i: any) => i.status !== 'PAID');
        let dueDate = '';
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
          mobileNumber: rawMobile.startsWith('+91') ? rawMobile : (rawMobile ? `+91 ${rawMobile}` : ''),
          schemeTitle: title,
          schemeAccNumber: custNum,
          paidCount: paid,
          totalInstallments: total,
          monthlyAmount: monthly,
          nextDueDate: dueDate,
          address: custAddr,
          joinDate: custJoinDate,
          nominee: custNominee,
        });
      }
    } catch {
      /* fallback to identity values if network fails */
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

  const progressPercent = profileData.totalInstallments > 0
    ? Math.min(100, Math.round((profileData.paidCount / profileData.totalInstallments) * 100))
    : 0;

  const hasPersonalDetails = Boolean(profileData.address || profileData.joinDate || profileData.nominee);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header Bar */}
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>My Profile</Text>
        <TouchableOpacity style={styles.editButton}>
          <Pencil size={20} color="#7A0C2E" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Card 1: Avatar & Identity Card */}
        <View style={styles.identityCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarRing}>
              <View style={styles.avatarInner}>
                <Text style={styles.avatarInitial}>{profileData.customerName.charAt(0).toUpperCase()}</Text>
              </View>
            </View>
            {/* Gold Verified Checkmark Badge */}
            <View style={styles.verifiedGoldBadge}>
              <Check size={12} color="#4A101E" strokeWidth={3.5} />
            </View>
          </View>

          <Text style={styles.userName}>{profileData.customerName}</Text>
          {Boolean(profileData.customerNumber) && (
            <Text style={styles.userIdText}>ID: {profileData.customerNumber}</Text>
          )}
          {Boolean(profileData.mobileNumber) && (
            <Text style={styles.userMobileText}>{profileData.mobileNumber}</Text>
          )}

          {/* Gold Scheme Pill Badge */}
          <View style={styles.goldSchemePill}>
            <Text style={styles.goldSchemePillText}>🏆 {profileData.schemeTitle.toUpperCase()}</Text>
          </View>
        </View>

        {/* Card 2: Current Scheme Card */}
        <View style={styles.schemeCard}>
          <View style={styles.schemeHeaderRow}>
            <Text style={styles.cardSectionLabel}>CURRENT SCHEME</Text>
            <PiggyBank size={20} color="#7A0C2E" />
          </View>

          <View style={styles.schemeContentRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.schemeTitle}>{profileData.schemeTitle}</Text>
              <Text style={styles.schemeSub}>
                ₹{profileData.monthlyAmount.toLocaleString('en-IN')} Monthly | {profileData.totalInstallments} Months
              </Text>
            </View>

            <View style={styles.paidFractionContainer}>
              <Text style={styles.paidFractionNumber}>{profileData.paidCount}/{profileData.totalInstallments}</Text>
              <Text style={styles.paidFractionSub}>Paid</Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          </View>

          {Boolean(profileData.nextDueDate) && (
            <Text style={styles.nextDueText}>Next payment due: {profileData.nextDueDate}</Text>
          )}
        </View>

        {/* Card 3: Personal Details Card (ONLY SHOW IF DATABASE HAS DETAILS) */}
        {hasPersonalDetails && (
          <View style={styles.detailsCard}>
            <Text style={styles.cardSectionLabel}>PERSONAL DETAILS</Text>

            {/* Address Row (Only if present in DB) */}
            {Boolean(profileData.address) && (
              <View style={styles.detailRow}>
                <View style={styles.iconCircleBadge}>
                  <MapPin size={18} color="#7A0C2E" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailLabel}>ADDRESS</Text>
                  <Text style={styles.detailValue}>{profileData.address}</Text>
                </View>
              </View>
            )}

            {/* Join Date & Nominee Dual Row (Only if present in DB) */}
            {(Boolean(profileData.joinDate) || Boolean(profileData.nominee)) && (
              <View style={styles.dualDetailRow}>
                {Boolean(profileData.joinDate) && (
                  <View style={[styles.detailRow, { flex: 1, marginBottom: 0 }]}>
                    <View style={styles.iconCircleBadge}>
                      <Calendar size={18} color="#7A0C2E" />
                    </View>
                    <View>
                      <Text style={styles.detailLabel}>JOIN DATE</Text>
                      <Text style={styles.detailValue}>{profileData.joinDate}</Text>
                    </View>
                  </View>
                )}

                {Boolean(profileData.nominee) && (
                  <View style={[styles.detailRow, { flex: 1, marginBottom: 0 }]}>
                    <View style={styles.iconCircleBadge}>
                      <UserPlus size={18} color="#7A0C2E" />
                    </View>
                    <View>
                      <Text style={styles.detailLabel}>NOMINEE</Text>
                      <Text style={styles.detailValue}>{profileData.nominee}</Text>
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* Section: QUICK ACTIONS */}
        <Text style={styles.quickActionsLabel}>QUICK ACTIONS</Text>

        <View style={styles.quickActionsList}>
          {/* Action 1: Change Password */}
          <TouchableOpacity
            style={styles.actionCardRow}
            onPress={() => setShowChangePasswordModal(true)}
            activeOpacity={0.7}
          >
            <View style={styles.iconCircleBadge}>
              <Lock size={18} color="#7A0C2E" />
            </View>
            <Text style={styles.actionCardTitle}>Change Password</Text>
            <ChevronRight size={18} color="#94A3B8" />
          </TouchableOpacity>

          {/* Action 2: View Passbook */}
          <TouchableOpacity
            style={styles.actionCardRow}
            onPress={() => router.push('/(tabs)/passbook')}
            activeOpacity={0.7}
          >
            <View style={styles.iconCircleBadge}>
              <BookOpen size={18} color="#7A0C2E" />
            </View>
            <Text style={styles.actionCardTitle}>View Passbook</Text>
            <ChevronRight size={18} color="#94A3B8" />
          </TouchableOpacity>

          {/* Action 3: Download Passbook PDF */}
          <TouchableOpacity
            style={styles.actionCardRow}
            onPress={() => router.push('/(tabs)/passbook')}
            activeOpacity={0.7}
          >
            <View style={styles.iconCircleBadge}>
              <ImageIcon size={18} color="#7A0C2E" />
            </View>
            <Text style={styles.actionCardTitle}>Download Passbook PDF</Text>
            <Download size={18} color="#475569" />
          </TouchableOpacity>

          {/* Action 4: Shop details */}
          <TouchableOpacity
            style={styles.actionCardRow}
            onPress={() => router.push('/support/shop')}
            activeOpacity={0.7}
          >
            <View style={styles.iconCircleBadge}>
              <Store size={18} color="#7A0C2E" />
            </View>
            <Text style={styles.actionCardTitle}>Shop details</Text>
            <Phone size={18} color="#475569" />
          </TouchableOpacity>

          {/* Action 5: Help & Support */}
          <TouchableOpacity
            style={styles.actionCardRow}
            onPress={() => router.push('/support/help')}
            activeOpacity={0.7}
          >
            <View style={styles.iconCircleBadge}>
              <HelpCircle size={18} color="#7A0C2E" />
            </View>
            <Text style={styles.actionCardTitle}>Help & Support</Text>
            <ChevronRight size={18} color="#94A3B8" />
          </TouchableOpacity>

          {/* Action 6: About Ramya's Jeweller */}
          <TouchableOpacity
            style={styles.actionCardRow}
            onPress={() => router.push('/support/privacy')}
            activeOpacity={0.7}
          >
            <View style={styles.iconCircleBadge}>
              <Info size={18} color="#7A0C2E" />
            </View>
            <Text style={styles.actionCardTitle}>About Ramya's Jeweller</Text>
            <ChevronRight size={18} color="#94A3B8" />
          </TouchableOpacity>

          {/* Action 7: Rate App */}
          <TouchableOpacity
            style={styles.actionCardRow}
            onPress={() => setShowRateAppModal(true)}
            activeOpacity={0.7}
          >
            <View style={styles.iconCircleBadge}>
              <Star size={18} color="#7A0C2E" />
            </View>
            <Text style={styles.actionCardTitle}>Rate App</Text>
            <ChevronRight size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Card 4: Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => setShowLogoutModal(true)}
          activeOpacity={0.85}
        >
          <LogOut size={18} color="#7A0C2E" style={{ marginRight: 8 }} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        {/* App Version Footer */}
        <Text style={styles.appVersionText}>App Version 2.4.1 • Made in India</Text>
      </ScrollView>

      {/* Logout Modal */}
      <LogoutModal
        visible={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogoutConfirm}
      />

      {/* Change Password Modal */}
      <ChangePasswordModal
        visible={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
      />

      {/* Rate App Modal */}
      <RateAppModal
        visible={showRateAppModal}
        onClose={() => setShowRateAppModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAF7F2',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: 16,
    backgroundColor: '#FAF7F2',
    borderBottomWidth: 1,
    borderBottomColor: '#F1E6EA',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#7A0C2E',
  },
  editButton: {
    padding: spacing.xs,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 40,
  },

  /* Identity Card */
  identityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F3E8EC',
    ...shadows.soft,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 14,
  },
  avatarRing: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 3,
    borderColor: '#7A0C2E',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 3,
  },
  avatarInner: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
    backgroundColor: '#7A0C2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '800',
  },
  verifiedGoldBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F9C041',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B',
  },
  userIdText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 3,
    fontWeight: '600',
  },
  userMobileText: {
    fontSize: 14,
    color: '#1E293B',
    marginTop: 2,
    fontWeight: '600',
  },
  goldSchemePill: {
    backgroundColor: '#FACC15',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9999,
    marginTop: 14,
  },
  goldSchemePillText: {
    color: '#713F12',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  /* Current Scheme Card */
  schemeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F3E8EC',
    ...shadows.soft,
  },
  schemeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardSectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#7A0C2E',
    letterSpacing: 0.8,
  },
  schemeContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  schemeTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
  },
  schemeSub: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 3,
  },
  paidFractionContainer: {
    alignItems: 'flex-end',
  },
  paidFractionNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#7A0C2E',
  },
  paidFractionSub: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  progressTrack: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    marginVertical: 14,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#7A0C2E',
    borderRadius: 4,
  },
  nextDueText: {
    fontSize: 12,
    color: '#64748B',
    fontStyle: 'italic',
  },

  /* Personal Details Card */
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F3E8EC',
    ...shadows.soft,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
  },
  dualDetailRow: {
    flexDirection: 'row',
    marginTop: 14,
  },
  iconCircleBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 2,
  },

  /* Quick Actions Section */
  quickActionsLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#7A0C2E',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 4,
  },
  quickActionsList: {
    gap: 10,
    marginBottom: 20,
  },
  actionCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#F3E8EC',
    ...shadows.soft,
  },
  actionCardTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },

  /* Logout Button */
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: 16,
    paddingVertical: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  logoutText: {
    color: '#7A0C2E',
    fontSize: 16,
    fontWeight: '800',
  },
  appVersionText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
});
