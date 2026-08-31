import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
} from 'react-native';
import { colors, radius, shadows, spacing } from '../../theme';
import { LogOut } from 'lucide-react-native';

interface LogoutModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export default function LogoutModal({
  visible,
  onClose,
  onConfirm,
  isLoading = false,
}: LogoutModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalCard}>
              {/* Top Icon Badge */}
              <View style={styles.iconCircle}>
                <View style={styles.iconInner}>
                  <LogOut size={28} color={colors.maroonPrimary} />
                </View>
              </View>

              {/* Title & Subtitle */}
              <Text style={styles.title}>Logout</Text>
              <Text style={styles.subtitle}>Are you sure you want to logout?</Text>

              {/* Logout Action Button */}
              <TouchableOpacity
                style={styles.logoutButton}
                onPress={onConfirm}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                <LogOut size={18} color={colors.cardWhite} style={{ marginRight: 8 }} />
                <Text style={styles.logoutButtonText}>
                  {isLoading ? 'Logging out...' : 'Logout'}
                </Text>
              </TouchableOpacity>

              {/* Cancel Button */}
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onClose}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(82, 12, 37, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
  },
  modalCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: colors.cardWhite,
    borderRadius: 28,
    padding: spacing.xxl,
    alignItems: 'center',
    ...shadows.card,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: radius.full,
    backgroundColor: colors.creamBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  iconInner: {
    width: 52,
    height: 52,
    borderRadius: radius.full,
    backgroundColor: '#FCE7F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textDark,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 20,
  },
  logoutButton: {
    flexDirection: 'row',
    width: '100%',
    height: 50,
    backgroundColor: colors.maroonPrimary,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.cardWhite,
  },
  cancelButton: {
    width: '100%',
    height: 50,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.maroonPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.maroonPrimary,
  },
});
