import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Linking,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { OFFICIAL_SHOP_INFO } from '@/constants/shopData';
import { PrivacyPolicyContent } from '@/types/privacy';

const privacyPolicyData: PrivacyPolicyContent = {
  title: 'Privacy Policy',
  commitmentText:
    "At Ramya's Jeweller, we cherish the trust you place in us as much as the gold you purchase. Your privacy is not just a policy; it is our promise to protect your personal and financial information with the highest level of integrity and care.",
  lastUpdatedDate: '18 September 2026',
  contactPhone: OFFICIAL_SHOP_INFO.phone,
  contactEmail: OFFICIAL_SHOP_INFO.email,
  sections: [
    {
      id: 'data_we_collect',
      title: 'Data We Collect',
      iconName: 'server-outline',
      description:
        'To provide a seamless jewellery shopping and savings experience, we collect only the essential information required for managing your account:',
      items: [
        {
          id: '1',
          title: 'Full Name',
          description: 'Used to identify your savings account and for scheme record keeping.',
        },
        {
          id: '2',
          title: 'Mobile Number',
          description:
            'Primary contact for account login, transaction alerts, installment reminders, and customer support.',
        },
        {
          id: '3',
          title: 'Address & Location',
          description: 'Used for showroom record keeping and scheme enrollment verification.',
        },
        {
          id: '4',
          title: 'Nominee Information',
          description:
            'Nominee name and relationship stored as shop records for scheme documentation.',
        },
        {
          id: '5',
          title: 'Scheme & Payment Records',
          description:
            'Monthly installment payment history, bonus eligibility, and passbook statements.',
        },
        {
          id: '6',
          title: 'App Preferences',
          description: 'Selected language preference for localized application experience.',
        },
      ],
    },
    {
      id: 'information_protection',
      title: 'Information Protection',
      iconName: 'shield-checkmark-outline',
      description:
        'Your data is secured through strict access controls and administrative protocols. We ensure that your personal information is accessible only to authorized showroom personnel for processing transactions and updating passbook records.',
      highlightText: 'Your data is never sold or shared with third parties for marketing purposes.',
    },
    {
      id: 'data_usage',
      title: 'How We Use Your Data',
      iconName: 'document-text-outline',
      description: 'The information collected is strictly utilized for the following purposes:',
      items: [
        {
          id: 'u1',
          title: 'Savings Scheme Management',
          description: 'Enrolling, tracking, and maintaining your gold savings plan.',
        },
        {
          id: 'u2',
          title: 'Installment & Passbook Records',
          description: 'Recording monthly payments and providing digital passbook statements.',
        },
        {
          id: 'u3',
          title: 'Notifications & Communications',
          description: 'Sending payment reminders, gold rate updates, and shop announcements.',
        },
        {
          id: 'u4',
          title: 'Showroom & Customer Support',
          description: 'Assisting with inquiries, gold redemption, and scheme maturity benefits.',
        },
      ],
    },
  ],
};

export default function PrivacyPolicyScreen() {
  const router = useRouter();

  const handleCallSupport = () => {
    const cleanNumber = privacyPolicyData.contactPhone.replace(/[^0-9+]/g, '');
    Linking.openURL(`tel:${cleanNumber}`).catch(() => {
      const msg = `Please call support at ${privacyPolicyData.contactPhone}`;
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Call Support', msg);
      }
    });
  };

  const handleEmailSupport = () => {
    Linking.openURL(`mailto:${privacyPolicyData.contactEmail}`).catch(() => {
      const msg = `Please email support at ${privacyPolicyData.contactEmail}`;
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
          accessibilityLabel="Back"
        >
          <Ionicons name="arrow-back" size={24} color="#70001E" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{privacyPolicyData.title}</Text>
        <View style={styles.headerRightSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* OUR COMMITMENT SECTION */}
        <View style={styles.commitmentContainer}>
          <Text style={styles.sectionHeaderTitle}>Our Commitment</Text>
          <Text style={styles.commitmentText}>{privacyPolicyData.commitmentText}</Text>
        </View>

        {/* DATA WE COLLECT CARD */}
        {privacyPolicyData.sections
          .filter((s) => s.id === 'data_we_collect')
          .map((section) => (
            <View key={section.id} style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.iconCircle}>
                  <Ionicons name={section.iconName as never} size={20} color="#70001E" />
                </View>
                <Text style={styles.cardTitle}>{section.title}</Text>
              </View>

              {section.description && (
                <Text style={styles.cardDescription}>{section.description}</Text>
              )}

              {section.items && (
                <View style={styles.itemList}>
                  {section.items.map((item) => (
                    <View key={item.id} style={styles.itemRow}>
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={18}
                        color="#70001E"
                        style={styles.itemIcon}
                      />
                      <View style={styles.itemTextCol}>
                        <Text style={styles.itemTitle}>{item.title}</Text>
                        <Text style={styles.itemDescription}>{item.description}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}

        {/* INFORMATION PROTECTION CARD */}
        {privacyPolicyData.sections
          .filter((s) => s.id === 'information_protection')
          .map((section) => (
            <View key={section.id} style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.iconCircle}>
                  <Ionicons name={section.iconName as never} size={20} color="#70001E" />
                </View>
                <Text style={styles.cardTitle}>{section.title}</Text>
              </View>

              {section.description && (
                <Text style={styles.cardDescription}>{section.description}</Text>
              )}

              {section.highlightText && (
                <View style={styles.highlightBox}>
                  <Ionicons name="shield-checkmark" size={20} color="#854D0E" />
                  <Text style={styles.highlightText}>{section.highlightText}</Text>
                </View>
              )}
            </View>
          ))}

        {/* DATA USAGE CARD */}
        {privacyPolicyData.sections
          .filter((s) => s.id === 'data_usage')
          .map((section) => (
            <View key={section.id} style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.iconCircle}>
                  <Ionicons name={section.iconName as never} size={20} color="#70001E" />
                </View>
                <Text style={styles.cardTitle}>{section.title}</Text>
              </View>

              {section.description && (
                <Text style={styles.cardDescription}>{section.description}</Text>
              )}

              {section.items && (
                <View style={styles.itemList}>
                  {section.items.map((item) => (
                    <View key={item.id} style={styles.itemRow}>
                      <Ionicons
                        name="ellipse"
                        size={8}
                        color="#70001E"
                        style={{ marginTop: 6, marginRight: 8 }}
                      />
                      <View style={styles.itemTextCol}>
                        <Text style={styles.itemTitle}>{item.title}</Text>
                        <Text style={styles.itemDescription}>{item.description}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}

        {/* PRIVACY CONCERNS / CONTACT CARD */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="help-circle-outline" size={20} color="#70001E" />
            </View>
            <Text style={styles.cardTitle}>Privacy Concerns?</Text>
          </View>

          <Text style={styles.cardDescription}>
            If you have questions about how we handle your data or wish to update your
            information, please contact our support team.
          </Text>

          <View style={styles.contactList}>
            {/* CALL SUPPORT */}
            <TouchableOpacity
              style={styles.contactRow}
              onPress={handleCallSupport}
              activeOpacity={0.7}
            >
              <View style={styles.contactIconCircle}>
                <Ionicons name="call-outline" size={18} color="#70001E" />
              </View>
              <View style={styles.contactTextCol}>
                <Text style={styles.contactLabel}>Call Us</Text>
                <Text style={styles.contactValue}>{privacyPolicyData.contactPhone}</Text>
              </View>
            </TouchableOpacity>

            {/* EMAIL SUPPORT */}
            <TouchableOpacity
              style={styles.contactRow}
              onPress={handleEmailSupport}
              activeOpacity={0.7}
            >
              <View style={styles.contactIconCircle}>
                <Ionicons name="mail-outline" size={18} color="#70001E" />
              </View>
              <View style={styles.contactTextCol}>
                <Text style={styles.contactLabel}>Email Us</Text>
                <Text style={styles.contactValue}>{privacyPolicyData.contactEmail}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* LAST UPDATED */}
        <Text style={styles.lastUpdatedText}>
          Last Updated: {privacyPolicyData.lastUpdatedDate}
        </Text>
      </ScrollView>

      {/* BOTTOM TAB BAR */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => router.push('/(tabs)')}
          activeOpacity={0.7}
        >
          <Ionicons name="home-outline" size={18} color="#64748B" />
          <Text style={styles.tabText}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => router.push('/(tabs)/passbook')}
          activeOpacity={0.7}
        >
          <Ionicons name="book-outline" size={18} color="#64748B" />
          <Text style={styles.tabText}>Passbook</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => router.push('/(tabs)/notifications')}
          activeOpacity={0.7}
        >
          <Ionicons name="megaphone-outline" size={18} color="#64748B" />
          <Text style={styles.tabText}>Updates</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => router.push('/(tabs)/profile')}
          activeOpacity={0.7}
        >
          <Ionicons name="person-outline" size={18} color="#64748B" />
          <Text style={styles.tabText}>Profile</Text>
        </TouchableOpacity>
      </View>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 16,
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
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  cardDescription: {
    fontSize: 13.5,
    lineHeight: 20,
    color: '#64748B',
    marginBottom: 14,
  },
  itemList: {
    gap: 12,
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
    marginTop: 4,
  },
  highlightText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '700',
    color: '#854D0E',
    lineHeight: 18,
  },
  contactList: {
    gap: 12,
    marginTop: 4,
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
    gap: 4,
  },
  tabText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
  },
});
