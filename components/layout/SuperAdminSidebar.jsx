import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Modal, Platform, useWindowDimensions, Pressable, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';

const SIDEBAR_EXPANDED  = 256;
const SIDEBAR_COLLAPSED = 72;
const MOBILE_BREAKPOINT = 768;

// Super-admin-specific navigation — entirely separate from the regular NAV_ITEMS
const SA_NAV_ITEMS = [
  {
    section: 'Admin',
    items: [
      { label: 'Overview',       icon: 'grid',      route: '/super' },
      { label: 'Users',          icon: 'users',     route: '/super/users' },
      { label: 'Organizations',  icon: 'briefcase', route: '/super/organizations' },
    ],
  },
  {
    section: 'Analytics',
    items: [
      { label: 'AI Usage',    icon: 'cpu',       route: '/super/ai-usage' },
      { label: 'Audit Logs',  icon: 'shield',    route: '/super/audit' },
    ],
  },
  {
    section: 'System',
    items: [
      { label: 'Health', icon: 'activity', route: '/super/system' },
    ],
  },
];

function SidebarContent({ expanded, onClose, isDesktop }) {
  const { isDark } = useTheme();
  const { user, logout } = useAuth();
  const router   = useRouter();
  const pathname = usePathname();
  const C        = isDark ? Colors.dark : Colors.light;
  const insets   = useSafeAreaInsets();

  const topInset = (!isDesktop && Platform.OS === 'ios') ? insets.top : 0;
  const initials = ((user?.firstName?.charAt(0) || '') + (user?.lastName?.charAt(0) || '')).toUpperCase();

  const handleNav = (route) => {
    if (!isDesktop && onClose) onClose();
    router.push(route);
  };

  const handleLogout = async () => {
    if (!isDesktop && onClose) onClose();
    await logout();
    router.replace('/');
  };

  return (
    <View style={[styles.sidebar, { backgroundColor: C.sidebarBg, borderRightColor: C.sidebarBorder, width: isDesktop ? (expanded ? SIDEBAR_EXPANDED : SIDEBAR_COLLAPSED) : SIDEBAR_EXPANDED }]}>
      {/* Header */}
      <View style={[styles.sidebarHeader, { borderBottomColor: C.border, paddingTop: topInset }]}>
        <View style={styles.logoRow}>
          {/* Amber-red gradient distinguishes admin mode from regular mode */}
          <LinearGradient colors={['#DC2626', '#7C3AED']} style={styles.logoIcon}>
            <Feather name="shield" size={18} color="#fff" />
          </LinearGradient>
          {(expanded || !isDesktop) && (
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={[styles.logoText, { color: C.primary }]}>ExamFlow AI</Text>
              <View style={styles.adminBadgeRow}>
                <View style={styles.adminBadge}>
                  <Text style={styles.adminBadgeText}>ADMIN CONSOLE</Text>
                </View>
              </View>
            </View>
          )}
        </View>
        {!isDesktop && (
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Feather name="x" size={20} color={C.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Nav */}
      <ScrollView style={styles.nav} showsVerticalScrollIndicator={false}>
        {SA_NAV_ITEMS.map((section) => (
          <View key={section.section} style={styles.section}>
            {(expanded || !isDesktop) && (
              <Text style={[styles.sectionLabel, { color: C.textSubtle }]}>{section.section}</Text>
            )}
            {section.items.map((item) => {
              const itemActive = item.route === '/super'
                ? pathname === '/super'
                : pathname.startsWith(item.route);

              return (
                <TouchableOpacity
                  key={item.label}
                  onPress={() => handleNav(item.route)}
                  style={[
                    styles.navItem,
                    { justifyContent: (!expanded && isDesktop) ? 'center' : 'space-between' },
                    itemActive && [styles.navItemActive, { backgroundColor: C.navActive }],
                  ]}
                >
                  <View style={[styles.navItemLeft, { justifyContent: (!expanded && isDesktop) ? 'center' : 'flex-start' }]}>
                    {itemActive && <View style={styles.activeIndicator} />}
                    <Feather
                      name={item.icon}
                      size={18}
                      color={itemActive ? '#DC2626' : C.textMuted}
                    />
                    {(expanded || !isDesktop) && (
                      <Text style={[styles.navLabel, { color: itemActive ? '#DC2626' : C.textMuted }]}>
                        {item.label}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </ScrollView>

      {/* Footer */}
      <View style={[styles.sidebarFooter, { borderTopColor: C.border }]}>
        <View style={styles.profileRow}>
          {user?.photo ? (
            <Animated.Image source={{ uri: user.photo }} style={styles.avatar} />
          ) : (
            <LinearGradient colors={['#DC2626', '#7C3AED']} style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </LinearGradient>
          )}
          {(expanded || !isDesktop) && (
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={[styles.profileName, { color: C.foreground }]} numberOfLines={1}>
                {user?.firstName} {user?.lastName}
              </Text>
              <Text style={[styles.profileRole, { color: '#DC2626' }]} numberOfLines={1}>
                super_admin
              </Text>
            </View>
          )}
          {(expanded || !isDesktop) && (
            <TouchableOpacity onPress={handleLogout}>
              <Feather name="log-out" size={16} color={C.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

export function SuperAdminSidebar({ expanded, onToggle }) {
  const { isDark } = useTheme();
  const C = isDark ? Colors.dark : Colors.light;
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= MOBILE_BREAKPOINT;

  if (isDesktop) {
    return (
      <View style={{ position: 'relative' }}>
        <SidebarContent expanded={expanded} isDesktop={true} />
        <TouchableOpacity
          onPress={onToggle}
          style={[styles.toggleBtn, { backgroundColor: C.sidebarBg, borderColor: C.border, right: -12 }]}
        >
          <Feather name={expanded ? 'chevron-left' : 'chevron-right'} size={12} color={C.textMuted} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <Modal visible={expanded} transparent animationType="none" onRequestClose={onToggle}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onToggle} />
        <Animated.View style={styles.drawerWrapper}>
          <SidebarContent expanded={true} onClose={onToggle} isDesktop={false} />
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    height: '100%',
    borderRightWidth: 1,
    flexDirection: 'column',
  },
  sidebarHeader: {
    minHeight: 64,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    flexShrink: 0,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  logoText: {
    fontSize: Typography.size.sm,
    fontFamily: Typography.fontFamily.bold,
  },
  adminBadgeRow: {
    flexDirection: 'row',
    marginTop: 2,
  },
  adminBadge: {
    backgroundColor: 'rgba(220,38,38,0.12)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  adminBadgeText: {
    fontSize: 8,
    fontFamily: Typography.fontFamily.bold,
    color: '#DC2626',
    letterSpacing: 0.8,
  },
  closeBtn: {
    padding: 4,
  },
  nav: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 9,
    fontFamily: Typography.fontFamily.bold,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    paddingHorizontal: 10,
    paddingBottom: 6,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  navItemActive: {},
  navItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  activeIndicator: {
    position: 'absolute',
    left: -10,
    top: '50%',
    marginTop: -12,
    width: 3,
    height: 24,
    backgroundColor: '#DC2626',
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  navLabel: {
    marginLeft: 10,
    fontSize: Typography.size.sm,
    fontFamily: Typography.fontFamily.semiBold,
  },
  sidebarFooter: {
    padding: 14,
    borderTopWidth: 1,
    flexShrink: 0,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    color: '#fff',
    fontSize: Typography.size.sm,
    fontFamily: Typography.fontFamily.bold,
  },
  profileName: {
    fontSize: Typography.size.sm,
    fontFamily: Typography.fontFamily.bold,
  },
  profileRole: {
    fontSize: Typography.size.xs,
    fontFamily: Typography.fontFamily.medium,
  },
  toggleBtn: {
    position: 'absolute',
    top: '50%',
    marginTop: -12,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    zIndex: 10,
    ...Platform.select({
      web: { boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
    }),
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  drawerWrapper: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: SIDEBAR_EXPANDED,
    ...Platform.select({
      web: { boxShadow: '4px 0 16px rgba(0,0,0,0.2)' },
      default: { shadowColor: '#000', shadowOffset: { width: 4, height: 0 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 16 },
    }),
  },
});
