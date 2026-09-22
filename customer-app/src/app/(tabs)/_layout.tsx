import React, { useEffect, useState } from 'react';
import { Tabs, useRouter, useSegments } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  LayoutChangeEvent,
} from 'react-native';
import { getStoredCustomerSession } from '@/services/customerAuthService';

import { useLanguage, TranslationKey } from '@/i18n';
import { useResponsiveMetrics } from '@/constants/responsive';

interface TabConfig {
  name: string;
  key: TranslationKey;
  activeIcon: string;
  inactiveIcon: string;
  hasBadge?: boolean;
}

const TAB_ITEMS: TabConfig[] = [
  {
    name: 'index',
    key: 'home',
    activeIcon: 'home',
    inactiveIcon: 'home-outline',
  },
  {
    name: 'passbook',
    key: 'passbook',
    activeIcon: 'book',
    inactiveIcon: 'book-outline',
  },
  {
    name: 'notifications',
    key: 'updates',
    activeIcon: 'megaphone',
    inactiveIcon: 'megaphone-outline',
    hasBadge: true,
  },
  {
    name: 'profile',
    key: 'profile',
    activeIcon: 'person',
    inactiveIcon: 'person-outline',
  },
];

function CustomTabBar({ state, descriptors, navigation }: any) {
  const segments = useSegments();
  const { t } = useLanguage();
  const responsive = useResponsiveMetrics();
  const [containerWidth, setContainerWidth] = useState(0);
  const [animValue] = useState(() => new Animated.Value(state.index));

  useEffect(() => {
    const isNative = Platform.OS !== 'web';
    Animated.spring(animValue, {
      toValue: state.index,
      damping: 22,
      stiffness: 220,
      mass: 0.7,
      useNativeDriver: isNative,
    }).start();
  }, [state.index, animValue]);

  // Guard condition AFTER all React hooks are unconditionally invoked
  if (segments.length > 0 && segments[0] !== '(tabs)') {
    return null;
  }

  const handleLayout = (e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  };

  const currentNavWidth = containerWidth > 0 ? containerWidth : responsive.navWidth;
  const slotWidth = currentNavWidth / 4;
  const pillOffset = (slotWidth - responsive.activePillWidth) / 2;

  const pillTranslateX = animValue.interpolate({
    inputRange: [0, 1, 2, 3],
    outputRange: [
      pillOffset,
      slotWidth * 1 + pillOffset,
      slotWidth * 2 + pillOffset,
      slotWidth * 3 + pillOffset,
    ],
  });

  const pillTopPosition = Math.round((responsive.navHeight - responsive.activePillHeight) / 2);

  return (
    <View
      style={[
        styles.outerWrapper,
        {
          paddingBottom: Math.max(responsive.insets.bottom, 12),
        },
      ]}
    >
      <View
        style={[
          styles.navContainer,
          {
            height: responsive.navHeight,
            marginHorizontal: responsive.navHorizontalMargin,
          },
        ]}
        onLayout={handleLayout}
      >
        {/* SLIDING ACTIVE CHAMPAGNE-YELLOW ROUNDED PILL */}
        {currentNavWidth > 0 && (
          <Animated.View
            style={[
              styles.activePillBackground,
              {
                width: responsive.activePillWidth,
                height: responsive.activePillHeight,
                top: pillTopPosition,
                transform: [{ translateX: pillTranslateX }],
              },
            ]}
          />
        )}

        {/* 4 EQUAL TAB SLOTS */}
        {state.routes.map((route: any, index: number) =>
          renderTabSlot(route, index, state, descriptors, navigation, t, responsive)
        )}
      </View>
    </View>
  );
}

function renderTabSlot(
  route: any,
  tabIndex: number,
  state: any,
  descriptors: any,
  navigation: any,
  t: (key: TranslationKey) => string,
  responsive: any
) {
  if (!route) return null;

  const isFocused = state.index === tabIndex;
  const tabConfig = TAB_ITEMS[tabIndex] || {
    key: 'home' as TranslationKey,
    activeIcon: 'square',
    inactiveIcon: 'square-outline',
  };
  const localizedLabel = t(tabConfig.key);

  const onPress = () => {
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });

    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(route.name);
    }
  };

  const onLongPress = () => {
    navigation.emit({
      type: 'tabLongPress',
      target: route.key,
    });
  };

  return (
    <TouchableOpacity
      key={route.key}
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={descriptors[route.key]?.options?.tabBarAccessibilityLabel || localizedLabel}
      testID={descriptors[route.key]?.options?.tabBarTestID}
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.tabBarItem}
      activeOpacity={0.75}
    >
      <View style={styles.tabItemContent}>
        <View style={styles.iconSlot}>
          <Ionicons
            name={(isFocused ? tabConfig.activeIcon : tabConfig.inactiveIcon) as any}
            size={responsive ? responsive.scale(22, 19, 25) : 22}
            color={isFocused ? '#70001E' : '#746F72'}
          />
          {tabConfig.hasBadge && (
            <View style={styles.updatesBadgeDot} />
          )}
        </View>

        <Text
          numberOfLines={1}
          style={[
            styles.tabText,
            { fontSize: responsive ? responsive.scaleFont(12.5, 11, 14) : 12.5 },
            isFocused ? styles.tabTextActive : styles.tabTextInactive,
          ]}
        >
          {localizedLabel}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function TabsLayout() {
  const router = useRouter();

  useEffect(() => {
    async function checkSessionGuard() {
      const session = await getStoredCustomerSession();
      if (!session) {
        router.replace('/login');
      } else if (session.passwordStatus === 'RESET_REQUIRED') {
        router.replace('/reset-password' as any);
      }
    }
    checkSessionGuard();
  }, [router]);

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="passbook" options={{ title: 'Passbook' }} />
      <Tabs.Screen name="notifications" options={{ title: 'Updates' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  outerWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    overflow: 'visible',
    zIndex: 100,
  },
  navContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#E6C687',
    elevation: 10,
    shadowColor: '#70001E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
  },
  activePillBackground: {
    position: 'absolute',
    borderRadius: 16,
    backgroundColor: '#FFE98A',
    borderWidth: 1,
    borderColor: '#E7C86E',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 1,
  },
  tabBarItem: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  tabItemContent: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
    maxWidth: '100%',
  },
  iconSlot: {
    width: 32,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  updatesBadgeDot: {
    position: 'absolute',
    top: 0,
    right: 2,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#70001E',
  },
  tabText: {
    fontSize: 12.5,
    textAlign: 'center',
    marginTop: 2,
  },
  tabTextInactive: {
    color: '#746F72',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#70001E',
    fontWeight: '700',
  },
});
