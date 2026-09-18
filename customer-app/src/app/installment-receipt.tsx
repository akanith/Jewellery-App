import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Share,
  Platform,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { OFFICIAL_SHOP_INFO } from '@/constants/shopData';
import { getReceiptByIdOrNumber } from '@/data/receiptFixture';
import { formatCurrency } from '@/lib/formatters';

export default function InstallmentReceiptScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ receiptId?: string; installmentNumber?: string }>();

  const instNum = params.installmentNumber ? parseInt(params.installmentNumber, 10) : undefined;
  const receipt = getReceiptByIdOrNumber(params.receiptId, instNum);

  const handleDownloadPDF = () => {
    const title = 'Download Receipt PDF';
    const msg = `Installment Receipt PDF statement for Receipt #${receipt.receiptNumber} has been generated and saved to downloads.`;
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${msg}`);
    } else {
      Alert.alert(title, msg, [{ text: 'OK' }]);
    }
  };

  const handleShareReceipt = async () => {
    try {
      await Share.share({
        title: `Receipt #${receipt.receiptNumber}`,
        message: `${OFFICIAL_SHOP_INFO.name} - Installment Receipt\nReceipt #: ${receipt.receiptNumber}\nCustomer: ${receipt.customerName} (${receipt.customerId})\nScheme: ${receipt.schemeName}\nInstallment: ${receipt.installmentNumber} of ${receipt.totalInstallments}\nAmount: ${formatCurrency(receipt.installmentAmount)}\nPaid Date: ${receipt.paymentDate}\nCollected At: ${receipt.collectedAt}`,
      });
    } catch {
      // Fallback ignore share error
    }
  };

  const handleContactShop = () => {
    router.push('/shop');
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

        <Text style={styles.headerTitle}>Installment Receipt</Text>

        <TouchableOpacity
          onPress={handleShareReceipt}
          style={styles.shareButton}
          activeOpacity={0.7}
          accessibilityLabel="Share Receipt"
        >
          <Ionicons name="share-social-outline" size={22} color="#70001E" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* SUCCESS BANNER AREA */}
        <View style={styles.successBannerCard}>
          <View style={styles.successIconCircle}>
            <Ionicons name="checkmark-circle" size={44} color="#16A34A" />
          </View>

          <Text style={styles.successTitle}>Payment Received</Text>
          <Text style={styles.successSubtitle}>Successfully</Text>

          <View style={styles.installmentPill}>
            <Ionicons name="ribbon-outline" size={14} color="#70001E" />
            <Text style={styles.installmentPillText}>
              Installment {receipt.installmentNumber} of {receipt.totalInstallments}
            </Text>
          </View>

          <Text style={styles.paymentDateText}>Paid on {receipt.paymentDate}</Text>
        </View>

        {/* INSTALLMENT SUMMARY CARD */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>INSTALLMENT AMOUNT</Text>
          <Text style={styles.summaryAmount}>{formatCurrency(receipt.installmentAmount)}</Text>

          <View style={styles.summaryRow}>
            <View style={styles.summaryCol}>
              <Text style={styles.summarySubLabel}>Payment Method</Text>
              <Text style={styles.summarySubValue}>{receipt.paymentMethod}</Text>
            </View>
            <View style={styles.summaryColRight}>
              <Text style={styles.summarySubLabel}>Collected At</Text>
              <Text style={styles.summarySubValue}>{receipt.collectedAt}</Text>
            </View>
          </View>
        </View>

        {/* DIGITAL RECEIPT CARD */}
        <View style={styles.receiptDetailsCard}>
          <View style={styles.receiptHeaderRow}>
            <Text style={styles.receiptSectionTitle}>DIGITAL RECEIPT</Text>
            <Ionicons name="document-text-outline" size={18} color="#70001E" />
          </View>

          <View style={styles.receiptGrid}>
            <View style={styles.receiptDetailRow}>
              <Text style={styles.detailLabel}>Receipt Number</Text>
              <Text style={styles.detailValueBold}>{receipt.receiptNumber}</Text>
            </View>

            <View style={styles.receiptDetailRow}>
              <Text style={styles.detailLabel}>Customer Name</Text>
              <Text style={styles.detailValue}>{receipt.customerName}</Text>
            </View>

            <View style={styles.receiptDetailRow}>
              <Text style={styles.detailLabel}>Customer ID</Text>
              <Text style={styles.detailValue}>{receipt.customerId}</Text>
            </View>

            <View style={styles.receiptDetailRow}>
              <Text style={styles.detailLabel}>Scheme</Text>
              <Text style={styles.detailValue}>{receipt.schemeName}</Text>
            </View>

            <View style={styles.receiptDetailRow}>
              <Text style={styles.detailLabel}>Installment</Text>
              <Text style={styles.detailValue}>
                Installment {receipt.installmentNumber} of {receipt.totalInstallments}
              </Text>
            </View>

            <View style={styles.receiptDetailRow}>
              <Text style={styles.detailLabel}>Payment Date</Text>
              <Text style={styles.detailValue}>{receipt.paymentDate}</Text>
            </View>

            <View style={styles.receiptDetailRow}>
              <Text style={styles.detailLabel}>Collected By</Text>
              <Text style={styles.detailValue}>{receipt.collectedBy}</Text>
            </View>
          </View>
        </View>

        {/* SCHEME PROGRESS SUMMARY */}
        <View style={styles.progressCard}>
          <Text style={styles.progressSectionTitle}>SCHEME PROGRESS</Text>

          <View style={styles.progressGrid}>
            <View style={styles.progressCol}>
              <Text style={styles.progressLabel}>Paid</Text>
              <Text style={styles.progressValuePaid}>{formatCurrency(receipt.paidTotal)}</Text>
            </View>

            <View style={styles.progressCol}>
              <Text style={styles.progressLabel}>Remaining</Text>
              <Text style={styles.progressValueRemaining}>
                {formatCurrency(receipt.remainingContribution)}
              </Text>
            </View>

            <View style={styles.progressCol}>
              <Text style={styles.progressLabel}>Bonus</Text>
              <Text style={styles.progressValueBonus}>{formatCurrency(receipt.bonusAmount)}</Text>
            </View>
          </View>
        </View>

        {/* NEXT INSTALLMENT CARD OR SCHEME MATURED CARD */}
        {receipt.isSchemeCompleted || receipt.installmentNumber === 12 ? (
          <View style={styles.maturityCard}>
            <View style={styles.maturityHeaderRow}>
              <Ionicons name="trophy-outline" size={24} color="#B45309" />
              <Text style={styles.maturityTitle}>SCHEME COMPLETED & MATURED</Text>
            </View>
            <Text style={styles.maturityMessage}>
              Congratulations! All 12 monthly installments have been successfully completed. Your ₹1,000 completion bonus has been credited.
            </Text>
            <View style={styles.maturityValueBox}>
              <Text style={styles.maturityValueLabel}>Total Maturity Value</Text>
              <Text style={styles.maturityValueAmount}>{formatCurrency(13000)}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.nextInstallmentCard}>
            <View style={styles.nextHeaderRow}>
              <Text style={styles.nextTitle}>Next Installment</Text>
              <Text style={styles.nextAmount}>
                {formatCurrency(receipt.installmentAmount)}
              </Text>
            </View>
            <Text style={styles.nextMonthText}>
              {receipt.nextInstallmentMonth || 'Next Month'}
            </Text>
            <Text style={styles.noFixedDateNotice}>
              No fixed daily due date. Pay at your convenience anytime during the calendar month.
            </Text>
          </View>
        )}

        {/* SHOP CARD */}
        <View style={styles.shopCard}>
          <View style={styles.shopHeaderRow}>
            <View style={styles.shopDiamondIcon}>
              <Ionicons name="diamond" size={16} color="#FFFFFF" />
            </View>
            <Text style={styles.shopName}>{OFFICIAL_SHOP_INFO.name}</Text>
          </View>
          <Text style={styles.shopAddress}>{OFFICIAL_SHOP_INFO.address}, {OFFICIAL_SHOP_INFO.city}</Text>
          <Text style={styles.shopPhone}>Phone: {OFFICIAL_SHOP_INFO.phone}</Text>
        </View>

        {/* BOTTOM ACTION BUTTONS */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.primaryActionButton}
            onPress={handleDownloadPDF}
            activeOpacity={0.8}
          >
            <Ionicons name="download-outline" size={18} color="#FFFFFF" />
            <Text style={styles.primaryActionText}>Download Receipt PDF</Text>
          </TouchableOpacity>

          <View style={styles.secondaryActionsRow}>
            <TouchableOpacity
              style={styles.secondaryActionButton}
              onPress={handleShareReceipt}
              activeOpacity={0.8}
            >
              <Ionicons name="share-social-outline" size={16} color="#70001E" />
              <Text style={styles.secondaryActionText}>Share Receipt</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryActionButton}
              onPress={handleContactShop}
              activeOpacity={0.8}
            >
              <Ionicons name="storefront-outline" size={16} color="#70001E" />
              <Text style={styles.secondaryActionText}>Contact Shop</Text>
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
  shareButton: {
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
  successBannerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  successIconCircle: {
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  successSubtitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#16A34A',
    marginBottom: 12,
  },
  installmentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF08A',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FDE047',
  },
  installmentPillText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#70001E',
  },
  paymentDateText: {
    fontSize: 12.5,
    fontWeight: '500',
    color: '#64748B',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#70001E',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: '#70001E',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    width: '100%',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  summaryCol: {
    flex: 1,
  },
  summaryColRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  summarySubLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 2,
  },
  summarySubValue: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1E293B',
  },
  receiptDetailsCard: {
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
  receiptHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  receiptSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#70001E',
    letterSpacing: 0.8,
  },
  receiptGrid: {
    gap: 10,
  },
  receiptDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
  },
  detailValue: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#1E293B',
  },
  detailValueBold: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#70001E',
  },
  progressCard: {
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
  progressSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#70001E',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  progressGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressCol: {
    flex: 1,
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 4,
  },
  progressValuePaid: {
    fontSize: 16,
    fontWeight: '800',
    color: '#16A34A',
  },
  progressValueRemaining: {
    fontSize: 16,
    fontWeight: '800',
    color: '#64748B',
  },
  progressValueBonus: {
    fontSize: 16,
    fontWeight: '800',
    color: '#70001E',
  },
  nextInstallmentCard: {
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
  nextHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  nextTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#70001E',
  },
  nextAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#70001E',
  },
  nextMonthText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  noFixedDateNotice: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
  },
  maturityCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 8,
  },
  maturityHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  maturityTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#B45309',
    letterSpacing: 0.6,
  },
  maturityMessage: {
    fontSize: 13,
    lineHeight: 19,
    color: '#92400E',
    fontWeight: '500',
  },
  maturityValueBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FEF08A',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#FDE047',
  },
  maturityValueLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#70001E',
  },
  maturityValueAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#70001E',
  },
  shopCard: {
    backgroundColor: '#FDF2F8',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FCE7F3',
    gap: 4,
  },
  shopHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  shopDiamondIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#70001E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shopName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#70001E',
  },
  shopAddress: {
    fontSize: 12.5,
    fontWeight: '500',
    color: '#334155',
  },
  shopPhone: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  actionsContainer: {
    gap: 10,
    marginTop: 4,
  },
  primaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#70001E',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    elevation: 3,
    shadowColor: '#70001E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  primaryActionText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#70001E',
    gap: 6,
  },
  secondaryActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#70001E',
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
