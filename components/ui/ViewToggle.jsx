import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { Colors } from '../../constants/colors';

/**
 * Usage:
 *   const [view, setView] = useState('grid');
 *   <ViewToggle view={view} onChange={setView} />
 */
export function ViewToggle({ view = 'grid', onChange }) {
  const { isDark } = useTheme();
  const C = isDark ? Colors.dark : Colors.light;

  const btn = (id, icon) => {
    const active = view === id;
    return (
      <TouchableOpacity
        key={id}
        onPress={() => onChange(id)}
        style={[
          styles.btn,
          active
            ? { backgroundColor: '#4F46E5' }
            : { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' },
        ]}
        activeOpacity={0.8}
      >
        <Feather name={icon} size={15} color={active ? '#fff' : C.textMuted} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.row, { borderColor: C.border }]}>
      {btn('grid', 'grid')}
      {btn('list', 'list')}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', borderRadius: 10, overflow: 'hidden', borderWidth: 1 },
  btn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
});
