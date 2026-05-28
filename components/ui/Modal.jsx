import React, { useEffect, useRef } from 'react';
import {
  Modal as RNModal, View, Text, TouchableOpacity,
  StyleSheet, Animated, Platform, ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';

export function Modal({ visible, onClose, title, children, maxWidth = 480 }) {
  const { isDark } = useTheme();
  const C = isDark ? Colors.dark : Colors.light;

  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const panelTranslateY = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(overlayOpacity,   { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(panelTranslateY,  { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(overlayOpacity,   { toValue: 0, duration: 160, useNativeDriver: true }),
        Animated.timing(panelTranslateY,  { toValue: 24, duration: 160, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  // Web: close on Escape key
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handler = (e) => { if (e.key === 'Escape' && visible) onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [visible, onClose]);

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
        {/* Backdrop tap closes */}
        <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={onClose} />

        <Animated.View
          style={[
            styles.panel,
            {
              backgroundColor: C.card,
              borderColor: C.border,
              maxWidth,
              transform: [{ translateY: panelTranslateY }],
            },
            Platform.select({
              web: { boxShadow: '0 8px 48px rgba(0,0,0,0.35)' },
              default: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 48, elevation: 20 },
            }),
          ]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: C.border }]}>
            <Text style={[styles.title, { color: C.foreground }]}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x" size={18} color={C.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </RNModal>
  );
}

Modal.Footer = function ModalFooter({ children }) {
  const { isDark } = useTheme();
  const C = isDark ? Colors.dark : Colors.light;
  return (
    <View style={[styles.footer, { borderTopColor: C.border }]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  panel: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: Typography.size.base,
    fontFamily: Typography.fontFamily.bold,
    flex: 1,
    marginRight: 12,
  },
  closeBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: 20,
    maxHeight: 480,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
});
