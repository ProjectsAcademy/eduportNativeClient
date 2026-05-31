import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import { Shadows } from '../../constants/shadows';
import { superAdminService } from '../../services/superAdminService';

function Row({ label, value, valueColor }) {
  const { isDark } = useTheme();
  const C = isDark ? Colors.dark : Colors.light;
  return (
    <View style={rowStyles.row}>
      <Text style={[rowStyles.label, { color: C.textMuted }]}>{label}</Text>
      <Text style={[rowStyles.value, { color: valueColor ?? C.foreground }]}>{value}</Text>
    </View>
  );
}
const rowStyles = StyleSheet.create({
  row:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9 },
  label: { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.medium },
  value: { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.bold },
});

function formatUptime(s) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

export default function SystemScreen() {
  const { isDark } = useTheme();
  const C = isDark ? Colors.dark : Colors.light;

  const [health,  setHealth]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastFetched, setLastFetched] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await superAdminService.getSystemHealth();
      setHealth(res.data);
      setLastFetched(new Date());
    } catch (_) {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, []);

  const db      = health?.database ?? {};
  const proc    = health?.process  ?? {};
  const cols    = health?.collections ?? {};
  const mem     = proc.memoryMb ?? {};
  const isConnected = db.status === 'connected';

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: C.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.pageHeader, { borderBottomColor: C.border }]}>
        <View>
          <Text style={[styles.pageTitle, { color: C.foreground }]}>System Health</Text>
          {lastFetched && (
            <Text style={[styles.pageSub, { color: C.textMuted }]}>
              Last checked: {lastFetched.toLocaleTimeString()}
            </Text>
          )}
        </View>
        <TouchableOpacity onPress={load} style={[styles.refreshBtn, { backgroundColor: C.surface2 }]}>
          <Feather name="refresh-cw" size={14} color={C.textMuted} />
        </TouchableOpacity>
      </View>

      {loading && !health ? (
        <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} />
      ) : (
        <View style={styles.cards}>
          {/* Status banner */}
          <View style={[
            styles.statusBanner,
            { backgroundColor: isConnected ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)' },
          ]}>
            <Feather
              name={isConnected ? 'check-circle' : 'alert-circle'}
              size={18}
              color={isConnected ? '#10B981' : '#EF4444'}
            />
            <Text style={[styles.statusText, { color: isConnected ? '#10B981' : '#EF4444' }]}>
              {isConnected ? 'All systems operational' : 'Database connection issue'}
            </Text>
          </View>

          {/* Database */}
          <View style={[styles.card, { backgroundColor: C.card }, Shadows.sm]}>
            <View style={styles.cardHeader}>
              <Feather name="database" size={16} color="#6366F1" />
              <Text style={[styles.cardTitle, { color: C.foreground }]}>Database</Text>
            </View>
            <View style={[styles.sep, { borderColor: C.border }]} />
            <Row label="Status"  value={db.status ?? '—'} valueColor={isConnected ? '#10B981' : '#EF4444'} />
            <View style={[styles.sep, { borderColor: C.border }]} />
            <Row label="State code" value={String(db.state ?? '—')} />
          </View>

          {/* Process */}
          <View style={[styles.card, { backgroundColor: C.card }, Shadows.sm]}>
            <View style={styles.cardHeader}>
              <Feather name="cpu" size={16} color="#8B5CF6" />
              <Text style={[styles.cardTitle, { color: C.foreground }]}>Process</Text>
            </View>
            <View style={[styles.sep, { borderColor: C.border }]} />
            <Row label="Uptime"       value={formatUptime(proc.uptimeSeconds ?? 0)} />
            <View style={[styles.sep, { borderColor: C.border }]} />
            <Row label="Heap Used"    value={`${mem.heapUsed ?? '—'} MB`} />
            <View style={[styles.sep, { borderColor: C.border }]} />
            <Row label="Heap Total"   value={`${mem.heapTotal ?? '—'} MB`} />
            <View style={[styles.sep, { borderColor: C.border }]} />
            <Row label="RSS"          value={`${mem.rss ?? '—'} MB`} />
            <View style={[styles.sep, { borderColor: C.border }]} />
            <Row label="Node.js"      value={proc.nodeVersion ?? '—'} />
          </View>

          {/* Collections */}
          <View style={[styles.card, { backgroundColor: C.card }, Shadows.sm]}>
            <View style={styles.cardHeader}>
              <Feather name="layers" size={16} color="#F59E0B" />
              <Text style={[styles.cardTitle, { color: C.foreground }]}>Collections</Text>
            </View>
            <View style={[styles.sep, { borderColor: C.border }]} />
            <Row label="Users"      value={String(cols.users     ?? '—')} />
            <View style={[styles.sep, { borderColor: C.border }]} />
            <Row label="Exams"      value={String(cols.exams     ?? '—')} />
            <View style={[styles.sep, { borderColor: C.border }]} />
            <Row label="Sessions"   value={String(cols.sessions  ?? '—')} />
            <View style={[styles.sep, { borderColor: C.border }]} />
            <Row label="Audit Logs" value={String(cols.auditLogs ?? '—')} />
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1 },
  content:     { paddingBottom: 40 },
  pageHeader:  { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pageTitle:   { fontSize: Typography.size.xl, fontFamily: Typography.fontFamily.bold },
  pageSub:     { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.regular, marginTop: 2 },
  refreshBtn:  { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  cards:       { padding: 16, gap: 16 },
  statusBanner:{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12 },
  statusText:  { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.semiBold },
  card:        { borderRadius: 14, padding: 16 },
  cardHeader:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  cardTitle:   { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.bold },
  sep:         { borderTopWidth: 1 },
});
