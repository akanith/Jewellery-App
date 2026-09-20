import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useLanguage } from '@/i18n';

export default function OfflineScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  const handleRetry = () => {
    router.replace('/(tabs)');
  };

  const handleContactShop = () => {
    router.push('/shop');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* HEADER */}
      <View style={styles.headerContainer}>
        <View style={styles.brandRow}>
          <View style={styles.brandIconBox}>
            <Ionicons name="book-outline" size={18} color="#70001E" />
          </View>
          <Text style={styles.brandName}>Ramyas</Text>
        </View>

        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.closeButton}
          activeOpacity={0.7}
          accessibilityLabel={t('close')}
        >
          <Ionicons name="close-outline" size={24} color="#475569" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 32 + Math.max(insets.bottom, 16) }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.mainContent}>
        {/* ILLUSTRATION CARD */}
        <View style={styles.illustrationCard}>
          <View style={styles.sparkleTopRight}>
            <Ionicons name="sparkles" size={24} color="#F59E0B" />
          </View>

          <View style={styles.wifiCircleOuter}>
            <View style={styles.wifiCircleInner}>
              <Ionicons name="wifi-outline" size={40} color="#70001E" />
              <View style={styles.wifiSlashBadge}>
                <Ionicons name="close" size={14} color="#FFFFFF" />
              </View>
            </View>
          </View>

          <View style={styles.sparkleBottomLeft}>
            <Ionicons name="diamond-outline" size={16} color="#FDA4AF" />
          </View>
        </View>

        {/* TEXT & ACTIONS */}
        <Text style={styles.title}>{t('noInternetTitle')}</Text>
        <Text style={styles.subtitle}>{t('noInternetSub')}</Text>

        <View style={styles.buttonContainer}>
          {/* RETRY BUTTON */}
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleRetry}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={18} color="#FFFFFF" />
            <Text style={styles.retryButtonText}>{t('retry')}</Text>
          </TouchableOpacity>

          {/* CONTACT SHOP BUTTON */}
          <TouchableOpacity
            style={styles.contactButton}
            onPress={handleContactShop}
            activeOpacity={0.8}
          >
            <Ionicons name="storefront-outline" size={18} color="#70001E" />
            <Text style={styles.contactButtonText}>{t('contactShop')}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.refCodeText}>Ref: ERR_NO_CONNECTION</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandIconBox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#70001E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#70001E',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  illustrationCard: {
    width: 260,
    height: 220,
    backgroundColor: '#F8FAFC',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  sparkleTopRight: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  sparkleBottomLeft: {
    position: 'absolute',
    bottom: 16,
    left: 16,
  },
  wifiCircleOuter: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  wifiCircleInner: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  wifiSlashBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 32,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
    marginBottom: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#70001E',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    elevation: 3,
    shadowColor: '#70001E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  retryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#70001E',
    gap: 8,
  },
  contactButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#70001E',
  },
  refCodeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
});
