import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SupportedLanguage } from '@/services/languageService';
import { useLanguage } from '@/i18n';
import { OFFICIAL_SHOP_INFO, OFFICIAL_SCHEME_NAME } from '@/constants/shopData';
import { getStoredCustomerSession } from '@/services/customerAuthService';

export default function LanguageScreen() {
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();
  const insets = useSafeAreaInsets();

  const handleSelectLanguage = async (lang: SupportedLanguage) => {
    await setLanguage(lang);
  };

  const handleContinue = async () => {
    await setLanguage(language);
    const session = await getStoredCustomerSession();
    if (session) {
      router.replace('/(tabs)/profile');
    } else {
      router.push('/login');
    }
  };

  const handleBack = async () => {
    const session = await getStoredCustomerSession();
    if (session) {
      router.replace('/(tabs)/profile');
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.push('/login');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* TOP HEADER */}
      <View style={styles.headerContainer}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backButton}
          activeOpacity={0.7}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={22} color="#70001E" />
        </TouchableOpacity>

        <View style={styles.headerBrand}>
          <Ionicons name="diamond-outline" size={20} color="#70001E" style={styles.diamondIcon} />
          <Text style={styles.headerBrandText}>RAMYAS</Text>
        </View>

        <View style={styles.headerRightSpacer} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 24 + Math.max(insets.bottom, 12) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* BRAND INTRO */}
        <View style={styles.brandIntroSection}>
          <Text style={styles.brandTitle}>{OFFICIAL_SHOP_INFO.name.toUpperCase()}</Text>
          <Text style={styles.brandSubtitle}>{OFFICIAL_SCHEME_NAME}</Text>
        </View>

        {/* WELCOME IMAGE CARD */}
        <View style={styles.welcomeCard}>
          <Image
            source={require('@/assets/images/jewellery_showroom_banner.jpg')}
            style={styles.bannerImage}
            resizeMode="cover"
          />
          <View style={styles.welcomeCardBody}>
            <Text style={styles.welcomeTitle}>{t('chooseLanguage')}</Text>
            <Text style={styles.welcomeSubtitle}>
              {t('chooseLanguageSub')}
            </Text>
          </View>
        </View>

        {/* LANGUAGE OPTIONS */}
        <View style={styles.languageOptionsSection}>
          {/* Tamil Option Card */}
          <TouchableOpacity
            style={[
              styles.languageCard,
              language === 'ta' && styles.languageCardSelected,
            ]}
            onPress={() => handleSelectLanguage('ta')}
            activeOpacity={0.85}
          >
            <View style={styles.languageCardLeft}>
              <Text style={styles.flagEmoji}>🇮🇳</Text>
              <View style={styles.languageTextContainer}>
                <Text style={styles.languageTitle}>{t('tamilTitle')}</Text>
                <Text style={styles.languageSubtitle}>{t('tamilSub')}</Text>
              </View>
            </View>

            {language === 'ta' && (
              <Ionicons name="checkmark-circle" size={24} color="#854D0E" />
            )}
          </TouchableOpacity>

          {/* English Option Card */}
          <TouchableOpacity
            style={[
              styles.languageCard,
              language === 'en' && styles.languageCardSelected,
            ]}
            onPress={() => handleSelectLanguage('en')}
            activeOpacity={0.85}
          >
            <View style={styles.languageCardLeft}>
              <Text style={styles.flagEmoji}>🇬🇧</Text>
              <View style={styles.languageTextContainer}>
                <Text style={styles.languageTitle}>{t('englishTitle')}</Text>
                <Text style={styles.languageSubtitle}>{t('englishSub')}</Text>
              </View>
            </View>

            {language === 'en' && (
              <Ionicons name="checkmark-circle" size={24} color="#854D0E" />
            )}
          </TouchableOpacity>
        </View>

        {/* INFORMATION CARD */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={20} color="#64748B" style={styles.infoIcon} />
          <Text style={styles.infoText}>
            {t('changeLanguageNotice')}
          </Text>
        </View>

        {/* CONTINUE BUTTON */}
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
          activeOpacity={0.9}
        >
          <Text style={styles.continueButtonText}>{t('continue')}</Text>
        </TouchableOpacity>

        {/* TRUST TEXT */}
        <View style={styles.trustSection}>
          <Text style={styles.trustTitle}>{t('poweredByShop')}</Text>
        </View>
      </ScrollView>

      {/* BOTTOM LANGUAGE SWITCHER BAR */}
      <View style={styles.bottomSwitcherBar}>
        <TouchableOpacity
          style={[
            styles.bottomTabItem,
            language === 'ta' && styles.bottomTabItemSelected,
          ]}
          onPress={() => handleSelectLanguage('ta')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="globe-outline"
            size={18}
            color={language === 'ta' ? '#1E293B' : '#64748B'}
          />
          <Text
            style={[
              styles.bottomTabText,
              language === 'ta' && styles.bottomTabTextSelected,
            ]}
          >
            Tamil
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.bottomTabItem,
            language === 'en' && styles.bottomTabItemSelected,
          ]}
          onPress={() => handleSelectLanguage('en')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="language-outline"
            size={18}
            color={language === 'en' ? '#1E293B' : '#64748B'}
          />
          <Text
            style={[
              styles.bottomTabText,
              language === 'en' && styles.bottomTabTextSelected,
            ]}
          >
            English
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerContainer: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 8,
    marginLeft: -4,
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  diamondIcon: {
    marginRight: 2,
  },
  headerBrandText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#70001E',
    letterSpacing: 1.5,
  },
  headerRightSpacer: {
    width: 38,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
    alignItems: 'stretch',
  },
  brandIntroSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E293B',
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  brandSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '500',
    textAlign: 'center',
  },
  welcomeCard: {
    backgroundColor: '#FFF8F8',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#FCE7F3',
    marginBottom: 20,
  },
  bannerImage: {
    width: '100%',
    height: 180,
  },
  welcomeCardBody: {
    padding: 18,
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#70001E',
    marginBottom: 6,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 20,
  },
  languageOptionsSection: {
    gap: 12,
    marginBottom: 16,
  },
  languageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    minHeight: 76,
  },
  languageCardSelected: {
    backgroundColor: '#FFFDF0',
    borderColor: '#EAB308',
  },
  languageCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  flagEmoji: {
    fontSize: 28,
  },
  languageTextContainer: {
    flex: 1,
  },
  languageTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  languageSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 14,
    marginBottom: 24,
    gap: 10,
  },
  infoIcon: {
    marginRight: 2,
  },
  infoText: {
    fontSize: 12.5,
    color: '#475569',
    flex: 1,
    lineHeight: 18,
  },
  continueButton: {
    backgroundColor: '#70001E',
    borderRadius: 30,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#70001E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  trustSection: {
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  trustSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 2,
  },
  trustTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#70001E',
  },
  bottomSwitcherBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
    gap: 16,
  },
  bottomTabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 8,
  },
  bottomTabItemSelected: {
    backgroundColor: '#FDE047',
  },
  bottomTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  bottomTabTextSelected: {
    color: '#1E293B',
    fontWeight: '700',
  },
});
