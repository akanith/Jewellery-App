import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { colors, radius, shadows, spacing } from '../../theme';
import {
  HelpCircle,
  Phone,
  MessageSquare,
  ArrowRight,
  Info,
  LogIn,
  MapPin,
  LifeBuoy,
  AlertCircle,
} from 'lucide-react-native';

export default function LoginScreen() {
  const router = useRouter();
  const { signInWithMobile, isLoading } = useAuthStore();

  const [mobileNumber, setMobileNumber] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!mobileNumber.trim()) {
      setErrorMessage('Please enter your mobile number.');
      return;
    }

    setErrorMessage(null);

    try {
      await signInWithMobile(mobileNumber);
      // Session is now set in store — navigate to customer dashboard
      router.replace('/(tabs)/home');
    } catch (err: any) {
      setErrorMessage(err.message || 'Customer not found. Please contact Ramyas Jeweller.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Top Brand Bar */}
          <View style={styles.topBrandBar}>
            <View style={styles.jewelSaveLogo}>
              <Text style={styles.diamondSymbol}>◆</Text>
              <Text style={styles.jewelSaveText}>JewelSave</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(auth)/language')}>
              <HelpCircle size={22} color={colors.maroonPrimary} />
            </TouchableOpacity>
          </View>

          {/* Main Title Heading */}
          <Text style={styles.mainTitleHeading}>Ramya's Jeweller</Text>

          {/* Hero Banner Card */}
          <View style={styles.heroBannerCard}>
            <View style={styles.heroBannerBg}>
              <Text style={styles.heroBannerText}>
                Every Gram Saved, Every{'\n'}Dream Closer.
              </Text>
            </View>
          </View>

          {/* Form Card Container */}
          <View style={styles.formCard}>
            <Text style={styles.welcomeTitle}>Welcome Back</Text>

            {/* Mobile Number Input ONLY */}
            <Text style={styles.inputLabel}>Mobile Number</Text>
            <View style={styles.inputRowContainer}>
              <View style={styles.prefixBadge}>
                <Text style={styles.prefixText}>+91</Text>
              </View>
              <TextInput
                style={styles.textInput}
                placeholder="Enter mobile number"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                value={mobileNumber}
                onChangeText={setMobileNumber}
                maxLength={13}
                editable={!isLoading}
              />
            </View>

            {/* Error Message Banner */}
            {errorMessage && (
              <View style={styles.errorBanner}>
                <AlertCircle size={18} color={colors.errorRed} style={{ marginRight: 8 }} />
                <Text style={styles.errorBannerText}>{errorMessage}</Text>
              </View>
            )}

            {/* Login Button */}
            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <View style={styles.loginButtonContent}>
                  <ActivityIndicator color={colors.cardWhite} size="small" style={{ marginRight: 8 }} />
                  <Text style={styles.loginButtonText}>Checking your mobile number...</Text>
                </View>
              ) : (
                <View style={styles.loginButtonContent}>
                  <Text style={styles.loginButtonText}>LOGIN</Text>
                  <ArrowRight size={20} color={colors.cardWhite} style={{ marginLeft: 8 }} />
                </View>
              )}
            </TouchableOpacity>

            {/* Registered Customer Info Pill */}
            <View style={styles.yellowInfoBox}>
              <Info size={20} color={colors.textDark} style={{ marginRight: 10, marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.yellowInfoTitle}>Registered Customer?</Text>
                <Text style={styles.yellowInfoSub}>
                  Enter your registered 10-digit mobile number to access your savings scheme.
                </Text>
              </View>
            </View>
          </View>

          {/* Need Assistance Section */}
          <View style={styles.assistanceSection}>
            <Text style={styles.assistanceLabel}>NEED ASSISTANCE?</Text>
            <View style={styles.assistanceButtonsRow}>
              <TouchableOpacity style={styles.callShopButton} onPress={() => Linking.openURL('tel:+919842143307')}>
                <Phone size={18} color={colors.maroonPrimary} style={{ marginRight: 8 }} />
                <Text style={styles.callShopText}>Call Shop</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.whatsappButton} onPress={() => Linking.openURL('https://wa.me/919842143307')}>
                <MessageSquare size={18} color={colors.whatsappGreen} style={{ marginRight: 8 }} />
                <Text style={styles.whatsappText}>WhatsApp</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom Auth Navigation Bar */}
      <View style={styles.bottomNavBar}>
        <TouchableOpacity style={[styles.navTabItem, styles.navTabItemActive]}>
          <LogIn size={18} color={colors.maroonPrimary} />
          <Text style={[styles.navTabText, styles.navTabTextActive]}>Login</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navTabItem}>
          <LifeBuoy size={18} color={colors.textMuted} />
          <Text style={styles.navTabText}>Support</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navTabItem}>
          <MapPin size={18} color={colors.textMuted} />
          <Text style={styles.navTabText}>Locate</Text>
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
    paddingTop: spacing.sm,
    paddingBottom: 90,
  },
  topBrandBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  jewelSaveLogo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  diamondSymbol: {
    fontSize: 16,
    color: colors.maroonPrimary,
    marginRight: 6,
  },
  jewelSaveText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.maroonPrimary,
  },
  mainTitleHeading: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.maroonPrimary,
    textAlign: 'center',
    marginVertical: spacing.sm,
  },
  heroBannerCard: {
    height: 160,
    borderRadius: radius.xxl,
    overflow: 'hidden',
    marginBottom: spacing.xl,
    backgroundColor: '#520C25',
    ...shadows.card,
  },
  heroBannerBg: {
    flex: 1,
    padding: spacing.xl,
    justifyContent: 'flex-end',
    backgroundColor: '#520C25',
  },
  heroBannerText: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.cardWhite,
    lineHeight: 26,
  },
  formCard: {
    backgroundColor: colors.cardWhite,
    borderRadius: radius.xxl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: spacing.xl,
    ...shadows.soft,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textDark,
    marginBottom: spacing.lg,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textDark,
    marginBottom: 6,
  },
  inputRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBackground,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderInput,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  prefixBadge: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  prefixText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textDark,
  },
  textInput: {
    flex: 1,
    height: 48,
    fontSize: 15,
    color: colors.textDark,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorBg,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.errorBorder,
    marginBottom: spacing.lg,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.errorRed,
  },
  loginButton: {
    height: 52,
    backgroundColor: colors.maroonPrimary,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  loginButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loginButtonText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.cardWhite,
    letterSpacing: 0.5,
  },
  yellowInfoBox: {
    flexDirection: 'row',
    backgroundColor: colors.goldLight,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  yellowInfoTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textDark,
  },
  yellowInfoSub: {
    fontSize: 12,
    color: colors.textDark,
    marginTop: 2,
    lineHeight: 17,
  },
  assistanceSection: {
    alignItems: 'center',
  },
  assistanceLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 1.2,
    marginBottom: spacing.md,
  },
  assistanceButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  callShopButton: {
    flex: 0.48,
    flexDirection: 'row',
    height: 48,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.maroonPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  callShopText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.maroonPrimary,
  },
  whatsappButton: {
    flex: 0.48,
    flexDirection: 'row',
    height: 48,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.whatsappGreen,
    justifyContent: 'center',
    alignItems: 'center',
  },
  whatsappText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.whatsappGreen,
  },
  bottomNavBar: {
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
  navTabItem: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 6,
  },
  navTabItemActive: {
    backgroundColor: colors.goldLight,
    borderRadius: radius.full,
  },
  navTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: 2,
  },
  navTabTextActive: {
    color: colors.maroonPrimary,
    fontWeight: '700',
  },
});
