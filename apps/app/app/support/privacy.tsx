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
import { colors, radius, shadows, spacing } from '../../theme';
import {
  ArrowLeft,
  Database,
  CheckCircle,
  Shield,
  ShieldCheck,
  HelpCircle,
  Phone,
  Mail,
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
        {/* Our Commitment Title Section */}
        <Text style={styles.mainTitle}>Our Commitment</Text>
        <Text style={styles.introParagraph}>
          At Ramyas Jeweller, we cherish the trust you place in us as much as the gold you
          purchase. Your privacy is not just a policy; it is our promise to protect your personal
          and financial information with the highest level of integrity and care.
        </Text>

        {/* Card 1: Data We Collect */}
        <View style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <Database size={22} color="#7A0C2E" style={{ marginRight: 10 }} />
            <Text style={styles.cardTitle}>Data We Collect</Text>
          </View>

          <Text style={styles.cardDescText}>
            To provide a seamless jewellery shopping and savings experience, we collect the
            following essential information:
          </Text>

          <View style={styles.checkListItem}>
            <CheckCircle size={18} color="#7A0C2E" style={styles.checkIcon} />
            <View style={{ flex: 1 }}>
              <Text style={styles.checkTitle}>Full Name</Text>
              <Text style={styles.checkSub}>Used to identify your account and for legal invoicing.</Text>
            </View>
          </View>

          <View style={styles.checkListItem}>
            <CheckCircle size={18} color="#7A0C2E" style={styles.checkIcon} />
            <View style={{ flex: 1 }}>
              <Text style={styles.checkTitle}>Phone Number</Text>
              <Text style={styles.checkSub}>Primary contact for transaction alerts and account verification.</Text>
            </View>
          </View>

          <View style={styles.checkListItem}>
            <CheckCircle size={18} color="#7A0C2E" style={styles.checkIcon} />
            <View style={{ flex: 1 }}>
              <Text style={styles.checkTitle}>Identification Proof (ID)</Text>
              <Text style={styles.checkSub}>Required for compliance with gold purchase regulations and KYC.</Text>
            </View>
          </View>
        </View>

        {/* Card 2: Information Protection */}
        <View style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <Shield size={22} color="#7A0C2E" style={{ marginRight: 10 }} />
            <Text style={styles.cardTitle}>Information Protection</Text>
          </View>

          <Text style={styles.cardDescText}>
            Your data is secured using bank-grade encryption technology. We ensure that your personal
            information is strictly accessible only to authorized personnel for processing transactions.
          </Text>

          <View style={styles.yellowCalloutBox}>
            <ShieldCheck size={18} color="#854D0E" style={{ marginRight: 10, marginTop: 2 }} />
            <Text style={styles.yellowCalloutText}>
              Your data is never shared with third parties for marketing purposes.
            </Text>
          </View>
        </View>

        {/* Card 3: Privacy Concerns? */}
        <View style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <HelpCircle size={22} color="#7A0C2E" style={{ marginRight: 10 }} />
            <Text style={styles.cardTitle}>Privacy Concerns?</Text>
          </View>

          <Text style={styles.cardDescText}>
            If you have questions about how we handle your data or wish to update your information,
            please contact our support team.
          </Text>

          <View style={styles.contactRow}>
            <View style={styles.contactIconCircle}>
              <Phone size={18} color="#7A0C2E" />
            </View>
            <View>
              <Text style={styles.contactLabel}>Call Us</Text>
              <Text style={styles.contactValue}>+91 98421 43307</Text>
            </View>
          </View>

          <View style={[styles.contactRow, { marginBottom: 0 }]}>
            <View style={styles.contactIconCircle}>
              <Mail size={18} color="#7A0C2E" />
            </View>
            <View>
              <Text style={styles.contactLabel}>Email Us</Text>
              <Text style={styles.contactValue}>ramyasjeweller@gmail.com</Text>
            </View>
          </View>
        </View>

        <Text style={styles.lastUpdatedText}>Last Updated: 24 May 2024</Text>
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
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 40,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#7A0C2E',
    marginBottom: spacing.md,
  },
  introParagraph: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  sectionCard: {
    backgroundColor: '#FFF',
    borderRadius: radius.xxl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: '#F3E8E8',
    marginBottom: spacing.xl,
    ...shadows.sm,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textDark,
  },
  cardDescText: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  checkListItem: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  checkIcon: {
    marginTop: 2,
    marginRight: 10,
  },
  checkTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textDark,
  },
  checkSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
    lineHeight: 18,
  },
  yellowCalloutBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F4E9',
    borderRadius: radius.md,
    padding: spacing.md,
  },
  yellowCalloutText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#854D0E',
    flex: 1,
    lineHeight: 18,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  contactIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FDF2F2',
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
    marginTop: 1,
  },
  lastUpdatedText: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
});
