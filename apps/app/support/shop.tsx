import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, radius, shadows, spacing } from '../theme';
import {
  ArrowLeft,
  Share2,
  Phone,
  MessageSquare,
  Navigation,
  MapPin,
  Clock,
  Calendar,
  Mail,
  Headphones,
  CheckCircle,
  Shield,
  Lock,
  Star,
} from 'lucide-react-native';

export default function ShopScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={20} color={colors.maroonPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Visit Our Shop</Text>
        <TouchableOpacity>
          <Share2 size={20} color={colors.maroonPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Main Shop Header Card */}
        <View style={styles.shopHeaderCard}>
          <View style={styles.shopLogoCircle}>
            <Text style={styles.shopLogoSymbol}>◆</Text>
          </View>

          <Text style={styles.shopName}>Ramyas Jeweller</Text>
          <Text style={styles.starsText}>⭐⭐⭐⭐⭐  Trusted Since 1999</Text>
          <Text style={styles.partnerText}>Premium Jewellery Savings Partner</Text>

          <View style={styles.openPill}>
            <View style={styles.greenDot} />
            <Text style={styles.openPillText}>Open Now • Closes at 8:30 PM</Text>
            <CheckCircle size={14} color="#0EA5E9" style={{ marginLeft: 4 }} />
          </View>
        </View>

        {/* Quick Action Buttons */}
        <View style={styles.quickActionsRow}>
          <TouchableOpacity style={styles.actionBtn}>
            <Phone size={18} color={colors.cardWhite} style={{ marginBottom: 4 }} />
            <Text style={styles.actionBtnText}>Call Shop</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn}>
            <MessageSquare size={18} color={colors.cardWhite} style={{ marginBottom: 4 }} />
            <Text style={styles.actionBtnText}>WhatsApp</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn}>
            <Navigation size={18} color={colors.cardWhite} style={{ marginBottom: 4 }} />
            <Text style={styles.actionBtnText}>Directions</Text>
          </TouchableOpacity>
        </View>

        {/* Shop Information Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoCardTitle}>Shop Information</Text>

          {/* Address */}
          <View style={styles.infoRow}>
            <View style={styles.infoIconBadge}>
              <MapPin size={18} color={colors.maroonPrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Address</Text>
              <Text style={styles.infoValue}>
                No. 124, Temple View Road, Opp. Sivan Temple, Retail Hub, Coimbatore - 641001
              </Text>
            </View>
          </View>

          {/* Working Hours */}
          <View style={styles.infoRow}>
            <View style={styles.infoIconBadge}>
              <Clock size={18} color={colors.maroonPrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Working Hours</Text>
              <Text style={styles.infoValue}>10:00 AM - 08:30 PM</Text>
            </View>
          </View>

          {/* Weekly Holiday */}
          <View style={styles.infoRow}>
            <View style={styles.infoIconBadge}>
              <Calendar size={18} color={colors.maroonPrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Weekly Holiday</Text>
              <Text style={styles.infoValue}>Tuesday</Text>
            </View>
          </View>

          {/* Email */}
          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <View style={styles.infoIconBadge}>
              <Mail size={18} color={colors.maroonPrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>contact@ramyasjewellers.com</Text>
            </View>
          </View>
        </View>

        {/* Flagship Store Banner Card */}
        <View style={styles.storePhotoCard}>
          <View style={styles.storePhotoOverlay}>
            <Text style={styles.storeTag}>Our Flagship Store</Text>
            <Text style={styles.storeTitle}>Coimbatore Main</Text>
            <TouchableOpacity style={styles.viewMapsBtn}>
              <Navigation size={14} color={colors.maroonPrimary} style={{ marginRight: 6 }} />
              <Text style={styles.viewMapsBtnText}>View on Maps</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Support Yellow Box */}
        <View style={styles.supportBox}>
          <View style={styles.supportHeaderRow}>
            <View style={styles.supportIconCircle}>
              <Headphones size={20} color={colors.maroonPrimary} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.supportTitle}>Need Help? Support Available</Text>
              <Text style={styles.supportSub}>Average Response: Under 10 Minutes</Text>
            </View>
          </View>

          <View style={styles.supportBtnRow}>
            <TouchableOpacity style={styles.supportCallBtn}>
              <Phone size={16} color={colors.maroonPrimary} style={{ marginRight: 6 }} />
              <Text style={styles.supportCallText}>Call Support</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.supportWhatsappBtn}>
              <MessageSquare size={16} color={colors.maroonPrimary} style={{ marginRight: 6 }} />
              <Text style={styles.supportWhatsappText}>WhatsApp</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Thank you for choosing Ramyas Jeweller. Trusted by thousands of families.
          </Text>
          <View style={styles.securityIconsRow}>
            <Shield size={16} color={colors.textMuted} style={{ marginHorizontal: 6 }} />
            <Lock size={16} color={colors.textMuted} style={{ marginHorizontal: 6 }} />
            <Star size={16} color={colors.textMuted} style={{ marginHorizontal: 6 }} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.creamBackground,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.cardWhite,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.maroonPrimary,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  shopHeaderCard: {
    backgroundColor: colors.cardWhite,
    borderRadius: radius.xxl,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...shadows.soft,
  },
  shopLogoCircle: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: colors.maroonPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  shopLogoSymbol: {
    fontSize: 24,
    color: colors.cardWhite,
    fontWeight: 'bold',
  },
  shopName: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.maroonPrimary,
  },
  starsText: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
    fontWeight: '600',
  },
  partnerText: {
    fontSize: 13,
    color: colors.textDark,
    marginTop: 4,
    fontWeight: '500',
  },
  openPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successBg,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: spacing.md,
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.successGreen,
    marginRight: 6,
  },
  openPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.successGreen,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  actionBtn: {
    flex: 0.31,
    height: 60,
    backgroundColor: colors.maroonPrimary,
    borderRadius: radius.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.cardWhite,
  },
  infoCard: {
    backgroundColor: colors.cardWhite,
    borderRadius: radius.xxl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: spacing.lg,
    ...shadows.soft,
  },
  infoCardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.maroonPrimary,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  infoIconBadge: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.creamBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textDark,
    marginTop: 2,
    lineHeight: 20,
  },
  storePhotoCard: {
    height: 180,
    backgroundColor: colors.maroonDark,
    borderRadius: radius.xxl,
    overflow: 'hidden',
    marginBottom: spacing.lg,
    justifyContent: 'flex-end',
    ...shadows.card,
  },
  storePhotoOverlay: {
    padding: spacing.xl,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  storeTag: {
    fontSize: 11,
    color: colors.goldLight,
    fontWeight: '700',
  },
  storeTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.cardWhite,
    marginVertical: 4,
  },
  viewMapsBtn: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    backgroundColor: colors.cardWhite,
    borderRadius: radius.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
  },
  viewMapsBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.maroonPrimary,
  },
  supportBox: {
    backgroundColor: colors.goldSoft,
    borderRadius: radius.xxl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.goldPrimary,
    marginBottom: spacing.xl,
  },
  supportHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  supportIconCircle: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.goldLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  supportTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textDark,
  },
  supportSub: {
    fontSize: 12,
    color: colors.textDark,
    marginTop: 2,
  },
  supportBtnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  supportCallBtn: {
    flex: 0.48,
    flexDirection: 'row',
    height: 42,
    backgroundColor: colors.cardWhite,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.maroonPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  supportCallText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.maroonPrimary,
  },
  supportWhatsappBtn: {
    flex: 0.48,
    flexDirection: 'row',
    height: 42,
    backgroundColor: colors.cardWhite,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.maroonPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  supportWhatsappText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.maroonPrimary,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  footerText: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 8,
  },
  securityIconsRow: {
    flexDirection: 'row',
  },
});
