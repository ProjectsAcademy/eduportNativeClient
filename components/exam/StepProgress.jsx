import React from 'react';
import { View, Text, ScrollView, StyleSheet, useWindowDimensions, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';

/**
 * 8-step progress indicator.
 * Wide screens: horizontal bar with labels.
 * Narrow screens: compact "Step N of 8" + mini dot row.
 */
export function StepProgress({ steps, currentStep }) {
  const { isDark } = useTheme();
  const C = isDark ? Colors.dark : Colors.light;
  const { width } = useWindowDimensions();
  const isWide = Platform.OS === 'web' && width >= 900;

  if (!isWide) {
    return (
      <View style={[styles.compact, { backgroundColor: C.card, borderColor: C.border }]}>
        <Text style={[styles.compactLabel, { color: C.textSubtle }]}>
          Step {currentStep} of {steps.length}
        </Text>
        <Text style={[styles.compactTitle, { color: C.foreground }]}>
          {steps[currentStep - 1]?.label}
        </Text>
        <View style={styles.dotRow}>
          {steps.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i + 1 < currentStep  && { backgroundColor: '#4F46E5', width: 8 },
                i + 1 === currentStep && { backgroundColor: '#4F46E5', width: 20, borderRadius: 4 },
                i + 1 > currentStep  && { backgroundColor: C.border },
              ]}
            />
          ))}
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[styles.bar, { backgroundColor: C.card, borderColor: C.border }]}
      contentContainerStyle={styles.barContent}
    >
      {steps.map((step, i) => {
        const n = i + 1;
        const done    = n < currentStep;
        const active  = n === currentStep;
        const pending = n > currentStep;

        return (
          <React.Fragment key={n}>
            <View style={styles.stepItem}>
              {/* Circle */}
              <View style={[
                styles.circle,
                done   && { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
                active && { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
                pending && { backgroundColor: 'transparent', borderColor: C.border },
              ]}>
                {done
                  ? <Feather name="check" size={13} color="#fff" />
                  : <Text style={[styles.circleNum, { color: active ? '#fff' : C.textSubtle }]}>{n}</Text>
                }
              </View>
              {/* Label */}
              <Text style={[
                styles.stepLabel,
                { color: active ? '#4F46E5' : done ? C.textMuted : C.textSubtle },
                active && styles.stepLabelActive,
              ]} numberOfLines={1}>
                {step.label}
              </Text>
            </View>

            {/* Connector */}
            {i < steps.length - 1 && (
              <View style={[styles.connector, { backgroundColor: done ? '#4F46E5' : C.border }]} />
            )}
          </React.Fragment>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Wide
  bar: { borderRadius: 16, borderWidth: 1, marginBottom: 20 },
  barContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 20 },
  stepItem: { alignItems: 'center', gap: 6, minWidth: 64 },
  circle: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  circleNum: { fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.bold },
  stepLabel: { fontSize: 10, fontFamily: Typography.fontFamily.medium, textAlign: 'center', maxWidth: 64 },
  stepLabelActive: { fontFamily: Typography.fontFamily.bold },
  connector: { flex: 1, height: 2, minWidth: 16, marginHorizontal: 4, marginBottom: 18 },
  // Compact
  compact: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 16, gap: 8 },
  compactLabel: { fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.medium, textTransform: 'uppercase', letterSpacing: 0.5 },
  compactTitle: { fontSize: Typography.size.base, fontFamily: Typography.fontFamily.bold },
  dotRow: { flexDirection: 'row', gap: 4, alignItems: 'center', marginTop: 2 },
  dot: { height: 6, width: 6, borderRadius: 3 },
});
