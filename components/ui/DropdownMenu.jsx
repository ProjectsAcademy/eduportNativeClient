import React, { useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, Modal, StyleSheet,
  Platform, useWindowDimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';

/**
 * Usage:
 *   <DropdownMenu
 *     trigger={<Feather name="more-vertical" size={18} />}
 *     items={[
 *       { label: 'Edit', icon: 'edit-2', onPress: handleEdit },
 *       { label: 'Share', icon: 'share', onPress: handleShare },
 *       { label: 'Delete', icon: 'trash-2', onPress: handleDelete, danger: true },
 *     ]}
 *     align="right"    // 'left' | 'right'
 *   />
 */
export function DropdownMenu({ trigger, items = [], align = 'right' }) {
  const { isDark } = useTheme();
  const C = isDark ? Colors.dark : Colors.light;
  const { width: screenWidth } = useWindowDimensions();

  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const triggerRef = useRef(null);

  const open = () => {
    triggerRef.current?.measureInWindow((x, y, w, h) => {
      setCoords({ x, y, width: w, height: h });
      setVisible(true);
    });
  };

  const close = () => setVisible(false);

  const menuWidth = 200;
  const menuLeft = align === 'right'
    ? Math.max(8, coords.x + coords.width - menuWidth)
    : Math.min(coords.x, screenWidth - menuWidth - 8);
  const menuTop = coords.y + coords.height + 6;

  return (
    <>
      <TouchableOpacity ref={triggerRef} onPress={open} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        {trigger}
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="none" onRequestClose={close} statusBarTranslucent>
        {/* Backdrop */}
        <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={close} />

        <View
          style={[
            styles.menu,
            {
              top: menuTop,
              left: menuLeft,
              width: menuWidth,
              backgroundColor: isDark ? '#1A1A2E' : '#fff',
              borderColor: C.border,
            },
            Platform.select({
              web: { boxShadow: '0 8px 24px rgba(0,0,0,0.18)' },
              default: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 24, elevation: 12 },
            }),
          ]}
        >
          {items.map((item, i) => (
            <React.Fragment key={i}>
              {item.divider ? (
                <View style={[styles.divider, { backgroundColor: C.border }]} />
              ) : (
                <TouchableOpacity
                  onPress={() => { close(); item.onPress?.(); }}
                  style={[styles.item, { borderBottomColor: i < items.length - 1 ? C.border : 'transparent' }]}
                  activeOpacity={0.7}
                >
                  {item.icon && (
                    <Feather name={item.icon} size={15} color={item.danger ? '#EF4444' : C.textMuted} style={{ marginRight: 10 }} />
                  )}
                  <Text style={[styles.itemText, { color: item.danger ? '#EF4444' : C.foreground }]}>
                    {item.label}
                  </Text>
                  {item.badge != null && (
                    <View style={styles.itemBadge}>
                      <Text style={styles.itemBadgeText}>{item.badge}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
            </React.Fragment>
          ))}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  menu: {
    position: 'absolute',
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    zIndex: 999,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemText: {
    flex: 1,
    fontSize: Typography.size.sm,
    fontFamily: Typography.fontFamily.medium,
  },
  itemBadge: {
    backgroundColor: 'rgba(99,102,241,0.12)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  itemBadgeText: {
    fontSize: 10,
    color: '#6366F1',
    fontFamily: Typography.fontFamily.bold,
  },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 2 },
});
