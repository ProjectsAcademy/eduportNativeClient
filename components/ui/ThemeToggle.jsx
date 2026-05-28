import React from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { Colors } from '../../constants/colors';

export function ThemeToggle({ size = 20 }) {
  const { isDark, toggleTheme } = useTheme();
  const C = isDark ? Colors.dark : Colors.light;

  return (
    <TouchableOpacity
      onPress={toggleTheme}
      style={[
        styles.btn,
        { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
      ]}
      accessibilityLabel="Toggle theme"
    >
      <Feather
        name={isDark ? 'sun' : 'moon'}
        size={size}
        color={C.textMuted}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
