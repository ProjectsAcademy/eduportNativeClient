import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';

export function Button({
  title,
  onPress,
  variant = 'primary',    // 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
  loading = false,
  disabled = false,
  icon = null,
  style = {},
  textStyle = {},
  fullWidth = true,
}) {
  const { isDark } = useTheme();
  const C = isDark ? Colors.dark : Colors.light;

  if (variant === 'primary') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.85}
        style={[styles.base, fullWidth && styles.fullWidth, (disabled || loading) && styles.disabled, style]}
      >
        <LinearGradient
          colors={['#4F46E5', '#7C3AED']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <View style={styles.row}>
              {icon}
              <Text style={[styles.primaryText, textStyle]}>{title}</Text>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  if (variant === 'success') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.85}
        style={[styles.base, fullWidth && styles.fullWidth, (disabled || loading) && styles.disabled, style]}
      >
        <LinearGradient
          colors={['#059669', '#0D9488']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={[styles.primaryText, textStyle]}>{title}</Text>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  if (variant === 'secondary') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.85}
        style={[
          styles.base,
          fullWidth && styles.fullWidth,
          { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', borderWidth: 1, borderColor: C.borderMedium, borderRadius: 12 },
          (disabled || loading) && styles.disabled,
          style
        ]}
      >
        {loading ? (
          <ActivityIndicator color={C.foreground} size="small" />
        ) : (
          <View style={styles.row}>
            {icon}
            <Text style={[styles.secondaryText, { color: C.foreground }, textStyle]}>{title}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  if (variant === 'danger') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.85}
        style={[
          styles.base,
          fullWidth && styles.fullWidth,
          { backgroundColor: 'rgba(239,68,68,0.10)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.20)', borderRadius: 12 },
          (disabled || loading) && styles.disabled,
          style
        ]}
      >
        <Text style={[styles.secondaryText, { color: '#EF4444' }, textStyle]}>{title}</Text>
      </TouchableOpacity>
    );
  }

  // ghost
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled || loading} activeOpacity={0.7} style={[{ padding: 8 }, style]}>
      <Text style={[{ color: C.primary, fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.semiBold }, textStyle]}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  fullWidth: {
    width: '100%',
  },
  gradient: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    color: '#FFFFFF',
    fontSize: Typography.size.base,
    fontFamily: Typography.fontFamily.semiBold,
    letterSpacing: 0.2,
  },
  secondaryText: {
    fontSize: Typography.size.base,
    fontFamily: Typography.fontFamily.semiBold,
    letterSpacing: 0.2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  disabled: {
    opacity: 0.5,
  },
});
