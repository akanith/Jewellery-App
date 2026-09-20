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

function getNavBgPath(width: number, height: number, radius: number, cradleWidth: number, cradleDepth: number) {
  const cx = width / 2;
  const halfNotch = cradleWidth / 2;

  const leftStart = cx - halfNotch;
  const rightEnd = cx + halfNotch;
  const cpSpan = cradleWidth * 0.25;

  const p1x = leftStart + cpSpan;
  const p1y = 0;
  const p2x = cx - cpSpan;
  const p2y = cradleDepth;
  const p3x = cx;
  const p3y = cradleDepth;

  const p4x = cx + cpSpan;
  const p4y = cradleDepth;
  const p5x = rightEnd - cpSpan;
  const p5y = 0;
  const p6x = rightEnd;
  const p6y = 0;

  return `
    M ${radius},0
    L ${leftStart},0
    C ${p1x},${p1y} ${p2x},${p2y} ${p3x},${p3y}
    C ${p4x},${p4y} ${p5x},${p5y} ${p6x},${p6y}
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
  const { t } = useLanguage();
  const responsive = useResponsiveMetrics();
  const [containerWidth, setContainerWidth] = useState(0);

  // Active yellow pill horizontal position animation
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

  const currentNavWidth = containerWidth > 0 ? containerWidth : responsive.navWidth;
  const slotWidth = currentNavWidth / 5;
  const pillOffset = (slotWidth - responsive.activePillWidth) / 2;

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
      router.push('/pay');
    });
  };

  const svgPath = currentNavWidth > 0
    ? getNavBgPath(currentNavWidth, responsive.navHeight, 28, responsive.cradleWidth, responsive.cradleDepth)
    : '';

  const qrTopPosition = -Math.round(responsive.qrDiameter * 0.45);
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
        {/* SVG CURVED DOWNWARD CONCAVE NOTCH BACKGROUND */}
        {currentNavWidth > 0 && (
          <Svg
            width={currentNavWidth}
            height={responsive.navHeight}
            style={styles.svgBackground}
          >
            <Path
              d={svgPath}
              fill="#FFFFFF"
              stroke="#D4AF37"
              strokeWidth={1.8}
            />
          </Svg>
        )}

        {/* SLIDING ACTIVE YELLOW ROUNDED PILL */}
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

        {/* OVERLAYING HERO CENTER SCAN QR CIRCLE BUTTON SEATED IN CRADLE NOTCH */}
        <View style={[styles.qrCenterWrapper, { top: qrTopPosition }]} pointerEvents="box-none">
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={handleQrPress}
            style={styles.qrTouchable}
          >
            <Animated.View
              style={[
                styles.qrCircleOuterRing,
                {
                  width: responsive.qrDiameter,
                  height: responsive.qrDiameter,
                  borderRadius: responsive.qrDiameter / 2,
                  transform: [{ scale: qrScaleAnim }],
                },
              ]}
            >
              <View
                style={[
                  styles.qrCircleInner,
                  { borderRadius: (responsive.qrDiameter - 8) / 2 },
                ]}
              >
                <Ionicons name="qr-code" size={responsive.scale(32, 28, 36)} color="#FDE047" />
              </View>
              {/* TOP-RIGHT GOLD ACCENT DOT */}
              <View style={styles.qrAccentDot} />
            </Animated.View>
          </TouchableOpacity>
        </View>

        {/* 5-SLOT CONTENT ROW */}
        {renderTabSlot(0, state.routes[0], 0, state, descriptors, navigation, t, responsive)}
        {renderTabSlot(1, state.routes[1], 1, state, descriptors, navigation, t, responsive)}

        {/* SLOT 2: CENTER QR LABEL SPACER */}
        <View style={styles.centerQrLabelSlot} pointerEvents="box-none">
          <Text style={[styles.qrLabelText, { fontSize: responsive.scaleFont(12.5, 11, 14) }]}>
            Scan QR
          </Text>
        </View>

        {renderTabSlot(3, state.routes[2], 2, state, descriptors, navigation, t, responsive)}
        {renderTabSlot(4, state.routes[3], 3, state, descriptors, navigation, t, responsive)}
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
  t: (key: TranslationKey) => string,
  responsive: any
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
    borderRadius: 28,
    overflow: 'hidden',
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
  qrCenterWrapper: {
    position: 'absolute',
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
    paddingBottom: 10,
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
