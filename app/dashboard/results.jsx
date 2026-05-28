import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  FlatList, StyleSheet, Platform, useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import { Tabs } from '../../components/ui/Tabs';
import { Badge } from '../../components/ui/Badge';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { ScoreRing } from '../../components/ui/charts/ScoreRing';
import { BarChart } from '../../components/ui/charts/BarChart';
import { examService } from '../../services/examService';

// ── Mock fallback (shown when no API data yet) ──────────────────────────────
const MOCK_RESULTS = {
  exam: { id: 'mock', title: 'Mathematics Final Exam', accessCode: 'EXM-1042', questionCount: 50 },
  stats: { total: 45, avgScore: 78.4, passRate: 82, topScore: 94 },
  leaderboard: [
    { rank: 1, sessionId: 's1', name: 'Alice Johnson',   email: 'alice@example.com', scorePercentage: 94, passed: true,  timeTaken: 2903, violations: 0 },
    { rank: 2, sessionId: 's2', name: 'Bob Williams',    email: 'bob@example.com',   scorePercentage: 87, passed: true,  timeTaken: 3130, violations: 0 },
    { rank: 3, sessionId: 's3', name: 'Carol Davis',     email: 'carol@example.com', scorePercentage: 79, passed: true,  timeTaken: 3525, violations: 1 },
    { rank: 4, sessionId: 's4', name: 'David Brown',     email: 'david@example.com', scorePercentage: 72, passed: true,  timeTaken: 3690, violations: 0 },
    { rank: 5, sessionId: 's5', name: 'Emma Wilson',     email: 'emma@example.com',  scorePercentage: 65, passed: true,  timeTaken: 3312, violations: 2 },
    { rank: 6, sessionId: 's6', name: 'Frank Miller',    email: 'frank@example.com', scorePercentage: 48, passed: false, timeTaken: 4020, violations: 3 },
  ],
  distribution: [
    { label: '0–20',  value: 1,  color: '#EF4444' },
    { label: '21–40', value: 3,  color: '#F97316' },
    { label: '41–60', value: 7,  color: '#F59E0B' },
    { label: '61–80', value: 20, color: '#10B981' },
    { label: '81–100',value: 14, color: '#10B981' },
  ],
};

const MOCK_HISTORY = [
  { sessionId: 's1', examTitle: 'Mathematics Final Exam', subject: 'Mathematics', score: 43, scorePercentage: 86, passed: true,  timeTaken: 3154, violations: 0 },
  { sessionId: 's2', examTitle: 'Physics Midterm Test',   subject: 'Physics',     score: 33, scorePercentage: 82, passed: true,  timeTaken: 2610, violations: 1 },
];

const MOCK_SUBTOPICS = [
  { label: 'Algebra',           value: 92, color: '#10B981' },
  { label: 'Geometry',          value: 85, color: '#10B981' },
  { label: 'Calculus',          value: 74, color: '#F59E0B' },
  { label: 'Statistics',        value: 68, color: '#F59E0B' },
  { label: 'Number Theory',     value: 55, color: '#EF4444' },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(secs) {
  if (!secs) return '—';
  const m = Math.floor(secs / 60), s = secs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function getGrade(pct) {
  if (pct >= 90) return 'A+'; if (pct >= 80) return 'A';
  if (pct >= 70) return 'B+'; if (pct >= 60) return 'B';
  if (pct >= 50) return 'C';  if (pct >= 40) return 'D'; return 'F';
}

function RankBadge({ rank }) {
  const bg = rank === 1 ? ['#F59E0B', '#EF4444'] : rank === 2 ? ['#94A3B8', '#64748B'] : rank === 3 ? ['#B47C3C', '#92642E'] : null;
  if (bg) return (
    <LinearGradient colors={bg} style={S.rankBadge} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
      <Text style={S.rankBadgeText}>{rank}</Text>
    </LinearGradient>
  );
  return (
    <View style={[S.rankBadge, { backgroundColor: 'rgba(100,116,139,0.15)' }]}>
      <Text style={[S.rankBadgeText, { color: '#64748B' }]}>{rank}</Text>
    </View>
  );
}

// ── Screen ──────────────────────────────────────────────────────────────────

export default function ResultsScreen() {
  const { isDark } = useTheme();
  const C = isDark ? Colors.dark : Colors.light;
  const { width } = useWindowDimensions();
  const isWide = Platform.OS === 'web' && width >= 768;
  const router = useRouter();
  const { examId: paramExamId } = useLocalSearchParams();

  const [activeTab, setActiveTab]         = useState('teacher');
  const [myExams, setMyExams]             = useState([]);
  const [selectedExamId, setSelectedExamId] = useState(paramExamId || null);
  const [results, setResults]             = useState(MOCK_RESULTS);
  const [history, setHistory]             = useState(MOCK_HISTORY);
  const [loading, setLoading]             = useState(false);
  const [searchQuery, setSearchQuery]     = useState('');

  // Load exam list for selector
  useEffect(() => {
    examService.getMyExams()
      .then(res => {
        const exams = res.data?.exams ?? [];
        setMyExams(exams);
        if (!selectedExamId && exams.length > 0) setSelectedExamId(exams[0].id);
      })
      .catch(() => {});
  }, []);

  // Load results when exam changes
  useEffect(() => {
    if (!selectedExamId) return;
    setLoading(true);
    examService.getExamResults(selectedExamId)
      .then(res => setResults(res.data))
      .catch(() => setResults(MOCK_RESULTS))
      .finally(() => setLoading(false));
  }, [selectedExamId]);

  // Load student history
  useEffect(() => {
    examService.getHistory()
      .then(res => setHistory(res.data?.history ?? MOCK_HISTORY))
      .catch(() => setHistory(MOCK_HISTORY));
  }, []);

  const filteredLeaderboard = (results?.leaderboard ?? []).filter(s =>
    !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ── Teacher view ───────────────────────────────────────────────────────────
  const TeacherView = () => (
    <View style={{ gap: 20 }}>

      {/* Exam selector */}
      {myExams.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {myExams.map(e => (
            <TouchableOpacity
              key={e.id}
              onPress={() => setSelectedExamId(e.id)}
              style={[S.examSelBtn, { backgroundColor: selectedExamId === e.id ? 'rgba(99,102,241,0.12)' : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', borderColor: selectedExamId === e.id ? 'rgba(99,102,241,0.4)' : C.border }]}
              activeOpacity={0.7}
            >
              <Text style={[S.examSelBtnText, { color: selectedExamId === e.id ? '#818CF8' : C.textSubtle }]}>{e.title}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Stat cards */}
      <View style={[S.statsGrid, { flexDirection: isWide ? 'row' : 'column' }]}>
        {[
          { label: 'Total Submissions', value: String(results?.stats?.total ?? 0),          color: '#818CF8', sub: '100% submitted' },
          { label: 'Average Score',     value: `${results?.stats?.avgScore ?? 0}%`,          color: '#34D399', sub: '+4.2% vs last exam' },
          { label: 'Pass Rate',         value: `${results?.stats?.passRate ?? 0}%`,          color: '#FBBF24', sub: null, isProgress: true },
          { label: 'Top Score',         value: `${results?.stats?.topScore ?? 0}%`,          color: '#818CF8', sub: null },
        ].map((s, i) => (
          <View key={i} style={[S.statCard, { backgroundColor: C.card, borderColor: C.border, flex: isWide ? 1 : undefined }]}>
            <Text style={[S.statVal, { color: s.color }]}>{s.value}</Text>
            <Text style={[S.statLabel, { color: C.textSubtle }]}>{s.label}</Text>
            {s.isProgress && <ProgressBar value={results?.stats?.passRate ?? 0} color="#10B981" height={5} style={{ marginTop: 8 }} />}
            {s.sub && <Text style={[S.statSub, { color: '#10B981' }]}>↑ {s.sub}</Text>}
          </View>
        ))}
      </View>

      {/* Score distribution chart */}
      <View style={[S.card, { backgroundColor: C.card, borderColor: C.border }]}>
        <View style={S.cardHeader}>
          <Text style={[S.cardTitle, { color: C.foreground }]}>Score Distribution</Text>
          <View style={[S.chipSmall, { backgroundColor: 'rgba(99,102,241,0.10)' }]}>
            <Text style={[S.chipSmallText, { color: '#818CF8' }]}>{results?.stats?.total ?? 0} students</Text>
          </View>
        </View>
        <BarChart data={results?.distribution ?? []} height={180} />
      </View>

      {/* Leaderboard */}
      <View style={[S.card, { backgroundColor: C.card, borderColor: C.border }]}>
        <View style={[S.cardHeader, { flexWrap: 'wrap', gap: 10 }]}>
          <Text style={[S.cardTitle, { color: C.foreground }]}>Student Results</Text>
          <View style={[S.searchBox, { backgroundColor: C.surface2, borderColor: C.border }]}>
            <Feather name="search" size={13} color={C.textSubtle} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search student…"
              placeholderTextColor={C.textSubtle}
              style={[S.searchInput, { color: C.foreground, outlineStyle: 'none' }]}
              autoComplete="off"
            />
          </View>
        </View>

        {loading ? (
          <View style={{ gap: 8, padding: 4 }}>
            {[1, 2, 3].map(i => <SkeletonCard key={i} height={60} />)}
          </View>
        ) : filteredLeaderboard.length === 0 ? (
          <EmptyState icon="users" title="No submissions yet" subtitle="Students will appear here once they complete the exam." />
        ) : (
          filteredLeaderboard.map(s => (
            <View key={s.sessionId} style={[S.leaderRow, { borderBottomColor: C.border }]}>
              <RankBadge rank={s.rank} />
              <View style={{ flex: 1 }}>
                <Text style={[S.leaderName, { color: C.foreground }]}>{s.name}</Text>
                <Text style={[S.leaderEmail, { color: C.textSubtle }]}>{s.email}</Text>
              </View>
              <View style={S.leaderScore}>
                <Text style={[S.leaderScoreVal, { color: s.passed ? '#10B981' : '#EF4444' }]}>{s.scorePercentage}%</Text>
                <Text style={[S.leaderScoreSub, { color: C.textSubtle }]}>{formatTime(s.timeTaken)}</Text>
              </View>
              <Badge label={s.passed ? 'pass' : 'fail'} variant={s.passed ? 'active' : 'error'} />
              {s.violations > 0 && (
                <View style={S.violationDot}>
                  <Text style={S.violationDotText}>{s.violations}⚠</Text>
                </View>
              )}
              <TouchableOpacity
                onPress={() => router.push({ pathname: '/dashboard/student-report', params: { examId: results?.exam?.id, sessionId: s.sessionId } })}
                style={[S.viewBtn, { borderColor: C.border }]}
                activeOpacity={0.7}
              >
                <Text style={[S.viewBtnText, { color: C.textMuted }]}>Report</Text>
                <Feather name="chevron-right" size={12} color={C.textMuted} />
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>
    </View>
  );

  // ── Student result view ────────────────────────────────────────────────────
  const StudentView = () => {
    const myResult = history[0]; // most recent
    if (!myResult) return <EmptyState icon="clipboard" title="No results yet" subtitle="Join and complete an exam to see your results here." />;

    return (
      <View style={{ gap: 20 }}>
        {/* Score hero */}
        <View style={[S.resultHero, { borderColor: 'rgba(79,70,229,0.2)' }]}>
          <LinearGradient colors={['rgba(79,70,229,0.12)', 'rgba(124,58,237,0.06)']} style={StyleSheet.absoluteFillObject} />
          <View style={S.resultHeroInner}>
            <ScoreRing score={Math.round(myResult.scorePercentage)} grade={getGrade(myResult.scorePercentage)} size={140} animate />
            <View style={{ flex: 1 }}>
              <Text style={[S.resultHeroTitle, { color: C.foreground }]}>
                {myResult.passed ? 'Great Performance! 🎉' : 'Keep Practising 📚'}
              </Text>
              <Text style={[S.resultHeroExam, { color: C.textSubtle }]}>
                {myResult.examTitle} · {myResult.subject}
              </Text>
              <View style={S.resultMiniStats}>
                {[
                  { label: 'Correct',    value: String(myResult.score ?? '—'),              color: '#34D399' },
                  { label: 'Score',      value: `${myResult.scorePercentage}%`,               color: '#818CF8' },
                  { label: 'Time',       value: formatTime(myResult.timeTaken),               color: '#FBBF24' },
                  { label: 'Violations', value: String(myResult.violations ?? 0),             color: myResult.violations > 0 ? '#EF4444' : '#10B981' },
                ].map((s, i) => (
                  <View key={i} style={S.miniStat}>
                    <Text style={[S.miniStatVal, { color: s.color }]}>{s.value}</Text>
                    <Text style={[S.miniStatLabel, { color: C.textSubtle }]}>{s.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* Performance breakdown by subtopic */}
        <View style={[S.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[S.cardTitle, { color: C.foreground, marginBottom: 16 }]}>📊 Performance Breakdown</Text>
          {MOCK_SUBTOPICS.map((s, i) => (
            <View key={i} style={[S.subtopicRow, { borderBottomColor: C.border }]}>
              <Text style={[S.subtopicLabel, { color: C.textSubtle }]} numberOfLines={1}>{s.label}</Text>
              <View style={{ flex: 1 }}>
                <ProgressBar value={s.value} color={s.color} height={7} />
              </View>
              <Text style={[S.subtopicPct, { color: s.color }]}>{s.value}%</Text>
            </View>
          ))}
        </View>

        {/* Recent exam history */}
        <View style={[S.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[S.cardTitle, { color: C.foreground, marginBottom: 12 }]}>📋 Recent History</Text>
          {history.map((h, i) => (
            <View key={i} style={[S.historyRow, { borderBottomColor: C.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[S.historyTitle, { color: C.foreground }]} numberOfLines={1}>{h.examTitle}</Text>
                <Text style={[S.historySub, { color: C.textSubtle }]}>{h.subject} · {formatTime(h.timeTaken)}</Text>
              </View>
              <Text style={[S.historyScore, { color: h.passed ? '#10B981' : '#EF4444' }]}>{h.scorePercentage}%</Text>
              <Badge label={h.passed ? 'pass' : 'fail'} variant={h.passed ? 'active' : 'error'} />
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.background }}
      contentContainerStyle={[S.content, { padding: isWide ? 32 : 16 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Page header + tabs */}
      <View style={[S.pageHeader, { borderBottomColor: C.border }]}>
        <View>
          <Text style={[S.pageTitle, { color: C.foreground }]}>Results & Analytics</Text>
          <Text style={[S.pageSub, { color: C.textSubtle }]}>Detailed performance insights for your exams</Text>
        </View>
      </View>

      <Tabs
        tabs={[
          { id: 'teacher', label: 'Teacher View' },
          { id: 'student', label: 'My Result' },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
        style={{ marginBottom: 20 }}
      />

      {activeTab === 'teacher' ? <TeacherView /> : <StudentView />}
    </ScrollView>
  );
}

const S = StyleSheet.create({
  content:        { flexGrow: 1, paddingBottom: 40, gap: 0 },
  pageHeader:     { paddingBottom: 20, borderBottomWidth: 1, marginBottom: 16 },
  pageTitle:      { fontSize: Typography.size['2xl'], fontFamily: Typography.fontFamily.extraBold },
  pageSub:        { fontSize: Typography.size.sm,    fontFamily: Typography.fontFamily.regular, marginTop: 3 },
  // Exam selector
  examSelBtn:     { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  examSelBtnText: { fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.semiBold },
  // Stats grid
  statsGrid:      { gap: 12 },
  statCard:       { borderRadius: 16, borderWidth: 1, padding: 18 },
  statVal:        { fontSize: 30, fontFamily: Typography.fontFamily.extraBold, lineHeight: 34, letterSpacing: -0.5 },
  statLabel:      { fontSize: 12, fontFamily: Typography.fontFamily.regular, marginTop: 3 },
  statSub:        { fontSize: 12, fontFamily: Typography.fontFamily.medium, marginTop: 6 },
  // Cards
  card:           { borderRadius: 16, borderWidth: 1, padding: 20 },
  cardHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  cardTitle:      { fontSize: Typography.size.base, fontFamily: Typography.fontFamily.semiBold },
  chipSmall:      { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  chipSmallText:  { fontSize: 10, fontFamily: Typography.fontFamily.bold },
  // Search
  searchBox:      { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, height: 34, minWidth: 160 },
  searchInput:    { flex: 1, fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.regular },
  // Leaderboard
  leaderRow:      { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  rankBadge:      { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  rankBadgeText:  { fontSize: 10, fontFamily: Typography.fontFamily.extraBold, color: '#fff' },
  leaderName:     { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.semiBold },
  leaderEmail:    { fontSize: 11, fontFamily: Typography.fontFamily.regular, marginTop: 1 },
  leaderScore:    { alignItems: 'flex-end' },
  leaderScoreVal: { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.extraBold },
  leaderScoreSub: { fontSize: 10, fontFamily: Typography.fontFamily.regular },
  violationDot:   { paddingHorizontal: 6, paddingVertical: 2, backgroundColor: 'rgba(239,68,68,0.10)', borderRadius: 6 },
  violationDotText: { fontSize: 10, color: '#EF4444', fontFamily: Typography.fontFamily.bold },
  viewBtn:        { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  viewBtnText:    { fontSize: 10, fontFamily: Typography.fontFamily.semiBold },
  // Result hero
  resultHero:     { borderRadius: 20, borderWidth: 1, overflow: 'hidden', padding: 24 },
  resultHeroInner:{ flexDirection: 'row', alignItems: 'center', gap: 20, flexWrap: 'wrap' },
  resultHeroTitle:{ fontSize: Typography.size.xl, fontFamily: Typography.fontFamily.extraBold, marginBottom: 4 },
  resultHeroExam: { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.regular, marginBottom: 14 },
  resultMiniStats:{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  miniStat:       { alignItems: 'center' },
  miniStatVal:    { fontSize: Typography.size.xl, fontFamily: Typography.fontFamily.extraBold },
  miniStatLabel:  { fontSize: 11, fontFamily: Typography.fontFamily.regular, marginTop: 2 },
  // Subtopic breakdown
  subtopicRow:    { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  subtopicLabel:  { width: 100, fontSize: 12, fontFamily: Typography.fontFamily.semiBold },
  subtopicPct:    { width: 40, textAlign: 'right', fontSize: 12, fontFamily: Typography.fontFamily.extraBold },
  // History
  historyRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  historyTitle:   { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.semiBold },
  historySub:     { fontSize: 11, fontFamily: Typography.fontFamily.regular, marginTop: 2 },
  historyScore:   { fontSize: Typography.size.base, fontFamily: Typography.fontFamily.extraBold },
});
