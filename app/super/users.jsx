import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Platform, useWindowDimensions, ActivityIndicator, Modal,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import { Shadows } from '../../constants/shadows';
import { superAdminService } from '../../services/superAdminService';

const ROLES = ['All Roles', 'student', 'Teacher / Instructor', 'School Administrator', 'Corporate Trainer'];
const STATUSES = [
  { label: 'All',       value: undefined },
  { label: 'Active',    value: true },
  { label: 'Suspended', value: false },
];
const ASSIGNABLE = ['student', 'Teacher / Instructor', 'School Administrator', 'Corporate Trainer'];

function RoleBadge({ role, C }) {
  const colors = {
    'student':              { bg: 'rgba(99,102,241,0.12)',  fg: '#6366F1' },
    'Teacher / Instructor': { bg: 'rgba(16,185,129,0.12)', fg: '#10B981' },
    'School Administrator': { bg: 'rgba(245,158,11,0.12)', fg: '#F59E0B' },
    'Corporate Trainer':    { bg: 'rgba(59,130,246,0.12)', fg: '#3B82F6' },
    'super_admin':          { bg: 'rgba(220,38,38,0.12)',  fg: '#DC2626' },
  };
  const { bg, fg } = colors[role] ?? { bg: 'rgba(107,114,128,0.12)', fg: '#6B7280' };
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color: fg }]}>{role}</Text>
    </View>
  );
}

export default function UsersScreen() {
  const { isDark } = useTheme();
  const C = isDark ? Colors.dark : Colors.light;
  const { width } = useWindowDimensions();
  const isWide = Platform.OS === 'web' && width >= 768;

  const [users,    setUsers]    = useState([]);
  const [total,    setTotal]    = useState(0);
  const [page,     setPage]     = useState(1);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [role,     setRole]     = useState('All Roles');
  const [status,   setStatus]   = useState(undefined);
  const [selected, setSelected] = useState(null);
  const [acting,   setActing]   = useState(false);
  const [actionMsg,setActionMsg]= useState('');

  const load = useCallback(async (pg = 1, reset = false) => {
    try {
      setLoading(true);
      const params = { page: pg, limit: 20 };
      if (search)              params.search   = search;
      if (role !== 'All Roles') params.role    = role;
      if (status !== undefined) params.isActive = status;
      const res = await superAdminService.listUsers(params);
      const fetched = res.data?.users ?? [];
      setUsers(reset ? fetched : prev => pg === 1 ? fetched : [...prev, ...fetched]);
      setTotal(res.data?.pagination?.total ?? 0);
      setPage(pg);
    } catch (_) {}
    finally { setLoading(false); }
  }, [search, role, status]);

  useEffect(() => { load(1, true); }, [search, role, status]);

  const handleAction = async (action) => {
    if (!selected) return;
    setActing(true);
    setActionMsg('');
    try {
      if (action === 'suspend')  await superAdminService.suspendUser(selected._id);
      if (action === 'activate') await superAdminService.activateUser(selected._id);
      setSelected(null);
      await load(1, true);
    } catch (e) {
      setActionMsg(e.message || 'Action failed');
    } finally { setActing(false); }
  };

  const handleRoleChange = async (newRole) => {
    if (!selected) return;
    setActing(true);
    try {
      await superAdminService.changeUserRole(selected._id, newRole);
      setSelected(null);
      await load(1, true);
    } catch (e) {
      setActionMsg(e.message || 'Failed to change role');
    } finally { setActing(false); }
  };

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
      {/* Header */}
      <View style={[styles.pageHeader, { borderBottomColor: C.border }]}>
        <View>
          <Text style={[styles.pageTitle, { color: C.foreground }]}>User Management</Text>
          <Text style={[styles.pageSub, { color: C.textMuted }]}>{total} total users</Text>
        </View>
      </View>

      {/* Filters */}
      <View style={[styles.filters, { borderBottomColor: C.border }]}>
        {/* Search */}
        <View style={[styles.searchBox, { backgroundColor: C.surface2, borderColor: C.border }]}>
          <Feather name="search" size={14} color={C.textSubtle} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by name or email…"
            placeholderTextColor={C.textSubtle}
            style={[styles.searchInput, { color: C.foreground }]}
            autoComplete="off"
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Feather name="x" size={14} color={C.textSubtle} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Status chips */}
        <View style={styles.chips}>
          {STATUSES.map((s) => {
            const active = status === s.value;
            return (
              <TouchableOpacity
                key={s.label}
                onPress={() => setStatus(s.value)}
                style={[styles.chip, { borderColor: active ? C.primary : C.border, backgroundColor: active ? 'rgba(99,102,241,0.1)' : 'transparent' }]}
              >
                <Text style={[styles.chipText, { color: active ? C.primary : C.textMuted }]}>{s.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* List */}
      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {loading && users.length === 0 ? (
          <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} />
        ) : users.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="users" size={32} color={C.textSubtle} />
            <Text style={[styles.emptyText, { color: C.textMuted }]}>No users found</Text>
          </View>
        ) : (
          users.map((u) => (
            <TouchableOpacity
              key={u._id}
              onPress={() => { setSelected(u); setActionMsg(''); }}
              style={[styles.userCard, { backgroundColor: C.card }, Shadows.xs]}
            >
              <View style={[styles.userAvatar, { backgroundColor: u.isActive ? 'rgba(99,102,241,0.12)' : 'rgba(107,114,128,0.12)' }]}>
                <Text style={[styles.userAvatarText, { color: u.isActive ? '#6366F1' : '#9CA3AF' }]}>
                  {(u.firstName?.charAt(0) || '') + (u.lastName?.charAt(0) || '')}
                </Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={[styles.userName, { color: C.foreground }]} numberOfLines={1}>
                  {u.firstName} {u.lastName}
                </Text>
                <Text style={[styles.userEmail, { color: C.textMuted }]} numberOfLines={1}>{u.email}</Text>
                <View style={styles.userMeta}>
                  <RoleBadge role={u.role} C={C} />
                  {u.isActive === false && (
                    <View style={styles.suspendedBadge}>
                      <Text style={styles.suspendedText}>Suspended</Text>
                    </View>
                  )}
                </View>
              </View>
              <Feather name="chevron-right" size={16} color={C.textSubtle} />
            </TouchableOpacity>
          ))
        )}

        {/* Load more */}
        {!loading && users.length < total && (
          <TouchableOpacity
            onPress={() => load(page + 1)}
            style={[styles.loadMore, { borderColor: C.border }]}
          >
            <Text style={[styles.loadMoreText, { color: C.primary }]}>Load more</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Action modal */}
      <Modal visible={!!selected} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <View style={styles.overlay}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={() => setSelected(null)} />
          <View style={[styles.sheet, { backgroundColor: isDark ? '#1A1A2E' : '#fff' }]}>
            <Text style={[styles.sheetTitle, { color: C.foreground }]}>
              {selected?.firstName} {selected?.lastName}
            </Text>
            <Text style={[styles.sheetEmail, { color: C.textMuted }]}>{selected?.email}</Text>
            <RoleBadge role={selected?.role} C={C} />

            {actionMsg ? (
              <Text style={styles.actionErr}>{actionMsg}</Text>
            ) : null}

            <View style={[styles.divider, { borderColor: C.border }]} />
            <Text style={[styles.sheetSectionLabel, { color: C.textSubtle }]}>Account Status</Text>

            {selected?.isActive ? (
              <TouchableOpacity
                onPress={() => handleAction('suspend')}
                disabled={acting}
                style={[styles.actionBtn, { backgroundColor: 'rgba(239,68,68,0.1)' }]}
              >
                {acting ? <ActivityIndicator size="small" color="#EF4444" /> : <Feather name="slash" size={16} color="#EF4444" />}
                <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>Suspend Account</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => handleAction('activate')}
                disabled={acting}
                style={[styles.actionBtn, { backgroundColor: 'rgba(16,185,129,0.1)' }]}
              >
                {acting ? <ActivityIndicator size="small" color="#10B981" /> : <Feather name="check-circle" size={16} color="#10B981" />}
                <Text style={[styles.actionBtnText, { color: '#10B981' }]}>Activate Account</Text>
              </TouchableOpacity>
            )}

            <View style={[styles.divider, { borderColor: C.border }]} />
            <Text style={[styles.sheetSectionLabel, { color: C.textSubtle }]}>Change Role</Text>

            {ASSIGNABLE.map((r) => (
              <TouchableOpacity
                key={r}
                onPress={() => handleRoleChange(r)}
                disabled={acting || selected?.role === r}
                style={[
                  styles.roleOption,
                  { opacity: selected?.role === r ? 0.4 : 1 },
                ]}
              >
                <RoleBadge role={r} C={C} />
                {selected?.role === r && <Feather name="check" size={14} color={C.primary} style={{ marginLeft: 'auto' }} />}
              </TouchableOpacity>
            ))}

            <TouchableOpacity onPress={() => setSelected(null)} style={styles.cancelBtn}>
              <Text style={[styles.cancelText, { color: C.textMuted }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1 },
  pageHeader:  { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  pageTitle:   { fontSize: Typography.size.xl, fontFamily: Typography.fontFamily.bold },
  pageSub:     { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.regular, marginTop: 2 },

  filters:     { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, gap: 10 },
  searchBox:   { flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, height: 38, gap: 8 },
  searchInput: { flex: 1, fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.regular, ...Platform.select({ web: { outlineStyle: 'none' } }) },
  chips:       { flexDirection: 'row', gap: 8 },
  chip:        { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  chipText:    { fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.semiBold },

  list:        { padding: 16, gap: 10, paddingBottom: 32 },
  empty:       { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyText:   { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.medium },

  userCard:    { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 14, gap: 12 },
  userAvatar:  { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  userAvatarText: { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.bold },
  userInfo:    { flex: 1 },
  userName:    { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.bold },
  userEmail:   { fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.regular, marginTop: 1 },
  userMeta:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5 },

  badge:       { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  badgeText:   { fontSize: 10, fontFamily: Typography.fontFamily.semiBold },
  suspendedBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, backgroundColor: 'rgba(239,68,68,0.12)' },
  suspendedText:  { fontSize: 10, fontFamily: Typography.fontFamily.semiBold, color: '#EF4444' },

  loadMore:    { alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, borderWidth: 1, marginTop: 8 },
  loadMoreText:{ fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.semiBold },

  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet:       { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 },
  sheetTitle:  { fontSize: Typography.size.lg, fontFamily: Typography.fontFamily.bold, marginBottom: 2 },
  sheetEmail:  { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.regular, marginBottom: 8 },
  sheetSectionLabel: { fontSize: 10, fontFamily: Typography.fontFamily.bold, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  divider:     { borderTopWidth: 1, marginVertical: 14 },
  actionBtn:   { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12, marginBottom: 8 },
  actionBtnText: { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.semiBold },
  roleOption:  { paddingVertical: 8, flexDirection: 'row', alignItems: 'center' },
  actionErr:   { color: '#EF4444', fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.medium, marginTop: 6 },
  cancelBtn:   { alignItems: 'center', paddingVertical: 14, marginTop: 4 },
  cancelText:  { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.semiBold },
});
