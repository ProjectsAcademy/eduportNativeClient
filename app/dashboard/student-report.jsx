import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Platform, useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import { Badge } from '../../components/ui/Badge';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { ScoreRing } from '../../components/ui/charts/ScoreRing';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { examService } from '../../services/examService';

const BLOOMS_CONFIG = {
  remember:   { label: 'Remember',   color: '#6366F1', bg: 'rgba(99,102,241,0.12)' },
  understand: { label: 'Understand', color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
  apply:      { label: 'Apply',      color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  analyze:    { label: 'Analyze',    color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
  evaluate:   { label: 'Evaluate',   color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)' },
  create:     { label: 'Create',     color: '#06B6D4', bg: 'rgba(6,182,212,0.12)' },
};

const VIOLATION_LABELS = {
  tab_switch:      'Tab Switch',
  right_click:     'Right Click',
  copy_paste:      'Copy / Paste',
  fullscreen_exit: 'Fullscreen Exit',
  app_background:  'App Background',
};

const SEVERITY_COLORS = {
  high:   { color: '#F87171', bg: 'rgba(239,68,68,0.12)',  border: '#EF4444' },
  medium: { color: '#FBBF24', bg: 'rgba(245,158,11,0.12)', border: '#F59E0B' },
  low:    { color: '#94A3B8', bg: 'rgba(100,116,139,0.10)', border: '#64748B' },
};

function formatTime(secs) {
  if (!secs && secs !== 0) return '—';
  const m = Math.floor(secs / 60), s = secs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function getGrade(pct) {
  if (pct >= 90) return 'A+'; if (pct >= 80) return 'A';
  if (pct >= 70) return 'B+'; if (pct >= 60) return 'B';
  if (pct >= 50) return 'C';  if (pct >= 40) return 'D'; return 'F';
}

function SectionLabel({ title }) {
  const { isDark } = useTheme();
  const C = isDark ? Colors.dark : Colors.light;
  return (
    <View style={S.sectionLabelRow}>
      <Text style={[S.sectionLabel, { color: C.textSubtle }]}>{title}</Text>
      <View style={[S.sectionLine, { backgroundColor: C.border }]} />
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function StudentReportScreen() {
  const { isDark } = useTheme();
  const C = isDark ? Colors.dark : Colors.light;
  const { width } = useWindowDimensions();
  const isWide = Platform.OS === 'web' && width >= 768;
  const router = useRouter();
  const { examId, sessionId } = useLocalSearchParams();

  const [loading, setLoading]       = useState(true);
  const [detail, setDetail]         = useState(null);
  const [expandedQ, setExpandedQ]   = useState(null);

  useEffect(() => {
    if (examId && sessionId) {
      examService.getSessionDetail(examId, sessionId)
        .then(res => setDetail(res.data))
        .catch(() => setDetail(null))
        .finally(() => setLoading(false));
    } else {
      setDetail(null);
      setLoading(false);
    }
  }, [examId, sessionId]);

  if (loading) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: C.background }} contentContainerStyle={{ padding: 24, gap: 16 }}>
        {[1, 2, 3].map(i => <SkeletonCard key={i} height={120} />)}
      </ScrollView>
    );
  }

  if (!detail) return (
    <EmptyState
      icon="user"
      title="Report not found"
      subtitle="Select a student from the Results screen to view their full report."
    />
  );

  const { session, exam, qaReview } = detail;
  const answeredCount = (qaReview ?? []).filter(q => q.studentAnswer !== null).length;
  const correctCount  = (qaReview ?? []).filter(q => q.isCorrect).length;
  const wrongCount    = answeredCount - correctCount;
  const skippedCount  = (qaReview ?? []).length - answeredCount;

  // ── Bloom's taxonomy aggregation ─────────────────────────────────────────────
  const bloomsData = Object.keys(BLOOMS_CONFIG).map(level => {
    const qs = (qaReview ?? []).filter(q => q.bloomsLevel === level);
    const correct = qs.filter(q => q.isCorrect).length;
    const pct = qs.length > 0 ? Math.round((correct / qs.length) * 100) : 0;
    return { level, pct, total: qs.length, correct, ...BLOOMS_CONFIG[level] };
  });

  // ── Subtopic aggregation ──────────────────────────────────────────────────────
  const subtopicMap = {};
  for (const q of qaReview ?? []) {
    if (!q.subtopic) continue;
    if (!subtopicMap[q.subtopic]) subtopicMap[q.subtopic] = { total: 0, correct: 0 };
    subtopicMap[q.subtopic].total++;
    if (q.isCorrect) subtopicMap[q.subtopic].correct++;
  }
  const subtopics = Object.entries(subtopicMap).map(([label, v]) => ({
    label, value: Math.round((v.correct / v.total) * 100),
    color: v.correct / v.total >= 0.7 ? '#10B981' : v.correct / v.total >= 0.5 ? '#F59E0B' : '#EF4444',
  }));

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.background }}
      contentContainerStyle={[S.content, { padding: isWide ? 32 : 16 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Back button */}
      <TouchableOpacity onPress={() => router.back()} style={S.backBtn} activeOpacity={0.7}>
        <Feather name="arrow-left" size={16} color={C.textMuted} />
        <Text style={[S.backBtnText, { color: C.textMuted }]}>Back to Results</Text>
      </TouchableOpacity>

      {/* ── Hero ── */}
      <View style={[S.hero, { borderColor: 'rgba(79,70,229,0.22)' }]}>
        <LinearGradient colors={['rgba(79,70,229,0.12)', 'rgba(124,58,237,0.06)']} style={StyleSheet.absoluteFillObject} />
        <View style={[S.heroInner, { flexDirection: isWide ? 'row' : 'column', alignItems: isWide ? 'center' : 'flex-start' }]}>
          <ScoreRing score={Math.round(session.scorePercentage)} grade={getGrade(session.scorePercentage)} size={120} animate />
          <View style={{ flex: 1, gap: 8 }}>
            <Text style={[S.heroName, { color: C.foreground }]}>{session.student.name}</Text>
            <Text style={[S.heroExam, { color: C.textSubtle }]}>{exam.title} · {exam.subject}</Text>
            <View style={S.heroPills}>
              <View style={[S.pill, { backgroundColor: session.passed ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)', borderColor: session.passed ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)' }]}>
                <Text style={[S.pillText, { color: session.passed ? '#34D399' : '#F87171' }]}>
                  {session.passed ? '✓ PASSED' : '✗ FAILED'}
                </Text>
              </View>
              <View style={[S.pill, { backgroundColor: C.surface2, borderColor: C.border }]}>
                <Feather name="clock" size={11} color={C.textSubtle} />
                <Text style={[S.pillText, { color: C.textSubtle }]}>{formatTime(session.timeTaken)}</Text>
              </View>
              {session.student.rollNumber && (
                <View style={[S.pill, { backgroundColor: C.surface2, borderColor: C.border }]}>
                  <Text style={[S.pillText, { color: C.textSubtle }]}>#{session.student.rollNumber}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>

      {/* ── Quick stat cards ── */}
      <View style={[S.statRow, { flexDirection: isWide ? 'row' : 'row', flexWrap: 'wrap' }]}>
        {[
          { label: 'Score',        value: `${correctCount}/${(qaReview ?? []).length}`, color: '#818CF8', sub: `${session.scorePercentage}%` },
          { label: 'Correct',      value: String(correctCount),   color: '#10B981', sub: null },
          { label: 'Incorrect',    value: String(wrongCount),     color: '#EF4444', sub: null },
          { label: 'Violations',   value: String((session.violations ?? []).length), color: '#F59E0B', sub: null },
        ].map((s, i) => (
          <View key={i} style={[S.statCard, { backgroundColor: C.card, borderColor: C.border, flex: 1, minWidth: 70 }]}>
            <Text style={[S.statVal, { color: s.color }]}>{s.value}</Text>
            <Text style={[S.statLabel, { color: C.textSubtle }]}>{s.label}</Text>
            {s.sub && <Text style={[S.statSub, { color: C.textSubtle }]}>{s.sub}</Text>}
          </View>
        ))}
      </View>

      {/* ── Subtopic performance ── */}
      {subtopics.length > 0 && (
        <>
          <SectionLabel title="SUBTOPIC PERFORMANCE" />
          <View style={[S.card, { backgroundColor: C.card, borderColor: C.border }]}>
            {subtopics.map((s, i) => (
              <View key={i} style={[S.subtopicRow, { borderBottomColor: C.border }]}>
                <Text style={[S.subtopicLabel, { color: C.textSubtle }]} numberOfLines={1}>{s.label}</Text>
                <View style={{ flex: 1 }}>
                  <ProgressBar value={s.value} color={s.color} height={7} />
                </View>
                <Text style={[S.subtopicPct, { color: s.color }]}>{s.value}%</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {/* ── Bloom's taxonomy ── */}
      <SectionLabel title="BLOOM'S TAXONOMY BREAKDOWN" />
      <View style={S.bloomGrid}>
        {bloomsData.map(b => (
          <View key={b.level} style={[S.bloomCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderColor: C.border }]}>
            <Text style={[S.bloomLabel, { color: C.textSubtle }]}>{b.label.toUpperCase()}</Text>
            <View style={[S.bloomBarWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
              <View style={[S.bloomBarFill, { width: `${b.pct}%`, backgroundColor: b.color }]} />
            </View>
            <Text style={[S.bloomPct, { color: b.color }]}>{b.total > 0 ? `${b.pct}%` : '—'}</Text>
            <Text style={[S.bloomCount, { color: C.textSubtle }]}>{b.correct}/{b.total} correct</Text>
          </View>
        ))}
      </View>

      {/* ── Violation log ── */}
      {(session.violations ?? []).length > 0 && (
        <>
          <SectionLabel title="VIOLATION LOG" />
          <View style={[S.card, { backgroundColor: C.card, borderColor: C.border, padding: 0, overflow: 'hidden' }]}>
            {(session.violations ?? []).map((v, i) => {
              const sc = SEVERITY_COLORS[v.severity] || SEVERITY_COLORS.low;
              return (
                <View key={i} style={[S.vioItem, { borderBottomColor: C.border, borderLeftColor: sc.border }]}>
                  <View style={[S.vioIcon, { backgroundColor: sc.bg }]}>
                    <Feather name="alert-triangle" size={14} color={sc.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[S.vioTitle, { color: C.foreground }]}>{VIOLATION_LABELS[v.type] ?? v.type}</Text>
                    <View style={[S.vioSeverity, { backgroundColor: sc.bg }]}>
                      <Text style={[S.vioSeverityText, { color: sc.color }]}>{(v.severity ?? 'medium').toUpperCase()}</Text>
                    </View>
                  </View>
                  <Text style={[S.vioTime, { color: C.textSubtle }]}>
                    {v.timestamp ? new Date(v.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </Text>
                </View>
              );
            })}
          </View>
        </>
      )}

      {/* ── Q&A Analysis ── */}
      <SectionLabel title="QUESTION ANALYSIS" />
      <View style={[S.card, { backgroundColor: C.card, borderColor: C.border, padding: 0, overflow: 'hidden' }]}>
        {(qaReview ?? []).map((q, i) => {
          const isExpanded = expandedQ === i;
          const resultColor = q.studentAnswer === null ? C.textSubtle : q.isCorrect ? '#10B981' : '#EF4444';
          const resultIcon  = q.studentAnswer === null ? 'minus' : q.isCorrect ? 'check' : 'x';

          return (
            <View key={i} style={{ borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border }}>
              {/* Row header */}
              <TouchableOpacity
                onPress={() => setExpandedQ(isExpanded ? null : i)}
                style={S.qaRow}
                activeOpacity={0.7}
              >
                <View style={[S.qaNum, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                  <Text style={[S.qaNumText, { color: C.textSubtle }]}>Q{i + 1}</Text>
                </View>
                <Feather name={resultIcon} size={14} color={resultColor} style={{ flexShrink: 0 }} />
                <Text style={[S.qaText, { color: C.foreground }]} numberOfLines={1}>{q.text}</Text>
                <View style={[S.qaSubtopicChip, { backgroundColor: isDark ? 'rgba(245,158,11,0.10)' : 'rgba(245,158,11,0.08)' }]}>
                  <Text style={S.qaSubtopicText} numberOfLines={1}>{q.subtopic}</Text>
                </View>
                <Feather name={isExpanded ? 'chevron-up' : 'chevron-down'} size={14} color={C.textSubtle} />
              </TouchableOpacity>

              {/* Expanded detail */}
              {isExpanded && (
                <View style={[S.qaDetail, { backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', borderTopColor: C.border }]}>
                  <Text style={[S.qaFullText, { color: C.foreground }]}>{q.text}</Text>

                  {/* Options */}
                  <View style={{ gap: 6, marginTop: 10 }}>
                    {(q.options ?? []).map((opt, oi) => {
                      const isCorrect = oi === q.correctAnswer;
                      const isStudent = oi === q.studentAnswer;
                      const variant = isCorrect ? 'correct' : (isStudent && !isCorrect) ? 'wrong' : 'normal';
                      return (
                        <View key={oi} style={[
                          S.qaOption,
                          variant === 'correct' && { backgroundColor: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.25)' },
                          variant === 'wrong'   && { backgroundColor: 'rgba(239,68,68,0.08)',  borderColor: 'rgba(239,68,68,0.25)'  },
                          variant === 'normal'  && { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', borderColor: 'transparent' },
                        ]}>
                          <Feather
                            name={variant === 'correct' ? 'check-circle' : variant === 'wrong' ? 'x-circle' : 'circle'}
                            size={14}
                            color={variant === 'correct' ? '#34D399' : variant === 'wrong' ? '#F87171' : C.textSubtle}
                          />
                          <Text style={[S.qaOptionText, { color: variant === 'correct' ? '#34D399' : variant === 'wrong' ? '#F87171' : C.textSubtle }]}>
                            {opt}
                          </Text>
                          {isStudent && (
                            <View style={[S.myAnswerTag, { backgroundColor: isCorrect ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.12)' }]}>
                              <Text style={[S.myAnswerText, { color: isCorrect ? '#34D399' : '#F87171' }]}>Your answer</Text>
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>

                  {/* Bloom's level chip */}
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                    <View style={[S.bloomChip, { backgroundColor: BLOOMS_CONFIG[q.bloomsLevel]?.bg ?? 'rgba(99,102,241,0.10)' }]}>
                      <Text style={[S.bloomChipText, { color: BLOOMS_CONFIG[q.bloomsLevel]?.color ?? '#818CF8' }]}>
                        {BLOOMS_CONFIG[q.bloomsLevel]?.label ?? q.bloomsLevel}
                      </Text>
                    </View>
                    <View style={[S.bloomChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }]}>
                      <Text style={[S.bloomChipText, { color: C.textSubtle }]}>{q.subtopic}</Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const S = StyleSheet.create({
  content:          { flexGrow: 1, paddingBottom: 40, gap: 20 },
  backBtn:          { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  backBtnText:      { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.medium },
  // Hero
  hero:             { borderRadius: 20, borderWidth: 1, overflow: 'hidden', padding: 24 },
  heroInner:        { gap: 20 },
  heroName:         { fontSize: Typography.size.xl, fontFamily: Typography.fontFamily.extraBold },
  heroExam:         { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.regular },
  heroPills:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill:             { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  pillText:         { fontSize: 11, fontFamily: Typography.fontFamily.bold },
  // Stats row
  statRow:          { gap: 10 },
  statCard:         { borderRadius: 14, borderWidth: 1, padding: 14, alignItems: 'center', gap: 3 },
  statVal:          { fontSize: Typography.size.xl, fontFamily: Typography.fontFamily.extraBold },
  statLabel:        { fontSize: 10, fontFamily: Typography.fontFamily.medium },
  statSub:          { fontSize: 10, fontFamily: Typography.fontFamily.regular },
  // Section label
  sectionLabelRow:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionLabel:     { fontSize: 11, fontFamily: Typography.fontFamily.extraBold, textTransform: 'uppercase', letterSpacing: 0.8, flexShrink: 0 },
  sectionLine:      { flex: 1, height: 1 },
  // Subtopic bars
  card:             { borderRadius: 16, borderWidth: 1, padding: 18 },
  subtopicRow:      { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  subtopicLabel:    { width: 110, fontSize: 12, fontFamily: Typography.fontFamily.semiBold },
  subtopicPct:      { width: 40, textAlign: 'right', fontSize: 12, fontFamily: Typography.fontFamily.extraBold },
  // Bloom's grid
  bloomGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  bloomCard:        { borderRadius: 12, borderWidth: 1, padding: 12, alignItems: 'center', width: '30%', flexGrow: 1 },
  bloomLabel:       { fontSize: 9, fontFamily: Typography.fontFamily.bold, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  bloomBarWrap:     { height: 5, width: '100%', borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  bloomBarFill:     { height: '100%', borderRadius: 3 },
  bloomPct:         { fontSize: Typography.size.lg, fontFamily: Typography.fontFamily.extraBold },
  bloomCount:       { fontSize: 10, fontFamily: Typography.fontFamily.regular, marginTop: 2 },
  // Violation log
  vioItem:          { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderLeftWidth: 3 },
  vioIcon:          { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  vioTitle:         { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.bold, marginBottom: 4 },
  vioSeverity:      { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start' },
  vioSeverityText:  { fontSize: 9, fontFamily: Typography.fontFamily.bold, letterSpacing: 0.5 },
  vioTime:          { fontSize: 11, fontFamily: Typography.fontFamily.regular, marginLeft: 'auto', paddingTop: 2 },
  // Q&A accordion
  qaRow:            { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14 },
  qaNum:            { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, flexShrink: 0 },
  qaNumText:        { fontSize: 9, fontFamily: Typography.fontFamily.extraBold },
  qaText:           { flex: 1, fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.medium },
  qaSubtopicChip:   { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, flexShrink: 0 },
  qaSubtopicText:   { fontSize: 9, fontFamily: Typography.fontFamily.bold, color: '#FBBF24', maxWidth: 80 },
  qaDetail:         { padding: 14, paddingTop: 12, borderTopWidth: 1 },
  qaFullText:       { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.semiBold, lineHeight: 20 },
  qaOption:         { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 8, borderWidth: 1 },
  qaOptionText:     { flex: 1, fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.regular, lineHeight: 17 },
  myAnswerTag:      { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, flexShrink: 0 },
  myAnswerText:     { fontSize: 9, fontFamily: Typography.fontFamily.bold },
  bloomChip:        { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  bloomChipText:    { fontSize: 10, fontFamily: Typography.fontFamily.bold },
});
