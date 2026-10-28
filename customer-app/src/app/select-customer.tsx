import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Rect } from 'react-native-svg';
import { useLanguage } from '@/i18n';
import { useResponsiveMetrics } from '@/constants/responsive';
import {
  CustomerProfileOption,
  getStoredCustomerSession,
  getAuthorizedProfiles,
  selectCustomerProfile,
  logoutCustomer,
} from '@/services/customerAuthService';

export default function SelectCustomerScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const responsive = useResponsiveMetrics();

  const [profiles, setProfiles] = useState<CustomerProfileOption[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSwitching, setIsSwitching] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadProfiles() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const session = await getStoredCustomerSession();
        if (!session?.token) {
          if (isMounted) {
            router.replace('/login');
          }
          return;
        }

        if (isMounted) {
          setSelectedCustomerId(session.customerId || null);
        }

        const list = await getAuthorizedProfiles();
        const availableProfiles = list && list.length > 0 ? list : (session.authorizedProfiles || []);

        if (isMounted) {
          if (availableProfiles.length === 1) {
            // Exactly one authorized profile: Navigate directly to Home
            const single = availableProfiles[0];
            if (session.customerId !== single.customerId) {
              await selectCustomerProfile(single.customerId);
            }
            if (single.passwordStatus === 'RESET_REQUIRED') {
              router.replace('/reset-password' as any);
            } else {
              router.replace('/(tabs)' as any);
            }
            return;
          }

          if (availableProfiles.length > 1) {
            setProfiles(availableProfiles);
            if (!session.customerId || !availableProfiles.some((p) => p.customerId === session.customerId)) {
              setSelectedCustomerId(availableProfiles[0].customerId);
            } else {
              setSelectedCustomerId(session.customerId);
            }
          } else {
            setErrorMessage('No customer profiles found for this account.');
          }
        }
      } catch (err) {
        console.error('Error loading customer profiles:', err);
        if (isMounted) {
          setErrorMessage('Failed to load customer profiles. Please try again.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadProfiles();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const handleSelectProfile = (profileId: string) => {
    setSelectedCustomerId(profileId);
  };

  const handleContinue = async () => {
    if (!selectedCustomerId || isSwitching) return;

    setIsSwitching(true);
    setErrorMessage(null);

    try {
      const res = await selectCustomerProfile(selectedCustomerId);
      if (res.success && res.session) {
        if (res.session.passwordStatus === 'RESET_REQUIRED') {
          router.replace('/reset-password' as any);
        } else {
          router.replace('/(tabs)' as any);
        }
      } else {
        setErrorMessage(res.message || 'Unable to select profile. Please try again.');
        setIsSwitching(false);
      }
    } catch (err) {
      console.error('Profile selection exception:', err);
      setErrorMessage('Network error while switching profile. Please check connection.');
      setIsSwitching(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      t('signOutSession') || 'Sign Out',
      'Are you sure you want to sign out of Ramyas Jeweller?',
      [
        { text: t('cancel') || 'Cancel', style: 'cancel' },
        {
          text: t('logout') || 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await logoutCustomer();
            router.replace('/login');
          },
        },
      ]
    );
  };

  const getInitials = (name: string, index: number): string => {
    if (!name) return `C${index + 1}`;
    const trimmed = name.trim();
    // Check if name is like "test1", "test2"
    const match = trimmed.match(/^([a-zA-Z]+)(\d+)$/);
    if (match) {
      return (match[1][0] + match[2]).toUpperCase();
    }
    const parts = trimmed.split(/\s+/);
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const formatSchemeCount = (count?: number): string => {
    const c = count !== undefined && count !== null ? count : 1;
    if (c === 1) {
      return t('oneActiveScheme') || '1 Active Scheme';
    }
    return `${c} ${t('activeSchemesCount') || 'Active Schemes'}`;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF7F2" />

      {/* TOP HEADER */}
      <View style={[styles.header, { paddingHorizontal: responsive.pageHorizontalPadding }]}>
        <View style={styles.headerLeft}>
          {router.canGoBack() ? (
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backBtn}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={t('back') || 'Back'}
            >
              <Ionicons name="arrow-back" size={22} color="#70001E" />
            </TouchableOpacity>
          ) : (
            <View style={styles.brandIconEmblem}>
              <Ionicons name="diamond" size={17} color="#E7C86E" />
            </View>
          )}

          <View style={styles.brandTitleCol}>
            <Text style={styles.brandTitleText}>RAMYAS JEWELLER</Text>
            <View style={styles.brandSubRow}>
              <Ionicons name="shield-checkmark" size={10} color="#B45309" />
              <Text style={styles.brandSubtitleText}>SAVINGS APP</Text>
            </View>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={() => router.push('/help' as any)}
            style={styles.headerIconBtn}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t('help') || 'Help'}
          >
            <Ionicons name="help-circle-outline" size={21} color="#70001E" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleLogout}
            style={styles.headerIconBtn}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t('signOutSession') || 'Sign Out'}
          >
            <Ionicons name="log-out-outline" size={21} color="#70001E" />
          </TouchableOpacity>
        </View>
      </View>

      {/* SCROLLABLE MAIN CONTENT */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: responsive.pageHorizontalPadding,
            paddingBottom: 110 + Math.max(insets.bottom, 16),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* HERO BANNER CARD: RAMYAS JEWELLER SAVINGS APP */}
        <View style={styles.heroCard}>
          {/* Subtle Decorative Geometric Mandala / Watermark */}
          <Svg
            style={StyleSheet.absoluteFill}
            viewBox="0 0 340 180"
            preserveAspectRatio="xMidYMid slice"
            pointerEvents="none"
          >
            <Circle cx="170" cy="90" r="80" stroke="rgba(231, 200, 110, 0.12)" strokeWidth="1" fill="none" />
            <Circle cx="170" cy="90" r="55" stroke="rgba(231, 200, 110, 0.14)" strokeWidth="1" fill="none" />
            <Rect
              x="125"
              y="45"
              width="90"
              height="90"
              stroke="rgba(231, 200, 110, 0.10)"
              strokeWidth="1"
              fill="none"
              transform="rotate(45 170 90)"
            />
          </Svg>

          {/* Top Pill: Brand Identifier */}
          <View style={styles.heroPill}>
            <Ionicons name="sparkles" size={12} color="#F7E7A8" />
            <Text style={styles.heroPillText}>RAMYAS JEWELLER SAVINGS APP</Text>
          </View>

          {/* Headline */}
          <Text style={styles.heroTitle}>
            {t('welcomeToSavingsApp') || 'Welcome to RAMYAS JEWELLER Savings App'}
          </Text>

          {/* Subtitle */}
          <Text style={styles.heroSubtitle}>
            {t('chooseAccountToView') || 'Choose the customer account you would like to view.'}
          </Text>

          {/* Refined Ornamental Gold Divider with Diamond Motif */}
          <View style={styles.ornamentRow}>
            <View style={styles.ornamentLine} />
            <View style={styles.diamondEmblemWrapper}>
              <Ionicons name="diamond" size={13} color="#E7C86E" />
            </View>
            <View style={styles.ornamentLine} />
          </View>

          {/* Profile Count Badge */}
          {profiles.length > 0 && (
            <View style={styles.profileCountBadge}>
              <Ionicons name="people-outline" size={13} color="#F7E7A8" />
              <Text style={styles.profileCountText}>
                {profiles.length}{' '}
                {profiles.length === 1
                  ? (t('singleCustomerProfile') || 'customer profile')
                  : (t('customerProfilesCount') || 'customer profiles')}
              </Text>
            </View>
          )}
        </View>

        {/* ERROR MESSAGE BANNER */}
        {errorMessage && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={19} color="#991B1B" />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {/* SECTION HEADER */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderTitle}>
            {t('selectProfile') || 'SELECT CUSTOMER ACCOUNT'}
          </Text>
          <Text style={styles.sectionHeaderSub}>
            {t('sharedNumberNotice') || 'Shared Mobile Access'}
          </Text>
        </View>

        {/* PROFILES LIST / LOADING / EMPTY STATES */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#70001E" />
            <Text style={styles.loadingText}>
              {t('switchingProfile') || 'Loading customer profiles...'}
            </Text>
          </View>
        ) : profiles.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="person-circle-outline" size={54} color="#D1C7BD" />
            <Text style={styles.emptyTitle}>No Customer Profiles Found</Text>
            <Text style={styles.emptyDesc}>
              No verified accounts are registered under this mobile number. Please contact our showroom for assistance.
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleLogout}>
              <Text style={styles.retryButtonText}>{t('backToLogin') || 'Back to Login'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.cardsList}>
            {profiles.map((profile, index) => {
              const isSelected = selectedCustomerId === profile.customerId;
              const initials = getInitials(profile.fullName, index);

              return (
                <TouchableOpacity
                  key={profile.customerId}
                  style={[
                    styles.accountCard,
                    isSelected ? styles.accountCardSelected : styles.accountCardUnselected,
                  ]}
                  onPress={() => handleSelectProfile(profile.customerId)}
                  activeOpacity={0.88}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={`${profile.fullName}, Customer Code ${profile.customerCode}`}
                >
                  <View style={styles.cardMainRow}>
                    {/* Left: Circular Avatar with Initials */}
                    <View
                      style={[
                        styles.avatarCircle,
                        isSelected ? styles.avatarCircleSelected : styles.avatarCircleUnselected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.avatarText,
                          isSelected ? styles.avatarTextSelected : styles.avatarTextUnselected,
                        ]}
                      >
                        {initials}
                      </Text>
                    </View>

                    {/* Middle: Customer Details & Scheme Summary */}
                    <View style={styles.cardInfoCol}>
                      <View style={styles.customerNameRow}>
                        <Text
                          style={[
                            styles.customerNameText,
                            isSelected && styles.customerNameTextSelected,
                          ]}
                          numberOfLines={1}
                        >
                          {profile.fullName}
                        </Text>
                      </View>

                      {/* Customer ID Tag */}
                      <View style={styles.customerIdRow}>
                        <Text style={styles.customerIdLabel}>ID:</Text>
                        <Text
                          style={[
                            styles.customerIdValue,
                            isSelected && styles.customerIdValueSelected,
                          ]}
                        >
                          #{profile.customerCode}
                        </Text>
                      </View>

                      {/* Active Schemes & Verification Row */}
                      <View style={styles.cardMetadataRow}>
                        <View style={styles.schemeTag}>
                          <Ionicons name="sparkles" size={11} color="#B45309" />
                          <Text style={styles.schemeTagText}>
                            {formatSchemeCount(profile.schemeCount)}
                          </Text>
                        </View>

                        <View style={styles.verifiedTag}>
                          <View style={styles.verifiedDot} />
                          <Text style={styles.verifiedText}>
                            {t('verifiedMember') || 'Verified Member'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Right: Selection Checkmark / Radio Indicator */}
                    <View style={styles.selectionIndicatorCol}>
                      {isSelected ? (
                        <View style={styles.selectedIconCircle}>
                          <Ionicons name="checkmark-circle" size={26} color="#70001E" />
                        </View>
                      ) : (
                        <View style={styles.unselectedRadioCircle}>
                          <Ionicons name="chevron-forward" size={18} color="#A8A29E" />
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* PINNED BOTTOM ACTION BAR */}
      <View
        style={[
          styles.bottomActionBar,
          {
            paddingHorizontal: responsive.pageHorizontalPadding,
            paddingBottom: Math.max(insets.bottom, 16),
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.continueBtn,
            (!selectedCustomerId || isSwitching || profiles.length === 0) &&
              styles.continueBtnDisabled,
          ]}
          onPress={handleContinue}
          activeOpacity={0.85}
          disabled={!selectedCustomerId || isSwitching || profiles.length === 0}
          accessibilityRole="button"
          accessibilityLabel={t('continueToAccount') || 'Continue to Account'}
        >
          {isSwitching ? (
            <View style={styles.btnLoadingRow}>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.continueBtnText}>
                {t('switchingProfile') || 'Switching profile...'}
              </Text>
            </View>
          ) : (
            <View style={styles.btnContentRow}>
              <Text style={styles.continueBtnText}>
                {t('continueToAccount') || 'Continue to Account  →'}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Security Assurance Tag */}
        <View style={styles.securityRow}>
          <Ionicons name="shield-checkmark" size={12} color="#16834B" />
          <Text style={styles.securityText}>
            {t('securityIsolationNotice') || 'Secure profile & passbook isolation by Ramyas Jeweller'}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAF7F2',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    backgroundColor: '#FAF7F2',
    borderBottomWidth: 1,
    borderBottomColor: '#EBE3D7',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EBE3D7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandIconEmblem: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#70001E',
    borderWidth: 1.5,
    borderColor: '#D4AF37',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#70001E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 2,
  },
  brandTitleCol: {
    justifyContent: 'center',
  },
  brandTitleText: {
    fontSize: 13.5,
    fontWeight: '900',
    color: '#70001E',
    letterSpacing: 1.2,
  },
  brandSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  brandSubtitleText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#926C15',
    letterSpacing: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EBE3D7',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* MAIN SCROLL VIEW */
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
  },

  /* 2. HERO BANNER CARD */
  heroCard: {
    backgroundColor: '#5A0219',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1.5,
    borderColor: '#C5A059',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#70001E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 20,
  },
  heroPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(231, 200, 110, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(231, 200, 110, 0.35)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 10,
  },
  heroPillText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#F7E7A8',
    letterSpacing: 1.2,
  },
  heroTitle: {
    fontSize: 21,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 13,
    color: '#F9ECEF',
    lineHeight: 18,
    fontWeight: '400',
    marginBottom: 14,
  },
  ornamentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
    gap: 10,
  },
  ornamentLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(231, 200, 110, 0.35)',
  },
  diamondEmblemWrapper: {
    paddingHorizontal: 4,
  },
  profileCountBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(231, 200, 110, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(231, 200, 110, 0.4)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    marginTop: 10,
  },
  profileCountText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  /* ERROR BANNER */
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#F87171',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#991B1B',
    fontWeight: '600',
  },

  /* SECTION HEADER */
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  sectionHeaderTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#78716C',
    letterSpacing: 1.1,
  },
  sectionHeaderSub: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },

  /* CARDS LIST */
  cardsList: {
    gap: 12,
  },
  accountCard: {
    borderRadius: 20,
    padding: 16,
  },
  accountCardUnselected: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#EBE3D7',
    shadowColor: '#70001E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  accountCardSelected: {
    backgroundColor: '#FFFDF7',
    borderWidth: 2,
    borderColor: '#D4AF37',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 4,
  },
  cardMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },

  /* AVATAR */
  avatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircleUnselected: {
    backgroundColor: '#F9EEF1',
    borderWidth: 1.5,
    borderColor: '#E8DED8',
  },
  avatarCircleSelected: {
    backgroundColor: '#70001E',
    borderWidth: 2,
    borderColor: '#D4AF37',
    shadowColor: '#70001E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarText: {
    fontSize: 17,
    fontWeight: '800',
  },
  avatarTextUnselected: {
    color: '#70001E',
  },
  avatarTextSelected: {
    color: '#FFFFFF',
  },

  /* CARD INFO */
  cardInfoCol: {
    flex: 1,
  },
  customerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  customerNameText: {
    fontSize: 16.5,
    fontWeight: '800',
    color: '#1F1A1C',
    letterSpacing: 0.2,
  },
  customerNameTextSelected: {
    color: '#70001E',
  },
  customerIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  customerIdLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#78716C',
    letterSpacing: 0.5,
  },
  customerIdValue: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#6F6870',
    letterSpacing: 0.5,
  },
  customerIdValueSelected: {
    color: '#854D0E',
  },
  cardMetadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  schemeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF7D6',
    borderWidth: 1,
    borderColor: '#F3C044',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  schemeTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#78350F',
  },
  verifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  verifiedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16834B',
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16834B',
  },

  /* RIGHT SELECTION INDICATOR */
  selectionIndicatorCol: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 4,
  },
  selectedIconCircle: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unselectedRadioCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FAF7F2',
    borderWidth: 1,
    borderColor: '#EBE3D7',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* LOADING & EMPTY STATES */
  loadingContainer: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6F6870',
  },
  emptyContainer: {
    padding: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EBE3D7',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#25232A',
  },
  emptyDesc: {
    fontSize: 13,
    color: '#6F6870',
    textAlign: 'center',
    lineHeight: 18,
  },
  retryButton: {
    marginTop: 8,
    backgroundColor: '#70001E',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },

  /* PINNED BOTTOM ACTION BAR */
  bottomActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FAF7F2',
    borderTopWidth: 1,
    borderTopColor: '#EBE3D7',
    paddingTop: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 8,
  },
  continueBtn: {
    height: 52,
    borderRadius: 16,
    backgroundColor: '#70001E',
    borderWidth: 1.5,
    borderColor: '#9E1B42',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#70001E',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  continueBtnDisabled: {
    backgroundColor: '#D5C4C8',
    borderColor: '#D5C4C8',
    shadowOpacity: 0,
    elevation: 0,
  },
  btnContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  continueBtnText: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 8,
  },
  securityText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#6F6870',
    textAlign: 'center',
  },
});
