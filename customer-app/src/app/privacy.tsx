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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { OFFICIAL_SHOP_INFO, OFFICIAL_SCHEME_NAME } from '@/constants/shopData';
import { useLanguage } from '@/i18n';
import { useResponsiveMetrics } from '@/constants/responsive';

const WEB_PRIVACY_URL = 'https://ramyas-jewellery-app.vercel.app/privacy';

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const responsive = useResponsiveMetrics();

  const handleOpenWebPrivacy = () => {
    Linking.openURL(WEB_PRIVACY_URL).catch(() => {
      const msg = `Please visit ${WEB_PRIVACY_URL} in your browser.`;
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Web Privacy Policy', msg);
      }
    });
  };

  const handleCallSupport = () => {
    const cleanNumber = OFFICIAL_SHOP_INFO.phone.replace(/[^0-9+]/g, '');
    Linking.openURL(`tel:${cleanNumber}`).catch(() => {
      const msg = `Please call support at ${OFFICIAL_SHOP_INFO.phone}`;
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Call Support', msg);
      }
    });
  };

  const handleEmailSupport = () => {
    Linking.openURL(`mailto:${OFFICIAL_SHOP_INFO.email}`).catch(() => {
      const msg = `Please email support at ${OFFICIAL_SHOP_INFO.email}`;
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Email Support', msg);
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

        <Text style={styles.headerTitle}>{t('privacyPolicy')}</Text>
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
        {/* OUR COMMITMENT SECTION */}
        <View style={styles.commitmentContainer}>
          <Text style={styles.sectionHeaderTitle}>{t('ourCommitment')}</Text>
          <Text style={styles.commitmentText}>{t('commitmentText')}</Text>
        </View>

        {/* WEB PRIVACY POLICY BUTTON */}
        <TouchableOpacity
          style={styles.webPolicyButton}
          onPress={handleOpenWebPrivacy}
          activeOpacity={0.8}
        >
          <Ionicons name="globe-outline" size={20} color="#70001E" />
          <Text style={styles.webPolicyButtonText}>{t('viewFullPrivacyPolicy')}</Text>
          <Ionicons name="open-outline" size={16} color="#70001E" />
        </TouchableOpacity>

        {/* SECTION 1: PRIVACY POLICY STATEMENT */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#70001E" />
            </View>
            <Text style={styles.cardTitle}>1. Privacy Policy Overview</Text>
          </View>
          <Text style={styles.cardDescription}>
            This Privacy Policy governs the collection, storage, and processing of customer personal data by {OFFICIAL_SHOP_INFO.name} for the {OFFICIAL_SCHEME_NAME}. We are committed to maintaining data confidentiality and transparency.
          </Text>
        </View>

        {/* SECTION 2: INFORMATION WE COLLECT */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="server-outline" size={20} color="#70001E" />
            </View>
            <Text style={styles.cardTitle}>2. Information We Collect</Text>
          </View>
          <Text style={styles.cardDescription}>
            We collect essential customer identification and contact details required to maintain your savings passbook:
          </Text>
          <View style={styles.itemList}>
            <View style={styles.itemRow}>
              <Ionicons name="checkmark-circle-outline" size={18} color="#70001E" style={styles.itemIcon} />
              <View style={styles.itemTextCol}>
                <Text style={styles.itemTitle}>Full Name &amp; Mobile Number</Text>
                <Text style={styles.itemDescription}>Used for account identification, secure login authentication, and scheme notifications.</Text>
              </View>
            </View>
            <View style={styles.itemRow}>
              <Ionicons name="checkmark-circle-outline" size={18} color="#70001E" style={styles.itemIcon} />
              <View style={styles.itemTextCol}>
                <Text style={styles.itemTitle}>Address &amp; Nominee Details</Text>
                <Text style={styles.itemDescription}>Stored for showroom documentation, scheme enrollment records, and family nominee reference.</Text>
              </View>
            </View>
          </View>
        </View>

        {/* SECTION 3: SCHEME SPECIFIC INFORMATION */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="ribbon-outline" size={20} color="#70001E" />
            </View>
            <Text style={styles.cardTitle}>3. Information Used for Savings Scheme</Text>
          </View>
          <Text style={styles.cardDescription}>
            Information collected is strictly associated with your {OFFICIAL_SCHEME_NAME} account, including passbook numbers, monthly installment ledger entries, and maturity bonus eligibility records.
          </Text>
        </View>

        {/* SECTION 4: HOW WE USE INFORMATION */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="document-text-outline" size={20} color="#70001E" />
            </View>
            <Text style={styles.cardTitle}>4. How We Use Information</Text>
          </View>
          <View style={styles.itemList}>
            <View style={styles.itemRow}>
              <Ionicons name="ellipse" size={8} color="#70001E" style={{ marginTop: 6, marginRight: 8 }} />
              <View style={styles.itemTextCol}>
                <Text style={styles.itemTitle}>Scheme Administration</Text>
                <Text style={styles.itemDescription}>Enrolling accounts, recording monthly installment payments, and tracking completion bonuses.</Text>
              </View>
            </View>
            <View style={styles.itemRow}>
              <Ionicons name="ellipse" size={8} color="#70001E" style={{ marginTop: 6, marginRight: 8 }} />
              <View style={styles.itemTextCol}>
                <Text style={styles.itemTitle}>Customer Support &amp; Service</Text>
                <Text style={styles.itemDescription}>Assisting with passbook inquiries, gold rate updates, showroom redemption, and account support.</Text>
              </View>
            </View>
          </View>
        </View>

        {/* SECTION 5: AUTHENTICATION AND SECURITY */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="lock-closed-outline" size={20} color="#70001E" />
            </View>
            <Text style={styles.cardTitle}>5. Authentication &amp; Account Security</Text>
          </View>
          <Text style={styles.cardDescription}>
            Authentication is secured via encrypted session bearer tokens issued by our Backend-For-Frontend (BFF) architecture. Passwords are set securely by customers, and account access is restricted to verified customer sessions.
          </Text>
        </View>

        {/* SECTION 6: PAYMENT & TRANSACTION INFORMATION */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="cash-outline" size={20} color="#70001E" />
            </View>
            <Text style={styles.cardTitle}>6. Payment &amp; Transaction Information</Text>
          </View>
          <Text style={styles.cardDescription}>
            Payments are made at the showroom and recorded manually by authorized staff into digital passbooks. The app does not collect credit card numbers, net banking credentials, or bank account passwords.
          </Text>
        </View>

        {/* SECTION 7: DATA STORAGE AND PROCESSING */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="cloud-outline" size={20} color="#70001E" />
            </View>
            <Text style={styles.cardTitle}>7. Data Storage &amp; Processing</Text>
          </View>
          <Text style={styles.cardDescription}>
            Customer data is stored securely in encrypted cloud database infrastructure with strict row-level security (RLS) policies and role-based access controls to prevent unauthorized access.
          </Text>
        </View>

        {/* SECTION 8: DATA SHARING */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="share-social-outline" size={20} color="#70001E" />
            </View>
            <Text style={styles.cardTitle}>8. Data Sharing</Text>
          </View>
          <Text style={styles.cardDescription}>
            We DO NOT sell, rent, trade, or commercialize customer personal data with any third-party marketing companies. Data is shared only with authorized showroom management and systems necessary for scheme operations.
          </Text>
          <View style={styles.highlightBox}>
            <Ionicons name="shield-checkmark" size={20} color="#854D0E" />
            <Text style={styles.highlightText}>Your data is never sold or shared with third parties for marketing purposes.</Text>
          </View>
        </View>

        {/* SECTION 9: DATA RETENTION */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="time-outline" size={20} color="#70001E" />
            </View>
            <Text style={styles.cardTitle}>9. Data Retention</Text>
          </View>
          <Text style={styles.cardDescription}>
            Customer profile records and scheme ledger transactions are retained for the duration of the active savings scheme and subsequently retained as required for legal, tax, accounting, and audit compliance.
          </Text>
        </View>

        {/* SECTION 10: ACCOUNT DELETION REQUESTS */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="trash-outline" size={20} color="#70001E" />
            </View>
            <Text style={styles.cardTitle}>10. Account Deletion Requests</Text>
          </View>
          <Text style={styles.cardDescription}>
            Customers may request deletion of their Ramyas Jeweller Customer App account by contacting Ramyas Jeweller via phone, WhatsApp, or visiting our showroom. Showroom staff will verify customer identity before processing the request. Certain financial ledgers and transaction records are retained where legitimately required for business, accounting, tax, or statutory compliance.
          </Text>
          <TouchableOpacity
            style={styles.inlineLinkButton}
            onPress={() => router.push('/delete-account' as any)}
            activeOpacity={0.7}
          >
            <Text style={styles.inlineLinkText}>Account Deletion Information  →</Text>
          </TouchableOpacity>
        </View>

        {/* SECTION 11: CHILDREN'S PRIVACY */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="people-outline" size={20} color="#70001E" />
            </View>
            <Text style={styles.cardTitle}>11. Children&apos;s Privacy</Text>
          </View>
          <Text style={styles.cardDescription}>
            The application is intended for adult customers participating in the jewellery savings scheme. We do not knowingly collect personal data directly from minors under the age of 18.
          </Text>
        </View>

        {/* SECTION 12: SECURITY */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="key-outline" size={20} color="#70001E" />
            </View>
            <Text style={styles.cardTitle}>12. Security Measures</Text>
          </View>
          <Text style={styles.cardDescription}>
            We employ industry-standard encryption protocols (HTTPS/TLS), rate-limiting safeguards, account locking after failed login attempts, and strict session isolation to safeguard customer data.
          </Text>
        </View>

        {/* SECTION 13: CHANGES TO THIS PRIVACY POLICY */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="create-outline" size={20} color="#70001E" />
            </View>
            <Text style={styles.cardTitle}>13. Changes to This Policy</Text>
          </View>
          <Text style={styles.cardDescription}>
            {OFFICIAL_SHOP_INFO.name} reserves the right to update this Privacy Policy. Any updates will be reflected in the app with the revised date statement.
          </Text>
        </View>

        {/* SECTION 14: CONTACT INFORMATION */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="help-circle-outline" size={20} color="#70001E" />
            </View>
            <Text style={styles.cardTitle}>14. Contact Information</Text>
          </View>
          <Text style={styles.cardDescription}>
            {t('privacyConcernsSub')}
          </Text>

          <View style={styles.contactList}>
            <TouchableOpacity style={styles.contactRow} onPress={handleCallSupport} activeOpacity={0.7}>
              <View style={styles.contactIconCircle}>
                <Ionicons name="call-outline" size={18} color="#70001E" />
              </View>
              <View style={styles.contactTextCol}>
                <Text style={styles.contactLabel}>{t('callUs')}</Text>
                <Text style={styles.contactValue}>{OFFICIAL_SHOP_INFO.phone}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.contactRow} onPress={handleEmailSupport} activeOpacity={0.7}>
              <View style={styles.contactIconCircle}>
                <Ionicons name="mail-outline" size={18} color="#70001E" />
              </View>
              <View style={styles.contactTextCol}>
                <Text style={styles.contactLabel}>{t('emailUs')}</Text>
                <Text style={styles.contactValue}>{OFFICIAL_SHOP_INFO.email}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* LAST UPDATED */}
        <Text style={styles.lastUpdatedText}>
          {t('lastUpdated')}: 18 September 2026
        </Text>
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
    gap: 14,
  },
  commitmentContainer: {
    marginBottom: 4,
  },
  sectionHeaderTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#70001E',
    marginBottom: 8,
  },
  commitmentText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#475569',
    fontWeight: '400',
  },
  webPolicyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FDF2F8',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCE7F3',
    gap: 8,
  },
  webPolicyButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#70001E',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FDF2F8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  cardDescription: {
    fontSize: 13.5,
    lineHeight: 20,
    color: '#64748B',
    marginBottom: 8,
  },
  itemList: {
    gap: 10,
    marginTop: 4,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  itemIcon: {
    marginTop: 2,
    marginRight: 10,
  },
  itemTextCol: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  itemDescription: {
    fontSize: 12.5,
    lineHeight: 18,
    color: '#64748B',
  },
  highlightBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 10,
    marginTop: 8,
  },
  highlightText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '700',
    color: '#854D0E',
    lineHeight: 18,
  },
  inlineLinkButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  inlineLinkText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#70001E',
  },
  contactList: {
    gap: 10,
    marginTop: 8,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  contactIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FDF2F8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactTextCol: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  contactValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  lastUpdatedText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
    marginTop: 8,
  },
});
