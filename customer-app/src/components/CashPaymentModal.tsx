import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OFFICIAL_SHOP_INFO } from '@/constants/shopData';
import { formatCurrency } from '@/lib/formatters';
import { useLanguage } from '@/i18n';

export interface CashPaymentModalProps {
  visible: boolean;
  onClose: () => void;
  dueAmount: number;
  calendarMonth: string;
  installmentNumber?: number;
  customerName?: string;
  customerCode?: string;
}

export function CashPaymentModal({
  visible,
  onClose,
  dueAmount,
  calendarMonth,
  installmentNumber,
  customerName,
  customerCode,
}: CashPaymentModalProps) {
  const { t } = useLanguage();
  const handleOpenMaps = async () => {
    try {
      if (Platform.OS === 'web') {
        window.open(OFFICIAL_SHOP_INFO.googleMapsUrl, '_blank', 'noopener,noreferrer');
      } else {
        await Linking.openURL(OFFICIAL_SHOP_INFO.googleMapsUrl);
      }
    } catch {
      // Non-blocking fallback
    }
  };

  const handleCallShop = async () => {
    try {
      await Linking.openURL(`tel:${OFFICIAL_SHOP_INFO.phone.replace(/\s+/g, '')}`);
    } catch {
      // Non-blocking fallback
    }
  };

  const formattedAmount = dueAmount > 0 ? formatCurrency(dueAmount) : '₹1,000';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* TOP DECORATIVE GOLD BAR */}
          <View style={styles.goldTopBar} />

          {/* HEADER */}
          <View style={styles.headerRow}>
            <View style={styles.headerTitleCol}>
              <View style={styles.iconEmblem}>
                <Ionicons name="cash-outline" size={22} color="#70001E" />
              </View>
              <View>
                <Text style={styles.headerTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
                  {t('payByCashModalTitle')}
                </Text>
                <Text style={styles.headerSubtitle} numberOfLines={1}>
                  {OFFICIAL_SHOP_INFO.name} • {OFFICIAL_SHOP_INFO.city}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={styles.closeIconBtn}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={t('close')}
            >
              <Ionicons name="close" size={20} color="#6F6870" />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* DUE INSTALLMENT HIGHLIGHT CARD */}
            <View style={styles.dueHighlightCard}>
              <View style={styles.dueHighlightLeft}>
                <Text style={styles.dueHighlightEyebrow} numberOfLines={1}>
                  {installmentNumber ? `${t('installmentDueLabel')} #${String(installmentNumber).padStart(2, '0')}` : t('monthlyDeposit')}
                </Text>
                <Text style={styles.dueHighlightMonth} numberOfLines={1}>{calendarMonth || 'Current Month'}</Text>
                {customerCode ? (
                  <Text style={styles.customerCodeTag} numberOfLines={1}>{t('customerIdLabel')}: #{customerCode}</Text>
                ) : null}
              </View>
              <View style={styles.dueHighlightRight}>
                <Text style={styles.dueAmountLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>{t('amountDueLabel')}</Text>
                <Text style={styles.dueAmountValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>{formattedAmount}</Text>
              </View>
            </View>

            {/* HOW CASH PAYMENT WORKS */}
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="information-circle-outline" size={16} color="#70001E" />
              <Text style={styles.sectionTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
                {t('howToPayCashTitle')}
              </Text>
            </View>

            <View style={styles.stepsContainer}>
              {/* Step 1 */}
              <View style={styles.stepItem}>
                <View style={styles.stepNumberBadge}>
                  <Text style={styles.stepNumberText}>1</Text>
                </View>
                <View style={styles.stepTextCol}>
                  <Text style={styles.stepHeading}>{t('cashStep1Title')}</Text>
                  <Text style={styles.stepBody}>
                    {t('cashStep1Desc')
                      .replace('{shopName}', OFFICIAL_SHOP_INFO.name)
                      .replace('{address}', OFFICIAL_SHOP_INFO.address)
                      .replace('{city}', OFFICIAL_SHOP_INFO.city)}
                  </Text>
                </View>
              </View>

              {/* Step 2 */}
              <View style={styles.stepItem}>
                <View style={styles.stepNumberBadge}>
                  <Text style={styles.stepNumberText}>2</Text>
                </View>
                <View style={styles.stepTextCol}>
                  <Text style={styles.stepHeading}>{t('cashStep2Title')}</Text>
                  <Text style={styles.stepBody}>
                    {customerCode ? `${t('cashStep2Desc')} (${customerCode})` : t('cashStep2Desc')}
                  </Text>
                </View>
              </View>

              {/* Step 3 */}
              <View style={styles.stepItem}>
                <View style={styles.stepNumberBadge}>
                  <Text style={styles.stepNumberText}>3</Text>
                </View>
                <View style={styles.stepTextCol}>
                  <Text style={styles.stepHeading}>{t('cashStep3Title')}</Text>
                  <Text style={styles.stepBody}>
                    {t('cashStep3Desc')}
                  </Text>
                </View>
              </View>

              {/* Step 4 */}
              <View style={styles.stepItem}>
                <View style={styles.stepNumberBadge}>
                  <Text style={styles.stepNumberText}>4</Text>
                </View>
                <View style={styles.stepTextCol}>
                  <Text style={styles.stepHeading}>{t('cashStep4Title')}</Text>
                  <Text style={styles.stepBody}>
                    {t('cashStep4Desc')}
                  </Text>
                </View>
              </View>
            </View>

            {/* SHOWROOM DETAILS CARD */}
            <View style={styles.showroomCard}>
              <View style={styles.showroomIdRow}>
                <Ionicons name="storefront" size={16} color="#70001E" />
                <Text style={styles.showroomTitle}>{OFFICIAL_SHOP_INFO.name}</Text>
              </View>
              <Text style={styles.showroomAddress}>
                {OFFICIAL_SHOP_INFO.address}, {OFFICIAL_SHOP_INFO.city}, {OFFICIAL_SHOP_INFO.state} {OFFICIAL_SHOP_INFO.pincode}
              </Text>
              <Text style={styles.showroomTimings}>
                🕒 {t('hoursLabel')}: {OFFICIAL_SHOP_INFO.openingTime} AM – {OFFICIAL_SHOP_INFO.closingTime} PM ({OFFICIAL_SHOP_INFO.workingDays})
              </Text>

              <View style={styles.showroomActionsRow}>
                <TouchableOpacity
                  style={styles.actionPillBtn}
                  onPress={handleCallShop}
                  activeOpacity={0.8}
                >
                  <Ionicons name="call" size={14} color="#70001E" />
                  <Text style={styles.actionPillText}>{OFFICIAL_SHOP_INFO.phone}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionPillBtn, styles.actionPillGold]}
                  onPress={handleOpenMaps}
                  activeOpacity={0.8}
                >
                  <Ionicons name="navigate" size={14} color="#78350F" />
                  <Text style={[styles.actionPillText, { color: '#78350F' }]}>{t('directions') || 'Get Directions'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* IMPORTANT SECURITY & INTEGRITY NOTICE */}
            <View style={styles.integrityNoticeBox}>
              <Ionicons name="shield-checkmark" size={16} color="#B45309" style={{ marginTop: 1 }} />
              <Text style={styles.integrityNoticeText}>
                <Text style={{ fontWeight: '800' }}>{t('noticeLabel') || 'Notice'}: </Text>
                Opening these instructions does not record a payment. Your digital passbook will update once showroom staff confirms cash receipt.
              </Text>
            </View>
          </ScrollView>

          {/* FOOTER ACTIONS */}
          <View style={styles.footerContainer}>
            <TouchableOpacity
              style={styles.understoodBtn}
              onPress={onClose}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={t('understood') || 'Understood'}
            >
              <Text style={styles.understoodBtnText}>{t('understood') || 'Understood'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '88%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  },
  goldTopBar: {
    height: 4,
    backgroundColor: '#D4AF37',
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitleCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconEmblem: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF8E7',
    borderWidth: 1,
    borderColor: '#F3C044',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#70001E',
    marginTop: 1,
  },
  closeIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 12,
  },
  dueHighlightCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF8E7',
    borderColor: '#D4AF37',
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
  },
  dueHighlightLeft: {
    flex: 1,
  },
  dueHighlightEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: '#78350F',
    letterSpacing: 0.5,
  },
  dueHighlightMonth: {
    fontSize: 16,
    fontWeight: '800',
    color: '#70001E',
    marginTop: 2,
  },
  customerCodeTag: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 4,
  },
  dueHighlightRight: {
    alignItems: 'flex-end',
  },
  dueAmountLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#78350F',
    letterSpacing: 0.5,
  },
  dueAmountValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#70001E',
    marginTop: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#25232A',
    letterSpacing: 0.2,
  },
  stepsContainer: {
    gap: 12,
    marginBottom: 18,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  stepNumberBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#70001E',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  stepTextCol: {
    flex: 1,
  },
  stepHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  stepBody: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
  },
  showroomCard: {
    backgroundColor: '#FAFAF9',
    borderColor: '#E7E5E4',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  showroomIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  showroomTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#70001E',
  },
  showroomAddress: {
    fontSize: 12,
    color: '#44403C',
    lineHeight: 17,
    marginBottom: 4,
  },
  showroomTimings: {
    fontSize: 11,
    fontWeight: '600',
    color: '#78716C',
    marginBottom: 10,
  },
  showroomActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  actionPillGold: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FCD34D',
  },
  actionPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#70001E',
  },
  integrityNoticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  integrityNoticeText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    color: '#92400E',
  },
  footerContainer: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  understoodBtn: {
    height: 48,
    borderRadius: 14,
    backgroundColor: '#70001E',
    borderWidth: 1,
    borderColor: '#D4AF37',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#70001E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  understoodBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});
