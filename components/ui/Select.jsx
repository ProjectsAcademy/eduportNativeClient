import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, Modal, FlatList } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';

/**
 * Usage:
 *   <Select label="Role" value={role} onChange={setRole}
 *           options={[{label:'Student', value:'student'}, ...]} />
 */
export function Select({ label, value, onChange, options = [], placeholder = 'Select…', error }) {
  const { isDark } = useTheme();
  const C = isDark ? Colors.dark : Colors.light;

  const selectedLabel = options.find(o => o.value === value)?.label ?? placeholder;

  // ── Native: Modal picker (iOS / Android) ────────────────────────────────────
  const [modalVisible, setModalVisible] = useState(false);

  if (Platform.OS !== 'web') {
    return (
      <View style={styles.wrapper}>
        {label && <Text style={[styles.label, { color: C.textSubtle }]}>{label}</Text>}
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          style={[styles.trigger, { backgroundColor: C.surface2, borderColor: error ? '#EF4444' : C.borderMedium }]}
          activeOpacity={0.7}
        >
          <Text style={[styles.triggerText, { color: value ? C.foreground : C.textSubtle }]} numberOfLines={1}>
            {selectedLabel}
          </Text>
          <Feather name="chevron-down" size={16} color={C.textSubtle} />
        </TouchableOpacity>
        {error && <Text style={styles.error}>{error}</Text>}

        <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setModalVisible(false)} />
          <View style={[styles.sheet, { backgroundColor: C.card, borderTopColor: C.border }]}>
            <View style={[styles.sheetHeader, { borderBottomColor: C.border }]}>
              <Text style={[styles.sheetTitle, { color: C.foreground }]}>{label || 'Select'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={{ color: '#6366F1', fontFamily: Typography.fontFamily.semiBold, fontSize: Typography.size.sm }}>Done</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={options}
              keyExtractor={item => String(item.value)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.optionRow, { borderBottomColor: C.border }]}
                  onPress={() => { onChange(item.value); setModalVisible(false); }}
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

  // ── Web: native <select> via Picker ─────────────────────────────────────────
  return (
    <View style={styles.wrapper}>
      {label && <Text style={[styles.label, { color: C.textSubtle }]}>{label}</Text>}
      <View style={[styles.pickerWrapper, { backgroundColor: C.surface2, borderColor: error ? '#EF4444' : C.borderMedium }]}>
        <Picker
          selectedValue={value}
          onValueChange={onChange}
          style={[styles.picker, { color: C.foreground }]}
          dropdownIconColor={C.textSubtle}
        >
          {!value && <Picker.Item label={placeholder} value="" color={C.textSubtle} />}
          {options.map(o => (
            <Picker.Item key={o.value} label={o.label} value={o.value} color={C.foreground} />
          ))}
        </Picker>
        <Feather name="chevron-down" size={16} color={C.textSubtle} style={styles.chevron} />
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  label: { fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.semiBold, textTransform: 'uppercase', letterSpacing: 0.5 },
  // Native trigger
  trigger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 13, borderRadius: 12, borderWidth: 1 },
  triggerText: { flex: 1, fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.regular, marginRight: 8 },
  // Web picker wrapper
  pickerWrapper: { borderRadius: 12, borderWidth: 1, overflow: 'hidden', position: 'relative', justifyContent: 'center' },
  picker: { height: 48, width: '100%', paddingHorizontal: 14, outlineStyle: 'none' },
  chevron: { position: 'absolute', right: 12, pointerEvents: 'none' },
  // Bottom sheet
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: 1, paddingBottom: 24, maxHeight: '60%' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  sheetTitle: { fontSize: Typography.size.base, fontFamily: Typography.fontFamily.bold },
  optionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1 },
  optionText: { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.medium },
  error: { fontSize: Typography.size.xs, color: '#EF4444', fontFamily: Typography.fontFamily.regular },
});
