import React from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';

/**
 * Usage:
 *   <Toggle value={enabled} onChange={setEnabled} label="Tab switch detection" description="Flags when student leaves the exam tab" />
 */
export function Toggle({ value, onChange, label, description, disabled = false }) {
  const { isDark } = useTheme();
  const C = isDark ? Colors.dark : Colors.light;

  return (
    <View style={styles.row}>
      {(label || description) && (
        <View style={styles.info}>
          {label && (
            <Text style={[styles.label, { color: C.foreground }]}>{label}</Text>
          )}
          {description && (
            <Text style={[styles.desc, { color: C.textSubtle }]}>{description}</Text>
          )}
        </View>
      )}
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ false: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)', true: '#4F46E5' }}
        thumbColor={value ? '#fff' : isDark ? '#94A3B8' : '#CBD5E1'}
        ios_backgroundColor={isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  info: {
    flex: 1,
  },
  label: {
    fontSize: Typography.size.sm,
    fontFamily: Typography.fontFamily.semiBold,
  },
  desc: {
    fontSize: Typography.size.xs,
    fontFamily: Typography.fontFamily.regular,
    marginTop: 2,
  },
});
