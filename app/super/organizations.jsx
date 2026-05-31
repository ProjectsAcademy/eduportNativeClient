import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Platform, ActivityIndicator, Modal,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import { Shadows } from '../../constants/shadows';
import { superAdminService } from '../../services/superAdminService';

const PLANS = [
  { label: 'All Plans', value: undefined },
  { label: 'Free',       value: 'free' },
  { label: 'Pro',        value: 'pro' },
  { label: 'Enterprise', value: 'enterprise' },
];

const PLAN_COLORS = {
  free:       { bg: 'rgba(107,114,128,0.12)', fg: '#6B7280' },
  pro:        { bg: 'rgba(99,102,241,0.12)',  fg: '#6366F1' },
  enterprise: { bg: 'rgba(245,158,11,0.12)', fg: '#F59E0B' },
};

export default function OrganizationsScreen() {
  const { isDark } = useTheme();
  const C = isDark ? Colors.dark : Colors.light;

  const [orgs,     setOrgs]     = useState([]);
  const [total,    setTotal]    = useState(0);
  const [page,     setPage]     = useState(1);
  const [loading,  setLoading]  = useState(true);
  const [planFilter, setPlanFilter] = useState(undefined);
  const [selected, setSelected] = useState(null);
  const [acting,   setActing]   = useState(false);
  const [actionMsg,setActionMsg]= useState('');

  const load = useCallback(async (pg = 1, reset = false) => {
    try {
      setLoading(true);
      const params = { page: pg, limit: 20 };
      if (planFilter) params.plan = planFilter;
      const res = await superAdminService.listOrganizations(params);
      const fetched = res.data?.organizations ?? [];
      setOrgs(reset ? fetched : prev => pg === 1 ? fetched : [...prev, ...fetched]);
      setTotal(res.data?.pagination?.total ?? 0);
      setPage(pg);
    } catch (_) {}
    finally { setLoading(false); }
  }, [planFilter]);

  useEffect(() => { load(1, true); }, [planFilter]);

  const handlePlanChange = async (newPlan) => {
    if (!selected) return;
    setActing(true);
    setActionMsg('');
    try {
      const userId = selected.teacher?._id ?? selected.teacher;
      await superAdminService.changePlan(userId, newPlan);
      setSelected(null);
      await load(1, true);
    } catch (e) {
      setActionMsg(e.message || 'Failed to change plan');
    } finally { setActing(false); }
  };

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
      <View style={[styles.pageHeader, { borderBottomColor: C.border }]}>
        <Text style={[styles.pageTitle, { color: C.foreground }]}>Organizations</Text>
        <Text style={[styles.pageSub, { color: C.textMuted }]}>{total} total</Text>
      </View>

      {/* Plan filter chips */}
      <View style={[styles.filters, { borderBottomColor: C.border }]}>
        {PLANS.map((p) => {
          const active = planFilter === p.value;
          return (
            <TouchableOpacity
              key={p.label}
              onPress={() => setPlanFilter(p.value)}
              style={[styles.chip, { borderColor: active ? C.primary : C.border, backgroundColor: active ? 'rgba(99,102,241,0.1)' : 'transparent' }]}
            >
              <Text style={[styles.chipText, { color: active ? C.primary : C.textMuted }]}>{p.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {loading && orgs.length === 0 ? (
          <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} />
        ) : orgs.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="briefcase" size={32} color={C.textSubtle} />
            <Text style={[styles.emptyText, { color: C.textMuted }]}>No organizations found</Text>
          </View>
        ) : (
          orgs.map((org) => {
            const { bg, fg } = PLAN_COLORS[org.plan] ?? PLAN_COLORS.free;
            const teacher = org.teacher;
            return (
              <TouchableOpacity
                key={org._id}
                onPress={() => { setSelected(org); setActionMsg(''); }}
                style={[styles.orgCard, { backgroundColor: C.card }, Shadows.xs]}
              >
                <View style={styles.orgIcon}>
                  <Feather name="briefcase" size={18} color="#6366F1" />
                </View>
                <View style={styles.orgInfo}>
                  <Text style={[styles.orgName, { color: C.foreground }]} numberOfLines={1}>
                    {org.orgName || 'Unnamed Organization'}
                  </Text>
                  {teacher && (
                    <Text style={[styles.orgOwner, { color: C.textMuted }]} numberOfLines={1}>
                      {teacher.firstName} {teacher.lastName} · {teacher.email}
                    </Text>
                  )}
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 5 }}>
                    <View style={[styles.planBadge, { backgroundColor: bg }]}>
                      <Text style={[styles.planText, { color: fg }]}>{(org.plan ?? 'free').toUpperCase()}</Text>
                    </View>
                    {teacher?.isActive === false && (
                      <View style={[styles.planBadge, { backgroundColor: 'rgba(239,68,68,0.12)' }]}>
                        <Text style={[styles.planText, { color: '#EF4444' }]}>OWNER SUSPENDED</Text>
                      </View>
                    )}
                  </View>
                </View>
                <Feather name="chevron-right" size={16} color={C.textSubtle} />
              </TouchableOpacity>
            );
          })
        )}

        {!loading && orgs.length < total && (
          <TouchableOpacity onPress={() => load(page + 1)} style={[styles.loadMore, { borderColor: C.border }]}>
            <Text style={[styles.loadMoreText, { color: C.primary }]}>Load more</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Plan change modal */}
      <Modal visible={!!selected} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <View style={styles.overlay}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={() => setSelected(null)} />
          <View style={[styles.sheet, { backgroundColor: isDark ? '#1A1A2E' : '#fff' }]}>
            <Text style={[styles.sheetTitle, { color: C.foreground }]}>
              {selected?.orgName || 'Unnamed Organization'}
            </Text>
            {selected?.teacher && (
              <Text style={[styles.sheetSub, { color: C.textMuted }]}>
                Owner: {selected.teacher.firstName} {selected.teacher.lastName}
              </Text>
            )}
            {actionMsg ? <Text style={styles.actionErr}>{actionMsg}</Text> : null}
            <View style={[styles.divider, { borderColor: C.border }]} />
            <Text style={[styles.sectionLabel, { color: C.textSubtle }]}>Change Plan</Text>
            {['free', 'pro', 'enterprise'].map((plan) => {
              const { bg, fg } = PLAN_COLORS[plan];
              const isCurrent = selected?.plan === plan;
              return (
                <TouchableOpacity
                  key={plan}
                  onPress={() => handlePlanChange(plan)}
                  disabled={acting || isCurrent}
                  style={[styles.planOption, { opacity: isCurrent ? 0.45 : 1 }]}
                >
                  <View style={[styles.planBadge, { backgroundColor: bg }]}>
                    <Text style={[styles.planText, { color: fg }]}>{plan.toUpperCase()}</Text>
                  </View>
                  {isCurrent && <Feather name="check" size={14} color={fg} style={{ marginLeft: 8 }} />}
                  {acting && isCurrent && <ActivityIndicator size="small" color={fg} style={{ marginLeft: 8 }} />}
                </TouchableOpacity>
              );
            })}
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
  root:       { flex: 1 },
  pageHeader: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  pageTitle:  { fontSize: Typography.size.xl, fontFamily: Typography.fontFamily.bold },
  pageSub:    { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.regular, marginTop: 2 },
  filters:    { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, gap: 8, flexWrap: 'wrap' },
  chip:       { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  chipText:   { fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.semiBold },
  list:       { padding: 16, gap: 10, paddingBottom: 32 },
  empty:      { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyText:  { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.medium },
  orgCard:    { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 14, gap: 12 },
  orgIcon:    { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(99,102,241,0.12)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  orgInfo:    { flex: 1 },
  orgName:    { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.bold },
  orgOwner:   { fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.regular, marginTop: 1 },
  planBadge:  { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start' },
  planText:   { fontSize: 10, fontFamily: Typography.fontFamily.bold, letterSpacing: 0.5 },
  loadMore:   { alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, borderWidth: 1, marginTop: 8 },
  loadMoreText:{ fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.semiBold },
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet:      { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 },
  sheetTitle: { fontSize: Typography.size.lg, fontFamily: Typography.fontFamily.bold, marginBottom: 4 },
  sheetSub:   { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.regular, marginBottom: 6 },
  sectionLabel:{ fontSize: 10, fontFamily: Typography.fontFamily.bold, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  divider:    { borderTopWidth: 1, marginVertical: 14 },
  planOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  actionErr:  { color: '#EF4444', fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.medium, marginTop: 4 },
  cancelBtn:  { alignItems: 'center', paddingVertical: 14, marginTop: 4 },
  cancelText: { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.semiBold },
});
