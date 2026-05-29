import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Platform, useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import { Badge } from '../../components/ui/Badge';
import { Skeleton, SkeletonCard } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { examService } from '../../services/examService';

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function DashboardIndex() {
  const { isDark } = useTheme();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const C = isDark ? Colors.dark : Colors.light;
  const { width } = useWindowDimensions();
  const isWide = Platform.OS === 'web' && width >= 768;

  const [exams, setExams]     = useState([]);
  const [loading, setLoading] = useState(true);

  const loadExams = useCallback(async () => {
    try {
      const res = await examService.getMyExams();
      setExams(res.data?.exams ?? []);
    } catch (_) {
      setExams([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (!authLoading && user) loadExams(); }, [authLoading, user]);

  if (authLoading || !user) return null;

  // ── Derived stats from real data ──────────────────────────────────────────
  const totalExams    = exams.length;
  const activeExams   = exams.filter(e => e.status === 'active' || e.status === 'scheduled').length;
  const upcomingExams = exams
    .filter(e => e.status === 'active' || e.status === 'scheduled')
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .slice(0, 5);

  const STATS = [
    {
      value:      String(totalExams),
      label:      'Total Exams',
      icon:       'clipboard',
      color:      '#6366F1',
      bg:         'rgba(99,102,241,0.10)',
      badge:      `${exams.filter(e => e.status === 'draft').length} draft`,
      badgeColor: '#10B981',
      badgeBg:    'rgba(16,185,129,0.10)',
    },
    {
      value:      String(activeExams),
      label:      'Active / Upcoming',
      icon:       'calendar',
      color:      '#F59E0B',
      bg:         'rgba(245,158,11,0.10)',
      badge:      activeExams > 0 ? 'Live now' : 'None active',
      badgeColor: '#F59E0B',
      badgeBg:    'rgba(245,158,11,0.10)',
      pulse:      activeExams > 0,
    },
  ];

  // ── Sub-components ────────────────────────────────────────────────────────

  const ExamRow = ({ item }) => (
    <View style={[styles.examRow, { borderBottomColor: C.border }]}>
      <View style={{ flex: 2 }}>
        <Text style={[styles.examTitle, { color: C.foreground }]} numberOfLines={1}>{item.title}</Text>
        <Text style={[styles.examSub, { color: C.textSubtle }]}>{item.subject || item.topic || '—'} · {item.questionCount} questions</Text>
      </View>
      <View style={{ flex: 1, alignItems: 'flex-start' }}>
        <Badge label={item.status} variant={item.status} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.codeChip}>
          <Text style={styles.codeText}>{item.accessCode}</Text>
        </View>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.examDate, { color: C.foreground }]}>{formatDate(item.scheduledAt ?? item.createdAt)}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
          <Feather name="clock" size={11} color={C.textSubtle} />
          <Text style={[styles.examSub, { color: C.textSubtle }]}>{item.settings?.duration ?? '—'} min</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        <TouchableOpacity
          onPress={() => router.push({ pathname: '/dashboard/results', params: { examId: item.id } })}
          style={[styles.actionBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}
        >
          <Feather name="bar-chart-2" size={14} color={C.textMuted} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const ExamCard = ({ item }) => (
    <View style={[styles.examCard, { backgroundColor: C.card, borderColor: C.border }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text style={[styles.examTitle, { color: C.foreground }]} numberOfLines={2}>{item.title}</Text>
          <Text style={[styles.examSub, { color: C.textSubtle }]}>{item.subject || item.topic || '—'} · {item.questionCount} questions</Text>
        </View>
        <Badge label={item.status} variant={item.status} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={styles.codeChip}><Text style={styles.codeText}>{item.accessCode}</Text></View>
        <Text style={[styles.examSub, { color: C.textSubtle }]}>{formatDate(item.scheduledAt ?? item.createdAt)} · {item.settings?.duration ?? '—'} min</Text>
      </View>
    </View>
  );

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.content, { padding: isWide ? 32 : 16 }]} showsVerticalScrollIndicator={false}>

      {/* Welcome Banner */}
      <View style={[styles.welcomeBanner, { borderColor: 'rgba(99,102,241,0.20)' }]}>
        <LinearGradient colors={['rgba(79,70,229,0.10)', 'rgba(124,58,237,0.04)']} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
        <View style={[styles.welcomeGlow, { backgroundColor: 'rgba(99,102,241,0.15)' }]} />
        <View style={[styles.welcomeInner, { flexDirection: isWide ? 'row' : 'column' }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.welcomeTitle, { color: C.foreground }]}>Good morning, {user.firstName} 👋</Text>
            <Text style={[styles.welcomeSub, { color: C.textMuted }]}>
              You have{' '}
              <Text style={{ color: C.foreground, fontFamily: Typography.fontFamily.bold }}>
                {loading ? '…' : `${activeExams} exam${activeExams !== 1 ? 's' : ''}`}
              </Text>{' '}
              active or scheduled.
            </Text>
          </View>
          <View style={[styles.welcomeActions, { marginTop: isWide ? 0 : 16 }]}>
            <TouchableOpacity style={styles.createBtn} onPress={() => router.push('/dashboard/create-exam')} activeOpacity={0.85}>
              <LinearGradient colors={['#4F46E5', '#7C3AED']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.createBtnGrad}>
                <Feather name="plus" size={15} color="#fff" />
                <Text style={styles.createBtnText}>Create Exam</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.joinBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)', borderColor: C.borderMedium }]} onPress={() => router.push('/dashboard/join-exam')} activeOpacity={0.8}>
              <Feather name="users" size={15} color={C.foreground} />
              <Text style={[styles.joinBtnText, { color: C.foreground }]}>Join Exam</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Stats */}
      <View style={[styles.statsRow, { flexDirection: isWide ? 'row' : 'column', gap: 16, marginBottom: 24 }]}>
        {loading
          ? [1, 2].map(i => <Skeleton key={i} height={84} borderRadius={16} style={{ flex: isWide ? 1 : undefined }} />)
          : STATS.map((s, i) => (
            <View key={i} style={[styles.statCard, { backgroundColor: C.card, borderColor: C.border, flex: isWide ? 1 : undefined }]}>
              <View style={[styles.statIcon, { backgroundColor: s.bg }]}>
                <Feather name={s.icon} size={22} color={s.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.statValue, { color: C.foreground }]}>{s.value}</Text>
                <Text style={[styles.statLabel, { color: C.textSubtle }]}>{s.label}</Text>
              </View>
              <View style={[styles.statBadge, { backgroundColor: s.badgeBg }]}>
                {s.pulse && <View style={[styles.pulseDot, { backgroundColor: s.badgeColor }]} />}
                <Text style={[styles.statBadgeText, { color: s.badgeColor }]}>{s.badge}</Text>
              </View>
            </View>
          ))
        }
      </View>

      {/* Upcoming Exams */}
      <View style={[styles.tableCard, { backgroundColor: C.card, borderColor: C.border }]}>
        <View style={[styles.tableHeader, { borderBottomColor: C.border }]}>
          <Text style={[styles.tableTitle, { color: C.foreground }]}>Active & Upcoming Exams</Text>
          <TouchableOpacity onPress={() => router.push('/dashboard/exams')}>
            <Text style={{ color: '#6366F1', fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.semiBold }}>View all →</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={{ padding: 16, gap: 10 }}>
            {[1, 2, 3].map(i => <SkeletonCard key={i} height={60} />)}
          </View>
        ) : upcomingExams.length === 0 ? (
          <EmptyState
            icon="clipboard"
            title="No active exams yet"
            subtitle="Create your first exam to get started."
            action={{ label: 'Create Exam', onPress: () => router.push('/dashboard/create-exam') }}
          />
        ) : isWide ? (
          <>
            <View style={[styles.tableHead, { backgroundColor: isDark ? Colors.dark.surface : Colors.light.surface }]}>
              {['Exam Title', 'Status', 'Access Code', 'Date & Duration', 'Actions'].map((h) => (
                <Text key={h} style={[styles.tableHeadCell, { color: C.textSubtle, flex: h === 'Actions' ? 0.5 : h === 'Status' ? 0.8 : 1 }]}>{h}</Text>
              ))}
            </View>
            {upcomingExams.map((item) => <ExamRow key={item.id} item={item} />)}
          </>
        ) : (
          <View style={{ padding: 12, gap: 10 }}>
            {upcomingExams.map((item) => <ExamCard key={item.id} item={item} />)}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingBottom: 40 },
  welcomeBanner: { borderRadius: 20, borderWidth: 1, overflow: 'hidden', marginBottom: 24, position: 'relative' },
  welcomeGlow: { position: 'absolute', top: -100, right: -100, width: 140, height: 140, borderRadius: 70, opacity: 0.7 },
  welcomeInner: { padding: 24, justifyContent: 'space-between', alignItems: 'center' },
  welcomeTitle: { fontSize: Typography.size['2xl'], fontFamily: Typography.fontFamily.extraBold, marginBottom: 6 },
  welcomeSub: { fontSize: Typography.size.base, fontFamily: Typography.fontFamily.regular },
  welcomeActions: { flexDirection: 'row', gap: 10 },
  createBtn: { borderRadius: 12, overflow: 'hidden' },
  createBtnGrad: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 18, paddingVertical: 11 },
  createBtnText: { color: '#fff', fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.semiBold },
  joinBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 12, borderWidth: 1 },
  joinBtnText: { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.semiBold },
  statsRow: {},
  statCard: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 16, borderWidth: 1, padding: 18 },
  statIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: Typography.size['2xl'], fontFamily: Typography.fontFamily.extraBold, lineHeight: 30 },
  statLabel: { fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.medium, marginTop: 2 },
  statBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statBadgeText: { fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.bold },
  pulseDot: { width: 6, height: 6, borderRadius: 3 },
  tableCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 18, borderBottomWidth: 1 },
  tableTitle: { fontSize: Typography.size.base, fontFamily: Typography.fontFamily.semiBold },
  tableHead: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 12 },
  tableHeadCell: { fontSize: 10, fontFamily: Typography.fontFamily.semiBold, textTransform: 'uppercase', letterSpacing: 0.5 },
  examRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, gap: 8 },
  examTitle: { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.semiBold },
  examSub: { fontSize: 11, fontFamily: Typography.fontFamily.regular, marginTop: 2 },
  examDate: { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.medium },
  codeChip: { backgroundColor: 'rgba(99,102,241,0.10)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start' },
  codeText: { color: '#818CF8', fontSize: 10, fontFamily: Typography.fontFamily.bold, letterSpacing: 1 },
  actionBtn: { width: 28, height: 28, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  examCard: { borderRadius: 14, borderWidth: 1, padding: 14 },
});
