import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import { Button } from './Button';

/**
 * Usage:
 *   <EmptyState icon="clipboard" title="No exams yet" subtitle="Create your first exam to get started" action={{ label: 'Create Exam', onPress: () => {} }} />
 */
export function EmptyState({ icon = 'inbox', title, subtitle, action }) {
  const { isDark } = useTheme();
  const C = isDark ? Colors.dark : Colors.light;

  return (
    <View style={styles.root}>
      <View style={[styles.iconWrap, { backgroundColor: isDark ? 'rgba(99,102,241,0.10)' : 'rgba(99,102,241,0.08)' }]}>
        <Feather name={icon} size={28} color="#6366F1" />
      </View>
      {title && <Text style={[styles.title, { color: C.foreground }]}>{title}</Text>}
      {subtitle && <Text style={[styles.sub, { color: C.textSubtle }]}>{subtitle}</Text>}
      {action && (
        <Button
          title={action.label}
          onPress={action.onPress}
          variant="primary"
          fullWidth={false}
          style={{ paddingHorizontal: 24, marginTop: 4 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, paddingHorizontal: 24, gap: 12 },
  iconWrap: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  title: { fontSize: Typography.size.base, fontFamily: Typography.fontFamily.bold, textAlign: 'center' },
  sub: { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.regular, textAlign: 'center', lineHeight: 20, maxWidth: 280 },
});
