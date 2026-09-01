import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, radius, shadows, spacing } from '../../theme';
import {
  ArrowLeft,
  Search,
  ChevronDown,
  ChevronUp,
  Phone,
  MessageSquare,
  Headphones,
} from 'lucide-react-native';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

const FAQ_DATA: FAQItem[] = [
  {
    id: '1',
    question: 'How do I pay?',
    answer: 'You can pay your monthly installment directly at our shop in person or via bank transfer. Our staff will update your passbook immediately.',
  },
  {
    id: '2',
    question: 'When will my scheme mature?',
    answer: 'Your scheme matures upon completing all 12 monthly installments. You can then redeem your total accumulated value plus shop bonus for gold jewellery.',
  },
  {
    id: '3',
    question: 'Can I pay late?',
    answer: 'Installments are due monthly. A grace period is available, but timely payments ensure you remain eligible for the full maturity bonus.',
  },
  {
    id: '4',
    question: 'How do I download my passbook?',
    answer: 'Go to the Passbook tab from the bottom navigation or click "Download Passbook PDF" in your Profile settings.',
  },
  {
    id: '5',
    question: 'How do I change my password?',
    answer: 'Customer access uses simple 10-digit registered mobile login. You can contact shop support to update your registered contact details.',
  },
];

export default function HelpCenterScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const filteredFaqs = FAQ_DATA.filter(
    (item) =>
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={20} color={colors.maroonPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help Center</Text>
        <TouchableOpacity style={styles.headerRightButton}>
          <Search size={20} color={colors.maroonPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Search Bar Input */}
        <View style={styles.searchBarContainer}>
          <Search size={18} color="#9CA3AF" style={{ marginRight: 10 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for help"
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Section Header */}
        <Text style={styles.sectionTitle}>Popular Questions</Text>

        {/* Accordion FAQ List */}
        <View style={styles.faqListContainer}>
          {filteredFaqs.map((faq) => {
            const isExpanded = expandedId === faq.id;
            return (
              <View key={faq.id} style={styles.faqCard}>
                <TouchableOpacity
                  style={styles.faqHeaderRow}
                  onPress={() => toggleExpand(faq.id)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.questionText}>{faq.question}</Text>
                  {isExpanded ? (
                    <ChevronUp size={20} color="#4B5563" />
                  ) : (
                    <ChevronDown size={20} color="#4B5563" />
                  )}
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.answerContainer}>
                    <Text style={styles.answerText}>{faq.answer}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Still Need Help Banner Card */}
        <View style={styles.stillNeedCard}>
          <Text style={styles.stillNeedTitle}>Still need help?</Text>
          <Text style={styles.stillNeedSub}>Our support team is here to assist you.</Text>

          <View style={styles.supportButtonsRow}>
            <TouchableOpacity style={styles.supportPillButton} activeOpacity={0.85}>
              <Phone size={16} color="#FFF" style={{ marginRight: 6 }} />
              <Text style={styles.supportPillText}>Call Shop</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.supportPillButton} activeOpacity={0.85}>
              <MessageSquare size={16} color="#FFF" style={{ marginRight: 6 }} />
              <Text style={styles.supportPillText}>WhatsApp Shop</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.headsetCircle}>
            <Headphones size={36} color="#9CA3AF" />
          </View>
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
  headerRightButton: {
    padding: spacing.xs,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 40,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: spacing.xl,
    ...shadows.sm,
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
  faqListContainer: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  faqCard: {
    backgroundColor: '#FFF',
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    ...shadows.sm,
  },
  faqHeaderRow: {
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
    paddingRight: spacing.md,
  },
  answerContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  answerText: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 20,
    marginTop: spacing.sm,
  },
  stillNeedCard: {
    backgroundColor: '#FFF',
    borderRadius: radius.xxl,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...shadows.sm,
  },
  stillNeedTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textDark,
    marginBottom: 4,
  },
  stillNeedSub: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  supportButtonsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  supportPillButton: {
    backgroundColor: '#7A0C2E',
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  supportPillText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  headsetCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.md,
  },
});
