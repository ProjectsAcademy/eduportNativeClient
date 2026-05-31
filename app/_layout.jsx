import { useEffect } from 'react';
import { enableScreens } from 'react-native-screens';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/inter';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

enableScreens(); // must be called before any Screen renders (Android requirement)
SplashScreen.preventAutoHideAsync();

// Centralized auth guard — the single source of truth for routing
function AuthGate() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return; // wait for AsyncStorage restore

    const inDashboard   = segments[0] === 'dashboard';
    const inSuper       = segments[0] === 'super';
    const isSuperAdmin  = user?.role === 'super_admin';

    if (!user) {
      // Not authenticated — kick out of any protected area
      if (inDashboard || inSuper) router.replace('/');
      return;
    }

    if (isSuperAdmin) {
      // Super admin must be in /super — redirect from anywhere else
      if (!inSuper) router.replace('/super');
    } else {
      // Regular users must be in /dashboard — redirect from /super and auth screen
      if (!inDashboard) router.replace('/dashboard');
    }
  }, [user, loading, segments]);

  return null;
}

function RootLayoutNav() {
  const { isDark } = useTheme();
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AuthGate />
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="dashboard" />
        <Stack.Screen name="super" />
        <Stack.Screen name="(exam)" options={{ animation: 'none' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontsError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontsError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontsError]);

  if (!fontsLoaded && !fontsError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              <RootLayoutNav />
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
