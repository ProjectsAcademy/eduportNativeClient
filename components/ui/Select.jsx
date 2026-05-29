import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Platform, TouchableOpacity,
  Modal, FlatList, ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';

/**
 * Cross-platform Select / Dropdown component.
 *
 * iOS / Android → custom bottom-sheet Modal (existing behaviour, unchanged)
 * Web           → custom positioned dropdown via transparent Modal
 *                 NO native <select> or @react-native-picker/picker on web.
 *
 * Why: browser-native <select> popup is rendered by the OS/browser UI layer,
 * completely outside React's component tree. Theme tokens, dark mode, and
 * design-system colors cannot reach it. See CLAUDE.md § Dropdown / Select
 * Architecture Rules.
 */
export function Select({ label, value, onChange, options = [], placeholder = 'Select…', error }) {
  const { isDark } = useTheme();
  const C = isDark ? Colors.dark : Colors.light;

  const selectedLabel = options.find(o => o.value === value)?.label ?? placeholder;

  // ── State — all hooks unconditional (required by React hook rules) ─────────
  const [open, setOpen]       = useState(false);
  const triggerRef            = useRef(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 0 });

  // Web-only: close on Escape key
  useEffect(() => {
    if (Platform.OS !== 'web' || !open) return;
    const handler = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  // ── Native branch — iOS / Android (unchanged from original) ──────────────
  if (Platform.OS !== 'web') {
    return (
      <View style={styles.wrapper}>
        {label && <Text style={[styles.label, { color: C.textSubtle }]}>{label}</Text>}
        <TouchableOpacity
          onPress={() => setOpen(true)}
          style={[styles.trigger, { backgroundColor: C.surface2, borderColor: error ? '#EF4444' : C.borderMedium }]}
          activeOpacity={0.7}
        >
          <Text style={[styles.triggerText, { color: value ? C.foreground : C.textSubtle }]} numberOfLines={1}>
            {selectedLabel}
          </Text>
          <Feather name={open ? 'chevron-up' : 'chevron-down'} size={16} color={C.textSubtle} />
        </TouchableOpacity>
        {error && <Text style={styles.error}>{error}</Text>}

        <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setOpen(false)} />
          <View style={[styles.sheet, { backgroundColor: C.card, borderTopColor: C.border }]}>
            <View style={[styles.sheetHeader, { borderBottomColor: C.border }]}>
              <Text style={[styles.sheetTitle, { color: C.foreground }]}>{label || 'Select'}</Text>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <Text style={{ color: '#6366F1', fontFamily: Typography.fontFamily.semiBold, fontSize: Typography.size.sm }}>Done</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={options}
              keyExtractor={item => String(item.value)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.optionRow, { borderBottomColor: C.border }]}
                  onPress={() => { onChange(item.value); setOpen(false); }}
                >
                  <Text style={[styles.optionText, { color: item.value === value ? '#6366F1' : C.foreground }]}>
                    {item.label}
                  </Text>
                  {item.value === value && <Feather name="check" size={16} color="#6366F1" />}
                </TouchableOpacity>
              )}
            />
          </View>
        </Modal>
      </View>
    );
  }

  // ── Web branch — fully custom, zero native <select> ───────────────────────

  const openMenu = () => {
    triggerRef.current?.measureInWindow((x, y, w, h) => {
      setMenuPos({ top: y + h + 4, left: x, width: w });
      setOpen(true);
    });
  };

  // Dark mode gets a heavier shadow to separate from dark surfaces
  const menuShadow = isDark
    ? { boxShadow: '0 8px 32px rgba(0,0,0,0.55)' }
    : { boxShadow: '0 8px 24px rgba(0,0,0,0.12)' };

  return (
    <View style={styles.wrapper}>
      {label && <Text style={[styles.label, { color: C.textSubtle }]}>{label}</Text>}

      {/* Trigger — styled from design tokens, not browser defaults */}
      <TouchableOpacity
        ref={triggerRef}
        onPress={openMenu}
        style={[
          styles.trigger,
          {
            backgroundColor: C.surface2,
            borderColor: error ? '#EF4444' : open ? '#4F46E5' : C.borderMedium,
            borderWidth: open ? 1.5 : 1,
          },
        ]}
        activeOpacity={0.8}
      >
        <Text style={[styles.triggerText, { color: value ? C.foreground : C.textSubtle }]} numberOfLines={1}>
          {selectedLabel}
        </Text>
        <Feather name={open ? 'chevron-up' : 'chevron-down'} size={16} color={open ? '#4F46E5' : C.textSubtle} />
      </TouchableOpacity>

      {error && <Text style={styles.error}>{error}</Text>}

      {/* Popup — transparent Modal catches outside taps; View holds the menu */}
      <Modal
        visible={open}
        transparent
        animationType="none"
        onRequestClose={() => setOpen(false)}
        statusBarTranslucent
      >
        {/* Backdrop — full screen, closes menu on tap outside */}
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={() => setOpen(false)}
        />

        {/* Menu — positioned directly below trigger using measureInWindow coords */}
        <View
          style={[
            styles.menu,
            {
              top:             menuPos.top,
              left:            menuPos.left,
              width:           menuPos.width,
              backgroundColor: C.card,
              borderColor:     C.border,
            },
            menuShadow,
          ]}
        >
          <ScrollView
            style={{ maxHeight: 260 }}
            bounces={false}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {options.map((o, i) => {
              const isSelected = o.value === value;
              const isLast     = i === options.length - 1;
              return (
                <TouchableOpacity
                  key={String(o.value)}
                  onPress={() => { onChange(o.value); setOpen(false); }}
                  style={[
                    styles.menuOption,
                    { borderBottomColor: C.border, borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth },
                    isSelected && {
                      backgroundColor: isDark ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.07)',
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.menuOptionText,
                    { color: isSelected ? '#6366F1' : C.foreground },
                    isSelected && { fontFamily: Typography.fontFamily.semiBold },
                  ]}>
                    {o.label}
                  </Text>
                  {isSelected && <Feather name="check" size={13} color="#6366F1" />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  label: {
    fontSize: Typography.size.xs,
    fontFamily: Typography.fontFamily.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // ── Shared trigger (used by both native and web) ──────────────────────────
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
  },
  triggerText: {
    flex: 1,
    fontSize: Typography.size.sm,
    fontFamily: Typography.fontFamily.regular,
    marginRight: 8,
  },

  // ── Web menu ──────────────────────────────────────────────────────────────
  menu: {
    position: 'absolute',
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    zIndex: 999,
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  menuOptionText: {
    fontSize: Typography.size.sm,
    fontFamily: Typography.fontFamily.regular,
    flex: 1,
    marginRight: 8,
  },

  // ── Native bottom sheet ───────────────────────────────────────────────────
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    paddingBottom: 24,
    maxHeight: '60%',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  sheetTitle: { fontSize: Typography.size.base, fontFamily: Typography.fontFamily.bold },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  optionText: { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.medium },
  error: { fontSize: Typography.size.xs, color: '#EF4444', fontFamily: Typography.fontFamily.regular },
});
