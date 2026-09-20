import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  ScrollView,
  StatusBar,
  Linking,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  loginWithMobile,
  sanitizeMobileNumber,
  validateMobileNumber,
} from '@/services/customerAuthService';
import { OFFICIAL_SHOP_INFO } from '@/constants/shopData';
import { useLanguage } from '@/i18n';

export default function LoginScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'login' | 'support' | 'locate'>('login');
  const [showForgotModal, setShowForgotModal] = useState(false);

  const isMobileValid = /^[6-9]\d{9}$/.test(mobileNumber);
  const isFormValid = isMobileValid && password.trim().length > 0;

  const handleMobileChange = (text: string) => {
    const cleaned = sanitizeMobileNumber(text);
    setMobileNumber(cleaned);
    if (errorMessage) setErrorMessage(null);
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    if (errorMessage) setErrorMessage(null);
  };

  const handleLogin = async () => {
    const validation = validateMobileNumber(mobileNumber);
    if (!validation.isValid) {
      setErrorMessage(validation.error ? t('invalidMobile') : t('invalidMobile'));
      return;
    }

    if (!password.trim()) {
      setErrorMessage(t('enterPassword'));
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await loginWithMobile(mobileNumber, password);
      if (result.success && result.session) {
        if (result.session.passwordStatus === 'RESET_REQUIRED') {
          router.replace('/reset-password' as any);
        } else {
          router.replace('/(tabs)' as any);
        }
      } else {
        setErrorMessage(result.message || t('loginFailed'));
      }
    } catch {
      setErrorMessage(t('loginError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCallShop = () => {
    const cleanNumber = OFFICIAL_SHOP_INFO.phone.replace(/[^0-9+]/g, '');
    Linking.openURL(`tel:${cleanNumber}`).catch(() => {
      setErrorMessage(`${t('unableCall')} ${OFFICIAL_SHOP_INFO.phone}`);
    });
  };

  const handleWhatsApp = () => {
    const message = encodeURIComponent("Hello Ramya's Jeweller, I need assistance with login.");
    Linking.openURL(`https://wa.me/${OFFICIAL_SHOP_INFO.whatsappPhone}?text=${message}`).catch(() => {
      setErrorMessage(`${t('unableWhatsapp')} ${OFFICIAL_SHOP_INFO.phone}`);
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* HEADER */}
      <View style={styles.headerContainer}>
        <View style={styles.headerBrand}>
          <Ionicons name="diamond-outline" size={20} color="#70001E" style={styles.diamondIcon} />
          <Text style={styles.headerBrandText}>JewelSave</Text>
        </View>

        <TouchableOpacity
          onPress={handleCallShop}
          style={styles.helpButton}
          activeOpacity={0.7}
          accessibilityLabel={t('help')}
        >
          <Ionicons name="help-circle-outline" size={24} color="#70001E" />
        </TouchableOpacity>
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
        {/* BRAND TITLE AREA */}
        <View style={styles.brandTitleSection}>
          <Text style={styles.brandTitle}>{OFFICIAL_SHOP_INFO.name}</Text>
        </View>

        {/* SHOWROOM HERO IMAGE CARD */}
        <View style={styles.heroCard}>
          <Image
            source={require('@/assets/images/jewellery_showroom_banner.jpg')}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <View style={styles.heroOverlay}>
            <Text style={styles.heroTagline}>
              {t('tagline')}
            </Text>
          </View>
        </View>

        {/* LOGIN CARD */}
        <View style={styles.loginCard}>
          <Text style={styles.cardTitle}>{t('welcomeBack')}</Text>

          {/* Validation Error Alert */}
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

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('password')}</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={18} color="#64748B" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.textInput}
                placeholder={t('enterPassword')}
                placeholderTextColor="#94A3B8"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={handlePasswordChange}
                editable={!isLoading}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#64748B"
                />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.forgotPasswordButton}
              onPress={() => router.push('/forgot-password' as any)}
              activeOpacity={0.7}
            >
              <Text style={styles.forgotPasswordText}>{t('forgotPassword')}</Text>
            </TouchableOpacity>
          </View>

          {/* Primary Login Button */}
          <TouchableOpacity
            style={[styles.loginButton, (!isFormValid || isLoading) && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={!isFormValid || isLoading}
            activeOpacity={0.9}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.loginButtonText}>{t('loginAction')}</Text>
            )}
          </TouchableOpacity>

          {/* First-Time Login Information Card */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color="#854D0E" style={styles.infoIcon} />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoTitle}>{t('firstTimeLogin')}</Text>
              <Text style={styles.infoSubtitle}>
                {t('initialPasswordHint')}
              </Text>
            </View>
          </View>
        </View>

        {/* NEED ASSISTANCE SECTION */}
        <View style={styles.assistanceSection}>
          <Text style={styles.assistanceHeader}>{t('needAssistance')}</Text>

          <View style={styles.assistanceButtonsContainer}>
            {/* Call Shop Button */}
            <TouchableOpacity
              style={styles.callButton}
              onPress={handleCallShop}
              activeOpacity={0.8}
            >
              <Ionicons name="call" size={18} color="#70001E" />
              <Text style={styles.callButtonText}>{t('callShop')}</Text>
            </TouchableOpacity>

            {/* WhatsApp Button */}
            <TouchableOpacity
              style={styles.whatsappButton}
              onPress={handleWhatsApp}
              activeOpacity={0.8}
            >
              <Ionicons name="logo-whatsapp" size={18} color="#16A34A" />
              <Text style={styles.whatsappButtonText}>{t('whatsapp')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* FORGOT PASSWORD MODAL */}
      <Modal
        visible={showForgotModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowForgotModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Ionicons name="key-outline" size={24} color="#70001E" />
              <Text style={styles.modalTitle}>{t('forgotPasswordModalTitle')}</Text>
            </View>
            <Text style={styles.modalText}>
              {t('forgotPasswordModalText')}
            </Text>

            <View style={styles.showroomBox}>
              <Text style={styles.showroomTitle}>{OFFICIAL_SHOP_INFO.name}</Text>
              <Text style={styles.showroomPhone}>{t('showroomContact')}: {OFFICIAL_SHOP_INFO.phone}</Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCallButton}
                onPress={() => {
                  setShowForgotModal(false);
                  handleCallShop();
                }}
              >
                <Ionicons name="call" size={16} color="#FFFFFF" />
                <Text style={styles.modalCallText}>{t('callShop')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowForgotModal(false)}
              >
                <Text style={styles.modalCloseText}>{t('close')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* BOTTOM NAVIGATION BAR */}
      <View style={styles.bottomNavBar}>
        <TouchableOpacity
          style={[styles.navItem, activeTab === 'login' && styles.navItemSelected]}
          onPress={() => setActiveTab('login')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="log-in-outline"
            size={18}
            color={activeTab === 'login' ? '#1E293B' : '#64748B'}
          />
          <Text
            style={[styles.navText, activeTab === 'login' && styles.navTextSelected]}
          >
            {t('login')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, activeTab === 'support' && styles.navItemSelected]}
          onPress={() => {
            setActiveTab('support');
            handleCallShop();
          }}
          activeOpacity={0.8}
        >
          <Ionicons
            name="headset-outline"
            size={18}
            color={activeTab === 'support' ? '#1E293B' : '#64748B'}
          />
          <Text
            style={[styles.navText, activeTab === 'support' && styles.navTextSelected]}
          >
            {t('support')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, activeTab === 'locate' && styles.navItemSelected]}
          onPress={() => {
            setActiveTab('locate');
            Linking.openURL(OFFICIAL_SHOP_INFO.googleMapsUrl).catch(() => {});
          }}
          activeOpacity={0.8}
        >
          <Ionicons
            name="location-outline"
            size={18}
            color={activeTab === 'locate' ? '#1E293B' : '#64748B'}
          />
          <Text
            style={[styles.navText, activeTab === 'locate' && styles.navTextSelected]}
          >
            {t('locate')}
          </Text>
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
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
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
    letterSpacing: 0.5,
  },
  helpButton: {
    padding: 6,
    marginRight: -4,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    alignItems: 'stretch',
  },
  brandTitleSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#70001E',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  heroCard: {
    borderRadius: 20,
    overflow: 'hidden',
    height: 180,
    marginBottom: 20,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(112, 0, 30, 0.45)',
    justifyContent: 'flex-end',
    padding: 16,
  },
  heroTagline: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 26,
    letterSpacing: 0.2,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  loginCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#FCE7F3',
    marginBottom: 24,
    shadowColor: '#70001E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 18,
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
    marginBottom: 20,
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
  loginButton: {
    backgroundColor: '#70001E',
    borderRadius: 30,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#70001E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF08A',
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  infoIcon: {
    marginTop: 1,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#854D0E',
    marginBottom: 2,
  },
  infoSubtitle: {
    fontSize: 12,
    color: '#A16207',
    lineHeight: 17,
  },
  assistanceSection: {
    alignItems: 'stretch',
    marginBottom: 16,
  },
  assistanceHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1.2,
    textAlign: 'center',
    marginBottom: 14,
  },
  assistanceButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  callButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#70001E',
    borderRadius: 14,
    height: 48,
    gap: 8,
  },
  callButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#70001E',
  },
  whatsappButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#16A34A',
    borderRadius: 14,
    height: 48,
    gap: 8,
  },
  whatsappButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#16A34A',
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginTop: 8,
    paddingVertical: 4,
  },
  forgotPasswordText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#70001E',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
    flex: 1,
  },
  modalText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 16,
  },
  showroomBox: {
    backgroundColor: '#FFFDF8',
    borderWidth: 1,
    borderColor: '#FDE047',
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  showroomTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#70001E',
    marginBottom: 4,
  },
  showroomPhone: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCallButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#70001E',
    borderRadius: 14,
    height: 46,
    gap: 6,
  },
  modalCallText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalCloseButton: {
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    height: 46,
  },
  modalCloseText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  bottomNavBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  navItemSelected: {
    backgroundColor: '#FDE047',
  },
  navText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  navTextSelected: {
    color: '#1E293B',
    fontWeight: '700',
  },
});
