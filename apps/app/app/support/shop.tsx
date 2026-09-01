import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, radius, shadows, spacing } from '../../theme';
import {
  ArrowLeft,
  Share2,
  Phone,
  MessageSquare,
  Compass,
  MapPin,
  Clock,
  Calendar,
  Mail,
  Headphones,
  Check,
  Star,
  BookOpen,
} from 'lucide-react-native';

export default function VisitShopScreen() {
  const router = useRouter();

  const handleCall = () => {
    Linking.openURL('tel:+919876543210');
  };

  const handleWhatsApp = () => {
    Linking.openURL('https://wa.me/919876543210');
  };

  const handleDirections = () => {
    Linking.openURL('https://maps.google.com/?q=Ramyas+Jeweller+Coimbatore');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={20} color={colors.maroonPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Visit Our Shop</Text>
        <TouchableOpacity style={styles.shareButton}>
          <Share2 size={20} color={colors.maroonPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Main Showroom Card */}
        <View style={styles.mainShowroomCard}>
          <View style={styles.logoBadgeCircle}>
            <Text style={styles.logoDiamondText}>◆</Text>
          </View>

          <Text style={styles.shopTitle}>Ramyas Jeweller</Text>

          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Star key={star} size={14} color="#F59E0B" fill="#F59E0B" style={{ marginRight: 2 }} />
            ))}
            <Text style={styles.ratingText}>Trusted Since 1995</Text>
          </View>

          <Text style={styles.taglineText}>Premium Jewellery Savings Partner</Text>

          <View style={styles.openPill}>
            <View style={styles.greenDot} />
            <Text style={styles.openPillText}>Open Now • Closes at 8:30 PM</Text>
            <Check size={14} color="#166534" style={{ marginLeft: 4 }} />
          </View>
        </View>

        {/* 3 Maroon Action Buttons */}
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity style={styles.actionMaroonButton} onPress={handleCall} activeOpacity={0.85}>
            <Phone size={18} color="#FFF" style={{ marginBottom: 4 }} />
            <Text style={styles.actionButtonText}>Call Shop</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionMaroonButton} onPress={handleWhatsApp} activeOpacity={0.85}>
            <MessageSquare size={18} color="#FFF" style={{ marginBottom: 4 }} />
            <Text style={styles.actionButtonText}>WhatsApp</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionMaroonButton} onPress={handleDirections} activeOpacity={0.85}>
            <Compass size={18} color="#FFF" style={{ marginBottom: 4 }} />
            <Text style={styles.actionButtonText}>Directions</Text>
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
          <View style={[styles.infoRow, { marginBottom: 0 }]}>
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
        <View style={styles.flagshipCard}>
          <View style={styles.flagshipOverlay}>
            <Text style={styles.flagshipTag}>Our Flagship Store</Text>
            <Text style={styles.flagshipTitle}>Coimbatore Main</Text>
            <TouchableOpacity style={styles.viewMapButton} onPress={handleDirections} activeOpacity={0.85}>
              <BookOpen size={16} color="#7A0C2E" style={{ marginRight: 6 }} />
              <Text style={styles.viewMapText}>View on Maps</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Support Available Yellow Box */}
        <View style={styles.supportBox}>
          <View style={styles.supportHeaderRow}>
            <View style={styles.headsetYellowBadge}>
              <Headphones size={20} color="#78350F" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.supportTitle}>Need Help? Support Available</Text>
              <Text style={styles.supportSub}>Average Response: Under 10 Minutes</Text>
            </View>
          </View>

          <View style={styles.supportButtonsContainer}>
            <TouchableOpacity style={styles.supportOutlineButton} onPress={handleCall}>
              <Phone size={16} color="#7A0C2E" style={{ marginRight: 6 }} />
              <Text style={styles.supportOutlineText}>Call Support</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.supportOutlineButton} onPress={handleWhatsApp}>
              <MessageSquare size={16} color="#7A0C2E" style={{ marginRight: 6 }} />
              <Text style={styles.supportOutlineText}>WhatsApp</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footerSection}>
          <Text style={styles.footerText}>
            Thank you for choosing Ramyas Jeweller. Trusted by thousands of families.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#7A0C2E',
  },
  shareButton: {
    padding: spacing.xs,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 40,
  },
  mainShowroomCard: {
    backgroundColor: '#FFF',
    borderRadius: radius.xxl,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  logoBadgeCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#7A0C2E',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  logoDiamondText: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  shopTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#7A0C2E',
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  ratingText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
    marginLeft: 6,
  },
  taglineText: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  openPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: spacing.lg,
    paddingVertical: 8,
    borderRadius: radius.full,
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16A34A',
    marginRight: 6,
  },
  openPillText: {
    color: '#166534',
    fontSize: 12,
    fontWeight: '700',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  actionMaroonButton: {
    flex: 1,
    backgroundColor: '#7A0C2E',
    borderRadius: radius.xl,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  infoCard: {
    backgroundColor: '#FFF',
    borderRadius: radius.xxl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: spacing.xl,
    ...shadows.sm,
  },
  infoCardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#7A0C2E',
    marginBottom: spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  infoIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FDF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textDark,
    marginTop: 2,
    lineHeight: 20,
  },
  flagshipCard: {
    height: 180,
    borderRadius: radius.xxl,
    backgroundColor: '#3F071B',
    overflow: 'hidden',
    marginBottom: spacing.xl,
    justifyContent: 'flex-end',
  },
  flagshipOverlay: {
    padding: spacing.xl,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  flagshipTag: {
    color: '#FACC15',
    fontSize: 12,
    fontWeight: '700',
  },
  flagshipTitle: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: spacing.md,
  },
  viewMapButton: {
    backgroundColor: '#FFF',
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: 8,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewMapText: {
    color: '#7A0C2E',
    fontSize: 13,
    fontWeight: '800',
  },
  supportBox: {
    backgroundColor: '#FFFDF0',
    borderRadius: radius.xxl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: '#FEF08A',
    marginBottom: spacing.xl,
  },
  supportHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  headsetYellowBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  supportTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textDark,
  },
  supportSub: {
    fontSize: 12,
    color: '#78350F',
    marginTop: 2,
    fontWeight: '500',
  },
  supportButtonsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  supportOutlineButton: {
    flex: 1,
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: '#7A0C2E',
    borderRadius: radius.lg,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  supportOutlineText: {
    color: '#7A0C2E',
    fontSize: 13,
    fontWeight: '800',
  },
  footerSection: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  footerText: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
