import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  TextInput,
  Linking,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { OFFICIAL_SHOP_INFO, OFFICIAL_SCHEME_NAME } from '@/constants/shopData';
import { FAQItem } from '@/types/faq';
import { useLanguage } from '@/i18n';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const getFaqItemsData = (lang: string): FAQItem[] => {
  if (lang === 'ta') {
    return [
      {
        id: 'faq_1',
        question: 'நான் தவணையை எப்படிச் செலுத்துவது?',
        answer:
          'வாடிக்கையாளர்கள் மாதாந்திர ₹1,000 தவணையை ரம்யாஸ் ஜுவல்லரில் செலுத்தலாம். கடை நிர்வாகி தவணையைப் பதிவு செய்தவுடன் உங்கள் டிஜிட்டல் பாஸ்புக்கில் தோன்றும்.',
      },
      {
        id: 'faq_2',
        question: 'எனது திட்டம் எப்போது முதிர்ச்சியடையும்?',
        answer:
          '12 மாதாந்திர தவணைகளும் செலுத்திய பிறகு திட்டம் முதிர்ச்சியடையும். 12வது தவணைக்கு பின் ₹1,000 கடை போனஸ் சேர்க்கப்பட்டு ₹13,000 முதிர்வுத் தொகையாக கிடைக்கும்.',
      },
      {
        id: 'faq_3',
        question: 'நான் தாமதமாகப் பணம் செலுத்தலாமா?',
        answer:
          'தாமதக் கட்டணம் எதுவும் இல்லை. ஒரு மாதம் செலுத்தவில்லை என்றால் அது நிலுவையில் இருக்கும். உங்கள் வசதிக்கேற்ப கடையைத் தொடர்பு கொண்டு செலுத்தலாம்.',
      },
      {
        id: 'faq_4',
        question: 'எனது பாஸ்புக்கை எப்படிப் பதிவிறக்குவது?',
        answer:
          'டிஜிட்டல் பாஸ்புக் திரையில் உள்ள பாஸ்புக் பதிவிறக்கம் விருப்பத்தைப் பயன்படுத்தலாம்.',
      },
      {
        id: 'faq_5',
        question: 'எனது கைபேசி எண்ணை எப்படி மாற்றுவது?',
        answer:
          'ரம்யாஸ் ஜுவல்லரைத் தொடர்பு கொள்ளவும். வாடிக்கையாளர் சுயவிவர மாற்றங்களை கடை நிர்வாகி மட்டுமே செய்வார்.',
      },
    ];
  }
  return [
    {
      id: 'faq_1',
      question: 'How do I pay?',
      answer:
        "Customers can make the monthly ₹1,000 installment at Ramyas Jeweller. The shop administrator records the payment and it appears in the customer's digital passbook after verification.",
    },
    {
      id: 'faq_2',
      question: 'When will my scheme mature?',
      answer:
        'The scheme completes after all 12 monthly installments are paid. After the 12th installment, the ₹1,000 completion bonus is credited and the maturity value becomes ₹13,000.',
    },
    {
      id: 'faq_3',
      question: 'Can I pay late?',
      answer:
        'There is no late fee or penalty. If a calendar month is missed, that installment remains PENDING. The customer can contact the shop and make the pending installment when appropriate.',
    },
    {
      id: 'faq_4',
      question: 'How do I download my passbook?',
      answer:
        'The customer can use the Download Passbook option from the Digital Passbook screen.',
    },
    {
      id: 'faq_5',
      question: 'How do I change my mobile number?',
      answer:
        'Contact Ramyas Jeweller. Customer profile and contact information changes are handled by the authorized showroom administrator.',
    },
  ];
};

export default function HelpCenterScreen() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>('faq_1'); // Default first item open

  const faqsData = useMemo(() => getFaqItemsData(language), [language]);

  const filteredFaqs = useMemo(() => {
    if (!searchQuery.trim()) return faqsData;
    const q = searchQuery.toLowerCase().trim();
    return faqsData.filter(
      (item) =>
        item.question.toLowerCase().includes(q) || item.answer.toLowerCase().includes(q)
    );
  }, [searchQuery, faqsData]);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleCallShop = () => {
    const cleanNumber = OFFICIAL_SHOP_INFO.phone.replace(/[^0-9+]/g, '');
    Linking.openURL(`tel:${cleanNumber}`).catch(() => {
      const msg = `Please call support directly at ${OFFICIAL_SHOP_INFO.phone}`;
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Call Support', msg);
      }
    });
  };

  const handleWhatsAppShop = () => {
    const message = encodeURIComponent(
      `Hello Ramya's Jeweller, I need assistance with the ${OFFICIAL_SCHEME_NAME}.`
    );
    const url = `https://wa.me/${OFFICIAL_SHOP_INFO.whatsappPhone}?text=${message}`;
    Linking.openURL(url).catch(() => {
      const msg = `Unable to open WhatsApp. Please contact ${OFFICIAL_SHOP_INFO.phone}`;
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

        <Text style={styles.headerTitle}>{t('helpCenter')}</Text>

        <TouchableOpacity
          style={styles.searchIconButton}
          activeOpacity={0.7}
          accessibilityLabel="Search Help"
        >
          <Ionicons name="search-outline" size={22} color="#70001E" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 120 + Math.max(insets.bottom, 16) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* SEARCH BAR */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#94A3B8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('searchHelpPlaceholder')}
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* POPULAR QUESTIONS SECTION */}
        <Text style={styles.sectionHeaderTitle}>{t('popularQuestions')}</Text>

        {filteredFaqs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="help-circle-outline" size={48} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>{t('noFaqFound')}</Text>
            <Text style={styles.emptySubtitle}>
              {t('noFaqFoundSub')}
            </Text>
          </View>
        ) : (
          <View style={styles.faqList}>
            {filteredFaqs.map((item) => {
              const isExpanded = expandedId === item.id;
              return (
                <View key={item.id} style={styles.faqCard}>
                  <TouchableOpacity
                    style={styles.faqHeaderRow}
                    onPress={() => toggleExpand(item.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.faqQuestionText}>{item.question}</Text>
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color="#475569"
                    />
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={styles.faqAnswerContainer}>
                      <Text style={styles.faqAnswerText}>{item.answer}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* STILL NEED HELP CARD */}
        <View style={styles.supportCard}>
          <Text style={styles.supportCardTitle}>{t('stillNeedHelp')}</Text>
          <Text style={styles.supportCardSubtitle}>
            {t('supportSubtext')}
          </Text>

          <View style={styles.supportButtonsRow}>
            <TouchableOpacity
              style={styles.supportButton}
              onPress={handleCallShop}
              activeOpacity={0.8}
            >
              <Ionicons name="call-outline" size={18} color="#FFFFFF" />
              <Text style={styles.supportButtonText}>{t('callShop')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.supportButton}
              onPress={handleWhatsAppShop}
              activeOpacity={0.8}
            >
              <Ionicons name="logo-whatsapp" size={18} color="#FFFFFF" />
              <Text style={styles.supportButtonText}>{t('whatsappShop')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* BOTTOM TAB BAR */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => router.push('/(tabs)')}
          activeOpacity={0.7}
        >
          <Ionicons name="home-outline" size={18} color="#64748B" />
          <Text style={styles.tabText}>{t('home')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => router.push('/(tabs)/passbook')}
          activeOpacity={0.7}
        >
          <Ionicons name="book-outline" size={18} color="#64748B" />
          <Text style={styles.tabText}>{t('passbook')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => router.push('/(tabs)/notifications')}
          activeOpacity={0.7}
        >
          <Ionicons name="megaphone-outline" size={18} color="#64748B" />
          <Text style={styles.tabText}>{t('updates')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => router.push('/(tabs)/profile')}
          activeOpacity={0.7}
        >
          <Ionicons name="person-outline" size={18} color="#64748B" />
          <Text style={styles.tabText}>{t('profile')}</Text>
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
  searchIconButton: {
    padding: 4,
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#1E293B',
    padding: 0,
  },
  sectionHeaderTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 4,
  },
  faqList: {
    gap: 12,
  },
  faqCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  faqHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  faqQuestionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    paddingRight: 12,
  },
  faqAnswerContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  faqAnswerText: {
    fontSize: 13.5,
    lineHeight: 20,
    color: '#475569',
    fontWeight: '400',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#475569',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
  },
  supportCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginTop: 8,
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  supportCardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  supportCardSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
    marginBottom: 20,
    textAlign: 'center',
  },
  supportButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  supportButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#70001E',
    paddingVertical: 14,
    borderRadius: 24,
    gap: 8,
    elevation: 3,
    shadowColor: '#70001E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  supportButtonText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
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
