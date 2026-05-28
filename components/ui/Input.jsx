import React, { useState } from 'react';
import { View, TextInput, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';

export function Input({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  icon = null,            // Feather icon name string
  rightIcon = null,
  onRightIconPress = null,
  disabled = false,
  multiline = false,
  numberOfLines = 1,
  style = {},
  inputStyle = {},
  required = false,
  maxLength,
  textAlign = 'left',
}) {
  const { isDark } = useTheme();
  const C = isDark ? Colors.dark : Colors.light;
  const [focused, setFocused] = useState(false);

  const containerBorderColor = focused ? '#4F46E5' : C.border;

  return (
    <View style={[styles.wrapper, style]}>
      {label && (
        <Text style={[styles.label, { color: C.textMuted }]}>
          {label}
        </Text>
      )}
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: C.surface2,
            borderColor: containerBorderColor,
            borderWidth: focused ? 1.5 : 1,
          },
          disabled && styles.disabled,
          multiline && { height: 80, alignItems: 'flex-start', paddingTop: 12 },
        ]}
      >
        {icon && (
          <Feather
            name={icon}
            size={18}
            color={C.textMuted}
            style={styles.leftIcon}
          />
        )}
        <TextInput
          style={[
            styles.input,
            {
              color: disabled ? C.textSubtle : C.foreground,
              fontFamily: Typography.fontFamily.regular,
              paddingLeft: icon ? 0 : 4,
              textAlign,
            },
            multiline && { height: 60 },
            inputStyle,
          ]}
          placeholder={placeholder}
          placeholderTextColor={C.textSubtle}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          editable={!disabled}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          multiline={multiline}
          numberOfLines={multiline ? numberOfLines : 1}
          maxLength={maxLength}
        />
        {rightIcon && (
          <TouchableOpacity onPress={onRightIconPress} style={styles.rightIconBtn}>
            <Feather name={rightIcon} size={18} color={C.textMuted} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 0,
  },
  label: {
    fontSize: Typography.size.sm,
    fontFamily: Typography.fontFamily.semiBold,
    marginBottom: 8,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 14,
    minHeight: 48,
  },
  leftIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: Typography.size.base,
    minHeight: 48,
    paddingVertical: 0,
  },
  rightIconBtn: {
    padding: 4,
    marginLeft: 6,
  },
  disabled: {
    opacity: 0.6,
  },
});
