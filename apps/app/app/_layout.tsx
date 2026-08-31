import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useAuthStore } from '../store/authStore';

export default function RootLayout() {
  const { session, isInitialized, initializeAuth } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  // Initialize session from AsyncStorage on app startup
  useEffect(() => {
    initializeAuth();
  }, []);

  // Navigate based on session state once initialized
  useEffect(() => {
    if (!isInitialized) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (session && inAuthGroup) {
      // Session exists → go to customer dashboard
      router.replace('/(tabs)/home');
    } else if (!session && !inAuthGroup) {
      // No session → go to login
      router.replace('/(auth)/language');
    }
  }, [session, isInitialized, segments]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
