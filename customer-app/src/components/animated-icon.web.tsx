import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
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
    SplashScreen.hideAsync().catch(() => {});

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

