import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Image,
  ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '@/i18n';

export default function ErrorScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  const handleTryAgain = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  const handleGoHome = () => {
    router.replace('/(tabs)');
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
        >
          <Ionicons name="arrow-back" size={24} color="#70001E" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{t('somethingWentWrong')}</Text>

        <Text style={styles.brandTitle}>Ramyas Digital</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 24 + Math.max(insets.bottom, 12) }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.mainContent}>
        {/* GRAPHIC CONTAINER */}
        <View style={styles.imageContainer}>
          <Image
            source={require('../../assets/images/error_diamond_graphic.jpg')}
            style={styles.errorImage}
            resizeMode="cover"
          />
        </View>

        {/* ERROR CARD */}
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>{t('somethingWentWrong')}</Text>
          <Text style={styles.errorDescription}>
            {t('errorDescription')}
          </Text>

          {/* TRY AGAIN BUTTON */}
          <TouchableOpacity
            style={styles.tryAgainButton}
            onPress={handleTryAgain}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={18} color="#FFFFFF" />
            <Text style={styles.tryAgainText}>{t('tryAgain')}</Text>
          </TouchableOpacity>

          {/* GO HOME BUTTON */}
          <TouchableOpacity
            style={styles.goHomeButton}
            onPress={handleGoHome}
            activeOpacity={0.8}
          >
            <Ionicons name="home-outline" size={18} color="#70001E" />
            <Text style={styles.goHomeText}>{t('goHome')}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.errorCodeText}>Error Code: ERR_RAMYAS_JEWEL_500</Text>
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
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#70001E',
  },
  mainContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  imageContainer: {
    width: '100%',
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  errorImage: {
    width: '100%',
    height: '100%',
  },
  errorCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#70001E',
    marginBottom: 10,
    textAlign: 'center',
  },
  errorDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
  },
  tryAgainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#70001E',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#70001E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  tryAgainText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  goHomeButton: {
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
  goHomeText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#70001E',
  },
  errorCodeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 20,
  },
  tabBar: {
    flexDirection: 'row',
    height: 64,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 6,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tabItemActive: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDE047',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 6,
  },
  tabTextActive: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1E293B',
  },
  tabText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
  },
});
