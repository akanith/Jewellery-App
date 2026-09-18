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
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CustomerProfileViewModel } from '@/types/profile';
import { logoutCustomer } from '@/services/customerAuthService';
import LogoutModal from '@/components/LogoutModal';

// Presentation-safe fixture data matching reference UI design
const initialProfileViewModel: CustomerProfileViewModel = {
  profile: {
    id: 'GS-2024-089',
    name: 'Anith Kumar',
    mobileNumber: '+91 98765 43210',
    avatarUrl: undefined, // Uses require fallback or image asset
    schemeBadge: 'SWARNA LAKSHMI SCHEME',
    joinDate: '15 Jan 2024',
    address: 'No. 45, Gandhi Street, T. Nagar, Chennai - 600017',
    nominee: {
      name: 'S. Meena',
      relationship: 'Wife',
    },
  },
  currentScheme: {
    schemeName: 'Gold Savings',
    monthlyInstallment: 1000,
    totalMonths: 12,
    paidInstallments: 8,
    nextPaymentDue: '15 Oct 2024',
  },
};

export default function ProfileScreen() {
  const router = useRouter();
  const [profileData] = useState<CustomerProfileViewModel>(initialProfileViewModel);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const { profile, currentScheme } = profileData;
  const progressPercent = Math.min(
    100,
    Math.max(0, (currentScheme.paidInstallments / currentScheme.totalMonths) * 100)
  );

  const handleEditProfileNotice = () => {
    const title = 'Edit Profile';
    const msg =
      'Customer profile records are maintained by the showroom administrator. Please visit or contact Ramyas Jeweller to update your details.';
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${msg}`);
    } else {
      Alert.alert(title, msg, [{ text: 'OK' }]);
    }
  };

  const handleDownloadPassbookPDF = () => {
    const title = 'Download Passbook';
    const msg = 'Your Digital Passbook PDF statement has been generated and saved to your device downloads.';
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${msg}`);
    } else {
      Alert.alert(title, msg, [{ text: 'OK' }]);
    }
  };

  const handleHelpSupport = () => {
    router.push('/help' as any);
  };

  const handleAboutShop = () => {
    const title = 'About Ramyas Jeweller';
    const msg =
      'Ramyas Jeweller • Premier Gold & Diamond Showroom.\nSwarna Lakshmi Gold Savings Scheme allows customers to invest in gold with attractive bonuses and zero making charge benefits.';
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${msg}`);
    } else {
      Alert.alert(title, msg, [{ text: 'OK' }]);
    }
  };

  const handleRateApp = () => {
    const title = 'Rate App';
    const msg = 'Thank you for using Ramyas Jeweller Customer App! We appreciate your 5-star feedback.';
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${msg}`);
    } else {
      Alert.alert(title, msg, [{ text: 'OK' }]);
    }
  };

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logoutCustomer();
      setShowLogoutModal(false);
      router.replace('/login');
    } catch {
      setShowLogoutModal(false);
      router.replace('/login');
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* HEADER */}
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>My Profile</Text>
        <TouchableOpacity
          onPress={handleEditProfileNotice}
          style={styles.editButton}
          activeOpacity={0.7}
          accessibilityLabel="Edit Profile"
        >
          <Ionicons name="create-outline" size={22} color="#70001E" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* CUSTOMER PROFILE CARD */}
        <View style={styles.profileCard}>
          <View style={styles.avatarWrapper}>
            <View style={styles.avatarBorder}>
              <Image
                source={require('../../../assets/images/customer_avatar.jpg')}
                style={styles.avatarImage}
                resizeMode="cover"
              />
            </View>
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-sharp" size={12} color="#FFFFFF" />
            </View>
          </View>

          <Text style={styles.customerName}>{profile.name}</Text>
          <Text style={styles.customerId}>ID: {profile.id}</Text>
          <Text style={styles.customerMobile}>{profile.mobileNumber}</Text>

          <View style={styles.schemeBadgeContainer}>
            <Ionicons name="ribbon-outline" size={14} color="#70001E" />
            <Text style={styles.schemeBadgeText}>{profile.schemeBadge}</Text>
          </View>
        </View>

        {/* CURRENT SCHEME CARD */}
        <View style={styles.schemeCard}>
          <View style={styles.schemeHeaderRow}>
            <Text style={styles.schemeHeaderTitle}>CURRENT SCHEME</Text>
            <Ionicons name="wallet-outline" size={20} color="#70001E" />
          </View>

          <View style={styles.schemeDetailsRow}>
            <View style={styles.schemeLeftCol}>
              <Text style={styles.schemeName}>{currentScheme.schemeName}</Text>
              <Text style={styles.schemeInstallmentText}>
                ₹{currentScheme.monthlyInstallment.toLocaleString('en-IN')} Monthly | {currentScheme.totalMonths} Months
              </Text>
            </View>
            <View style={styles.schemeRightCol}>
              <Text style={styles.paidRatioText}>
                {currentScheme.paidInstallments}/{currentScheme.totalMonths}
              </Text>
              <Text style={styles.paidSubtext}>Paid</Text>
            </View>
          </View>

          {/* PROGRESS BAR */}
          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
          </View>

          <Text style={styles.nextDueText}>
            Next payment due: {currentScheme.nextPaymentDue}
          </Text>
        </View>

        {/* PERSONAL DETAILS CARD */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeaderTitle}>PERSONAL DETAILS</Text>

          {/* ADDRESS */}
          <View style={styles.detailRow}>
            <View style={styles.detailIconCircle}>
              <Ionicons name="location-outline" size={18} color="#70001E" />
            </View>
            <View style={styles.detailTextCol}>
              <Text style={styles.detailLabel}>ADDRESS</Text>
              <Text style={styles.detailValue}>{profile.address}</Text>
            </View>
          </View>

          <View style={styles.detailsSplitRow}>
            {/* JOIN DATE */}
            <View style={styles.detailSplitCol}>
              <View style={styles.detailIconCircle}>
                <Ionicons name="calendar-outline" size={18} color="#70001E" />
              </View>
              <View style={styles.detailTextCol}>
                <Text style={styles.detailLabel}>JOIN DATE</Text>
                <Text style={styles.detailValue}>{profile.joinDate}</Text>
              </View>
            </View>

            {/* NOMINEE */}
            <View style={styles.detailSplitCol}>
              <View style={styles.detailIconCircle}>
                <Ionicons name="person-add-outline" size={18} color="#70001E" />
              </View>
              <View style={styles.detailTextCol}>
                <Text style={styles.detailLabel}>NOMINEE</Text>
                <Text style={styles.detailValue}>
                  {profile.nominee.name} ({profile.nominee.relationship})
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* QUICK ACTIONS */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeaderTitle}>QUICK ACTIONS</Text>

          <View style={styles.actionList}>
            {/* VIEW PASSBOOK */}
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => router.push('/(tabs)/passbook')}
              activeOpacity={0.7}
            >
              <View style={styles.actionIconCircle}>
                <Ionicons name="book-outline" size={18} color="#70001E" />
              </View>
              <Text style={styles.actionLabel}>View Passbook</Text>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>

            <View style={styles.actionDivider} />

            {/* DOWNLOAD PASSBOOK PDF */}
            <TouchableOpacity
              style={styles.actionRow}
              onPress={handleDownloadPassbookPDF}
              activeOpacity={0.7}
            >
              <View style={styles.actionIconCircle}>
                <Ionicons name="document-text-outline" size={18} color="#70001E" />
              </View>
              <Text style={styles.actionLabel}>Download Passbook PDF</Text>
              <Ionicons name="download-outline" size={18} color="#64748B" />
            </TouchableOpacity>

            <View style={styles.actionDivider} />

            {/* CONTACT SHOP */}
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => router.push('/shop')}
              activeOpacity={0.7}
            >
              <View style={styles.actionIconCircle}>
                <Ionicons name="storefront-outline" size={18} color="#70001E" />
              </View>
              <Text style={styles.actionLabel}>Contact Shop</Text>
              <Ionicons name="call-outline" size={18} color="#64748B" />
            </TouchableOpacity>

            <View style={styles.actionDivider} />

            {/* HELP & SUPPORT */}
            <TouchableOpacity
              style={styles.actionRow}
              onPress={handleHelpSupport}
              activeOpacity={0.7}
            >
              <View style={styles.actionIconCircle}>
                <Ionicons name="help-circle-outline" size={18} color="#70001E" />
              </View>
              <Text style={styles.actionLabel}>Help & Support</Text>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>

            <View style={styles.actionDivider} />

            {/* ABOUT RAMYAS JEWELLER */}
            <TouchableOpacity
              style={styles.actionRow}
              onPress={handleAboutShop}
              activeOpacity={0.7}
            >
              <View style={styles.actionIconCircle}>
                <Ionicons name="information-circle-outline" size={18} color="#70001E" />
              </View>
              <Text style={styles.actionLabel}>About Ramyas Jeweller</Text>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>

            <View style={styles.actionDivider} />

            {/* RATE APP */}
            <TouchableOpacity
              style={styles.actionRow}
              onPress={handleRateApp}
              activeOpacity={0.7}
            >
              <View style={styles.actionIconCircle}>
                <Ionicons name="star-outline" size={18} color="#70001E" />
              </View>
              <Text style={styles.actionLabel}>Rate App</Text>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>
          </View>
        </View>

        {/* LOGOUT BUTTON */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => setShowLogoutModal(true)}
          disabled={isLoggingOut}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={20} color="#70001E" />
          <Text style={styles.logoutText}>
            {isLoggingOut ? 'Logging out...' : 'Logout'}
          </Text>
        </TouchableOpacity>

        {/* FOOTER */}
        <Text style={styles.footerText}>App Version 2.4.1 • Made in India</Text>
      </ScrollView>

      {/* LOGOUT CONFIRMATION MODAL */}
      <LogoutModal
        visible={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmLogout}
        isLoading={isLoggingOut}
      />
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
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#70001E',
    letterSpacing: -0.3,
  },
  editButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#FDF2F8',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 16,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarBorder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: '#70001E',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#EAB308',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  customerName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  customerId: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 2,
  },
  customerMobile: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 12,
  },
  schemeBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF08A',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: '#FDE047',
  },
  schemeBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#70001E',
    letterSpacing: 0.4,
  },
  schemeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  schemeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  schemeHeaderTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#70001E',
    letterSpacing: 0.8,
  },
  schemeDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  schemeLeftCol: {
    flex: 1,
  },
  schemeName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  schemeInstallmentText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
  },
  schemeRightCol: {
    alignItems: 'flex-end',
  },
  paidRatioText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#70001E',
  },
  paidSubtext: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  progressBarTrack: {
    height: 10,
    backgroundColor: '#E2E8F0',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#70001E',
    borderRadius: 5,
  },
  nextDueText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#64748B',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  sectionHeaderTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#70001E',
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
    gap: 12,
  },
  detailIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FDF2F8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailTextCol: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#1E293B',
    lineHeight: 18,
  },
  detailsSplitRow: {
    flexDirection: 'row',
    gap: 12,
  },
  detailSplitCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  actionList: {
    gap: 0,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  actionIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FDF2F8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  actionDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    gap: 8,
    marginTop: 8,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#70001E',
  },
  footerText: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '500',
    color: '#94A3B8',
    marginTop: 4,
  },
});
