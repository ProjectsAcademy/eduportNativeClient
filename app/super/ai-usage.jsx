import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Platform, ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import { Shadows } from '../../constants/shadows';
import { superAdminService } from '../../services/superAdminService';

const PERIODS = [
  { label: '7 days',  days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
];

function fmt(n) {
  if (n == null) return '—';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

function StatRow({ label, value, color }) {
  const { isDark } = useTheme();
  const C = isDark ? Colors.dark : Colors.light;
  return (
    <View style={statRowStyles.row}>
      <Text style={[statRowStyles.label, { color: C.textMuted }]}>{label}</Text>
      <Text style={[statRowStyles.value, { color: color ?? C.foreground }]}>{value}</Text>
    </View>
  );
}
const statRowStyles = StyleSheet.create({
  row:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  label: { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.medium },
  value: { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.bold },
});

export default function AIUsageScreen() {
  const { isDark } = useTheme();
  const C = isDark ? Colors.dark : Colors.light;

  const [period,   setPeriod]   = useState(30);
  const [usage,    setUsage]    = useState(null);
  const [topUsers, setTopUsers] = useState([]);
  const [loading,  setLoading]  = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const from = new Date();
      from.setDate(from.getDate() - period);
      const [usageRes, topRes] = await Promise.all([
        superAdminService.getPlatformAIUsage({ from: from.toISOString() }),
        superAdminService.getTopAIUsers(10),
      ]);
      setUsage(usageRes.data);
      setTopUsers(topRes.data?.topUsers ?? []);
    } catch (_) {}
    finally { setLoading(false); }
  }, [period]);

  useEffect(() => { load(); }, [period]);

  const totals  = usage?.totals  ?? {};
  const byModel = usage?.byModel ?? [];
  const daily   = usage?.daily   ?? [];

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: C.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.pageHeader, { borderBottomColor: C.border }]}>
        <Text style={[styles.pageTitle, { color: C.foreground }]}>AI Usage Analytics</Text>
        <Text style={[styles.pageSub, { color: C.textMuted }]}>Platform-wide token & request tracking</Text>
      </View>

      {/* Period selector */}
      <View style={styles.periodRow}>
        {PERIODS.map((p) => {
          const active = period === p.days;
          return (
            <TouchableOpacity
              key={p.label}
              onPress={() => setPeriod(p.days)}
              style={[styles.chip, { borderColor: active ? C.primary : C.border, backgroundColor: active ? 'rgba(99,102,241,0.1)' : 'transparent' }]}
            >
              <Text style={[styles.chipText, { color: active ? C.primary : C.textMuted }]}>{p.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} />
      ) : (
        <>
          {/* Totals */}
          <View style={[styles.card, { backgroundColor: C.card }, Shadows.sm]}>
            <Text style={[styles.cardTitle, { color: C.foreground }]}>Summary (last {period} days)</Text>
            <StatRow label="Total Requests"   value={fmt(totals.requestCount)} color="#6366F1" />
            <View style={[styles.sep, { borderColor: C.border }]} />
            <StatRow label="Input Tokens"     value={fmt(totals.inputTokens)} />
            <View style={[styles.sep, { borderColor: C.border }]} />
            <StatRow label="Output Tokens"    value={fmt(totals.outputTokens)} />
            <View style={[styles.sep, { borderColor: C.border }]} />
            <StatRow label="Total Tokens"     value={fmt(totals.totalTokens)} color="#8B5CF6" />
            <View style={[styles.sep, { borderColor: C.border }]} />
            <StatRow label="Market Cost Equiv" value={`$${(totals.marketCostUsd ?? 0).toFixed(4)}`} color="#F59E0B" />
          </View>

          {/* By model */}
          {byModel.length > 0 && (
            <View style={[styles.card, { backgroundColor: C.card }, Shadows.sm]}>
              <Text style={[styles.cardTitle, { color: C.foreground }]}>Usage by Model</Text>
              {byModel.map((m, idx) => (
                <View key={`${m.provider}/${m.model}`}>
                  {idx > 0 && <View style={[styles.sep, { borderColor: C.border }]} />}
                  <View style={styles.modelRow}>
                    <View style={styles.modelDot} />
                    <View style={styles.modelInfo}>
                      <Text style={[styles.modelName, { color: C.foreground }]}>{m.model}</Text>
                      <Text style={[styles.modelProvider, { color: C.textSubtle }]}>{m.provider}</Text>
                    </View>
                    <View style={styles.modelStats}>
                      <Text style={[styles.modelStat, { color: '#6366F1' }]}>{fmt(m.requestCount)} req</Text>
                      <Text style={[styles.modelStat, { color: C.textMuted }]}>{fmt(m.totalTokens)} tok</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Daily trend — simple bar representation */}
          {daily.length > 0 && (
            <View style={[styles.card, { backgroundColor: C.card }, Shadows.sm]}>
              <Text style={[styles.cardTitle, { color: C.foreground }]}>Daily Requests</Text>
              {(() => {
                const maxReq = Math.max(...daily.map(d => d.requestCount), 1);
                return daily.slice(-14).map((d) => (
                  <View key={d.date} style={styles.barRow}>
                    <Text style={[styles.barLabel, { color: C.textSubtle }]}>{d.date.slice(5)}</Text>
                    <View style={[styles.barTrack, { backgroundColor: C.surface2 }]}>
                      <View style={[styles.barFill, { width: `${(d.requestCount / maxReq) * 100}%`, backgroundColor: '#6366F1' }]} />
                    </View>
                    <Text style={[styles.barValue, { color: C.textMuted }]}>{d.requestCount}</Text>
                  </View>
                ));
              })()}
            </View>
          )}

          {/* Top users */}
          {topUsers.length > 0 && (
            <View style={[styles.card, { backgroundColor: C.card }, Shadows.sm]}>
              <Text style={[styles.cardTitle, { color: C.foreground }]}>Top 10 Users by Requests</Text>
              {topUsers.map((u, idx) => (
                <View key={u.userId ?? idx}>
                  {idx > 0 && <View style={[styles.sep, { borderColor: C.border }]} />}
                  <View style={styles.topUserRow}>
                    <Text style={[styles.topRank, { color: C.textSubtle }]}>{idx + 1}</Text>
                    <View style={styles.topUserInfo}>
                      <Text style={[styles.topUserName, { color: C.foreground }]} numberOfLines={1}>
                        {u.firstName} {u.lastName}
                      </Text>
                      <Text style={[styles.topUserEmail, { color: C.textMuted }]} numberOfLines={1}>{u.email}</Text>
                    </View>
                    <View style={styles.topUserStats}>
                      <Text style={[styles.topStatVal, { color: '#6366F1' }]}>{fmt(u.requestCount)}</Text>
                      <Text style={[styles.topStatLabel, { color: C.textSubtle }]}>requests</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1 },
  content:     { paddingBottom: 40 },
  pageHeader:  { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  pageTitle:   { fontSize: Typography.size.xl, fontFamily: Typography.fontFamily.bold },
  pageSub:     { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.regular, marginTop: 2 },
  periodRow:   { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  chip:        { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  chipText:    { fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.semiBold },
  card:        { marginHorizontal: 16, marginBottom: 16, borderRadius: 14, padding: 16 },
  cardTitle:   { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.bold, marginBottom: 12 },
  sep:         { borderTopWidth: 1 },
  modelRow:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 },
  modelDot:    { width: 8, height: 8, borderRadius: 4, backgroundColor: '#6366F1', flexShrink: 0 },
  modelInfo:   { flex: 1 },
  modelName:   { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.semiBold },
  modelProvider:{ fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.regular },
  modelStats:  { alignItems: 'flex-end' },
  modelStat:   { fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.semiBold },
  barRow:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, gap: 8 },
  barLabel:    { width: 40, fontSize: 10, fontFamily: Typography.fontFamily.regular },
  barTrack:    { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  barFill:     { height: '100%', borderRadius: 4 },
  barValue:    { width: 28, fontSize: 10, fontFamily: Typography.fontFamily.semiBold, textAlign: 'right' },
  topUserRow:  { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 },
  topRank:     { width: 20, fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.bold, textAlign: 'center' },
  topUserInfo: { flex: 1 },
  topUserName: { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.semiBold },
  topUserEmail:{ fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.regular },
  topUserStats:{ alignItems: 'flex-end' },
  topStatVal:  { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.bold },
  topStatLabel:{ fontSize: 10, fontFamily: Typography.fontFamily.regular },
});
