import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

/**
 * Usage:
 *   <Skeleton width="100%" height={20} borderRadius={6} />
 *   <Skeleton width={80} height={80} borderRadius={40} />  // circle
 */
export function Skeleton({ width = '100%', height = 16, borderRadius = 6, style }) {
  const { isDark } = useTheme();
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1,   duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const bg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';

  return (
    <Animated.View
      style={[{ width, height, borderRadius, backgroundColor: bg, opacity }, style]}
    />
  );
}

/** Convenience: a row of skeleton lines mimicking text content */
export function SkeletonText({ lines = 3, style }) {
  return (
    <View style={[{ gap: 8 }, style]}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} width={i === lines - 1 ? '60%' : '100%'} height={12} borderRadius={4} />
      ))}
    </View>
  );
}

/** Convenience: a card-shaped skeleton */
export function SkeletonCard({ height = 120, style }) {
  const { isDark } = useTheme();
  return (
    <View style={[{ borderRadius: 16, padding: 16, gap: 12, backgroundColor: isDark ? '#1A1A2E' : '#fff', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }, style]}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <Skeleton width={44} height={44} borderRadius={12} />
        <View style={{ flex: 1, gap: 8 }}>
          <Skeleton width="60%" height={14} />
          <Skeleton width="40%" height={11} />
        </View>
      </View>
      <Skeleton width="100%" height={height - 100} borderRadius={8} />
    </View>
  );
}
