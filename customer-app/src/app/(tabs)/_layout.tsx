import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet } from 'react-native';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => (
            <View style={[styles.tabItem, focused && styles.tabItemSelected]}>
              <Ionicons
                name={focused ? 'home' : 'home-outline'}
                size={18}
                color={focused ? '#1E293B' : '#64748B'}
              />
              <Text style={[styles.tabText, focused && styles.tabTextSelected]}>
                Home
              </Text>
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="passbook"
        options={{
          title: 'Passbook',
          tabBarIcon: ({ focused }) => (
            <View style={[styles.tabItem, focused && styles.tabItemSelected]}>
              <Ionicons
                name={focused ? 'book' : 'book-outline'}
                size={18}
                color={focused ? '#1E293B' : '#64748B'}
              />
              <Text style={[styles.tabText, focused && styles.tabTextSelected]}>
                Passbook
              </Text>
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Updates',
          tabBarIcon: ({ focused }) => (
            <View style={[styles.tabItem, focused && styles.tabItemSelected]}>
              <Ionicons
                name={focused ? 'megaphone' : 'megaphone-outline'}
                size={18}
                color={focused ? '#1E293B' : '#64748B'}
              />
              <Text style={[styles.tabText, focused && styles.tabTextSelected]}>
                Updates
              </Text>
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => (
            <View style={[styles.tabItem, focused && styles.tabItemSelected]}>
              <Ionicons
                name={focused ? 'person' : 'person-outline'}
                size={18}
                color={focused ? '#1E293B' : '#64748B'}
              />
              <Text style={[styles.tabText, focused && styles.tabTextSelected]}>
                Profile
              </Text>
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 64,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 6,
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 6,
  },
  tabItemSelected: {
    backgroundColor: '#FDE047',
  },
  tabText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextSelected: {
    color: '#1E293B',
    fontWeight: '700',
  },
});
