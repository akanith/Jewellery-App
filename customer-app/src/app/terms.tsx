import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Linking,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { OFFICIAL_SHOP_INFO, OFFICIAL_SCHEME_NAME } from '@/constants/shopData';
import { useLanguage } from '@/i18n';
import { useResponsiveMetrics } from '@/constants/responsive';

interface TermsSectionItem {
  id: string;
  titleKey: string;
  textKey: string;
  iconName: string;
}

const termsSections: TermsSectionItem[] = [
  {
    id: 'about',
    titleKey: 'termsAboutTitle',
    textKey: 'termsAboutText',
    iconName: 'ribbon-outline',
  },
  {
    id: 'monthly',
    titleKey: 'termsMonthlyTitle',
    textKey: 'termsMonthlyText',
    iconName: 'cash-outline',
  },
  {
    id: 'calendar',
    titleKey: 'termsCalendarMonthTitle',
    textKey: 'termsCalendarMonthText',
    iconName: 'calendar-outline',
  },
  {
    id: 'missed',
    titleKey: 'termsMissedMonthTitle',
    textKey: 'termsMissedMonthText',
    iconName: 'alert-circle-outline',
  },
  {
    id: 'bonus',
    titleKey: 'termsBonusTitle',
    textKey: 'termsBonusText',
    iconName: 'gift-outline',
  },
  {
    id: 'maturity',
    titleKey: 'termsMaturityTitle',
    textKey: 'termsMaturityText',
    iconName: 'wallet-outline',
  },
  {
    id: 'recording',
    titleKey: 'termsPaymentRecordingTitle',
    textKey: 'termsPaymentRecordingText',
    iconName: 'receipt-outline',
  },
  {
    id: 'redemption',
    titleKey: 'termsRedemptionTitle',
    textKey: 'termsRedemptionText',
    iconName: 'cart-outline',
  },
  {
    id: 'gifts',
    titleKey: 'termsGiftsTitle',
    textKey: 'termsGiftsText',
    iconName: 'sparkles-outline',
  },
  {
    id: 'transfer',
    titleKey: 'termsTransferTitle',
    textKey: 'termsTransferText',
    iconName: 'swap-horizontal-outline',
  },
  {
    id: 'cancellation',
    titleKey: 'termsCancellationTitle',
    textKey: 'termsCancellationText',
    iconName: 'close-circle-outline',
  },
  {
    id: 'info',
    titleKey: 'termsSchemeInfoTitle',
    textKey: 'termsSchemeInfoText',
    iconName: 'information-circle-outline',
  },
  {
    id: 'responsibility',
    titleKey: 'termsAccountRespTitle',
    textKey: 'termsAccountRespText',
    iconName: 'key-outline',
  },
  {
    id: 'changes',
    titleKey: 'termsChangesTitle',
    textKey: 'termsChangesText',
    iconName: 'document-text-outline',
  },
];

export default function TermsAndConditionsScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const responsive = useResponsiveMetrics();

  const handleCallShop = () => {
    const cleanNumber = OFFICIAL_SHOP_INFO.phone.replace(/[^0-9+]/g, '');
    Linking.openURL(`tel:${cleanNumber}`).catch(() => {
      const msg = `Please call support at ${OFFICIAL_SHOP_INFO.phone}`;
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Call Showroom', msg);
      }
    });
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
          accessibilityLabel={t('back')}
        >
          <Ionicons name="arrow-back" size={24} color="#70001E" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{t('termsTitle')}</Text>
        <View style={styles.headerRightSpacer} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: responsive.pageHorizontalPadding,
            paddingBottom: responsive.bottomClearance + 24,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* TOP BANNER */}
        <View style={styles.topBanner}>
          <Ionicons name="document-text" size={32} color="#70001E" />
          <Text style={styles.bannerTitle}>{OFFICIAL_SCHEME_NAME}</Text>
          <Text style={styles.bannerSubtitle}>
            Official Scheme Rules & Policy Terms
          </Text>
        </View>

        {/* SECTIONS */}
        {termsSections.map((section) => (
          <View key={section.id} style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.iconCircle}>
                <Ionicons name={section.iconName as never} size={20} color="#70001E" />
              </View>
              <Text style={styles.cardTitle}>{t(section.titleKey as any)}</Text>
            </View>
            <Text style={styles.cardText}>{t(section.textKey as any)}</Text>
          </View>
        ))}

        {/* CONTACT SECTION */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="location-outline" size={20} color="#70001E" />
            </View>
            <Text style={styles.cardTitle}>{t('termsContactTitle')}</Text>
          </View>

          <Text style={styles.shopNameText}>{OFFICIAL_SHOP_INFO.name.toUpperCase()}</Text>
          <Text style={styles.shopAddressText}>
            {OFFICIAL_SHOP_INFO.address}, {OFFICIAL_SHOP_INFO.city}
          </Text>
          <Text style={styles.shopAddressText}>
            {OFFICIAL_SHOP_INFO.state} - {OFFICIAL_SHOP_INFO.pincode}, {OFFICIAL_SHOP_INFO.country}
          </Text>

          <TouchableOpacity
            style={styles.contactRowButton}
            onPress={handleCallShop}
            activeOpacity={0.7}
          >
            <Ionicons name="call-outline" size={18} color="#70001E" />
            <Text style={styles.contactButtonText}>{OFFICIAL_SHOP_INFO.phone}</Text>
          </TouchableOpacity>
        </View>

        {/* FOOTER DATE */}
        <Text style={styles.lastUpdatedText}>{t('termsLastUpdated')}</Text>
      </ScrollView>
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
  headerRightSpacer: {
    width: 28,
  },
  scrollContent: {
    paddingTop: 16,
    gap: 14,
  },
  topBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    gap: 6,
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#70001E',
    textAlign: 'center',
  },
  bannerSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
  },
  card: {
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
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FDF2F8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  cardText: {
    fontSize: 13.5,
    lineHeight: 21,
    color: '#334155',
    fontWeight: '400',
  },
  shopNameText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#70001E',
    marginBottom: 4,
  },
  shopAddressText: {
    fontSize: 13.5,
    color: '#475569',
    lineHeight: 20,
  },
  contactRowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDF2F8',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginTop: 12,
    gap: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#FCE7F3',
  },
  contactButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#70001E',
  },
  lastUpdatedText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
    marginTop: 8,
  },
});
