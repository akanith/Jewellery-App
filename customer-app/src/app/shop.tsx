import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Image,
  Linking,
  Share,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { OFFICIAL_SHOP_INFO, OFFICIAL_SCHEME_NAME } from '@/constants/shopData';
import { useLanguage } from '@/i18n';

export default function ShopScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  // Dynamic calculation for Open / Closed state based on actual local time
  const checkIsOpen = (): { isOpen: boolean; statusText: string } => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const currentMinutes = hours * 60 + minutes;

    const [openH, openM] = OFFICIAL_SHOP_INFO.openingTime.split(':').map(Number);
    const [closeH, closeM] = OFFICIAL_SHOP_INFO.closingTime.split(':').map(Number);

    const openMinutes = openH * 60 + openM;
    const closeMinutes = closeH * 60 + closeM;

    if (currentMinutes >= openMinutes && currentMinutes < closeMinutes) {
      return {
        isOpen: true,
        statusText: t('openNow'),
      };
    } else {
      return {
        isOpen: false,
        statusText: t('closedNow'),
      };
    }
  };

  const shopStatus = checkIsOpen();

  const handleCallShop = () => {
    const cleanNumber = OFFICIAL_SHOP_INFO.phone.replace(/[^0-9+]/g, '');
    Linking.openURL(`tel:${cleanNumber}`).catch(() => {
      const msg = `Please call Ramyas Jeweller directly at ${OFFICIAL_SHOP_INFO.phone}`;
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Phone Call', msg);
      }
    });
  };

  const handleWhatsApp = () => {
    const message = encodeURIComponent(
      `Hello Ramya's Jeweller, I would like to inquire about the ${OFFICIAL_SCHEME_NAME}.`
    );
    const url = `https://wa.me/${OFFICIAL_SHOP_INFO.whatsappPhone}?text=${message}`;
    Linking.openURL(url).catch(() => {
      const msg = `Unable to open WhatsApp. Please message ${OFFICIAL_SHOP_INFO.phone}`;
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('WhatsApp', msg);
      }
    });
  };

  const handleDirections = () => {
    Linking.openURL(OFFICIAL_SHOP_INFO.googleMapsUrl).catch(() => {
      const msg = `Opening Google Maps for ${OFFICIAL_SHOP_INFO.name}, Dindigul`;
      if (Platform.OS === 'web') {
        window.open(OFFICIAL_SHOP_INFO.googleMapsUrl, '_blank');
      } else {
        Alert.alert('Google Maps', msg);
      }
    });
  };

  const handleShareShop = async () => {
    try {
      await Share.share({
        title: OFFICIAL_SHOP_INFO.name,
        message: `${OFFICIAL_SHOP_INFO.name}\n${OFFICIAL_SHOP_INFO.address}, ${OFFICIAL_SHOP_INFO.city}, ${OFFICIAL_SHOP_INFO.state} - ${OFFICIAL_SHOP_INFO.pincode}\nPhone: ${OFFICIAL_SHOP_INFO.phone}\nLocation: ${OFFICIAL_SHOP_INFO.googleMapsUrl}`,
      });
    } catch {
      // Fallback ignore share error
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* HEADER */}
      <View style={styles.headerContainer}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.7}
          accessibilityLabel="Back"
        >
          <Ionicons name="arrow-back" size={24} color="#70001E" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{t('visitOurShop')}</Text>

        <TouchableOpacity
          onPress={handleShareShop}
          style={styles.shareButton}
          activeOpacity={0.7}
          accessibilityLabel="Share Shop Location"
        >
          <Ionicons name="share-social-outline" size={22} color="#70001E" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 24 + Math.max(insets.bottom, 12) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* SHOP IDENTITY CARD */}
        <View style={styles.identityCard}>
          <View style={styles.diamondBadge}>
            <Ionicons name="diamond" size={28} color="#FFFFFF" />
          </View>

          <Text style={styles.shopName}>{OFFICIAL_SHOP_INFO.name}</Text>

          <View style={styles.ratingRow}>
            <Text style={styles.ratingText}>{OFFICIAL_SHOP_INFO.category}</Text>
          </View>

          <Text style={styles.shopTagline}>{OFFICIAL_SHOP_INFO.tagline}</Text>

          {/* DYNAMIC OPEN/CLOSED BADGE */}
          <View style={styles.statusPill}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: shopStatus.isOpen ? '#22C55E' : '#EF4444' },
              ]}
            />
            <Text style={styles.statusText}>{shopStatus.statusText}</Text>
            <Ionicons name="checkmark-circle" size={14} color="#3B82F6" />
          </View>
        </View>

        {/* THREE PRIMARY ACTIONS */}
        <View style={styles.primaryActionsRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleCallShop}
            activeOpacity={0.8}
          >
            <Ionicons name="call-outline" size={22} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>{t('callShop')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleWhatsApp}
            activeOpacity={0.8}
          >
            <Ionicons name="logo-whatsapp" size={22} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>{t('whatsapp')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleDirections}
            activeOpacity={0.8}
          >
            <Ionicons name="navigate-outline" size={22} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>{t('directions')}</Text>
          </TouchableOpacity>
        </View>

        {/* SHOP INFORMATION CARD */}
        <View style={styles.infoCard}>
          <Text style={styles.cardHeaderTitle}>{t('shopInformation')}</Text>

          {/* ADDRESS */}
          <View style={styles.infoRow}>
            <View style={styles.infoIconCircle}>
              <Ionicons name="location-outline" size={20} color="#70001E" />
            </View>
            <View style={styles.infoTextCol}>
              <Text style={styles.infoLabel}>{t('address')}</Text>
              <Text style={styles.infoValue}>
                {OFFICIAL_SHOP_INFO.address},{'\n'}
                {OFFICIAL_SHOP_INFO.city}, {OFFICIAL_SHOP_INFO.state} -{' '}
                {OFFICIAL_SHOP_INFO.pincode},{'\n'}
                {OFFICIAL_SHOP_INFO.country}
              </Text>
            </View>
          </View>

          {/* WORKING HOURS */}
          <View style={styles.infoRow}>
            <View style={styles.infoIconCircle}>
              <Ionicons name="time-outline" size={20} color="#70001E" />
            </View>
            <View style={styles.infoTextCol}>
              <Text style={styles.infoLabel}>{t('workingHours')}</Text>
              <Text style={styles.infoValue}>
                9:30 AM - 10:00 PM ({OFFICIAL_SHOP_INFO.workingDays})
              </Text>
            </View>
          </View>

          {/* CATEGORY */}
          <View style={styles.infoRow}>
            <View style={styles.infoIconCircle}>
              <Ionicons name="pricetag-outline" size={20} color="#70001E" />
            </View>
            <View style={styles.infoTextCol}>
              <Text style={styles.infoLabel}>{t('category')}</Text>
              <Text style={styles.infoValue}>{OFFICIAL_SHOP_INFO.category}</Text>
            </View>
          </View>

          {/* PHONE */}
          <View style={styles.infoRow}>
            <View style={styles.infoIconCircle}>
              <Ionicons name="call-outline" size={20} color="#70001E" />
            </View>
            <View style={styles.infoTextCol}>
              <Text style={styles.infoLabel}>{t('phone')}</Text>
              <Text style={styles.infoValue}>{OFFICIAL_SHOP_INFO.phone}</Text>
            </View>
          </View>
        </View>

        {/* STORE IMAGE / SHOWROOM BANNER */}
        <View style={styles.bannerCard}>
          <Image
            source={require('../../assets/images/jewellery_showroom_banner.jpg')}
            style={styles.bannerImage}
            resizeMode="cover"
          />
          <View style={styles.bannerOverlay}>
            <View style={styles.bannerTextCol}>
              <Text style={styles.bannerSubtitle}>{t('flagshipStore')}</Text>
              <Text style={styles.bannerTitle}>{t('showroomTitle')}</Text>
            </View>

            <TouchableOpacity
              style={styles.viewMapsPill}
              onPress={handleDirections}
              activeOpacity={0.8}
            >
              <Ionicons name="map-outline" size={16} color="#70001E" />
              <Text style={styles.viewMapsText}>{t('viewOnMaps')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* SUPPORT SECTION */}
        <View style={styles.supportCard}>
          <View style={styles.supportHeaderRow}>
            <View style={styles.supportIconCircle}>
              <Ionicons name="headset-outline" size={20} color="#B45309" />
            </View>
            <View style={styles.supportTextCol}>
              <Text style={styles.supportTitle}>{t('needHelpSupport')}</Text>
              <Text style={styles.supportSubtitle}>
                {t('avgResponseTime')}
              </Text>
            </View>
          </View>

          <View style={styles.supportButtonsRow}>
            <TouchableOpacity
              style={styles.supportButton}
              onPress={handleCallShop}
              activeOpacity={0.8}
            >
              <Ionicons name="call-outline" size={16} color="#70001E" />
              <Text style={styles.supportButtonText}>{t('callSupport')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.supportButton}
              onPress={handleWhatsApp}
              activeOpacity={0.8}
            >
              <Ionicons name="logo-whatsapp" size={16} color="#70001E" />
              <Text style={styles.supportButtonText}>{t('whatsapp')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* FOOTER TRUST MESSAGE */}
        <View style={styles.footerContainer}>
          <Text style={styles.footerTrustText}>
            {t('thankYouChoosing')}
          </Text>

          <View style={styles.footerIconsRow}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#94A3B8" />
            <Ionicons name="ribbon-outline" size={20} color="#94A3B8" />
            <Ionicons name="medal-outline" size={20} color="#94A3B8" />
          </View>
        </View>
      </ScrollView>

      {/* BOTTOM TAB BAR */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => router.push('/(tabs)')}
          activeOpacity={0.7}
        >
          <Ionicons name="home-outline" size={18} color="#64748B" />
          <Text style={styles.tabText}>{t('home')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => router.push('/(tabs)/passbook')}
          activeOpacity={0.7}
        >
          <Ionicons name="book-outline" size={18} color="#64748B" />
          <Text style={styles.tabText}>{t('passbook')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => router.push('/(tabs)/notifications')}
          activeOpacity={0.7}
        >
          <Ionicons name="megaphone-outline" size={18} color="#64748B" />
          <Text style={styles.tabText}>{t('updates')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => router.push('/(tabs)/profile')}
          activeOpacity={0.7}
        >
          <Ionicons name="person-outline" size={18} color="#64748B" />
          <Text style={styles.tabText}>{t('profile')}</Text>
        </TouchableOpacity>
      </View>
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
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#70001E',
    letterSpacing: -0.3,
  },
  shareButton: {
    padding: 4,
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
  identityCard: {
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
  diamondBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#70001E',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#70001E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  shopName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#70001E',
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  shopTagline: {
    fontSize: 13,
    fontWeight: '500',
    color: '#334155',
    marginBottom: 14,
    textAlign: 'center',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
  },
  primaryActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#70001E',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    elevation: 3,
    shadowColor: '#70001E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  actionButtonText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  infoCard: {
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
  cardHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#70001E',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
    gap: 12,
  },
  infoIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FDF2F8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoTextCol: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#1E293B',
    lineHeight: 19,
  },
  bannerCard: {
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    elevation: 3,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  bannerTextCol: {
    flex: 1,
  },
  bannerSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FDE047',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  viewMapsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  viewMapsText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#70001E',
  },
  supportCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  supportHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  supportIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  supportTextCol: {
    flex: 1,
  },
  supportTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#92400E',
  },
  supportSubtitle: {
    fontSize: 11.5,
    fontWeight: '500',
    color: '#B45309',
  },
  supportButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  supportButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#70001E',
    gap: 6,
  },
  supportButtonText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#70001E',
  },
  footerContainer: {
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  footerTrustText: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    paddingHorizontal: 20,
    lineHeight: 18,
  },
  footerIconsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  tabBar: {
    flexDirection: 'row',
    height: 64,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 6,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 4,
  },
  tabText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
  },
});
