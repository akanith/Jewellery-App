import React, { useEffect, useState } from 'react';
import { StyleSheet, View, StatusBar } from 'react-native';
import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  runOnJS,
  Easing,
} from 'react-native-reanimated';

export function AnimatedSplashOverlay() {
  const [visible, setVisible] = useState(true);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(1.04);

  useEffect(() => {
    // Hide native splash screen as soon as React component mounts
    SplashScreen.hideAsync().catch(() => {});

    // Animation timeline:
    // 0.0s -> 0.6s (600ms): opacity 0 -> 1 (ease-out), scale 1.04 -> 1.00 (ease-out)
    // 0.6s -> 1.8s (1200ms): hold opacity 1, subtle breathing scale 1.00 -> 1.015 -> 1.00
    // 1.8s -> 2.5s (700ms): hold opacity 1, hold scale 1.00
    // 2.5s -> 3.0s (500ms): opacity 1 -> 0 (ease-out fade to reveal screen underneath)
    opacity.value = withSequence(
      withTiming(1, { duration: 600, easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: 1900 }),
      withTiming(0, { duration: 500, easing: Easing.out(Easing.quad) }, (finished) => {
        if (finished) {
          runOnJS(setVisible)(false);
        }
      })
    );

    scale.value = withSequence(
      withTiming(1.00, { duration: 600, easing: Easing.out(Easing.quad) }),
      withTiming(1.015, { duration: 600, easing: Easing.inOut(Easing.quad) }),
      withTiming(1.00, { duration: 600, easing: Easing.inOut(Easing.quad) }),
      withTiming(1.00, { duration: 1200 })
    );
  }, [opacity, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  if (!visible) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      <StatusBar hidden />
      <Animated.View style={[styles.imageWrapper, animatedStyle]}>
        <Image
          source={require('@/assets/images/splash-screen.png')}
          style={styles.splashImage}
          contentFit="cover"
          priority="high"
        />
      </Animated.View>
    </View>
  );
}

export function AnimatedIcon() {
  return null;
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#FAF3EC',
    zIndex: 999999,
    elevation: 999999,
  },
  imageWrapper: {
    width: '100%',
    height: '100%',
  },
  splashImage: {
    width: '100%',
    height: '100%',
  },
});

