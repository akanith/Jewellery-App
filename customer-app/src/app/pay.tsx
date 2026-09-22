import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '@/i18n';
import { getStoredCustomerSession } from '@/services/customerAuthService';

export default function PayScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();

  const [customerName, setCustomerName] = useState<string>('Customer');
  const [customerCode, setCustomerCode] = useState<string>('');

  useEffect(() => {
    async function loadData() {
      const session = await getStoredCustomerSession();
      if (session?.fullName) {
        setCustomerName(session.fullName);
      }
      if (session?.customerCode) {
        setCustomerCode(session.customerCode);
      }
    }
    loadData();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerIconBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#70001E" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{t('scanQrTitle')}</Text>

        <TouchableOpacity
          onPress={() => router.push('/help')}
          style={styles.headerIconBtn}
          activeOpacity={0.7}
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
        showsVerticalScrollIndicator={false}
      >
        {/* CUSTOMER & SCHEME SUMMARY */}
        <View style={styles.customerSummaryCard}>
          <View style={styles.customerAvatar}>
            <Text style={styles.avatarText}>RJ</Text>
          </View>
          <View style={styles.customerDetails}>
            <Text style={styles.customerNameLabel}>
              {t('customerLabel')}: <Text style={styles.customerNameVal}>{customerName}</Text> {customerCode ? `(${customerCode})` : ''}
            </Text>
            <Text style={styles.schemeNameVal}>{t('schemeName')}</Text>
          </View>
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={18} color="#70001E" />
          </View>
        </View>

        {/* INFORMATIONAL NOTICE CARD */}
        <View style={styles.noticeCard}>
          <View style={styles.iconCircle}>
            <Ionicons name="information-circle" size={44} color="#70001E" />
          </View>

          <Text style={styles.noticeTitle}>
            {t('onlinePaymentUnavailableTitle')}
          </Text>

          <Text style={styles.noticeBody}>
            {t('onlinePaymentUnavailableMsg')}
          </Text>

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.push('/shop')}
            activeOpacity={0.85}
          >
            <Ionicons name="storefront-outline" size={20} color="#FFFFFF" />
            <Text style={styles.primaryBtnText}>{t('visitOurShop')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => router.push('/(tabs)/passbook')}
            activeOpacity={0.8}
          >
            <Ionicons name="book-outline" size={18} color="#70001E" />
            <Text style={styles.secondaryBtnText}>{t('viewPassbookAction')}</Text>
          </TouchableOpacity>
        </View>

        {/* SHOWROOM CONTACT CARD */}
        <View style={styles.contactCard}>
          <Text style={styles.contactHeader}>{t('aboutShop')}</Text>
          <Text style={styles.contactSubText}>
            Begambur Main Showroom • Dindigul, Tamil Nadu
          </Text>
          <View style={styles.contactRow}>
            <Ionicons name="call-outline" size={16} color="#70001E" />
            <Text style={styles.contactPhone}>+91 94437 25297</Text>
          </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerIconBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#70001E',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  customerSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFDF7',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FEF08A',
    marginBottom: 16,
    gap: 12,
  },
  customerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FCE7F3',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#70001E',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#70001E',
  },
  customerDetails: {
    flex: 1,
  },
  customerNameLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  customerNameVal: {
    fontWeight: '700',
    color: '#1E293B',
  },
  schemeNameVal: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#70001E',
    marginTop: 1,
  },
  verifiedBadge: {
    padding: 4,
  },
  noticeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E9D9C4',
    shadowColor: '#70001E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 16,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFF5F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FCE7F3',
  },
  noticeTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#70001E',
    textAlign: 'center',
    marginBottom: 10,
  },
  noticeBody: {
    fontSize: 14,
    lineHeight: 22,
    color: '#524B53',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  primaryBtn: {
    width: '100%',
    height: 48,
    backgroundColor: '#70001E',
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  secondaryBtn: {
    width: '100%',
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFDF7',
    borderWidth: 1,
    borderColor: '#E9D9C4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#70001E',
  },
  contactCard: {
    backgroundColor: '#FFFDF7',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E9D9C4',
    alignItems: 'center',
  },
  contactHeader: {
    fontSize: 14,
    fontWeight: '800',
    color: '#70001E',
    marginBottom: 4,
  },
  contactSubText: {
    fontSize: 12,
    color: '#6F6870',
    marginBottom: 10,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contactPhone: {
    fontSize: 13,
    fontWeight: '700',
    color: '#70001E',
  },
});
