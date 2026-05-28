import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Typography } from '../../constants/typography';

const VARIANTS = {
  success: { icon: 'check-circle', color: '#10B981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.25)' },
  error:   { icon: 'x-circle',     color: '#EF4444', bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.25)' },
  warning: { icon: 'alert-triangle',color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)' },
  info:    { icon: 'info',          color: '#6366F1', bg: 'rgba(99,102,241,0.12)',  border: 'rgba(99,102,241,0.25)' },
};

export function Toast({ message, type = 'info' }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,     { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(translateY,  { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
  }, []);

  const v = VARIANTS[type] || VARIANTS.info;

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          backgroundColor: v.bg,
          borderColor: v.border,
          opacity,
          transform: [{ translateY }],
        },
      ]}
      pointerEvents="none"
    >
      <Feather name={v.icon} size={16} color={v.color} style={styles.icon} />
      <Text style={[styles.text, { color: v.color }]} numberOfLines={2}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    maxWidth: 340,
    ...Platform.select({
      web: { boxShadow: '0 4px 16px rgba(0,0,0,0.15)' },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 8 },
    }),
  },
  icon: { marginRight: 8, flexShrink: 0 },
  text: {
    fontSize: Typography.size.sm,
    fontFamily: Typography.fontFamily.semiBold,
    flexShrink: 1,
  },
});
