import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { colors, radius, shadows, spacing } from '../../theme';
import { SupportedLanguage } from '../../types';
import { ArrowLeft, Check, Info, ArrowRight, Globe } from 'lucide-react-native';

export default function LanguageScreen() {
  const router = useRouter();
  const { language, setLanguage } = useAuthStore();
  const [selectedLang, setSelectedLang] = useState<SupportedLanguage>(language);

  const handleContinue = () => {
    setLanguage(selectedLang);
    router.push('/(auth)/login');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header Bar */}
        <View style={styles.headerBar}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={20} color={colors.maroonPrimary} />
          </TouchableOpacity>
          <View style={styles.brandTitleRow}>
            <View style={styles.logoDiamond}>
              <Text style={styles.logoSymbol}>◆</Text>
            </View>
            <Text style={styles.headerBrandText}>RAMYAS</Text>
          </View>
          <View style={{ width: 24 }} />
        </View>

        {/* Subtitle Header */}
        <View style={styles.titleSection}>
          <Text style={styles.mainTitle}>RAMYAS JEWELLER</Text>
          <Text style={styles.subTitle}>Jewellery Savings Scheme</Text>
        </View>

        {/* Welcome Card Banner */}
        <View style={styles.bannerCard}>
          <View style={styles.illustrationPlaceholder}>
            <Text style={styles.illustrationText}>✨</Text>
            <Text style={styles.illustrationTitle}>Jewellery Savings</Text>
          </View>
          <View style={styles.bannerContent}>
            <Text style={styles.welcomeHeading}>Welcome</Text>
            <Text style={styles.welcomeSubtitle}>Choose your preferred language to continue.</Text>
          </View>
        </View>

        {/* Language Options */}
        <View style={styles.optionsContainer}>
          {/* Tamil Option */}
          <TouchableOpacity
            style={[
              styles.langCard,
              selectedLang === 'ta' && styles.langCardSelected,
            ]}
            onPress={() => setSelectedLang('ta')}
            activeOpacity={0.8}
          >
            <View style={styles.flagBadge}>
              <Text style={styles.flagEmoji}>🇮🇳</Text>
            </View>
            <View style={styles.langTextCol}>
              <Text style={styles.langTitle}>தமிழ்</Text>
              <Text style={styles.langSub}>தமிழில் தொடரவும்</Text>
            </View>
            {selectedLang === 'ta' && (
              <View style={styles.checkCircle}>
                <Check size={14} color={colors.cardWhite} />
              </View>
            )}
          </TouchableOpacity>

          {/* English Option */}
          <TouchableOpacity
            style={[
              styles.langCard,
              selectedLang === 'en' && styles.langCardSelected,
            ]}
            onPress={() => setSelectedLang('en')}
            activeOpacity={0.8}
          >
            <View style={styles.flagBadge}>
              <Text style={styles.flagEmoji}>🇬🇧</Text>
            </View>
            <View style={styles.langTextCol}>
              <Text style={styles.langTitle}>English</Text>
              <Text style={styles.langSub}>Continue in English</Text>
            </View>
            {selectedLang === 'en' && (
              <View style={styles.checkCircle}>
                <Check size={14} color={colors.cardWhite} />
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Info size={18} color={colors.textMuted} style={styles.infoIcon} />
          <Text style={styles.infoText}>
            You can change the language anytime later from your Profile settings.
          </Text>
        </View>

        {/* Continue Button */}
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
          activeOpacity={0.85}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
          <ArrowRight size={20} color={colors.cardWhite} style={{ marginLeft: 8 }} />
        </TouchableOpacity>

        {/* Trust Footer */}
        <View style={styles.footerSection}>
          <Text style={styles.trustText}>Trusted by thousands of families</Text>
          <Text style={styles.poweredText}>Powered by Ramyas Jeweller</Text>
        </View>
      </ScrollView>

      {/* Bottom Language Selector Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.bottomTab, selectedLang === 'ta' && styles.bottomTabActive]}
          onPress={() => setSelectedLang('ta')}
        >
          <Globe size={16} color={selectedLang === 'ta' ? colors.maroonPrimary : colors.textMuted} />
          <Text style={[styles.bottomTabText, selectedLang === 'ta' && styles.bottomTabTextActive]}>Tamil</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.bottomTab, selectedLang === 'en' && styles.bottomTabActive]}
          onPress={() => setSelectedLang('en')}
        >
          <Globe size={16} color={selectedLang === 'en' ? colors.maroonPrimary : colors.textMuted} />
          <Text style={[styles.bottomTabText, selectedLang === 'en' && styles.bottomTabTextActive]}>English</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.creamBackground,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: 100,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  backButton: {
    padding: spacing.xs,
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoDiamond: {
    marginRight: 6,
  },
  logoSymbol: {
    fontSize: 16,
    color: colors.maroonPrimary,
    fontWeight: 'bold',
  },
  headerBrandText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.maroonPrimary,
    letterSpacing: 1.5,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textDark,
    letterSpacing: 1.2,
  },
  subTitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },
  bannerCard: {
    backgroundColor: colors.cardWhite,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: 'hidden',
    marginBottom: spacing.xl,
    ...shadows.soft,
  },
  illustrationPlaceholder: {
    height: 140,
    backgroundColor: '#520C25',
    justifyContent: 'center',
    alignItems: 'center',
  },
  illustrationText: {
    fontSize: 40,
  },
  illustrationTitle: {
    color: colors.goldLight,
    fontWeight: 'bold',
    fontSize: 14,
    marginTop: 4,
  },
  bannerContent: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  welcomeHeading: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.maroonPrimary,
    marginBottom: 6,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  optionsContainer: {
    marginBottom: spacing.lg,
  },
  langCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardWhite,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
    ...shadows.soft,
  },
  langCardSelected: {
    backgroundColor: '#FEFCE8',
    borderColor: colors.goldPrimary,
  },
  flagBadge: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.creamBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  flagEmoji: {
    fontSize: 22,
  },
  langTextCol: {
    flex: 1,
  },
  langTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textDark,
  },
  langSub: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    backgroundColor: '#854D0E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xxl,
  },
  infoIcon: {
    marginRight: spacing.md,
  },
  infoText: {
    flex: 1,
    fontSize: 12.5,
    color: colors.textMuted,
    lineHeight: 18,
  },
  continueButton: {
    flexDirection: 'row',
    height: 54,
    backgroundColor: colors.maroonPrimary,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xxl,
    shadowColor: colors.maroonPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.cardWhite,
  },
  footerSection: {
    alignItems: 'center',
  },
  trustText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  poweredText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.maroonPrimary,
    marginTop: 2,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 64,
    backgroundColor: colors.cardWhite,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  bottomTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  bottomTabActive: {
    backgroundColor: colors.goldLight,
  },
  bottomTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    marginLeft: 6,
  },
  bottomTabTextActive: {
    color: colors.maroonPrimary,
    fontWeight: '700',
  },
});
