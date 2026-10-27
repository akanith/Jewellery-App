import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getStoredCustomerSession } from '@/services/customerAuthService';
import { getCustomerDashboard } from '@/services/customerDataService';
import { SchemeSummary } from '@/types/dashboard';
import { formatCurrency } from '@/lib/formatters';
import { useResponsiveMetrics } from '@/constants/responsive';
import { useLanguage } from '@/i18n';

export default function RewardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const responsive = useResponsiveMetrics();
  const { t } = useLanguage();

  const [schemes, setSchemes] = useState<SchemeSummary[]>([]);
  const [selectedSchemeId, setSelectedSchemeId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setIsLoading(true);
      const session = await getStoredCustomerSession();
      if (!session) {
        if (isMounted) {
          setIsLoading(false);
          router.replace('/login');
        }
        return;
      }

      try {
        const dash = await getCustomerDashboard();
        if (isMounted && dash?.schemes && dash.schemes.length > 0) {
          setSchemes(dash.schemes);
          setSelectedSchemeId(dash.schemes[0].schemeId || dash.schemes[0].id || '');
        } else if (isMounted && dash?.scheme) {
          setSchemes([dash.scheme]);
          setSelectedSchemeId(dash.scheme.schemeId || dash.scheme.id || '');
        }
      } catch (err) {
        console.warn('Failed to load dashboard schemes in reward screen:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [router]);

  const handleBackPress = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  const handleProfilePress = () => {
    router.push('/(tabs)/profile' as any);
  };

  const selectedScheme = schemes.find((s) => (s.schemeId || s.id) === selectedSchemeId) || schemes[0] || null;
  const monthlyAmount = selectedScheme?.monthlyInstallmentAmount || selectedScheme?.monthlyInstallment || 1000;
  const paidCount = selectedScheme?.paidInstallments ?? 0;
  const totalCount = selectedScheme?.totalInstallments ?? 12;
  const isCompleted = Boolean(
    selectedScheme &&
      (paidCount >= totalCount ||
        selectedScheme.status === 'COMPLETED' ||
        selectedScheme.status === 'MATURED' ||
        selectedScheme.status === 'PARTIALLY_REDEEMED' ||
        selectedScheme.status === 'FULLY_REDEEMED')
  );
  const bonusAmount = selectedScheme
    ? formatCurrency(selectedScheme.bonusAmount || monthlyAmount)
    : '—';
  const maturityValue = selectedScheme
    ? formatCurrency(
        selectedScheme.maturityAmount ||
          monthlyAmount * totalCount + (selectedScheme.bonusAmount || monthlyAmount)
      )
    : '—';

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#70001E" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFDF8" />

      {/* TOP HEADER */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={handleBackPress}
          activeOpacity={0.7}
          accessibilityLabel={t('back')}
        >
          <Ionicons name="arrow-back" size={22} color="#70001E" />
        </TouchableOpacity>

        <Text style={styles.headerTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
          {t('rewardTitle')}
        </Text>

        <TouchableOpacity
          style={styles.headerProfileBtn}
          onPress={handleProfilePress}
          activeOpacity={0.8}
          accessibilityLabel={t('profile')}
        >
          <View style={styles.profileAvatarFallback}>
            <Ionicons name="person" size={18} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: responsive.navHeight + insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* MULTI-SCHEME SELECTOR BAR (shown when customer has multiple schemes) */}
        {schemes.length > 1 ? (
          <View style={styles.schemeSwitcherContainer}>
            <Text style={styles.schemeSwitcherHeaderLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
              {t('selectSchemeForRewards')}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.schemeSwitcherScroll}
            >
              {schemes.map((s, idx) => {
                const sId = s.schemeId || s.id || '';
                const isSelected = (selectedScheme?.schemeId || selectedScheme?.id) === sId;
                const slotNum = s.slotNumber ?? (idx + 1);
                return (
                  <TouchableOpacity
                    key={sId || idx}
                    style={[
                      styles.schemeSwitchPill,
                      isSelected && styles.schemeSwitchPillActive,
                    ]}
                    onPress={() => setSelectedSchemeId(sId)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.schemeSwitchSlotBadge, isSelected && styles.schemeSwitchSlotBadgeActive]}>
                      <Text style={[styles.schemeSwitchSlotText, isSelected && styles.schemeSwitchSlotTextActive]}>
                        {t('slotLabel')} #{slotNum}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.schemeSwitchTitle,
                        isSelected && styles.schemeSwitchTitleActive,
                      ]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.85}
                    >
                      {s.schemeName || t('goldSchemeDefault')}
                    </Text>
                    <Text
                      style={[
                        styles.schemeSwitchMeta,
                        isSelected && styles.schemeSwitchMetaActive,
                      ]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.85}
                    >
                      ₹{s.monthlyInstallmentAmount || 1000}{t('perMonth')} • {s.paidInstallments ?? 0}/{s.totalInstallments ?? 12}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        {/* 1. HERO CERTIFICATE CARD */}
        <View style={styles.certificateCard}>
          {/* Decorative Corner Glow Accent */}
          <View style={styles.certGlowTopRight} />
          <View style={styles.certGlowBottomLeft} />

          {/* Eyebrow */}
          <View style={styles.eyebrowRow}>
            <Ionicons name="star" size={12} color="#8C6B1B" />
            <Text style={styles.certEyebrow} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
              {t('certEyebrow')}
            </Text>
            <Ionicons name="star" size={12} color="#8C6B1B" />
          </View>

          {/* Main Title */}
          <Text style={styles.certTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
            {selectedScheme ? (selectedScheme.schemeName || t('yourCompletionGift')) : t('yourCompletionGift')}
          </Text>

          {selectedScheme ? (
            <Text style={styles.certSlotSubtitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
              {t('slotLabel')} #{selectedScheme.slotNumber ?? 1} • {formatCurrency(monthlyAmount)}{t('perMonth')}
            </Text>
          ) : null}

          {/* Description */}
          <Text style={styles.certDescription}>
            {isCompleted
              ? t('certCompletedMsg')
              : t('certInProgressMsg')}
          </Text>

          {/* Stamped Badge */}
          <View style={[styles.stampedBadge, !isCompleted && styles.stampedBadgePending]}>
            <View style={[styles.stampedIconCircle, !isCompleted && styles.stampedIconCirclePending]}>
              <Ionicons
                name={isCompleted ? 'checkmark-sharp' : 'time-outline'}
                size={14}
                color={isCompleted ? '#70001E' : '#6F6870'}
              />
            </View>
            <Text style={[styles.stampedText, !isCompleted && styles.stampedTextPending]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
              {isCompleted ? `${totalCount}/${totalCount} ${t('stampedAndVerified')}` : `${paidCount}/${totalCount} ${t('inProgress')}`}
            </Text>
          </View>
        </View>

        {/* 2. SPECIAL GIFTS SECTION */}
        <View style={styles.sectionContainer}>
          <View style={styles.giftsHeaderRow}>
            <View style={styles.giftsTitleGroup}>
              <Ionicons name="gift-outline" size={22} color="#70001E" style={{ marginRight: 8 }} />
              <Text style={styles.specialGiftsTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
                {t('specialGiftsForYou')}
              </Text>
            </View>

            <View style={styles.handcraftedPill}>
              <Text style={styles.handcraftedPillText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
                {t('handcrafted')}
              </Text>
            </View>
          </View>

          <Text style={styles.giftsSubtext}>{t('festiveWelcomeCollection')}</Text>

          {/* Gift 1: Sweet */}
          <View style={styles.giftCardItem}>
            <Image
              source={require('@/assets/images/gift_sweet.jpg')}
              style={styles.giftImage}
              resizeMode="cover"
            />
            <View style={styles.giftInfoCol}>
              <View style={styles.giftHeaderSubRow}>
                <Text style={styles.giftItemName} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
                  {t('giftSweetName')}
                </Text>
                <Ionicons name="sparkles-outline" size={14} color="#8C6B1B" />
              </View>
              <Text style={styles.giftItemSubtitle}>{t('giftSweetSubtitle')}</Text>
              <Text style={styles.giftItemTag}>{t('giftSweetTag')}</Text>
            </View>
          </View>

          {/* Gift 2: Karam */}
          <View style={styles.giftCardItem}>
            <Image
              source={require('@/assets/images/gift_karam.jpg')}
              style={styles.giftImage}
              resizeMode="cover"
            />
            <View style={styles.giftInfoCol}>
              <View style={styles.giftHeaderSubRow}>
                <Text style={styles.giftItemName} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
                  {t('giftKaramName')}
                </Text>
                <Ionicons name="restaurant-outline" size={14} color="#8C6B1B" />
              </View>
              <Text style={styles.giftItemSubtitle}>{t('giftKaramSubtitle')}</Text>
              <Text style={styles.giftItemTag}>{t('giftKaramTag')}</Text>
            </View>
          </View>

          {/* Gift 3: Ever Silver Pathram */}
          <View style={styles.giftCardItem}>
            <Image
              source={require('@/assets/images/gift_eversilver.jpg')}
              style={styles.giftImage}
              resizeMode="cover"
            />
            <View style={styles.giftInfoCol}>
              <View style={styles.giftHeaderSubRow}>
                <Text style={styles.giftItemName} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
                  {t('giftEverSilverName')}
                </Text>
                <Ionicons name="diamond-outline" size={14} color="#8C6B1B" />
              </View>
              <Text style={styles.giftItemSubtitle}>{t('giftEverSilverSubtitle')}</Text>
              <Text style={styles.giftItemTag}>{t('giftEverSilverTag')}</Text>
            </View>
          </View>
        </View>

        {/* 3. SCHEME BENEFITS */}
        <View style={styles.benefitsSectionContainer}>
          <View style={styles.benefitsSectionHeader}>
            <Ionicons name="cash-outline" size={20} color="#70001E" style={{ marginRight: 6 }} />
            <Text style={styles.benefitsSectionTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
              {t('schemeBenefitsTitle')}
            </Text>
          </View>

          {/* Two Financial Cards */}
          <View style={styles.financialCardsRow}>
            <View style={styles.financialCard}>
              <Text style={styles.financialLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
                {t('completionBonusLabel')}
              </Text>
              <Text style={styles.financialValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
                {bonusAmount}
              </Text>
              <Text style={styles.financialSubtext} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
                {t('creditedToPlan')}
              </Text>
            </View>

            <View style={styles.financialCard}>
              <Text style={styles.financialLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
                {t('maturityValueLabel')}
              </Text>
              <Text style={styles.financialValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
                {maturityValue}
              </Text>
              <Text style={styles.financialSubtext} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
                {t('jewelleryPurchase')}
              </Text>
            </View>
          </View>

          {/* Separate Physical Gifts Card */}
          <View style={styles.physicalGiftsCard}>
            <View style={styles.physicalGiftsHeaderRow}>
              <Ionicons name="gift-sharp" size={18} color="#70001E" style={{ marginRight: 6 }} />
              <Text style={styles.physicalGiftsTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
                {t('physicalGiftsTitle')}
              </Text>
            </View>
            <Text style={styles.physicalGiftsListText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
              {t('physicalGiftsList')}
            </Text>
            <Text style={styles.physicalGiftsCounterNote}>{t('showroomCounterCollection')}</Text>
          </View>
        </View>

        {/* 4. GIFT ELIGIBILITY INFO CARD */}
        <View style={styles.eligibilityCard}>
          <Ionicons name="information-circle-outline" size={22} color="#666666" style={{ marginRight: 10, marginTop: 2 }} />
          <Text style={styles.eligibilityText}>
            <Text style={styles.eligibilityBold}>{t('giftEligibilityTitle')} </Text>
            {t('giftEligibilityDesc')}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#FFFDF8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFDF8',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFDF8',
    borderBottomWidth: 1,
    borderBottomColor: '#E8DED8',
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F7EFF1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1C1B1F',
    letterSpacing: -0.3,
  },
  headerProfileBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
  },
  profileAvatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#70001E',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#D4AF37',
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: '#FFFDF8',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 16,
  },

  /* CERTIFICATE HERO CARD */
  certificateCard: {
    backgroundColor: '#FFFDF5',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#F3E5C8',
    paddingHorizontal: 20,
    paddingVertical: 26,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#70001E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  certGlowTopRight: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: '#FFE98A',
    opacity: 0.4,
  },
  certGlowBottomLeft: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: '#FAD4D8',
    opacity: 0.4,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  certEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8C6B1B',
    letterSpacing: 1.0,
  },
  certTitle: {
    fontSize: 23,
    fontWeight: '900',
    color: '#70001E',
    textAlign: 'center',
    marginBottom: 12,
  },
  certDescription: {
    fontSize: 13.5,
    color: '#5D5759',
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 290,
    marginBottom: 20,
  },
  stampedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDF3D6',
    borderWidth: 1,
    borderColor: '#E8D7A8',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  stampedIconCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFE596',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stampedText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#70001E',
    letterSpacing: 0.5,
  },

  /* SECTION CONTAINERS */
  sectionContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EAE2D9',
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },

  /* SPECIAL GIFTS */
  giftsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  giftsTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  specialGiftsTitle: {
    fontSize: 16.5,
    fontWeight: '900',
    color: '#70001E',
    flexShrink: 1,
  },
  handcraftedPill: {
    backgroundColor: '#FDF3D6',
    borderWidth: 1,
    borderColor: '#E8D7A8',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  handcraftedPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#70001E',
  },
  giftsSubtext: {
    fontSize: 12,
    color: '#777777',
    marginBottom: 14,
  },
  giftCardItem: {
    flexDirection: 'row',
    backgroundColor: '#F8F6F2',
    borderRadius: 14,
    padding: 10,
    marginBottom: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EFEAE2',
  },
  giftImage: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: '#E6E0D8',
  },
  giftInfoCol: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  giftHeaderSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  giftItemName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1C1B1F',
  },
  giftItemSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4A4238',
    marginBottom: 3,
  },
  giftItemTag: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8C6B1B',
  },

  /* BENEFITS SECTION */
  benefitsSectionContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EAE2D9',
    padding: 16,
    gap: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  benefitsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  benefitsSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1C1B1F',
  },
  financialCardsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  financialCard: {
    flex: 1,
    backgroundColor: '#F9F7F3',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EAE3D9',
  },
  financialLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 4,
  },
  financialValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#70001E',
    marginBottom: 2,
  },
  financialSubtext: {
    fontSize: 11,
    color: '#888888',
  },
  physicalGiftsCard: {
    backgroundColor: '#FFFDF0',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E8DBB8',
  },
  physicalGiftsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  physicalGiftsTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#70001E',
  },
  physicalGiftsListText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4A4238',
    marginBottom: 4,
  },
  physicalGiftsCounterNote: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#8C6B1B',
  },

  /* ELIGIBILITY CARD */
  eligibilityCard: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    alignItems: 'flex-start',
  },
  eligibilityText: {
    flex: 1,
    fontSize: 12,
    color: '#555555',
    lineHeight: 17,
  },
  eligibilityBold: {
    fontWeight: '800',
    color: '#333333',
  },

  /* MULTI-SCHEME SWITCHER */
  schemeSwitcherContainer: {
    marginBottom: 4,
  },
  schemeSwitcherHeaderLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#70001E',
    letterSpacing: 1,
    marginBottom: 8,
  },
  schemeSwitcherScroll: {
    gap: 10,
  },
  schemeSwitchPill: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#EAE2D9',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 140,
  },
  schemeSwitchPillActive: {
    borderColor: '#70001E',
    backgroundColor: '#FFF7D6',
  },
  schemeSwitchSlotBadge: {
    backgroundColor: '#F3F0ED',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4,
  },
  schemeSwitchSlotBadgeActive: {
    backgroundColor: '#70001E',
  },
  schemeSwitchSlotText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#6F6870',
  },
  schemeSwitchSlotTextActive: {
    color: '#FFFFFF',
  },
  schemeSwitchTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#25232A',
  },
  schemeSwitchTitleActive: {
    fontWeight: '800',
    color: '#70001E',
  },
  schemeSwitchMeta: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6F6870',
    marginTop: 2,
  },
  schemeSwitchMetaActive: {
    color: '#70001E',
    fontWeight: '700',
  },

  certSlotSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8C6B1B',
    marginTop: -8,
    marginBottom: 10,
  },
  stampedBadgePending: {
    backgroundColor: '#F3F0ED',
    borderColor: '#E8DED8',
  },
  stampedIconCirclePending: {
    backgroundColor: '#E5DEDC',
  },
  stampedTextPending: {
    color: '#6F6870',
  },
});
