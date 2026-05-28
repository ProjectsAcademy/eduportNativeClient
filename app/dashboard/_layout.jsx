import React, { useState } from 'react';
import { View, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { Colors } from '../../constants/colors';
import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';

const MOBILE_BREAKPOINT = 768;

export default function DashboardLayout() {
  const { isDark } = useTheme();
  const C = isDark ? Colors.dark : Colors.light;
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= MOBILE_BREAKPOINT;
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const handleMenuPress = () => {
    if (isDesktop) {
      setSidebarExpanded(!sidebarExpanded);
    } else {
      setMobileDrawerOpen(true);
    }
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: C.background }]} edges={['top']}>
      <View style={styles.row}>
        {/* Desktop persistent sidebar */}
        {isDesktop && (
          <Sidebar
            expanded={sidebarExpanded}
            onToggle={() => setSidebarExpanded(!sidebarExpanded)}
          />
        )}

        {/* Mobile drawer */}
        {!isDesktop && (
          <Sidebar
            expanded={mobileDrawerOpen}
            onToggle={() => setMobileDrawerOpen(false)}
          />
        )}

        {/* Main content */}
        <View style={[styles.main, { backgroundColor: C.background }]}>
          <Header onMenuPress={handleMenuPress} />
          <Stack screenOptions={{ headerShown: false, animation: 'none', contentStyle: { backgroundColor: C.background } }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="settings" />
            <Stack.Screen name="exams" />
            <Stack.Screen name="create-exam" />
            <Stack.Screen name="join-exam" />
            <Stack.Screen name="results" />
            <Stack.Screen name="student-report" />
            <Stack.Screen name="history" />
          </Stack>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  row: { flex: 1, flexDirection: 'row' },
  main: { flex: 1, flexDirection: 'column', overflow: 'hidden' },
});
