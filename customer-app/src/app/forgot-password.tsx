import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  requestPasswordReset,
  sanitizeMobileNumber,
  validateMobileNumber,
} from '@/services/customerAuthService';
import { OFFICIAL_SHOP_INFO } from '@/constants/shopData';
import { useLanguage } from '@/i18n';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  const [mobileNumber, setMobileNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isMobileValid = /^[6-9]\d{9}$/.test(mobileNumber);

  const handleMobileChange = (text: string) => {
    const cleaned = sanitizeMobileNumber(text);
    setMobileNumber(cleaned);
    if (errorMessage) setErrorMessage(null);
  };

  const handleSubmit = async () => {
    const validation = validateMobileNumber(mobileNumber);
    if (!validation.isValid) {
      setErrorMessage(t('invalidMobile'));
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await requestPasswordReset(mobileNumber);
      if (result.success) {
        setIsSubmitted(true);
      } else {
        setErrorMessage(result.message || t('resetRequestError'));
      }
    } catch {
      setErrorMessage(t('resetRequestError'));
    } finally {
      setIsLoading(false);
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
          accessibilityLabel={t('back')}
        >
          <Ionicons name="arrow-back" size={24} color="#70001E" />
        </TouchableOpacity>

        <View style={styles.headerBrand}>
          <Ionicons name="diamond-outline" size={20} color="#70001E" />
          <Text style={styles.headerBrandText}>JewelSave</Text>
        </View>

        <Text style={styles.headerSubText}>{OFFICIAL_SHOP_INFO.name}</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 32 + Math.max(insets.bottom, 16) },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          {isSubmitted ? (
            /* SUCCESS STATE */
            <View style={styles.successContainer}>
              <View style={styles.iconBadgeSuccess}>
                <Ionicons name="checkmark-circle" size={48} color="#16A34A" />
              </View>

              <Text style={styles.cardTitle}>{t('resetRequestSubmittedTitle')}</Text>
              <Text style={styles.cardSubtitle}>
                {t('resetRequestSubmittedMessage')}
              </Text>

              <Text style={styles.detailText}>
                {t('contactShowroomToComplete')}
              </Text>

              {/* Showroom Contact Card */}
              <View style={styles.showroomCard}>
                <Ionicons name="business-outline" size={20} color="#70001E" />
                <View style={styles.showroomDetails}>
                  <Text style={styles.showroomTitle}>{OFFICIAL_SHOP_INFO.name}</Text>
                  <Text style={styles.showroomPhone}>
                    {t('phone')}: {OFFICIAL_SHOP_INFO.phone}
                  </Text>
                </View>
              </View>

              {/* Back to Login Button */}
              <TouchableOpacity
                style={styles.backToLoginButton}
                onPress={() => router.replace('/login' as any)}
                activeOpacity={0.9}
              >
                <Ionicons name="log-in-outline" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.backToLoginText}>{t('backToLogin')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* FORM STATE */
            <View>
              <View style={styles.iconBadge}>
                <Ionicons name="key-outline" size={32} color="#70001E" />
              </View>

              <Text style={styles.cardTitle}>{t('forgotPassword')}</Text>
              <Text style={styles.cardSubtitle}>
                {t('forgotPasswordDescription')}
              </Text>

              {errorMessage && (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={18} color="#991B1B" />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              )}

              {/* Mobile Number Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('mobileNumber')}</Text>
                <View style={styles.inputWrapper}>
                  <Text style={styles.countryCode}>+91</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder={t('enterMobile')}
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                    maxLength={10}
                    value={mobileNumber}
                    onChangeText={handleMobileChange}
                    editable={!isLoading}
                  />
                </View>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (!isMobileValid || isLoading) && styles.submitButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={!isMobileValid || isLoading}
                activeOpacity={0.9}
              >
                {isLoading ? (
                  <View style={styles.loadingWrapper}>
                    <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.submitButtonText}>{t('submittingRequest')}</Text>
                  </View>
                ) : (
                  <Text style={styles.submitButtonText}>{t('requestPasswordResetAction')}</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
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
    padding: 6,
    marginLeft: -4,
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerBrandText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#70001E',
    letterSpacing: 0.5,
  },
  headerSubText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#FCE7F3',
    shadowColor: '#70001E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFF1F2',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  iconBadgeSuccess: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  detailText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    fontSize: 13,
    color: '#991B1B',
    fontWeight: '600',
    flex: 1,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 50,
  },
  countryCode: {
    fontSize: 15,
    fontWeight: '700',
    color: '#64748B',
    marginRight: 10,
    paddingRight: 10,
    borderRightWidth: 1,
    borderRightColor: '#CBD5E1',
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    height: '100%',
  },
  submitButton: {
    backgroundColor: '#70001E',
    borderRadius: 30,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#70001E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  loadingWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successContainer: {
    alignItems: 'center',
  },
  showroomCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFDF8',
    borderColor: '#FDE047',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 24,
    width: '100%',
    gap: 12,
  },
  showroomDetails: {
    flex: 1,
  },
  showroomTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#70001E',
    marginBottom: 2,
  },
  showroomPhone: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  backToLoginButton: {
    backgroundColor: '#70001E',
    borderRadius: 30,
    height: 52,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#70001E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  backToLoginText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
});
