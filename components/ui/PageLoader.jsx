import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';

/**
 * Usage:
 *   <PageLoader visible={loading} />
 *
 * Renders a full-screen overlay that fades out when visible → false.
 * Always mount it at the screen root, above all content.
 */
export function PageLoader({ visible }) {
  const opacity = useRef(new Animated.Value(1)).current;
  const prevVisible = useRef(visible);

  useEffect(() => {
    if (!visible && prevVisible.current) {
      // Fade out
      Animated.timing(opacity, { toValue: 0, duration: 350, useNativeDriver: true }).start();
    } else if (visible && !prevVisible.current) {
      opacity.setValue(1);
    }
    prevVisible.current = visible;
  }, [visible]);

  if (!visible && opacity._value === 0) return null;

  return (
    <Animated.View style={[styles.root, { opacity }]} pointerEvents={visible ? 'auto' : 'none'}>
      <LinearGradient colors={['#0D0D1A', '#13131F']} style={StyleSheet.absoluteFillObject} />
      <View style={styles.content}>
        <LinearGradient colors={['#4F46E5', '#7C3AED']} style={styles.logo}>
          <Feather name="layers" size={28} color="#fff" />
        </LinearGradient>
        {/* Spinner ring */}
        <View style={styles.spinnerWrap}>
          <SpinnerRing />
        </View>
      </View>
    </Animated.View>
  );
}

function SpinnerRing() {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotation, { toValue: 1, duration: 900, useNativeDriver: true })
    ).start();
  }, []);

  const spin = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <Animated.View style={[styles.spinner, { transform: [{ rotate: spin }] }]} />
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, zIndex: 999, alignItems: 'center', justifyContent: 'center' },
  content: { alignItems: 'center', gap: 24 },
  logo: { width: 64, height: 64, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  spinnerWrap: { alignItems: 'center', justifyContent: 'center' },
  spinner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: 'rgba(99,102,241,0.2)',
    borderTopColor: '#6366F1',
  },
});
