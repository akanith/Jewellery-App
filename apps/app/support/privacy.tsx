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
  Database,
  Shield,
  HelpCircle,
  CheckCircle2,
  Phone,
  Mail,
  ShieldCheck,
} from 'lucide-react-native';

export default function PrivacyPolicyScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={20} color={colors.maroonPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Commitment Header */}
        <View style={styles.commitmentSection}>
          <Text style={styles.mainTitle}>Our Commitment</Text>
          <Text style={styles.commitmentText}>
            At Ramyas Jeweller, we cherish the trust you place in us as much as the gold you purchase.
            Your privacy is not just a policy; it is our promise to protect your personal and financial
            information with the highest level of integrity and care.
          </Text>
        </View>

        {/* Section 1: Data We Collect */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.iconBadge}>
              <Database size={20} color={colors.maroonPrimary} />
            </View>
            <Text style={styles.cardTitle}>Data We Collect</Text>
          </View>

          <Text style={styles.cardSubtext}>
            To provide a seamless jewellery shopping and savings experience, we collect the following essential information:
          </Text>

          <View style={styles.checkItemRow}>
            <CheckCircle2 size={18} color={colors.maroonPrimary} style={styles.checkIcon} />
            <View style={{ flex: 1 }}>
              <Text style={styles.checkItemTitle}>Full Name</Text>
              <Text style={styles.checkItemDesc}>Used to identify your account and for legal invoicing.</Text>
            </View>
          </View>

          <View style={styles.checkItemRow}>
            <CheckCircle2 size={18} color={colors.maroonPrimary} style={styles.checkIcon} />
            <View style={{ flex: 1 }}>
              <Text style={styles.checkItemTitle}>Phone Number</Text>
              <Text style={styles.checkItemDesc}>Primary contact for transaction alerts and account verification.</Text>
            </View>
          </View>

          <View style={styles.checkItemRow}>
            <CheckCircle2 size={18} color={colors.maroonPrimary} style={styles.checkIcon} />
            <View style={{ flex: 1 }}>
              <Text style={styles.checkItemTitle}>Identification Proof (ID)</Text>
              <Text style={styles.checkItemDesc}>Required for compliance with gold purchase regulations and KYC.</Text>
            </View>
          </View>
        </View>

        {/* Section 2: Information Protection */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.iconBadge}>
              <Shield size={20} color={colors.maroonPrimary} />
            </View>
            <Text style={styles.cardTitle}>Information Protection</Text>
          </View>

          <Text style={styles.cardSubtext}>
            Your data is secured using bank-grade encryption technology. We ensure that your personal
            information is strictly accessible only to authorized personnel for processing transactions.
          </Text>

          <View style={styles.protectionPill}>
            <ShieldCheck size={18} color="#854D0E" style={{ marginRight: 10 }} />
            <Text style={styles.protectionPillText}>
              Your data is never shared with third parties for marketing purposes.
            </Text>
          </View>
        </View>

        {/* Section 3: Privacy Concerns */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.iconBadge}>
              <HelpCircle size={20} color={colors.maroonPrimary} />
            </View>
            <Text style={styles.cardTitle}>Privacy Concerns?</Text>
          </View>

          <Text style={styles.cardSubtext}>
            If you have questions about how we handle your data or wish to update your information, please contact our support team.
          </Text>

          <View style={styles.contactRow}>
            <View style={styles.contactIconBadge}>
              <Phone size={16} color={colors.maroonPrimary} />
            </View>
            <View>
              <Text style={styles.contactLabel}>Call Us</Text>
              <Text style={styles.contactValue}>+91 98765 43210</Text>
            </View>
          </View>

          <View style={styles.contactRow}>
            <View style={styles.contactIconBadge}>
              <Mail size={16} color={colors.maroonPrimary} />
            </View>
            <View>
              <Text style={styles.contactLabel}>Email Us</Text>
              <Text style={styles.contactValue}>privacy@ramyasjeweller.com</Text>
            </View>
          </View>
        </View>

        <Text style={styles.footerDate}>Last Updated: 24 May 2024</Text>
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
  commitmentSection: {
    marginBottom: spacing.xl,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.maroonPrimary,
    marginBottom: spacing.sm,
  },
  commitmentText: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 22,
  },
  card: {
    backgroundColor: colors.cardWhite,
    borderRadius: radius.xxl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: spacing.lg,
    ...shadows.soft,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: radius.lg,
    backgroundColor: colors.creamBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textDark,
  },
  cardSubtext: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  checkItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.md,
  },
  checkIcon: {
    marginRight: spacing.md,
    marginTop: 2,
  },
  checkItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textDark,
  },
  checkItemDesc: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
    lineHeight: 18,
  },
  protectionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEFCE8',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.xs,
  },
  protectionPillText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#854D0E',
    lineHeight: 18,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  contactIconBadge: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.creamBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  contactLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  contactValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textDark,
    marginTop: 2,
  },
  footerDate: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
