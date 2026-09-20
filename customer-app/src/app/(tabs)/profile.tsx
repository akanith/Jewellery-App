import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '@/i18n';
import { CustomerProfileViewModel } from '@/types/profile';
import { logoutCustomer, getStoredCustomerSession } from '@/services/customerAuthService';
import { getCustomerProfile } from '@/services/customerDataService';
import LogoutModal from '@/components/LogoutModal';
import { OFFICIAL_SCHEME_NAME } from '@/constants/shopData';

const initialProfileViewModel: CustomerProfileViewModel = {
  profile: {
    id: '',
    name: 'Customer',
    mobileNumber: '',
    avatarUrl: undefined,
    schemeBadge: OFFICIAL_SCHEME_NAME,
    joinDate: 'Not provided',
    address: 'Not provided',
    nominee: {
      name: 'Not provided',
      relationship: 'Not provided',
    },
  },
  currentScheme: {
    schemeName: OFFICIAL_SCHEME_NAME,
    monthlyInstallment: 1000,
    totalMonths: 12,
    paidInstallments: 0,
    nextPaymentDue: 'Not provided',
  },
};

import { useResponsiveMetrics } from '@/constants/responsive';

export default function CustomerProfileScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const responsive = useResponsiveMetrics();
  const [profileData, setProfileData] = useState<CustomerProfileViewModel>(initialProfileViewModel);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadProfile = async () => {
      setIsLoading(true);
      const session = await getStoredCustomerSession();
      if (!session) {
        if (isMounted) {
          setIsLoading(false);
          router.replace('/login');
        }
        return;
      }

      const realProfile = await getCustomerProfile();
      if (isMounted) {
        if (realProfile) {
          setProfileData(realProfile);
        }
        setIsLoading(false);
      }
    };

    loadProfile();
    return () => {
      isMounted = false;
    };
  }, [router]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#70001E" />
        </View>
      </SafeAreaView>
    );
  }

  const { profile, currentScheme } = profileData;
  const progressPercent = Math.min(
    100,
    Math.max(0, (currentScheme.paidInstallments / currentScheme.totalMonths) * 100)
  );

  const handleEditProfileNotice = () => {
    const title = t('editProfile');
    const msg = t('editProfileNotice');
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${msg}`);
    } else {
      Alert.alert(title, msg, [{ text: 'OK' }]);
    }
  };

  const handleDownloadPassbookPDF = () => {
    const title = t('downloadPassbookPdf');
    const msg = t('passbookPdfFuture');
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${msg}`);
    } else {
      Alert.alert(title, msg, [{ text: t('ok') }]);
    }
  };

  const handleHelpSupport = () => {
    router.push('/help' as any);
  };

  const handleAboutShop = () => {
    router.push('/shop' as any);
  };

  const handleLanguage = () => {
    router.push('/language' as any);
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
        <Text style={styles.headerTitle}>{t('myProfile')}</Text>
        <TouchableOpacity
          onPress={handleEditProfileNotice}
          style={styles.editButton}
          activeOpacity={0.7}
          accessibilityLabel={t('editProfile')}
        >
          <Ionicons name="create-outline" size={22} color="#70001E" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: responsive.pageHorizontalPadding,
            paddingBottom: responsive.bottomClearance,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* CUSTOMER PROFILE CARD */}
        <View style={styles.profileCard}>
          <View style={styles.avatarWrapper}>
            <Ionicons name="person-circle" size={72} color="#70001E" />
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
            <Text style={styles.schemeHeaderTitle}>{t('currentScheme')}</Text>
            <Ionicons name="wallet-outline" size={20} color="#70001E" />
          </View>

          <View style={styles.schemeDetailsRow}>
            <View style={styles.schemeLeftCol}>
              <Text style={styles.schemeName}>{currentScheme.schemeName}</Text>
              <Text style={styles.schemeInstallmentText}>
                ₹{currentScheme.monthlyInstallment.toLocaleString('en-IN')} | {currentScheme.totalMonths} {t('monthsLabel')}
              </Text>
            </View>
            <View style={styles.schemeRightCol}>
              <Text style={styles.paidRatioText}>
                {currentScheme.paidInstallments}/{currentScheme.totalMonths}
              </Text>
              <Text style={styles.paidSubtext}>{t('paid')}</Text>
            </View>
          </View>

          {/* PROGRESS BAR */}
          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
          </View>

          <Text style={styles.nextDueText}>
            {t('nextPayment')}: {currentScheme.nextPaymentDue}
          </Text>
        </View>

        {/* PERSONAL DETAILS CARD */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeaderTitle}>{t('personalDetails')}</Text>

          {/* ADDRESS */}
          <View style={styles.detailRow}>
            <View style={styles.detailIconCircle}>
              <Ionicons name="location-outline" size={18} color="#70001E" />
            </View>
            <View style={styles.detailTextCol}>
              <Text style={styles.detailLabel}>{t('address')}</Text>
              <Text style={styles.detailValue}>{profile.address || t('notProvided')}</Text>
            </View>
          </View>

          <View style={styles.detailsSplitRow}>
            {/* JOIN DATE */}
            <View style={styles.detailSplitCol}>
              <View style={styles.detailIconCircle}>
                <Ionicons name="calendar-outline" size={18} color="#70001E" />
              </View>
              <View style={styles.detailTextCol}>
                <Text style={styles.detailLabel}>{t('joinDate')}</Text>
                <Text style={styles.detailValue}>{profile.joinDate || t('notProvided')}</Text>
              </View>
            </View>

            {/* NOMINEE */}
            <View style={styles.detailSplitCol}>
              <View style={styles.detailIconCircle}>
                <Ionicons name="person-add-outline" size={18} color="#70001E" />
              </View>
              <View style={styles.detailTextCol}>
                <Text style={styles.detailLabel}>{t('nominee')}</Text>
                <Text style={styles.detailValue}>
                  {profile.nominee?.name && profile.nominee.name !== 'Not provided'
                    ? `${profile.nominee.name}${profile.nominee.relationship && profile.nominee.relationship !== 'Not provided' ? ` (${profile.nominee.relationship})` : ''}`
                    : t('notProvided')}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* QUICK ACTIONS */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeaderTitle}>{t('quickActions')}</Text>

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
              <Text style={styles.actionLabel}>{t('viewPassbookAction')}</Text>
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
              <Text style={styles.actionLabel}>{t('downloadPassbookPdf')}</Text>
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
              <Text style={styles.actionLabel}>{t('contactShop')}</Text>
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
              <Text style={styles.actionLabel}>{t('helpSupport')}</Text>
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
              <Text style={styles.actionLabel}>{t('aboutShop')}</Text>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>

            <View style={styles.actionDivider} />

            {/* LANGUAGE */}
            <TouchableOpacity
              style={styles.actionRow}
              onPress={handleLanguage}
              activeOpacity={0.7}
            >
              <View style={styles.actionIconCircle}>
                <Ionicons name="globe-outline" size={18} color="#70001E" />
              </View>
              <Text style={styles.actionLabel}>{t('language')}</Text>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>

            <View style={styles.actionDivider} />

            {/* CHANGE PASSWORD */}
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => router.push('/change-password' as any)}
              activeOpacity={0.7}
            >
              <View style={styles.actionIconCircle}>
                <Ionicons name="key-outline" size={18} color="#70001E" />
              </View>
              <Text style={styles.actionLabel}>{t('changePassword')}</Text>
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
            {isLoggingOut ? t('loggingOut') : t('logout')}
          </Text>
        </TouchableOpacity>

        {/* FOOTER */}
        <Text style={styles.footerText}>{t('appVersionText')}</Text>
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
