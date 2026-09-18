import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  loginWithMobile,
  sanitizeMobileNumber,
  validateMobileNumber,
} from '@/services/customerAuthService';
import { getLanguagePreference } from '@/services/languageService';

export default function LoginScreen() {
  const router = useRouter();
  const [mobileNumber, setMobileNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'login' | 'support' | 'locate'>('login');

  useEffect(() => {
    // Read saved language preference if needed for future localization
    getLanguagePreference();
  }, []);

  const handleMobileChange = (text: string) => {
    const cleaned = sanitizeMobileNumber(text);
    setMobileNumber(cleaned);
    if (errorMessage) setErrorMessage(null);
  };

  const handleLogin = async () => {
    const validation = validateMobileNumber(mobileNumber);
    if (!validation.isValid) {
      setErrorMessage(validation.error || 'Please enter a valid mobile number.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await loginWithMobile(mobileNumber);
      if (result.success) {
        // Navigate to customer home dashboard route (e.g. index/tabs)
        router.replace('/');
      } else {
        setErrorMessage(result.message || 'Login failed. Please check your mobile number.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred during login.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCallShop = () => {
    Linking.openURL('tel:8778173682').catch(() => {
      setErrorMessage('Unable to make a call. Please dial 8778173682.');
    });
  };

  const handleWhatsApp = () => {
    Linking.openURL('https://wa.me/918778173682').catch(() => {
      setErrorMessage('Unable to open WhatsApp. Please message +91 8778173682.');
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
          accessibilityLabel="Help"
        >
          <Ionicons name="help-circle-outline" size={24} color="#70001E" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* BRAND TITLE AREA */}
        <View style={styles.brandTitleSection}>
          <Text style={styles.brandTitle}>Ramya&apos;s Jeweller</Text>
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
              Every Gram Saved, Every Dream Closer.
            </Text>
          </View>
        </View>

        {/* LOGIN CARD */}
        <View style={styles.loginCard}>
          <Text style={styles.cardTitle}>Welcome Back</Text>

          {/* Validation Error Alert */}
          {errorMessage && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={18} color="#991B1B" />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* Mobile Number Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Mobile Number</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.countryCode}>+91</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter mobile number"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                maxLength={10}
                value={mobileNumber}
                onChangeText={handleMobileChange}
                editable={!isLoading}
              />
            </View>
          </View>

          {/* Primary Login Button */}
          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.9}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.loginButtonText}>Login  →</Text>
            )}
          </TouchableOpacity>

          {/* First-Time Login Information Card */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color="#854D0E" style={styles.infoIcon} />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoTitle}>First-time login?</Text>
              <Text style={styles.infoSubtitle}>
                Use your registered mobile number to continue.
              </Text>
            </View>
          </View>
        </View>

        {/* NEED ASSISTANCE SECTION */}
        <View style={styles.assistanceSection}>
          <Text style={styles.assistanceHeader}>NEED ASSISTANCE?</Text>

          <View style={styles.assistanceButtonsContainer}>
            {/* Call Shop Button */}
            <TouchableOpacity
              style={styles.callButton}
              onPress={handleCallShop}
              activeOpacity={0.8}
            >
              <Ionicons name="call" size={18} color="#70001E" />
              <Text style={styles.callButtonText}>Call Shop</Text>
            </TouchableOpacity>

            {/* WhatsApp Button */}
            <TouchableOpacity
              style={styles.whatsappButton}
              onPress={handleWhatsApp}
              activeOpacity={0.8}
            >
              <Ionicons name="logo-whatsapp" size={18} color="#16A34A" />
              <Text style={styles.whatsappButtonText}>WhatsApp</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

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
            Login
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
            Support
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, activeTab === 'locate' && styles.navItemSelected]}
          onPress={() => {
            setActiveTab('locate');
            Linking.openURL('https://maps.google.com').catch(() => {});
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
            Locate
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
