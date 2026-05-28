import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Colors } from '../../constants/colors';

/**
 * Usage:
 *   <ProgressBar value={75} color="#6366F1" height={6} animated />
 *   <ProgressBar value={score} color={score >= 60 ? '#10B981' : '#EF4444'} />
 */
export function ProgressBar({ value = 0, color = '#6366F1', height = 6, animated = true, style }) {
  const { isDark } = useTheme();
  const C = isDark ? Colors.dark : Colors.light;

  const widthAnim = useRef(new Animated.Value(0)).current;
  const clampedValue = Math.max(0, Math.min(100, value));

  useEffect(() => {
    if (animated) {
      Animated.timing(widthAnim, {
        toValue: clampedValue,
        duration: 600,
        useNativeDriver: false,
      }).start();
    } else {
      widthAnim.setValue(clampedValue);
    }
  }, [clampedValue, animated]);

  const animatedWidth = widthAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={[styles.track, { height, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)', borderRadius: height / 2 }, style]}>
      <Animated.View
        style={[
          styles.fill,
          { width: animatedWidth, backgroundColor: color, borderRadius: height / 2 },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: '100%', overflow: 'hidden' },
  fill: { height: '100%' },
});
