import React, { useEffect, useRef } from 'react';
import { Animated, Text, View, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Typography } from '../../constants/typography';

const ICONS = {
  success: { name: 'check-circle', color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
  error: { name: 'x-circle', color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
  warning: { name: 'alert-triangle', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  info: { name: 'info', color: '#6366F1', bg: 'rgba(99,102,241,0.12)' },
};

export function Toast({ message, type = 'success', visible }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -20, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const v = ICONS[type] || ICONS.info;

  return (
    <Animated.View
      style={[
        styles.toast,
        { backgroundColor: v.bg, opacity, transform: [{ translateY }] },
      ]}
      pointerEvents="none"
    >
      <Feather name={v.name} size={16} color={v.color} style={{ marginRight: 8 }} />
      <Text style={[styles.text, { color: v.color }]}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    top: 20,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    zIndex: 9999,
    maxWidth: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  text: {
    fontSize: Typography.size.base,
    fontFamily: Typography.fontFamily.semiBold,
    flexShrink: 1,
  },
});
