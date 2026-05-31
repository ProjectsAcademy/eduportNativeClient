import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Platform, useWindowDimensions, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import { Shadows } from '../../constants/shadows';
import { superAdminService } from '../../services/superAdminService';

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatNum(n) {
  if (n == null) return '—';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

const ACTION_LABELS = {
  'user.view':        'Viewed user',
  'user.suspend':     'Suspended user',
  'user.activate':    'Activated user',
  'user.role_change': 'Changed user role',
  'user.delete':      'Deleted user',
  'org.view':         'Viewed organization',
  'org.plan_change':  'Changed org plan',
  'ai.usage_view':    'Viewed AI usage',
  'audit.view':       'Viewed audit logs',
  'super.denied':     'Access denied',
  'system.health_view': 'Viewed system health',
};

const OUTCOME_COLORS = {
  success: '#10B981',
  denied:  '#EF4444',
  error:   '#F59E0B',
};

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, color, bg, sub, onPress, loading }) {
  const { isDark } = useTheme();
  const C = isDark ? Colors.dark : Colors.light;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.75 : 1}
      style={[styles.statCard, { backgroundColor: C.card }, Shadows.sm]}
    >
      <View style={[styles.statIcon, { backgroundColor: bg }]}>
        <Feather name={icon} size={20} color={color} />
      </View>
      <View style={styles.statBody}>
        {loading ? (
          <ActivityIndicator size="small" color={color} />
        ) : (
          <Text style={[styles.statValue, { color: C.foreground }]}>{value}</Text>
        )}
        <Text style={[styles.statLabel, { color: C.textMuted }]}>{label}</Text>
        {sub ? <Text style={[styles.statSub, { color: C.textSubtle }]}>{sub}</Text> : null}
      </View>
    </TouchableOpacity>
  );
}

// ── Quick Action ──────────────────────────────────────────────────────────────

function QuickAction({ label, icon, color, bg, route }) {
  const { isDark } = useTheme();
  const C = isDark ? Colors.dark : Colors.light;
  const router = useRouter();

  return (
    <TouchableOpacity
      onPress={() => router.push(route)}
      style={[styles.quickAction, { backgroundColor: C.card }, Shadows.xs]}
    >
      <View style={[styles.quickIcon, { backgroundColor: bg }]}>
        <Feather name={icon} size={16} color={color} />
      </View>
      <Text style={[styles.quickLabel, { color: C.foreground }]}>{label}</Text>
      <Feather name="chevron-right" size={14} color={C.textSubtle} style={{ marginLeft: 'auto' }} />
    </TouchableOpacity>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function SuperAdminOverview() {
  const { isDark } = useTheme();
  const { user }   = useAuth();
  const router     = useRouter();
  const C          = isDark ? Colors.dark : Colors.light;
  const { width }  = useWindowDimensions();
  const isWide     = Platform.OS === 'web' && width >= 768;

  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await superAdminService.getPlatformStats();
      setStats(res.data);
    } catch (e) {
      setError(e.message || 'Failed to load platform stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadStats(); }, []);

  const hour        = new Date().getHours();
  const greeting    = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const totalUsers  = stats?.users?.total   ?? 0;
  const activeUsers = stats?.users?.active  ?? 0;
  const suspended   = stats?.users?.suspended ?? 0;
  const totalExams  = stats?.exams?.total   ?? 0;
  const totalSess   = stats?.sessions?.total ?? 0;
  const aiRequests  = stats?.aiToday?.requestCount ?? 0;
  const aiTokens    = stats?.aiToday?.totalTokens  ?? 0;
  const recentEvents = stats?.recentAuditEvents ?? [];

  const STAT_CARDS = [
    {
      label:   'Total Users',
      value:   formatNum(totalUsers),
      icon:    'users',
      color:   '#6366F1',
      bg:      'rgba(99,102,241,0.10)',
      sub:     `${activeUsers} active · ${suspended} suspended`,
      route:   '/super/users',
      onPress: true,
    },
    {
      label: 'Total Exams',
      value: formatNum(totalExams),
      icon:  'clipboard',
      color: '#F59E0B',
      bg:    'rgba(245,158,11,0.10)',
      route: '/super/organizations',  // Exams belong to orgs — org list is closest view
      onPress: null,                  // No dedicated exams screen in admin; stat is info-only
    },
    {
      label: 'Total Sessions',
      value: formatNum(totalSess),
      icon:  'check-square',
      color: '#10B981',
      bg:    'rgba(16,185,129,0.10)',
      route: '/super/ai-usage',
      onPress: null,                  // Info-only
    },
    {
      label:   'AI Requests Today',
      value:   formatNum(aiRequests),
      icon:    'cpu',
      color:   '#8B5CF6',
      bg:      'rgba(139,92,246,0.10)',
      sub:     `${formatNum(aiTokens)} tokens`,
      route:   '/super/ai-usage',
      onPress: true,
    },
  ];

  const QUICK_ACTIONS = [
    { label: 'Manage Users',          icon: 'users',     color: '#6366F1', bg: 'rgba(99,102,241,0.10)',   route: '/super/users' },
    { label: 'View Organizations',    icon: 'briefcase', color: '#F59E0B', bg: 'rgba(245,158,11,0.10)',   route: '/super/organizations' },
    { label: 'AI Usage Analytics',    icon: 'cpu',       color: '#8B5CF6', bg: 'rgba(139,92,246,0.10)',   route: '/super/ai-usage' },
    { label: 'Audit Logs',            icon: 'shield',    color: '#10B981', bg: 'rgba(16,185,129,0.10)',   route: '/super/audit' },
    { label: 'System Health',         icon: 'activity',  color: '#3B82F6', bg: 'rgba(59,130,246,0.10)',   route: '/super/system' },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: C.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Welcome banner */}
      <LinearGradient
        colors={isDark ? ['#1e0a0a', '#1a0a2e'] : ['#FEF2F2', '#F5F3FF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.banner}
      >
        <View style={styles.bannerLeft}>
          <View style={styles.bannerBadge}>
            <Feather name="shield" size={12} color="#DC2626" />
            <Text style={styles.bannerBadgeText}>SUPER ADMIN</Text>
          </View>
          <Text style={[styles.bannerGreeting, { color: C.foreground }]}>
            {greeting}, {user?.firstName}
          </Text>
          <Text style={[styles.bannerSub, { color: C.textMuted }]}>
            Platform overview — {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>
        </View>
        <TouchableOpacity
          onPress={loadStats}
          style={[styles.refreshBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)' }]}
        >
          <Feather name="refresh-cw" size={14} color={C.textMuted} />
        </TouchableOpacity>
      </LinearGradient>

      {error && (
        <View style={[styles.errorBanner, { backgroundColor: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.2)' }]}>
          <Feather name="alert-circle" size={14} color="#EF4444" />
          <Text style={[styles.errorText, { color: '#EF4444' }]}>{error}</Text>
          <TouchableOpacity onPress={loadStats}>
            <Text style={[styles.retryText, { color: '#EF4444' }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Stat cards */}
      <Text style={[styles.sectionTitle, { color: C.foreground }]}>Platform Overview</Text>
      <View style={[styles.statsGrid, isWide && styles.statsGridWide]}>
        {STAT_CARDS.map((card) => (
          <StatCard
            key={card.label}
            label={card.label}
            value={card.value}
            icon={card.icon}
            color={card.color}
            bg={card.bg}
            sub={card.sub}
            onPress={card.onPress === true ? () => router.push(card.route) : undefined}
            loading={loading}
          />
        ))}
      </View>

      {/* User breakdown */}
      {stats?.users?.byRole && (
        <View style={[styles.card, { backgroundColor: C.card }, Shadows.sm]}>
          <Text style={[styles.cardTitle, { color: C.foreground }]}>Users by Role</Text>
          {Object.entries(stats.users.byRole).map(([role, count]) => (
            <View key={role} style={styles.roleRow}>
              <View style={[styles.roleDot, { backgroundColor: role === 'super_admin' ? '#DC2626' : '#6366F1' }]} />
              <Text style={[styles.roleLabel, { color: C.textMuted }]}>{role}</Text>
              <Text style={[styles.roleCount, { color: C.foreground }]}>{count}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Quick actions */}
      <Text style={[styles.sectionTitle, { color: C.foreground }]}>Quick Actions</Text>
      <View style={[styles.quickGrid, isWide && styles.quickGridWide]}>
        {QUICK_ACTIONS.map((action) => (
          <QuickAction key={action.label} {...action} />
        ))}
      </View>

      {/* Recent audit events */}
      <View style={styles.auditHeader}>
        <Text style={[styles.sectionTitle, { color: C.foreground, marginBottom: 0 }]}>Recent Admin Activity</Text>
        <TouchableOpacity onPress={() => router.push('/super/audit')}>
          <Text style={styles.viewAll}>View all →</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.card, { backgroundColor: C.card }, Shadows.sm]}>
        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color="#6366F1" />
          </View>
        ) : recentEvents.length === 0 ? (
          <View style={styles.emptyAudit}>
            <Feather name="shield" size={28} color={C.textSubtle} />
            <Text style={[styles.emptyText, { color: C.textMuted }]}>No audit events yet</Text>
          </View>
        ) : (
          recentEvents.map((event, idx) => (
            <View
              key={event._id ?? idx}
              style={[
                styles.auditRow,
                idx < recentEvents.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.border },
              ]}
            >
              <View style={[styles.auditDot, { backgroundColor: OUTCOME_COLORS[event.outcome] ?? '#6B7280' }]} />
              <View style={styles.auditBody}>
                <Text style={[styles.auditAction, { color: C.foreground }]}>
                  {ACTION_LABELS[event.action] ?? event.action}
                </Text>
                {event.targetEmail ? (
                  <Text style={[styles.auditMeta, { color: C.textSubtle }]} numberOfLines={1}>
                    → {event.targetEmail}
                  </Text>
                ) : null}
              </View>
              <Text style={[styles.auditTime, { color: C.textSubtle }]}>
                {timeAgo(event.createdAt)}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1 },
  content:    { padding: 20, paddingBottom: 40 },

  // Banner
  banner: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  bannerLeft:      { flex: 1 },
  bannerBadge:     { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
  bannerBadgeText: {
    fontSize: 9,
    fontFamily: Typography.fontFamily.bold,
    color: '#DC2626',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  bannerGreeting:  { fontSize: Typography.size['2xl'], fontFamily: Typography.fontFamily.bold, marginBottom: 4 },
  bannerSub:       { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.regular },
  refreshBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Error
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  errorText:  { flex: 1, fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.medium, color: '#EF4444' },
  retryText:  { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.semiBold },

  // Section
  sectionTitle: {
    fontSize: Typography.size.base,
    fontFamily: Typography.fontFamily.bold,
    marginBottom: 12,
  },

  // Stats grid
  statsGrid:     { gap: 12, marginBottom: 24 },
  statsGridWide: { flexDirection: 'row', flexWrap: 'wrap' },

  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 16,
    gap: 14,
    ...Platform.select({ web: {}, default: {} }),
  },
  statIcon:  { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  statBody:  { flex: 1 },
  statValue: { fontSize: Typography.size['2xl'], fontFamily: Typography.fontFamily.extraBold, lineHeight: 30 },
  statLabel: { fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.medium, marginTop: 2 },
  statSub:   { fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.regular, marginTop: 2 },

  // Card
  card:      { borderRadius: 14, padding: 16, marginBottom: 24 },
  cardTitle: { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.bold, marginBottom: 12 },

  // Role rows
  roleRow:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, gap: 10 },
  roleDot:   { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  roleLabel: { flex: 1, fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.medium },
  roleCount: { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.bold },

  // Quick actions
  quickGrid:     { gap: 10, marginBottom: 24 },
  quickGridWide: { flexDirection: 'row', flexWrap: 'wrap' },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 12,
  },
  quickIcon:  { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  quickLabel: { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.semiBold, flex: 1 },

  // Audit header
  auditHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  viewAll:      { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.semiBold, color: '#6366F1' },

  // Audit rows
  loadingRow: { padding: 16, alignItems: 'center' },
  emptyAudit: { padding: 20, alignItems: 'center', gap: 8 },
  emptyText:  { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.medium },
  auditRow:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 10 },
  auditDot:   { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  auditBody:  { flex: 1 },
  auditAction:{ fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.semiBold },
  auditMeta:  { fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.regular, marginTop: 1 },
  auditTime:  { fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.regular, flexShrink: 0 },
});
