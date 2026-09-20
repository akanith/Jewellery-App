import React, { useState, useEffect } from 'react';
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
  changePassword,
  validatePasswordCriteria,
  getStoredCustomerSession,
  sanitizeMobileNumber,
} from '@/services/customerAuthService';
import { OFFICIAL_SHOP_INFO } from '@/constants/shopData';
import { useLanguage } from '@/i18n';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function verifySession() {
      const session = await getStoredCustomerSession();
      const cleanedMobile = session?.mobileNumber ? sanitizeMobileNumber(session.mobileNumber) : '';
      if (!session || !cleanedMobile || cleanedMobile.length < 10) {
        setErrorMessage('Session expired or mobile identity missing. Please log in again.');
      }
    }
    verifySession();
  }, []);

  const isFormValid =
    newPassword.length >= 8 && confirmPassword.length >= 8 && newPassword === confirmPassword;

  const handleSavePassword = async () => {
    if (newPassword !== confirmPassword) {
      setErrorMessage(t('passwordsDoNotMatch'));
      return;
    }

    const validation = validatePasswordCriteria(newPassword);
    if (!validation.isValid) {
      setErrorMessage(validation.error || t('passwordCriteria'));
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const session = await getStoredCustomerSession();
      const rawMobile = session?.mobileNumber ? sanitizeMobileNumber(session.mobileNumber) : '';
      const oldPass = currentPassword.trim() || (rawMobile.length >= 4 ? rawMobile.slice(-4) : '');

      if (!oldPass || oldPass.length < 4) {
        setErrorMessage('Unable to verify current session identity. Please log in again.');
        return;
      }

      const result = await changePassword(oldPass, newPassword);

      if (result.success) {
        router.replace('/(tabs)' as any);
      } else {
        setErrorMessage(result.message || 'Failed to update password.');
      }
    } catch {
      setErrorMessage('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* HEADER */}
      <View style={styles.headerContainer}>
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
          <View style={styles.iconBadge}>
            <Ionicons name="shield-checkmark" size={32} color="#70001E" />
          </View>

          <Text style={styles.cardTitle}>{t('setPasswordTitle')}</Text>
          <Text style={styles.cardSubtitle}>{t('setPasswordSubtitle')}</Text>

          {errorMessage && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={18} color="#991B1B" />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* New Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('newPassword')}</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={18} color="#64748B" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.textInput}
                placeholder={t('newPassword')}
                placeholderTextColor="#94A3B8"
                secureTextEntry={!showNewPassword}
                value={newPassword}
                onChangeText={(text) => {
                  setNewPassword(text);
                  if (errorMessage) setErrorMessage(null);
                }}
                editable={!isLoading}
              />
              <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)}>
                <Ionicons
                  name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#64748B"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('confirmPassword')}</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={18} color="#64748B" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.textInput}
                placeholder={t('confirmPassword')}
                placeholderTextColor="#94A3B8"
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (errorMessage) setErrorMessage(null);
                }}
                editable={!isLoading}
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                <Ionicons
                  name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#64748B"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Criteria info box */}
          <View style={styles.criteriaBox}>
            <Ionicons name="information-circle-outline" size={18} color="#70001E" />
            <Text style={styles.criteriaText}>{t('passwordCriteria')}</Text>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.saveButton, (!isFormValid || isLoading) && styles.saveButtonDisabled]}
            onPress={handleSavePassword}
            disabled={!isFormValid || isLoading}
            activeOpacity={0.9}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>{t('saveNewPassword')}</Text>
            )}
          </TouchableOpacity>
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
    marginBottom: 18,
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
  textInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    height: '100%',
  },
  criteriaBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFDF8',
    borderColor: '#FDE047',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 24,
    gap: 8,
  },
  criteriaText: {
    fontSize: 12,
    color: '#854D0E',
    fontWeight: '600',
    flex: 1,
  },
  saveButton: {
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
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
});
