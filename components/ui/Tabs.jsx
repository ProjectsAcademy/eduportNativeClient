import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';

/**
 * Usage:
 *   const [tab, setTab] = useState('profile');
 *   <Tabs tabs={[{id:'profile', label:'Profile'}, {id:'security', label:'Security'}]}
 *         activeTab={tab} onChange={setTab} />
 *   {tab === 'profile' && <ProfileContent />}
 */
export function Tabs({ tabs, activeTab, onChange, scrollable = false, style }) {
  const { isDark } = useTheme();
  const C = isDark ? Colors.dark : Colors.light;

  const Container = scrollable ? ScrollView : View;
  const containerProps = scrollable
    ? { horizontal: true, showsHorizontalScrollIndicator: false, contentContainerStyle: styles.row }
    : { style: [styles.row, style] };

  return (
    <Container {...containerProps}>
      {tabs.map(tab => {
        const isActive = tab.id === activeTab;
        return (
          <TouchableOpacity
            key={tab.id}
            onPress={() => onChange(tab.id)}
            style={[
              styles.tab,
              isActive && [styles.tabActive, { borderBottomColor: '#6366F1' }],
            ]}
            activeOpacity={0.7}
          >
            {tab.icon && (
              <tab.icon
                size={15}
                color={isActive ? '#6366F1' : C.textSubtle}
                style={{ marginRight: 6 }}
              />
            )}
            <Text
              style={[
                styles.label,
                { color: isActive ? '#6366F1' : C.textSubtle },
                isActive && styles.labelActive,
              ]}
            >
              {tab.label}
            </Text>
            {tab.badge != null && (
              <View style={[styles.badge, { backgroundColor: isActive ? 'rgba(99,102,241,0.15)' : C.surface }]}>
                <Text style={[styles.badgeText, { color: isActive ? '#6366F1' : C.textSubtle }]}>
                  {tab.badge}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </Container>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginBottom: -1,
  },
  tabActive: {
    borderBottomWidth: 2,
  },
  label: {
    fontSize: Typography.size.sm,
    fontFamily: Typography.fontFamily.medium,
  },
  labelActive: {
    fontFamily: Typography.fontFamily.semiBold,
  },
  badge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: Typography.fontFamily.bold,
  },
});
