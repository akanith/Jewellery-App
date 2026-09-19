import React, { useEffect, useState } from 'react';
import { Tabs, useRouter } from 'expo-router';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import Svg, { Path } from 'react-native-svg';
import { getStoredCustomerSession } from '@/services/customerAuthService';

import { useLanguage, TranslationKey } from '@/i18n';

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

const PILL_WIDTH = 66;
const PILL_HEIGHT = 48;
const QR_CIRCLE_SIZE = 74;

function getNavBgPath(width: number, height: number, radius: number = 24) {
  const cx = width / 2;
  const notchWidth = 92;
  const archHeight = 22;

  const leftStart = cx - notchWidth / 2;
  const rightEnd = cx + notchWidth / 2;

  return `
    M ${radius},0
    L ${leftStart},0
    C ${cx - 26},0 ${cx - 28},${-archHeight} ${cx},${-archHeight}
    C ${cx + 28},${-archHeight} ${cx + 26},0 ${rightEnd},0
    L ${width - radius},0
    A ${radius},${radius} 0 0,1 ${width},${radius}
    L ${width},${height - radius}
    A ${radius},${radius} 0 0,1 ${width - radius},${height}
    L ${radius},${height}
    A ${radius},${radius} 0 0,1 0,${height - radius}
    L 0,${radius}
    A ${radius},${radius} 0 0,1 ${radius},0
    Z
  `;
}

function CustomTabBar({ state, descriptors, navigation }: any) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const [containerWidth, setContainerWidth] = useState(0);

  // Active yellow pill horizontal position animation (0, 1, 2, 3 mapped to slots 0, 1, 3, 4)
  const [animValue] = useState(() => new Animated.Value(state.index));
  const [qrScaleAnim] = useState(() => new Animated.Value(1));

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

  const handleLayout = (e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  };

  // Calculate 5 equal flex slot positions for the navigation bar
  const slotWidth = containerWidth > 0 ? containerWidth / 5 : 0;
  const pillOffset = slotWidth > 0 ? (slotWidth - PILL_WIDTH) / 2 : 0;

  // Map 4 active tab indices (0, 1, 2, 3) to 5 visual slots (0, 1, 3, 4)
  const pillTranslateX = animValue.interpolate({
    inputRange: [0, 1, 2, 3],
    outputRange: [
      pillOffset,
      slotWidth * 1 + pillOffset,
      slotWidth * 3 + pillOffset,
      slotWidth * 4 + pillOffset,
    ],
  });

  const handleQrPress = () => {
    Animated.sequence([
      Animated.timing(qrScaleAnim, {
        toValue: 0.92,
        duration: 90,
        useNativeDriver: true,
      }),
      Animated.spring(qrScaleAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Navigate to Scan QR / Payment screen route
      router.push('/pay');
    });
  };

  const svgPath = containerWidth > 0 ? getNavBgPath(containerWidth, 68, 24) : '';

  return (
    <View style={[styles.outerWrapper, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={styles.navContainer} onLayout={handleLayout}>
        {/* SVG CURVED NOTCH CONTAINER BACKGROUND */}
        {containerWidth > 0 && (
          <Svg
            width={containerWidth}
            height={68}
            style={styles.svgBackground}
          >
            <Path
              d={svgPath}
              fill="rgba(255, 255, 255, 0.94)"
              stroke="#E5E7EB"
              strokeWidth={1.5}
            />
          </Svg>
        )}

        {/* HARDWARE / SYSTEM BLUR BACKDROP LAYER */}
        <BlurView intensity={60} tint="light" style={styles.glassBlurView} />

        {/* SLIDING ACTIVE YELLOW ROUNDED PILL */}
        {containerWidth > 0 && (
          <Animated.View
            style={[
              styles.activePillBackground,
              {
                transform: [{ translateX: pillTranslateX }],
              },
            ]}
          />
        )}

        {/* OVERLAYING HERO CENTER SCAN QR CIRCLE BUTTON */}
        <View style={styles.qrCenterWrapper} pointerEvents="box-none">
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={handleQrPress}
            style={styles.qrTouchable}
          >
            <Animated.View
              style={[
                styles.qrCircleOuterRing,
                { transform: [{ scale: qrScaleAnim }] },
              ]}
            >
              <View style={styles.qrCircleInner}>
                <Ionicons name="qr-code" size={32} color="#FDE047" />
              </View>
              {/* TOP-RIGHT GOLD ACCENT DOT */}
              <View style={styles.qrAccentDot} />
            </Animated.View>
          </TouchableOpacity>
        </View>

        {/* 5-SLOT CONTENT ROW */}
        {/* SLOT 0: HOME */}
        {renderTabSlot(0, state.routes[0], 0, state, descriptors, navigation, t)}

        {/* SLOT 1: PASSBOOK */}
        {renderTabSlot(1, state.routes[1], 1, state, descriptors, navigation, t)}

        {/* SLOT 2: CENTER QR LABEL SPACER */}
        <View style={styles.centerQrLabelSlot} pointerEvents="box-none">
          <Text style={styles.qrLabelText}>Scan QR</Text>
        </View>

        {/* SLOT 3: UPDATES */}
        {renderTabSlot(3, state.routes[2], 2, state, descriptors, navigation, t)}

        {/* SLOT 4: PROFILE */}
        {renderTabSlot(4, state.routes[3], 3, state, descriptors, navigation, t)}
      </View>
    </View>
  );
}

function renderTabSlot(
  slotIndex: number,
  route: any,
  tabIndex: number,
  state: any,
  descriptors: any,
  navigation: any,
  t: (key: TranslationKey) => string
) {
  if (!route) return <View key={`slot-${slotIndex}`} style={styles.tabBarItem} />;

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
            size={20}
            color={isFocused ? '#70001E' : '#6F6870'}
          />
          {tabConfig.hasBadge && (
            <View style={styles.updatesBadgeDot} />
          )}
        </View>

        <Text
          numberOfLines={1}
          style={[styles.tabText, isFocused ? styles.tabTextActive : styles.tabTextInactive]}
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
    height: 68,
    marginHorizontal: 16,
    alignItems: 'center',
    position: 'relative',
    overflow: 'visible',
    elevation: 10,
    shadowColor: '#70001E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
  },
  svgBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'visible',
  },
  glassBlurView: {
    ...StyleSheet.absoluteFill,
    borderRadius: 24,
    overflow: 'hidden',
  },
  activePillBackground: {
    position: 'absolute',
    top: 10,
    width: PILL_WIDTH,
    height: PILL_HEIGHT,
    borderRadius: 14,
    backgroundColor: '#F7E7A8',
    borderWidth: 1,
    borderColor: '#E7C86E',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 1,
  },
  qrCenterWrapper: {
    position: 'absolute',
    top: -36,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    overflow: 'visible',
  },
  qrTouchable: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrCircleOuterRing: {
    width: QR_CIRCLE_SIZE,
    height: QR_CIRCLE_SIZE,
    borderRadius: QR_CIRCLE_SIZE / 2,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E9D9C4',
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#70001E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 12,
  },
  qrCircleInner: {
    width: '100%',
    height: '100%',
    borderRadius: (QR_CIRCLE_SIZE - 8) / 2,
    backgroundColor: '#70001E',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#520018',
  },
  qrAccentDot: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#D4AF37',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  centerQrLabelSlot: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 8,
    zIndex: 2,
  },
  qrLabelText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#70001E',
    textAlign: 'center',
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
    width: 28,
    height: 24,
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
    fontSize: 12,
    textAlign: 'center',
    marginTop: 1,
  },
  tabTextInactive: {
    color: '#6F6870',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#70001E',
    fontWeight: '700',
  },
});
