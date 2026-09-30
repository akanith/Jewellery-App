import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Linking,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { OFFICIAL_SHOP_INFO } from '@/constants/shopData';
import { useLanguage } from '@/i18n';
import { useResponsiveMetrics } from '@/constants/responsive';

export default function DeleteAccountScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const responsive = useResponsiveMetrics();

  const handleCallShop = () => {
    const cleanNumber = OFFICIAL_SHOP_INFO.phone.replace(/[^0-9+]/g, '');
    Linking.openURL(`tel:${cleanNumber}`).catch(() => {
      const msg = `Please call support at ${OFFICIAL_SHOP_INFO.phone}`;
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Call Showroom', msg);
      }
    });
  };

  const handleWhatsAppShop = () => {
    const waNumber = OFFICIAL_SHOP_INFO.whatsappPhone || '919842143307';
    const message = encodeURIComponent("Hello Ramya's Jeweller, I would like to request deletion of my Customer App account.");
    const waUrl = `https://wa.me/${waNumber}?text=${message}`;

    Linking.openURL(waUrl).catch(() => {
      const msg = `Please WhatsApp us at +${waNumber}`;
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('WhatsApp Support', msg);
      }
    });
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

        <Text style={styles.headerTitle}>{t('deleteAccountTitle')}</Text>
        <View style={styles.headerRightSpacer} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: responsive.pageHorizontalPadding,
            paddingBottom: responsive.bottomClearance + 24,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* BANNER CARD */}
        <View style={styles.bannerCard}>
          <View style={styles.iconCircleLarge}>
            <Ionicons name="shield-checkmark" size={32} color="#70001E" />
          </View>
          <Text style={styles.bannerTitle}>{t('deleteAccountSub')}</Text>
          <Text style={styles.bannerSubtitle}>
            For security and customer verification, account deletion requests are handled directly by Ramyas Jeweller showroom staff.
          </Text>
        </View>

        {/* EXPLANATION CARD */}
        <View style={styles.card}>
          <Text style={styles.cardHeaderTitle}>How to Request Deletion</Text>
          <Text style={styles.cardDescription}>
            Please contact our showroom to request deletion of your Ramyas Jeweller Customer App account. Showroom staff will verify your identity before processing your request.
          </Text>

          <View style={styles.retentionNoticeBox}>
            <Ionicons name="information-circle-outline" size={20} color="#854D0E" style={{ marginTop: 1 }} />
            <Text style={styles.retentionNoticeText}>
              Note: App account deletion deactivates your mobile login. In accordance with statutory Indian gold savings regulations and financial accounting laws, past installment receipts and scheme transaction history will be retained for showroom audit compliance.
            </Text>
          </View>
        </View>

        {/* SHOWROOM CONTACT CARD */}
        <View style={styles.card}>
          <Text style={styles.cardHeaderTitle}>Showroom Contact Details</Text>
          
          <Text style={styles.shopName}>{OFFICIAL_SHOP_INFO.name.toUpperCase()}</Text>

          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={18} color="#70001E" />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Address</Text>
              <Text style={styles.infoValue}>
                {OFFICIAL_SHOP_INFO.address}, {OFFICIAL_SHOP_INFO.city}, {OFFICIAL_SHOP_INFO.state} - {OFFICIAL_SHOP_INFO.pincode}, {OFFICIAL_SHOP_INFO.country}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={18} color="#70001E" />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Phone Number</Text>
              <Text style={styles.infoValue}>{OFFICIAL_SHOP_INFO.phone}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={18} color="#70001E" />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Business Hours</Text>
              <Text style={styles.infoValue}>9:30 AM – 10:00 PM (Monday – Sunday)</Text>
            </View>
          </View>
        </View>

        {/* ACTION BUTTONS */}
        <View style={styles.actionButtonContainer}>
          {/* CALL BUTTON */}
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleCallShop}
            activeOpacity={0.8}
          >
            <Ionicons name="call" size={20} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Call Ramyas Jeweller</Text>
          </TouchableOpacity>

          {/* WHATSAPP BUTTON */}
          <TouchableOpacity
            style={styles.whatsappButton}
            onPress={handleWhatsAppShop}
            activeOpacity={0.8}
          >
            <Ionicons name="logo-whatsapp" size={20} color="#FFFFFF" />
            <Text style={styles.whatsappButtonText}>WhatsApp Ramyas Jeweller</Text>
          </TouchableOpacity>

          {/* BACK BUTTON */}
          <TouchableOpacity
            style={styles.backLinkButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Text style={styles.backLinkText}>{t('back')}</Text>
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
    letterSpacing: -0.3,
  },
  headerRightSpacer: {
    width: 28,
  },
  scrollContent: {
    paddingTop: 16,
    gap: 16,
  },
  bannerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    gap: 8,
  },
  iconCircleLarge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FDF2F8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#70001E',
    textAlign: 'center',
  },
  bannerSubtitle: {
    fontSize: 13.5,
    lineHeight: 20,
    color: '#475569',
    textAlign: 'center',
    fontWeight: '400',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    gap: 12,
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  cardDescription: {
    fontSize: 13.5,
    lineHeight: 21,
    color: '#334155',
    fontWeight: '400',
  },
  retentionNoticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 10,
    marginTop: 4,
  },
  retentionNoticeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: '#78350F',
    fontWeight: '500',
  },
  shopName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#70001E',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  infoValue: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#1E293B',
    lineHeight: 19,
  },
  actionButtonContainer: {
    gap: 12,
    marginTop: 4,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#70001E',
    paddingVertical: 15,
    borderRadius: 12,
    gap: 10,
    elevation: 2,
    shadowColor: '#70001E',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  whatsappButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16A34A',
    paddingVertical: 15,
    borderRadius: 12,
    gap: 10,
    elevation: 2,
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  whatsappButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  backLinkButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  backLinkText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
});
