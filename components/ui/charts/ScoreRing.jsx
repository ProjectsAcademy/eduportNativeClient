import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../../../context/ThemeContext';
import { Colors } from '../../../constants/colors';
import { Typography } from '../../../constants/typography';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * Animated score ring — mirrors the HTML .result-hero score circle animation.
 *
 * Usage:
 *   <ScoreRing score={84} grade="B+" size={180} />
 */
export function ScoreRing({ score = 0, grade, size = 160, strokeWidth = 14, animate = true }) {
  const { isDark } = useTheme();
  const C = isDark ? Colors.dark : Colors.light;

  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;

  // Stroke color based on score
  const ringColor = score >= 75 ? '#10B981' : score >= 50 ? '#F59E0B' : '#EF4444';

  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animate) {
      Animated.timing(progress, {
        toValue: score / 100,
        duration: 900,
        useNativeDriver: false,
      }).start();
    } else {
      progress.setValue(score / 100);
    }
  }, [score, animate]);

  // strokeDashoffset: full = circumference (empty), 0 = full fill
  const strokeDashoffset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  return (
    <View style={{ alignItems: 'center', gap: 8 }}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          {/* Track */}
          <Circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}
            strokeWidth={strokeWidth}
          />
          {/* Animated fill */}
          <AnimatedCircle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={ringColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            rotation={-90}
            origin={`${cx}, ${cy}`}
          />
        </Svg>

        {/* Center content */}
        <View style={[StyleSheet.absoluteFillObject, styles.center]}>
          <Text style={[styles.scoreText, { color: C.foreground }]}>{score}%</Text>
          {grade && (
            <Text style={[styles.gradeText, { color: ringColor }]}>{grade}</Text>
          )}
        </View>
      </View>

      {/* Pass / Fail indicator */}
      <View style={[styles.pill, { backgroundColor: score >= 40 ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)' }]}>
        <Text style={[styles.pillText, { color: score >= 40 ? '#10B981' : '#EF4444' }]}>
          {score >= 40 ? 'PASSED' : 'FAILED'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  scoreText: { fontSize: Typography.size['3xl'], fontFamily: Typography.fontFamily.extraBold, lineHeight: 36 },
  gradeText: { fontSize: Typography.size.xl, fontFamily: Typography.fontFamily.bold, marginTop: 2 },
  pill: { paddingHorizontal: 14, paddingVertical: 4, borderRadius: 20 },
  pillText: { fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.bold, letterSpacing: 1 },
});
