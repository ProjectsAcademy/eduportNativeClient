import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Typography } from '../../constants/typography';

const VARIANTS = {
  active:    { bg: 'rgba(16,185,129,0.10)',  color: '#10B981' },  // green
  scheduled: { bg: 'rgba(245,158,11,0.10)',  color: '#F59E0B' },  // amber
  completed: { bg: 'rgba(100,116,139,0.12)', color: '#94A3B8' },  // muted gray
  draft:     { bg: 'rgba(59,130,246,0.10)',  color: '#60A5FA' },  // blue
  ongoing:   { bg: 'rgba(99,102,241,0.12)',  color: '#818CF8' },  // indigo
  missed:    { bg: 'rgba(239,68,68,0.10)',   color: '#F87171' },  // red
  success:   { bg: 'rgba(16,185,129,0.10)',  color: '#10B981' },
  warning:   { bg: 'rgba(245,158,11,0.10)',  color: '#F59E0B' },
  error:     { bg: 'rgba(239,68,68,0.10)',   color: '#EF4444' },
  info:      { bg: 'rgba(99,102,241,0.10)',  color: '#6366F1' },
};

export function Badge({ label, variant = 'info', style = {} }) {
  const v = VARIANTS[variant] || VARIANTS.info;
  return (
    <View style={[styles.badge, { backgroundColor: v.bg }, style]}>
      <Text style={[styles.text, { color: v.color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: Typography.size.xs,
    fontFamily: Typography.fontFamily.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
