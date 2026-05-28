import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../../../context/ThemeContext';
import { Colors } from '../../../constants/colors';
import { Typography } from '../../../constants/typography';

/**
 * Stroke-dasharray donut chart using react-native-svg.
 * Each segment = a Circle with a portion of the circumference.
 *
 * Usage:
 *   <DonutChart
 *     size={160}
 *     segments={[
 *       { value: 14, color: '#10B981', label: 'Pass' },
 *       { value: 6,  color: '#EF4444', label: 'Fail' },
 *     ]}
 *     centerLabel="20"
 *     centerSub="Students"
 *   />
 */
export function DonutChart({ size = 160, strokeWidth = 18, segments = [], centerLabel, centerSub }) {
  const { isDark } = useTheme();
  const C = isDark ? Colors.dark : Colors.light;

  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;

  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;

  // Animate reveal
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, { toValue: 1, duration: 700, useNativeDriver: false }).start();
  }, []);

  // Build cumulative offsets
  let cumulativeOffset = 0;
  const segmentData = segments.map(seg => {
    const dash = (seg.value / total) * circumference;
    const offset = circumference - cumulativeOffset;
    cumulativeOffset += dash;
    return { ...seg, dash, offset };
  });

  const AnimatedCircle = Animated.createAnimatedComponent(Circle);

  return (
    <View style={{ alignItems: 'center', gap: 12 }}>
      <View style={{ width: size, height: size, position: 'relative' }}>
        <Svg width={size} height={size}>
          {/* Track */}
          <Circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}
            strokeWidth={strokeWidth}
          />
          {/* Segments */}
          {segmentData.map((seg, i) => (
            <Circle
              key={i}
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${seg.dash} ${circumference - seg.dash}`}
              strokeDashoffset={seg.offset}
              strokeLinecap="butt"
              rotation={-90}
              origin={`${cx}, ${cy}`}
            />
          ))}
        </Svg>
        {/* Center label */}
        {(centerLabel != null || centerSub) && (
          <View style={[StyleSheet.absoluteFillObject, styles.center]}>
            {centerLabel != null && (
              <Text style={[styles.centerLabel, { color: C.foreground }]}>{centerLabel}</Text>
            )}
            {centerSub && (
              <Text style={[styles.centerSub, { color: C.textSubtle }]}>{centerSub}</Text>
            )}
          </View>
        )}
      </View>

      {/* Legend */}
      {segments.length > 0 && (
        <View style={styles.legend}>
          {segments.map((seg, i) => (
            <View key={i} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: seg.color }]} />
              <Text style={[styles.legendText, { color: C.textSubtle }]}>{seg.label}</Text>
              <Text style={[styles.legendVal, { color: C.foreground }]}>{seg.value}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  centerLabel: { fontSize: Typography.size['2xl'], fontFamily: Typography.fontFamily.extraBold, lineHeight: 30 },
  centerSub: { fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.medium, marginTop: 2 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.medium },
  legendVal: { fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.bold },
});
