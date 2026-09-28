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
import { useLanguage } from '@/i18n';
import { getStoredCustomerSession } from '@/services/customerAuthService';
import { getCustomerPassbook } from '@/services/customerDataService';
import { useResponsiveMetrics } from '@/constants/responsive';

export default function RewardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const responsive = useResponsiveMetrics();

  const [isLoading, setIsLoading] = useState(true);
  const [customerName, setCustomerName] = useState('Anith Kumar');

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

      if (isMounted) {
        if (session.fullName) {
          setCustomerName(session.fullName);
        }
      }

      try {
        const passbookData = await getCustomerPassbook();
        if (isMounted && passbookData?.customerName) {
          setCustomerName(passbookData.customerName);
        }
      } catch (err) {
        console.warn('Failed to load passbook in reward screen:', err);
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
          accessibilityLabel="Back"
        >
          <Ionicons name="arrow-back" size={22} color="#70001E" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Reward</Text>

        <TouchableOpacity
          style={styles.headerProfileBtn}
          onPress={handleProfilePress}
          activeOpacity={0.8}
          accessibilityLabel="Profile"
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
        {/* 1. HERO CERTIFICATE CARD */}
        <View style={styles.certificateCard}>
          {/* Decorative Corner Glow Accent */}
          <View style={styles.certGlowTopRight} />
          <View style={styles.certGlowBottomLeft} />

          {/* Eyebrow */}
          <View style={styles.eyebrowRow}>
            <Ionicons name="star" size={12} color="#8C6B1B" />
            <Text style={styles.certEyebrow}>RAMYAS JEWELLER REWARD</Text>
            <Ionicons name="star" size={12} color="#8C6B1B" />
          </View>

          {/* Main Title */}
          <Text style={styles.certTitle} numberOfLines={1}>Your Completion Gift</Text>

          {/* Description */}
          <Text style={styles.certDescription}>
            Thank you for completing all 12 months of your savings journey with Ramyas Jeweller.
          </Text>

          {/* Stamped Badge */}
          <View style={styles.stampedBadge}>
            <View style={styles.stampedIconCircle}>
              <Ionicons name="checkmark-sharp" size={14} color="#70001E" />
            </View>
            <Text style={styles.stampedText}>12/12 STAMPED & VERIFIED</Text>
          </View>
        </View>

        {/* 2. SPECIAL GIFTS SECTION */}
        <View style={styles.sectionContainer}>
          <View style={styles.giftsHeaderRow}>
            <View style={styles.giftsTitleGroup}>
              <Ionicons name="gift-outline" size={22} color="#70001E" style={{ marginRight: 8 }} />
              <Text style={styles.specialGiftsTitle} numberOfLines={1}>
                Special Gifts for You
              </Text>
            </View>

            <View style={styles.handcraftedPill}>
              <Text style={styles.handcraftedPillText}>Handcrafted</Text>
            </View>
          </View>

          <Text style={styles.giftsSubtext}>Complimentary festive welcome collection</Text>

          {/* Gift 1: Sweet */}
          <View style={styles.giftCardItem}>
            <Image
              source={require('@/assets/images/gift_sweet.jpg')}
              style={styles.giftImage}
              resizeMode="cover"
            />
            <View style={styles.giftInfoCol}>
              <View style={styles.giftHeaderSubRow}>
                <Text style={styles.giftItemName}>Sweet</Text>
                <Ionicons name="sparkles-outline" size={14} color="#8C6B1B" />
              </View>
              <Text style={styles.giftItemSubtitle}>Traditional Festive Sweet Hamper</Text>
              <Text style={styles.giftItemTag}>Finest Assorted Delicacies</Text>
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
                <Text style={styles.giftItemName}>Karam</Text>
                <Ionicons name="restaurant-outline" size={14} color="#8C6B1B" />
              </View>
              <Text style={styles.giftItemSubtitle}>Authentic Savoury Mixture</Text>
              <Text style={styles.giftItemTag}>South Indian Traditional Recipe</Text>
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
                <Text style={styles.giftItemName}>Ever Silver Pathram</Text>
                <Ionicons name="diamond-outline" size={14} color="#8C6B1B" />
              </View>
              <Text style={styles.giftItemSubtitle}>Auspicious Stainless Steel Utensil</Text>
              <Text style={styles.giftItemTag}>Pristine Household Keepsake</Text>
            </View>
          </View>
        </View>

        {/* 3. SCHEME BENEFITS */}
        <View style={styles.benefitsSectionContainer}>
          <View style={styles.benefitsSectionHeader}>
            <Ionicons name="cash-outline" size={20} color="#70001E" style={{ marginRight: 6 }} />
            <Text style={styles.benefitsSectionTitle}>Your Scheme Benefits</Text>
          </View>

          {/* Two Financial Cards */}
          <View style={styles.financialCardsRow}>
            <View style={styles.financialCard}>
              <Text style={styles.financialLabel}>Completion Bonus</Text>
              <Text style={styles.financialValue}>₹1,000</Text>
              <Text style={styles.financialSubtext}>Credited to plan</Text>
            </View>

            <View style={styles.financialCard}>
              <Text style={styles.financialLabel}>Maturity Value</Text>
              <Text style={styles.financialValue}>₹13,000</Text>
              <Text style={styles.financialSubtext}>Jewellery purchase</Text>
            </View>
          </View>

          {/* Separate Physical Gifts Card */}
          <View style={styles.physicalGiftsCard}>
            <View style={styles.physicalGiftsHeaderRow}>
              <Ionicons name="gift-sharp" size={18} color="#70001E" style={{ marginRight: 6 }} />
              <Text style={styles.physicalGiftsTitle}>Complimentary Physical Gifts</Text>
            </View>
            <Text style={styles.physicalGiftsListText}>Sweet • Karam • Ever Silver Pathram</Text>
            <Text style={styles.physicalGiftsCounterNote}>To be received in person at showroom counter</Text>
          </View>
        </View>

        {/* 4. GIFT ELIGIBILITY INFO CARD */}
        <View style={styles.eligibilityCard}>
          <Ionicons name="information-circle-outline" size={22} color="#666666" style={{ marginRight: 10, marginTop: 2 }} />
          <Text style={styles.eligibilityText}>
            <Text style={styles.eligibilityBold}>Gift Eligibility: </Text>
            These special gifts are provided after successful completion of all 12 monthly installments.
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
});
