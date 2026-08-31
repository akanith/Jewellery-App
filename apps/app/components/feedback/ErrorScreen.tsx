import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, radius, shadows, spacing } from '../../theme';
import { ArrowLeft, RefreshCw, Home } from 'lucide-react-native';

interface ErrorScreenProps {
  errorTitle?: string;
  errorMessage?: string;
  errorCode?: string;
  onTryAgain?: () => void;
  onGoHome?: () => void;
}

export default function ErrorScreen({
  errorTitle = 'Something went wrong.',
  errorMessage = 'We encountered an unexpected error while processing your request. Please try again or return to the home screen.',
  errorCode = 'ERR_VD_JEWEL_500',
  onTryAgain,
  onGoHome,
}: ErrorScreenProps) {
  const router = useRouter();

  const handleHome = () => {
    if (onGoHome) {
      onGoHome();
    } else {
      router.replace('/(tabs)/home');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={20} color={colors.maroonPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Error</Text>
        <Text style={styles.brandTitle}>Vikas Digital</Text>
      </View>

      <View style={styles.container}>
        {/* Diamond Art Banner */}
        <View style={styles.imageCard}>
          <View style={styles.imagePlaceholder}>
            <Text style={styles.diamondSymbol}>💎</Text>
            <Text style={styles.sparkleText}>✨ ✨ ✨</Text>
          </View>
        </View>

        {/* Error Card */}
        <View style={styles.errorCard}>
          <Text style={styles.heading}>{errorTitle}</Text>
          <Text style={styles.subtext}>{errorMessage}</Text>

          {/* Buttons */}
          <TouchableOpacity
            style={styles.tryAgainButton}
            onPress={onTryAgain}
            activeOpacity={0.85}
          >
            <RefreshCw size={18} color={colors.cardWhite} style={{ marginRight: 8 }} />
            <Text style={styles.tryAgainText}>Try Again</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.goHomeButton}
            onPress={handleHome}
            activeOpacity={0.85}
          >
            <Home size={18} color={colors.maroonPrimary} style={{ marginRight: 8 }} />
            <Text style={styles.goHomeText}>Go Home</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.errorCodeText}>Error Code: {errorCode}</Text>
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
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.maroonPrimary,
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.maroonPrimary,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageCard: {
    width: '100%',
    height: 180,
    borderRadius: radius.xxl,
    overflow: 'hidden',
    marginBottom: spacing.xl,
    backgroundColor: colors.cardWhite,
    ...shadows.card,
  },
  imagePlaceholder: {
    flex: 1,
    backgroundColor: '#FAF5F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  diamondSymbol: {
    fontSize: 54,
  },
  sparkleText: {
    fontSize: 16,
    marginTop: 8,
  },
  errorCard: {
    width: '100%',
    backgroundColor: colors.cardWhite,
    borderRadius: 28,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: spacing.xl,
    ...shadows.soft,
  },
  heading: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.maroonPrimary,
    marginBottom: spacing.sm,
  },
  subtext: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  tryAgainButton: {
    flexDirection: 'row',
    height: 50,
    backgroundColor: colors.maroonPrimary,
    borderRadius: radius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  tryAgainText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.cardWhite,
  },
  goHomeButton: {
    flexDirection: 'row',
    height: 50,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.maroonPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goHomeText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.maroonPrimary,
  },
  errorCodeText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
  },
});
