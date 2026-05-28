import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Platform, useWindowDimensions, TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import { ThemeToggle } from '../ui/ThemeToggle';

const MOBILE_BREAKPOINT = 768;

export function Header({ onMenuPress, title = '' }) {
  const { isDark } = useTheme();
  const { user, logout } = useAuth();
  const router = useRouter();
  const C = isDark ? Colors.dark : Colors.light;
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= MOBILE_BREAKPOINT;
  const [profileOpen, setProfileOpen] = useState(false);

  const initials = ((user?.firstName?.charAt(0) || '') + (user?.lastName?.charAt(0) || '')).toUpperCase();

  const handleLogout = async () => {
    setProfileOpen(false);
    await logout();
    router.replace('/');
  };

  return (
    <View style={[styles.header, { backgroundColor: C.headerBg, borderBottomColor: C.border }]}>
      {/* Left */}
      <View style={styles.left}>
        <TouchableOpacity
          onPress={onMenuPress}
          style={[styles.menuBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }]}
        >
          <Feather name="menu" size={20} color={C.textMuted} />
        </TouchableOpacity>

        {isDesktop && (
          <View style={[styles.searchContainer, { backgroundColor: C.surface2, borderColor: C.border }]}>
            <Feather name="search" size={15} color={C.textSubtle} style={{ marginRight: 8 }} />
            <TextInput
              placeholder="Search exams, students..."
              placeholderTextColor={C.textSubtle}
              style={[styles.searchInput, { color: C.foreground, fontFamily: Typography.fontFamily.regular }]}
              autoComplete="off"
            />
          </View>
        )}
      </View>

      {/* Right */}
      <View style={styles.right}>
        <ThemeToggle />

        {/* Notification bell */}
        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }]}
        >
          <Feather name="bell" size={18} color={C.textMuted} />
          <View style={styles.notifDot} />
        </TouchableOpacity>

        {/* Profile */}
        <View style={{ position: 'relative' }}>
          <TouchableOpacity
            onPress={() => setProfileOpen(!profileOpen)}
            style={styles.profileBtn}
          >
            {user?.photo ? (
              <Animated.Image source={{ uri: user.photo }} style={styles.headerAvatar} />
            ) : (
              <LinearGradient colors={['#6366F1', '#7C3AED']} style={styles.headerAvatar}>
                <Text style={styles.headerAvatarText}>{initials}</Text>
              </LinearGradient>
            )}
            {isDesktop && (
              <>
                <Text style={[styles.headerName, { color: C.foreground }]} numberOfLines={1}>
                  {user?.firstName} {user?.lastName}
                </Text>
                <Feather
                  name={profileOpen ? 'chevron-up' : 'chevron-down'}
                  size={14}
                  color={C.textSubtle}
                  style={{ marginLeft: 4 }}
                />
              </>
            )}
          </TouchableOpacity>

          {/* Dropdown */}
          {profileOpen && (
            <View style={[styles.dropdown, { backgroundColor: isDark ? '#1A1A2E' : '#fff', borderColor: C.border }]}>
              <Text style={[styles.dropdownSection, { color: C.textSubtle }]}>My Account</Text>

              <TouchableOpacity
                onPress={() => { setProfileOpen(false); router.push('/dashboard/settings'); }}
                style={styles.dropdownItem}
              >
                <Feather name="user" size={14} color={C.textMuted} />
                <Text style={[styles.dropdownItemText, { color: C.foreground }]}>Profile</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => { setProfileOpen(false); router.push('/dashboard/settings'); }}
                style={styles.dropdownItem}
              >
                <Feather name="settings" size={14} color={C.textMuted} />
                <Text style={[styles.dropdownItemText, { color: C.foreground }]}>Settings</Text>
              </TouchableOpacity>

              <View style={[styles.dropdownDivider, { borderColor: C.border }]} />

              <TouchableOpacity onPress={handleLogout} style={styles.dropdownItem}>
                <Feather name="log-out" size={14} color="#EF4444" />
                <Text style={[styles.dropdownItemText, { color: '#EF4444' }]}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    zIndex: 30,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  menuBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 36,
    width: 280,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.size.sm,
    height: 36,
    paddingVertical: 0,
    outlineStyle: 'none',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notifDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  profileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 8,
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarText: {
    color: '#fff',
    fontSize: Typography.size.xs,
    fontFamily: Typography.fontFamily.bold,
  },
  headerName: {
    fontSize: Typography.size.sm,
    fontFamily: Typography.fontFamily.semiBold,
    maxWidth: 120,
  },
  dropdown: {
    position: 'absolute',
    right: 0,
    top: 44,
    width: 200,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 8,
    zIndex: 100,
    ...Platform.select({
      web: { boxShadow: '0 8px 20px rgba(0,0,0,0.15)' },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
    }),
  },
  dropdownSection: {
    fontSize: 9,
    fontFamily: Typography.fontFamily.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 4,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  dropdownItemText: {
    fontSize: Typography.size.sm,
    fontFamily: Typography.fontFamily.medium,
  },
  dropdownDivider: {
    borderTopWidth: 1,
    marginVertical: 4,
    marginHorizontal: 8,
  },
});
