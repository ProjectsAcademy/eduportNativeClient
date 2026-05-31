import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import { Shadows } from '../../constants/shadows';
import { superAdminService } from '../../services/superAdminService';

const ACTION_LABELS = {
  'user.view':          'Viewed user',
  'user.suspend':       'Suspended user',
  'user.activate':      'Activated user',
  'user.role_change':   'Changed user role',
  'user.delete':        'Deleted user',
  'org.view':           'Viewed org',
  'org.plan_change':    'Changed org plan',
  'ai.usage_view':      'Viewed AI usage',
  'audit.view':         'Viewed audit logs',
  'super.denied':       'Access denied',
  'system.health_view': 'Viewed system health',
};

const OUTCOME_META = {
  success: { color: '#10B981', icon: 'check-circle' },
  denied:  { color: '#EF4444', icon: 'slash' },
  error:   { color: '#F59E0B', icon: 'alert-circle' },
};

const FILTERS = [
  { label: 'All',      value: undefined },
  { label: 'Success',  value: 'success' },
  { label: 'Denied',   value: 'denied' },
  { label: 'Error',    value: 'error' },
];

function timeAgo(iso) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export default function AuditScreen() {
  const { isDark } = useTheme();
  const C = isDark ? Colors.dark : Colors.light;

  const [logs,    setLogs]    = useState([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [loading, setLoading] = useState(true);
  const [outcome, setOutcome] = useState(undefined);

  const load = useCallback(async (pg = 1, reset = false) => {
    try {
      setLoading(true);
      const params = { page: pg, limit: 50 };
      if (outcome) params.outcome = outcome;  // Note: backend doesn't filter by outcome yet, but useful when added
      const res = await superAdminService.getAuditLogs(params);
      const fetched = res.data?.logs ?? [];
      setLogs(reset ? fetched : prev => pg === 1 ? fetched : [...prev, ...fetched]);
      setTotal(res.data?.pagination?.total ?? 0);
      setPage(pg);
    } catch (_) {}
    finally { setLoading(false); }
  }, [outcome]);

  useEffect(() => { load(1, true); }, [outcome]);

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
      <View style={[styles.pageHeader, { borderBottomColor: C.border }]}>
        <Text style={[styles.pageTitle, { color: C.foreground }]}>Audit Logs</Text>
        <Text style={[styles.pageSub, { color: C.textMuted }]}>{total} events recorded</Text>
      </View>

      {/* Outcome filter */}
      <View style={[styles.filters, { borderBottomColor: C.border }]}>
        {FILTERS.map((f) => {
          const active = outcome === f.value;
          return (
            <TouchableOpacity
              key={f.label}
              onPress={() => setOutcome(f.value)}
              style={[styles.chip, { borderColor: active ? C.primary : C.border, backgroundColor: active ? 'rgba(99,102,241,0.1)' : 'transparent' }]}
            >
              <Text style={[styles.chipText, { color: active ? C.primary : C.textMuted }]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity onPress={() => load(1, true)} style={[styles.refreshBtn, { backgroundColor: C.surface2 }]}>
          <Feather name="refresh-cw" size={13} color={C.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {loading && logs.length === 0 ? (
          <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} />
        ) : logs.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="shield" size={32} color={C.textSubtle} />
            <Text style={[styles.emptyText, { color: C.textMuted }]}>No audit events</Text>
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: C.card }, Shadows.sm]}>
            {logs.map((log, idx) => {
              const { color, icon } = OUTCOME_META[log.outcome] ?? OUTCOME_META.success;
              return (
                <View
                  key={log._id ?? idx}
                  style={[
                    styles.logRow,
                    idx < logs.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.border },
                  ]}
                >
                  <Feather name={icon} size={14} color={color} style={{ flexShrink: 0 }} />
                  <View style={styles.logBody}>
                    <Text style={[styles.logAction, { color: C.foreground }]}>
                      {ACTION_LABELS[log.action] ?? log.action}
                    </Text>
                    <Text style={[styles.logActor, { color: C.textSubtle }]} numberOfLines={1}>
                      by {log.actorEmail}
                      {log.targetEmail ? ` → ${log.targetEmail}` : ''}
                    </Text>
                    {log.metadata?.previousRole && (
                      <Text style={[styles.logMeta, { color: C.textSubtle }]}>
                        {log.metadata.previousRole} → {log.metadata.newRole}
                      </Text>
                    )}
                  </View>
                  <Text style={[styles.logTime, { color: C.textSubtle }]}>{timeAgo(log.createdAt)}</Text>
                </View>
              );
            })}
          </View>
        )}

        {!loading && logs.length < total && (
          <TouchableOpacity onPress={() => load(page + 1)} style={[styles.loadMore, { borderColor: C.border }]}>
            <Text style={[styles.loadMoreText, { color: C.primary }]}>Load more</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1 },
  pageHeader:  { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  pageTitle:   { fontSize: Typography.size.xl, fontFamily: Typography.fontFamily.bold },
  pageSub:     { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.regular, marginTop: 2 },
  filters:     { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, gap: 8, alignItems: 'center' },
  chip:        { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  chipText:    { fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.semiBold },
  refreshBtn:  { marginLeft: 'auto', width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  list:        { padding: 16, paddingBottom: 32 },
  empty:       { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyText:   { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.medium },
  card:        { borderRadius: 14 },
  logRow:      { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  logBody:     { flex: 1 },
  logAction:   { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.semiBold },
  logActor:    { fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.regular, marginTop: 1 },
  logMeta:     { fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.regular, marginTop: 1, fontStyle: 'italic' },
  logTime:     { fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.regular, flexShrink: 0, marginTop: 1 },
  loadMore:    { alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, borderWidth: 1, marginTop: 12 },
  loadMoreText:{ fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.semiBold },
});
