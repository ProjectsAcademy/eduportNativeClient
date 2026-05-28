import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { useTheme } from '../../../context/ThemeContext';
import { Colors } from '../../../constants/colors';
import { Typography } from '../../../constants/typography';

/**
 * Usage:
 *   <BarChart
 *     data={[
 *       { label: '0-20', value: 3,  color: '#EF4444' },
 *       { label: '21-40', value: 5, color: '#F59E0B' },
 *       { label: '41-60', value: 8, color: '#6366F1' },
 *       { label: '61-80', value: 14, color: '#10B981' },
 *       { label: '81-100', value: 9, color: '#10B981' },
 *     ]}
 *     height={180}
 *   />
 *
 * Pure RN — no react-native-svg dependency needed for this component.
 * Uses Animated Views for bars (works on all platforms, animates smoothly).
 */
export function BarChart({ data = [], height = 180, showLabels = true, showValues = true }) {
  const { isDark } = useTheme();
  const C = isDark ? Colors.dark : Colors.light;

  const maxValue = Math.max(...data.map(d => d.value), 1);

  // One animated value per bar
  const anims = useRef(data.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.stagger(60, anims.map((anim, i) =>
      Animated.timing(anim, {
        toValue: data[i]?.value ?? 0,
        duration: 500,
        useNativeDriver: false,
      })
    )).start();
  }, []);

  const chartHeight = height - (showLabels ? 28 : 0);

  return (
    <View style={{ height, width: '100%' }}>
      {/* Grid lines */}
      <View style={[StyleSheet.absoluteFillObject, { bottom: showLabels ? 28 : 0, justifyContent: 'space-between', paddingBottom: 0 }]} pointerEvents="none">
        {[1, 0.75, 0.5, 0.25].map(f => (
          <View key={f} style={[styles.gridLine, { borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]} />
        ))}
      </View>

      {/* Bars */}
      <View style={[styles.barsRow, { height: chartHeight }]}>
        {data.map((item, i) => {
          const barHeight = anims[i].interpolate({
            inputRange: [0, maxValue],
            outputRange: ['0%', '100%'],
            extrapolate: 'clamp',
          });

          return (
            <View key={i} style={styles.barCol}>
              {showValues && (
                <Text style={[styles.valueText, { color: C.textSubtle }]}>{item.value}</Text>
              )}
              <View style={styles.barTrack}>
                <Animated.View
                  style={[styles.bar, { height: barHeight, backgroundColor: item.color ?? '#6366F1', opacity: 0.85 }]}
                />
              </View>
            </View>
          );
        })}
      </View>

      {/* X-axis labels */}
      {showLabels && (
        <View style={styles.labelsRow}>
          {data.map((item, i) => (
            <Text key={i} style={[styles.labelText, { color: C.textSubtle }]} numberOfLines={1}>
              {item.label}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  barsRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, paddingHorizontal: 4 },
  barCol: { flex: 1, alignItems: 'center', gap: 4 },
  barTrack: { width: '100%', flex: 1, justifyContent: 'flex-end', borderRadius: 4, overflow: 'hidden' },
  bar: { width: '100%', borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  labelsRow: { flexDirection: 'row', marginTop: 6, paddingHorizontal: 4 },
  labelText: { flex: 1, fontSize: 9, fontFamily: Typography.fontFamily.medium, textAlign: 'center' },
  valueText: { fontSize: 9, fontFamily: Typography.fontFamily.bold, textAlign: 'center' },
  gridLine: { width: '100%', borderTopWidth: StyleSheet.hairlineWidth },
});
