import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, radius, shadows, spacing } from '../theme';
import {
  ArrowLeft,
  Search,
  ChevronDown,
  ChevronUp,
  Phone,
  MessageSquare,
  Headphones,
} from 'lucide-react-native';

export default function HelpCenterScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const faqs = [
    {
      question: 'How do I pay?',
      answer:
        'You can pay your monthly installments directly at our showroom cash counter by Cash, UPI, or Card. Show your Customer ID or registered mobile number.',
    },
    {
      question: 'When will my scheme mature?',
      answer:
        'Your scheme matures upon completion of 12 monthly installments. You can view your exact maturity date on your Home Dashboard and Digital Passbook.',
    },
    {
      question: 'Can I pay late?',
      answer:
        'Yes, you can pay overdue installments at the shop. However, paying on time ensures you remain eligible for the full Shop Bonus at maturity.',
    },
    {
      question: 'How do I download my passbook?',
      answer:
        'Go to the Passbook tab in the app and tap "Download Passbook" to save your official PDF ledger.',
    },
    {
      question: 'How do I change my password?',
      answer:
        'Go to the Profile tab, select "Change Password" under Quick Actions, enter your current password, and choose a new password.',
    },
  ];

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={20} color={colors.maroonPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help Center</Text>
        <Search size={20} color={colors.maroonPrimary} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Search Bar */}
        <View style={styles.searchBarContainer}>
          <Search size={18} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for help"
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Popular Questions Section */}
        <Text style={styles.sectionTitle}>Popular Questions</Text>

        <View style={styles.faqList}>
          {faqs.map((faq, index) => {
            const isExpanded = expandedIndex === index;
            return (
              <View key={index} style={styles.faqCard}>
                <TouchableOpacity
                  style={styles.faqHeader}
                  onPress={() => toggleExpand(index)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.questionText}>{faq.question}</Text>
                  {isExpanded ? (
                    <ChevronUp size={20} color={colors.textDark} />
                  ) : (
                    <ChevronDown size={20} color={colors.textDark} />
                  )}
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.faqBody}>
                    <Text style={styles.answerText}>{faq.answer}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Still Need Help Card */}
        <View style={styles.stillNeedHelpCard}>
          <Text style={styles.helpTitle}>Still need help?</Text>
          <Text style={styles.helpSub}>Our support team is here to assist you.</Text>

          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.callShopBtn}>
              <Phone size={16} color={colors.cardWhite} style={{ marginRight: 6 }} />
              <Text style={styles.btnText}>Call Shop</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.whatsappShopBtn}>
              <MessageSquare size={16} color={colors.cardWhite} style={{ marginRight: 6 }} />
              <Text style={styles.btnText}>WhatsApp Shop</Text>
            </TouchableOpacity>
          </View>

          {/* Headset Graphic Icon */}
          <View style={styles.headsetCircle}>
            <Headphones size={44} color="#CBD5E1" />
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
    fontSize: 20,
    fontWeight: '800',
    color: colors.maroonPrimary,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardWhite,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    height: 52,
    borderWidth: 1,
    borderColor: colors.borderInput,
    marginBottom: spacing.xl,
    ...shadows.soft,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.textDark,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textDark,
    marginBottom: spacing.lg,
  },
  faqList: {
    marginBottom: spacing.xxl,
  },
  faqCard: {
    backgroundColor: colors.cardWhite,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...shadows.soft,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
  },
  questionText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textDark,
    flex: 1,
    marginRight: 8,
  },
  faqBody: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingTop: spacing.md,
  },
  answerText: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
  },
  stillNeedHelpCard: {
    backgroundColor: colors.cardWhite,
    borderRadius: radius.xxl,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: 'hidden',
    position: 'relative',
    ...shadows.soft,
  },
  helpTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textDark,
  },
  helpSub: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
    marginBottom: spacing.xl,
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    zIndex: 2,
    marginBottom: spacing.lg,
  },
  callShopBtn: {
    flex: 0.48,
    flexDirection: 'row',
    height: 48,
    backgroundColor: colors.maroonPrimary,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  whatsappShopBtn: {
    flex: 0.48,
    flexDirection: 'row',
    height: 48,
    backgroundColor: colors.maroonPrimary,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.cardWhite,
  },
  headsetCircle: {
    width: 80,
    height: 80,
    borderRadius: radius.full,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.md,
  },
});
