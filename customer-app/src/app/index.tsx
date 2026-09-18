import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { hasSavedLanguagePreference } from '@/services/languageService';
import { getStoredCustomerSession } from '@/services/customerAuthService';

export default function Index() {
  const [targetRoute, setTargetRoute] = useState<string | null>(null);

  useEffect(() => {
    async function determineTargetRoute() {
      try {
        const hasLang = await hasSavedLanguagePreference();
        const session = await getStoredCustomerSession();

        if (!hasLang) {
          setTargetRoute('/language');
        } else if (!session) {
          setTargetRoute('/login');
        } else {
          setTargetRoute('/(tabs)');
        }
      } catch {
        setTargetRoute('/language');
      }
    }

    determineTargetRoute();
  }, []);

  if (!targetRoute) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#70001E" />
      </View>
    );
  }

  return <Redirect href={targetRoute as any} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});
