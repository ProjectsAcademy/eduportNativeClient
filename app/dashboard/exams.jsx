import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  ScrollView, StyleSheet, Platform, useWindowDimensions, Share,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import { Badge } from '../../components/ui/Badge';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { ViewToggle } from '../../components/ui/ViewToggle';
import { DropdownMenu } from '../../components/ui/DropdownMenu';
import { useToast } from '../../context/ToastContext';
import { examService } from '../../services/examService';
import { SkeletonCard } from '../../components/ui/Skeleton';

const SUBJECT_COLORS = {
  'Mathematics': { bg: 'rgba(99,102,241,0.18)',  text: '#818CF8' },
  'Physics':     { bg: 'rgba(59,130,246,0.18)',  text: '#60A5FA' },
  'History':     { bg: 'rgba(245,158,11,0.18)',  text: '#FBBF24' },
  'English':     { bg: 'rgba(16,185,129,0.18)',  text: '#34D399' },
  'Chemistry':   { bg: 'rgba(6,182,212,0.18)',   text: '#22D3EE' },
  'Biology':     { bg: 'rgba(139,92,246,0.18)',  text: '#A78BFA' },
};
const FALLBACK_SUBJECT = { bg: 'rgba(99,102,241,0.18)', text: '#818CF8' };

const FILTER_TABS = ['all', 'active', 'scheduled', 'draft', 'completed'];
const SORT_OPTIONS = [
  { label: 'Date (newest)', value: 'date',   icon: 'calendar' },
  { label: 'Name (A–Z)',    value: 'name',   icon: 'type' },
  { label: 'Status',        value: 'status', icon: 'activity' },
  { label: 'Attempts',      value: 'attempts',icon: 'users' },
];

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ExamsScreen() {
  const { isDark } = useTheme();
  const C = isDark ? Colors.dark : Colors.light;
  const { width } = useWindowDimensions();
  const isWide = Platform.OS === 'web' && width >= 768;
  const { showToast } = useToast();
  const router = useRouter();

  const [filter, setFilter]         = useState('all');
  const [search, setSearch]         = useState('');
  const [sort, setSort]             = useState('date');
  const [view, setView]             = useState('grid');
  const [shareExam, setShareExam]   = useState(null);
  const [deleteExam, setDeleteExam] = useState(null);
  const [exams, setExams]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // ── Fetch exams from API on mount ──────────────────────────────────────────
  const loadExams = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await examService.getMyExams();
      // Normalise API shape to match what the UI expects
      const normalised = (res.data?.exams ?? []).map(e => ({
        id: e.id,
        title: e.title,
        subject: e.subject || e.topic || '—',
        date: e.scheduledAt ?? e.createdAt,
        attempts: 0,       // sessions not aggregated in list endpoint yet
        status: e.status,
        duration: e.settings?.duration ?? 60,
        questions: e.questionCount,
        score: null,       // avg score comes from analytics endpoint
        code: e.accessCode,
      }));
      setExams(normalised);
    } catch (err) {
      setFetchError(err.message || 'Failed to load exams');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadExams(); }, [loadExams]);

  // ── Derived list ────────────────────────────────────────────────────────────
  const displayed = useMemo(() => {
    let data = exams;
    if (filter !== 'all') data = data.filter(e => e.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(e =>
        e.title.toLowerCase().includes(q) || e.subject.toLowerCase().includes(q)
      );
    }
    return [...data].sort((a, b) => {
      if (sort === 'name')     return a.title.localeCompare(b.title);
      if (sort === 'status')   return a.status.localeCompare(b.status);
      if (sort === 'attempts') return b.attempts - a.attempts;
      return new Date(b.date) - new Date(a.date); // default: date
    });
  }, [exams, filter, search, sort]);

  // ── Copy / share ─────────────────────────────────────────────────────────────
  const handleCopy = async (text) => {
    if (Platform.OS === 'web' && navigator?.clipboard) {
      await navigator.clipboard.writeText(text).catch(() => {});
    } else {
      try { await Share.share({ message: `Exam code: ${text}` }); } catch (_) {}
    }
    showToast(`Code ${text} copied!`, 'success');
  };

  // ── Delete ────────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    const target = deleteExam;
    setDeleteExam(null);
    // Optimistic remove
    setExams(prev => prev.filter(e => e.id !== target.id));
    try {
      await examService.deleteExam(target.id);
      showToast('Exam deleted', 'success');
    } catch (err) {
      // Rollback on failure
      showToast(err.message || 'Failed to delete exam', 'error');
      loadExams();
    }
  };

  // ── Exam Card (grid) ──────────────────────────────────────────────────────────
  const ExamCard = ({ item }) => {
    const sc = SUBJECT_COLORS[item.subject] || FALLBACK_SUBJECT;
    return (
      <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }, isWide && view === 'grid' && styles.cardGrid]}>
        {/* Header row */}
        <View style={styles.cardTop}>
          <View style={[styles.subjectBadge, { backgroundColor: sc.bg }]}>
            <Text style={[styles.subjectText, { color: sc.text }]}>{item.subject}</Text>
          </View>
          <DropdownMenu
            trigger={<Feather name="more-vertical" size={16} color={C.textMuted} />}
            items={[
              { label: 'Edit',    icon: 'edit-2',      onPress: () => router.push({ pathname: '/dashboard/create-exam', params: { examId: item.id } }) },
              { label: 'Share',   icon: 'share-2',     onPress: () => setShareExam(item) },
              { label: 'Results', icon: 'bar-chart-2', onPress: () => router.push({ pathname: '/dashboard/results', params: { examId: item.id } }) },
              { divider: true },
              { label: 'Delete',  icon: 'trash-2',     onPress: () => setDeleteExam(item), danger: true },
            ]}
          />
        </View>

        {/* Title */}
        <Text style={[styles.cardTitle, { color: C.foreground }]} numberOfLines={2}>{item.title}</Text>

        {/* Meta row */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Feather name="calendar" size={11} color={C.textSubtle} />
            <Text style={[styles.metaText, { color: C.textSubtle }]}>{formatDate(item.date)}</Text>
          </View>
          <View style={styles.metaItem}>
            <Feather name="clock" size={11} color={C.textSubtle} />
            <Text style={[styles.metaText, { color: C.textSubtle }]}>{item.duration} min</Text>
          </View>
          <View style={styles.metaItem}>
            <Feather name="file-text" size={11} color={C.textSubtle} />
            <Text style={[styles.metaText, { color: C.textSubtle }]}>{item.questions}Q</Text>
          </View>
        </View>

        {/* Attempts + score */}
        <View style={{ gap: 6, marginTop: 8 }}>
          <View style={styles.metaItem}>
            <Feather name="users" size={11} color={C.textSubtle} />
            <Text style={[styles.metaText, { color: C.textSubtle }]}>{item.attempts} attempts</Text>
          </View>
          {item.score != null && (
            <View style={{ gap: 4 }}>
              <View style={styles.scoreRow}>
                <Text style={[styles.scoreLabel, { color: C.textSubtle }]}>Avg score</Text>
                <Text style={[styles.scoreVal, { color: item.score >= 60 ? '#10B981' : '#EF4444' }]}>{item.score}%</Text>
              </View>
              <ProgressBar value={item.score} color={item.score >= 60 ? '#10B981' : '#EF4444'} height={5} />
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={[styles.cardFooter, { borderTopColor: C.border }]}>
          <View style={[styles.codeChip, { backgroundColor: isDark ? 'rgba(99,102,241,0.10)' : 'rgba(99,102,241,0.08)' }]}>
            <Text style={styles.codeText}>{item.code}</Text>
          </View>
          <Badge label={item.status} variant={item.status} />
        </View>
      </View>
    );
  };

  // ── Exam Row (list) ────────────────────────────────────────────────────────────
  const ExamRow = ({ item }) => {
    const sc = SUBJECT_COLORS[item.subject] || FALLBACK_SUBJECT;
    return (
      <View style={[styles.row, { backgroundColor: C.card, borderColor: C.border }]}>
        <View style={[styles.rowSubjectDot, { backgroundColor: sc.bg, borderColor: sc.text + '44' }]}>
          <Text style={[styles.rowSubjectInitial, { color: sc.text }]}>{item.subject.charAt(0)}</Text>
        </View>
        <View style={{ flex: 2.5 }}>
          <Text style={[styles.rowTitle, { color: C.foreground }]} numberOfLines={1}>{item.title}</Text>
          <Text style={[styles.rowSub, { color: C.textSubtle }]}>{item.subject} · {item.questions}Q · {item.duration} min</Text>
        </View>
        <View style={[styles.rowCodeWrap, { backgroundColor: isDark ? 'rgba(99,102,241,0.10)' : 'rgba(99,102,241,0.08)' }]}>
          <Text style={styles.codeText}>{item.code}</Text>
        </View>
        <Badge label={item.status} variant={item.status} style={{ flex: 0, marginHorizontal: 8 }} />
        <View style={{ flex: 1, alignItems: 'flex-end', gap: 4 }}>
          {item.score != null ? (
            <Text style={[styles.rowScore, { color: item.score >= 60 ? '#10B981' : '#EF4444' }]}>{item.score}%</Text>
          ) : (
            <Text style={[styles.rowScore, { color: C.textSubtle }]}>—</Text>
          )}
          <Text style={[styles.rowSub, { color: C.textSubtle }]}>{item.attempts} attempts</Text>
        </View>
        <DropdownMenu
          trigger={<Feather name="more-vertical" size={16} color={C.textMuted} />}
          items={[
            { label: 'Edit',    icon: 'edit-2',      onPress: () => showToast('Edit coming in Phase 4', 'info') },
            { label: 'Share',   icon: 'share-2',     onPress: () => setShareExam(item) },
            { label: 'Results', icon: 'bar-chart-2', onPress: () => router.push({ pathname: '/dashboard/results', params: { examId: item.id } }) },
            { divider: true },
            { label: 'Delete',  icon: 'trash-2',     onPress: () => setDeleteExam(item), danger: true },
          ]}
        />
      </View>
    );
  };

  // ── List header ────────────────────────────────────────────────────────────────
  const ListHeader = () => (
    <View style={styles.listHeader}>
      {/* Page title */}
      <View style={[styles.pageHeader, { borderBottomColor: C.border }]}>
        <View>
          <Text style={[styles.pageTitle, { color: C.foreground }]}>My Exams</Text>
          <Text style={[styles.pageSub, { color: C.textSubtle }]}>{exams.length} total exams</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/dashboard/create-exam')}
          style={styles.newBtn}
        >
          <LinearGradient colors={['#4F46E5', '#7C3AED']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.newBtnGrad}>
            <Feather name="plus" size={15} color="#fff" />
            <Text style={styles.newBtnText}>New Exam</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
        {FILTER_TABS.map(f => {
          const active = filter === f;
          return (
            <TouchableOpacity
              key={f}
              onPress={() => setFilter(f)}
              style={[styles.chip, { backgroundColor: active ? '#4F46E5' : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', borderColor: active ? '#4F46E5' : C.border }]}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, { color: active ? '#fff' : C.textMuted }]}>
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Controls row */}
      <View style={[styles.controls, { borderBottomColor: C.border }]}>
        {/* Search */}
        <View style={[styles.searchBox, { backgroundColor: C.surface2, borderColor: C.border }]}>
          <Feather name="search" size={14} color={C.textSubtle} style={{ marginRight: 8 }} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search exams…"
            placeholderTextColor={C.textSubtle}
            style={[styles.searchInput, { color: C.foreground }]}
            autoComplete="off"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Feather name="x" size={14} color={C.textSubtle} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.controlsRight}>
          {/* Sort */}
          <DropdownMenu
            trigger={
              <View style={[styles.sortBtn, { backgroundColor: C.surface2, borderColor: C.border }]}>
                <Feather name="sliders" size={14} color={C.textMuted} />
                {isWide && <Text style={[styles.sortBtnText, { color: C.textMuted }]}>
                  {SORT_OPTIONS.find(o => o.value === sort)?.label}
                </Text>}
                <Feather name="chevron-down" size={12} color={C.textSubtle} />
              </View>
            }
            items={SORT_OPTIONS.map(o => ({
              label: o.label,
              icon: o.icon,
              onPress: () => setSort(o.value),
              badge: sort === o.value ? '✓' : undefined,
            }))}
          />
          <ViewToggle view={view} onChange={setView} />
        </View>
      </View>

      {/* Results count */}
      {search.trim().length > 0 && (
        <Text style={[styles.resultCount, { color: C.textSubtle }]}>
          {displayed.length} result{displayed.length !== 1 ? 's' : ''} for "{search}"
        </Text>
      )}
    </View>
  );

  const numCols = view === 'grid' && isWide ? 2 : 1;
  const isGridCard = view === 'grid';

  return (
    <>
      <FlatList
        key={`${view}-${numCols}`}
        data={displayed}
        keyExtractor={item => item.id}
        numColumns={numCols}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          loading ? (
            <View style={{ gap: 12, padding: 4 }}>
              {[1, 2, 3].map(i => <SkeletonCard key={i} height={160} />)}
            </View>
          ) : fetchError ? (
            <EmptyState icon="wifi-off" title="Could not load exams" subtitle={fetchError} action={{ label: 'Retry', onPress: loadExams }} />
          ) : (
            <EmptyState
              icon="clipboard"
              title="No exams found"
              subtitle={filter !== 'all' ? `No ${filter} exams yet.` : 'Create your first exam to get started.'}
              action={filter === 'all' ? { label: 'Create Exam', onPress: () => router.push('/dashboard/create-exam') } : undefined}
            />
          )
        }
        contentContainerStyle={[styles.listContent, { padding: isWide ? 24 : 16 }]}
        columnWrapperStyle={numCols > 1 ? { gap: 16 } : undefined}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => isGridCard ? <ExamCard item={item} /> : <ExamRow item={item} />}
      />

      {/* Share Modal */}
      <Modal visible={!!shareExam} onClose={() => setShareExam(null)} title="Share Exam" maxWidth={420}>
        {shareExam && (
          <View style={{ gap: 16 }}>
            <Text style={[styles.shareTitle, { color: C.foreground }]}>{shareExam.title}</Text>
            {/* Code display */}
            <View>
              <Text style={[styles.shareLabel, { color: C.textSubtle }]}>ACCESS CODE</Text>
              <View style={[styles.codeDisplay, { backgroundColor: isDark ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.05)', borderColor: 'rgba(99,102,241,0.2)' }]}>
                <Text style={styles.codeDisplayText}>{shareExam.code}</Text>
                <TouchableOpacity onPress={() => handleCopy(shareExam.code)} style={styles.copyBtn}>
                  <Feather name="copy" size={16} color="#6366F1" />
                </TouchableOpacity>
              </View>
            </View>
            {/* Quick stats */}
            <View style={styles.shareStats}>
              {[
                { icon: 'file-text', label: `${shareExam.questions} questions` },
                { icon: 'clock',     label: `${shareExam.duration} min` },
                { icon: 'calendar',  label: formatDate(shareExam.date) },
              ].map((s, i) => (
                <View key={i} style={styles.shareStat}>
                  <Feather name={s.icon} size={13} color={C.textSubtle} />
                  <Text style={[styles.shareStatText, { color: C.textSubtle }]}>{s.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
        <Modal.Footer>
          <Button title="Close" variant="secondary" fullWidth={false} onPress={() => setShareExam(null)} style={{ paddingHorizontal: 20 }} />
          <Button title="Copy Code" variant="primary" fullWidth={false} onPress={() => { handleCopy(shareExam?.code); setShareExam(null); }} style={{ paddingHorizontal: 20 }} />
        </Modal.Footer>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal visible={!!deleteExam} onClose={() => setDeleteExam(null)} title="Delete Exam" maxWidth={400}>
        {deleteExam && (
          <View style={{ gap: 12 }}>
            <Text style={[styles.deleteText, { color: C.textSubtle }]}>
              Are you sure you want to delete{' '}
              <Text style={{ color: C.foreground, fontFamily: Typography.fontFamily.bold }}>{deleteExam.title}</Text>
              ? This cannot be undone.
            </Text>
            {deleteExam.attempts > 0 && (
              <View style={[styles.deleteWarning, { backgroundColor: 'rgba(239,68,68,0.06)', borderColor: 'rgba(239,68,68,0.2)' }]}>
                <Feather name="alert-triangle" size={14} color="#EF4444" />
                <Text style={[styles.deleteWarningText, { color: '#EF4444' }]}>
                  This exam has {deleteExam.attempts} student attempt{deleteExam.attempts !== 1 ? 's' : ''} that will also be deleted.
                </Text>
              </View>
            )}
          </View>
        )}
        <Modal.Footer>
          <Button title="Cancel" variant="secondary" fullWidth={false} onPress={() => setDeleteExam(null)} style={{ paddingHorizontal: 20 }} />
          <Button title="Delete" variant="danger" fullWidth={false} onPress={handleDelete} style={{ paddingHorizontal: 20 }} />
        </Modal.Footer>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  listContent: { flexGrow: 1, paddingBottom: 40 },
  listHeader: { marginBottom: 16 },

  // Page header
  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 20, marginBottom: 16, borderBottomWidth: 1 },
  pageTitle: { fontSize: Typography.size['2xl'], fontFamily: Typography.fontFamily.extraBold },
  pageSub: { fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.regular, marginTop: 2 },
  newBtn: { borderRadius: 10, overflow: 'hidden' },
  newBtnGrad: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10 },
  newBtnText: { color: '#fff', fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.semiBold },

  // Filter chips
  filterScroll: { marginBottom: 14 },
  filterRow: { gap: 8, paddingBottom: 2 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.semiBold },

  // Controls
  controls: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 16, borderBottomWidth: 1, marginBottom: 4 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, height: 38 },
  searchInput: { flex: 1, fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.regular, outlineStyle: 'none' },
  controlsRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 38, borderRadius: 10, borderWidth: 1 },
  sortBtnText: { fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.medium },
  resultCount: { fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.regular, marginTop: 8, marginBottom: 4 },

  // Exam Card (grid)
  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 0 },
  cardGrid: { flex: 1 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  subjectBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  subjectText: { fontSize: 10, fontFamily: Typography.fontFamily.bold, textTransform: 'uppercase', letterSpacing: 0.5 },
  cardTitle: { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.bold, lineHeight: 19, marginBottom: 10 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11, fontFamily: Typography.fontFamily.regular },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between' },
  scoreLabel: { fontSize: 10, fontFamily: Typography.fontFamily.medium },
  scoreVal: { fontSize: 10, fontFamily: Typography.fontFamily.bold },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTopWidth: 1 },
  codeChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  codeText: { color: '#818CF8', fontSize: 10, fontFamily: Typography.fontFamily.bold, letterSpacing: 1 },

  // Exam Row (list)
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 1, padding: 14 },
  rowSubjectDot: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, flexShrink: 0 },
  rowSubjectInitial: { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.bold },
  rowTitle: { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.semiBold },
  rowSub: { fontSize: 11, fontFamily: Typography.fontFamily.regular, marginTop: 2 },
  rowCodeWrap: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  rowScore: { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.bold, textAlign: 'right' },

  // Share modal
  shareTitle: { fontSize: Typography.size.base, fontFamily: Typography.fontFamily.bold },
  shareLabel: { fontSize: 10, fontFamily: Typography.fontFamily.bold, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  codeDisplay: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12 },
  codeDisplayText: { fontSize: Typography.size.xl, fontFamily: Typography.fontFamily.extraBold, color: '#818CF8', letterSpacing: 4 },
  copyBtn: { padding: 6 },
  shareStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  shareStat: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  shareStatText: { fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.medium },

  // Delete modal
  deleteText: { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.regular, lineHeight: 21 },
  deleteWarning: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  deleteWarningText: { flex: 1, fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.medium, lineHeight: 18 },
});
