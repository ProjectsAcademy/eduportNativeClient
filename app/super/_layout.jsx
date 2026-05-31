import React, { useState } from 'react';
import { View, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { Colors } from '../../constants/colors';
import { SuperAdminSidebar } from '../../components/layout/SuperAdminSidebar';
import { Header } from '../../components/layout/Header';

const MOBILE_BREAKPOINT = 768;

export default function SuperAdminLayout() {
  const { isDark } = useTheme();
  const { user }   = useAuth();
  const router     = useRouter();
  const C          = isDark ? Colors.dark : Colors.light;
  const { width }  = useWindowDimensions();
  const isDesktop  = Platform.OS === 'web' && width >= MOBILE_BREAKPOINT;

  const [sidebarExpanded, setSidebarExpanded]   = useState(true);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Hard role guard — AuthGate in _layout.jsx is the primary guard,
  // but this prevents accidental render if somehow a non-super-admin reaches /super.
  if (!user || user.role !== 'super_admin') {
    router.replace('/');
    return null;
  }

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
          <SuperAdminSidebar
            expanded={sidebarExpanded}
            onToggle={() => setSidebarExpanded(!sidebarExpanded)}
          />
        )}

        {/* Mobile drawer */}
        {!isDesktop && (
          <SuperAdminSidebar
            expanded={mobileDrawerOpen}
            onToggle={() => setMobileDrawerOpen(false)}
          />
        )}

        {/* Main content */}
        <View style={[styles.main, { backgroundColor: C.background }]}>
          <Header onMenuPress={handleMenuPress} />
          <Stack screenOptions={{
            headerShown: false,
            animation: 'none',
            contentStyle: { backgroundColor: C.background },
          }}>
            {/* Only declare screens that have a corresponding file.
                Expo Router auto-discovers all others from the filesystem. */}
            <Stack.Screen name="index" />
          </Stack>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  row:  { flex: 1, flexDirection: 'row' },
  main: { flex: 1, flexDirection: 'column', overflow: 'hidden' },
});
