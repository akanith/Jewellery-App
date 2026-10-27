import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { getStoredCustomerSession } from '@/services/customerAuthService';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    async function checkInitialRoute() {
      try {
        const session = await getStoredCustomerSession();
        if (!isMounted) return;

        if (session?.token && session?.isAuthenticated) {
          if (session.passwordStatus === 'RESET_REQUIRED') {
            router.replace('/reset-password' as any);
          } else if (session.authorizedProfiles && session.authorizedProfiles.length > 1) {
            router.replace('/select-customer' as any);
          } else {
            router.replace('/(tabs)' as any);
          }
        } else {
          router.replace('/login' as any);
        }
      } catch {
        if (isMounted) {
          router.replace('/login' as any);
        }
      }
    }

    checkInitialRoute();

    return () => {
      isMounted = false;
    };
  }, [router]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FCFAF7" />
      <ActivityIndicator size="large" color="#70001E" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FCFAF7',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

