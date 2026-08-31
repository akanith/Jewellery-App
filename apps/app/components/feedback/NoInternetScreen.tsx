import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { colors, radius, shadows, spacing } from '../../theme';
import { WifiOff, RefreshCw, Headphones, X } from 'lucide-react-native';

interface NoInternetScreenProps {
  onRetry?: () => void;
  onContactShop?: () => void;
  onClose?: () => void;
}

export default function NoInternetScreen({
  onRetry,
  onContactShop,
  onClose,
}: NoInternetScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header Bar */}
      <View style={styles.headerBar}>
        <View style={styles.logoRow}>
          <Text style={styles.logoSymbol}>◆</Text>
          <Text style={styles.logoText}>Ramyas</Text>
        </View>
        {onClose && (
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={20} color={colors.textDark} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.container}>
        {/* Center Illustration Banner Card */}
        <View style={styles.illustrationCard}>
          <View style={styles.wifiCircle}>
            <WifiOff size={48} color={colors.maroonPrimary} />
            <View style={styles.alertBadge}>
              <WifiOff size={12} color={colors.cardWhite} />
            </View>
          </View>
        </View>

        {/* Text Content */}
        <Text style={styles.heading}>No Internet Connection</Text>
        <Text style={styles.subtitle}>
          Please check your internet and try again.
        </Text>

        {/* Buttons */}
        <TouchableOpacity
          style={styles.retryButton}
          onPress={onRetry}
          activeOpacity={0.85}
        >
          <RefreshCw size={18} color={colors.cardWhite} style={{ marginRight: 8 }} />
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.contactButton}
          onPress={onContactShop}
          activeOpacity={0.85}
        >
          <Headphones size={18} color={colors.maroonPrimary} style={{ marginRight: 8 }} />
          <Text style={styles.contactButtonText}>Contact Shop</Text>
        </TouchableOpacity>

        <Text style={styles.refCodeText}>Ref: ERR_NO_CONNECTION</Text>
      </View>
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
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoSymbol: {
    fontSize: 18,
    color: colors.maroonPrimary,
    marginRight: 6,
    fontWeight: 'bold',
  },
  logoText: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.maroonPrimary,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.inputBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.xxl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  illustrationCard: {
    width: 240,
    height: 200,
    backgroundColor: colors.cardWhite,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xxl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...shadows.card,
  },
  wifiCircle: {
    width: 90,
    height: 90,
    borderRadius: radius.full,
    backgroundColor: colors.creamBackground,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  alertBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: radius.full,
    backgroundColor: colors.errorRed,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heading: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textDark,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xxl,
    lineHeight: 22,
  },
  retryButton: {
    flexDirection: 'row',
    width: '100%',
    height: 52,
    backgroundColor: colors.maroonPrimary,
    borderRadius: radius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.cardWhite,
  },
  contactButton: {
    flexDirection: 'row',
    width: '100%',
    height: 52,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.maroonPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  contactButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.maroonPrimary,
  },
  refCodeText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
  },
});
