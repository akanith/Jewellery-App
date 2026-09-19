import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '@/i18n';

interface CustomerHeaderProps {
  customerName?: string;
  unreadCount?: number;
  avatarUri?: string | null;
  onNotificationPress?: () => void;
  onProfilePress?: () => void;
}

/**
 * Standard Global Customer Header Component
 * Enforces single visual specification & fallback avatar across all screens.
 */
export const CustomerHeader: React.FC<CustomerHeaderProps> = ({
  customerName = 'Anith Kumar',
  unreadCount = 0,
  avatarUri = null,
  onNotificationPress,
  onProfilePress,
}) => {
  const router = useRouter();
  const { t } = useLanguage();

  const handleNotificationTap = () => {
    if (onNotificationPress) {
      onNotificationPress();
    } else {
      router.push('/(tabs)/notifications' as any);
    }
  };

  const handleProfileTap = () => {
    if (onProfilePress) {
      onProfilePress();
    } else {
      router.push('/(tabs)/profile' as any);
    }
  };

  return (
    <View style={styles.headerContainer}>
      {/* LEFT: GREETING & CUSTOMER NAME */}
      <View style={styles.greetingCol}>
        <Text style={styles.greetingSub}>{t('goodMorning')}</Text>
        <Text style={styles.customerName} numberOfLines={1}>
          {customerName}
        </Text>
      </View>

      {/* RIGHT: NOTIFICATION & AVATAR ACTIONS */}
      <View style={styles.actionsRow}>
        {/* NOTIFICATION BUTTON */}
        <TouchableOpacity
          style={styles.notificationBtn}
          onPress={handleNotificationTap}
          activeOpacity={0.7}
          accessibilityLabel={t('notifications')}
        >
          <Ionicons name="notifications-outline" size={22} color="#70001E" />
          {unreadCount > 0 && <View style={styles.badgeDot} />}
        </TouchableOpacity>

        {/* PROFILE AVATAR */}
        <TouchableOpacity
          style={styles.avatarBtn}
          onPress={handleProfileTap}
          activeOpacity={0.8}
          accessibilityLabel={t('profile')}
        >
          {avatarUri && avatarUri.startsWith('http') ? (
            <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarFallback}>
              <Ionicons name="person" size={22} color="#FFFFFF" />
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: '#FFFDF8',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E8DED8',
  },
  greetingCol: {
    flex: 1,
    marginRight: 12,
  },
  greetingSub: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6F6870',
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  customerName: {
    fontSize: 19,
    fontWeight: '800',
    color: '#70001E',
    letterSpacing: -0.3,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notificationBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F9EEF1',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  badgeDot: {
    position: 'absolute',
    top: 10,
    right: 11,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#70001E',
    borderWidth: 1.5,
    borderColor: '#F9EEF1',
  },
  avatarBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#D4AF37',
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#70001E',
    borderWidth: 1.5,
    borderColor: '#D4AF37',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default CustomerHeader;
