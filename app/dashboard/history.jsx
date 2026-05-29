import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Platform, useWindowDimensions, Share,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { useToast } from '../../context/ToastContext';
import { examService } from '../../services/examService';

// ── Constants ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 8;

const SUBJECT_ICONS = {
  Mathematics: '📐', Physics: '⚗️', Chemistry: '🧪', Biology: '🧬',
  History: '📚', English: '📖', CS: '💻', Economics: '📈',
  Geography: '🌍', Hindi: '📝', Accountancy: '💰', Science: '🔬',
};
const DEFAULT_ICON = '📋';

const SUBJECT_COLORS = {
  Mathematics: '#818CF8', Physics: '#60A5FA', Chemistry: '#22D3EE',
  Biology: '#A78BFA', History: '#FBBF24', English: '#34D399',
  CS: '#818CF8', Economics: '#FB923C', Geography: '#4ADE80',
  Hindi: '#F472B6', Accountancy: '#94A3B8',
};
const DEFAULT_COLOR = '#818CF8';

const STATUS_OPTIONS = [
  { label: 'All Statuses', value: '' },
  { label: 'Active',       value: 'active' },
  { label: 'Scheduled',    value: 'scheduled' },
  { label: 'Draft',        value: 'draft' },
  { label: 'Completed',    value: 'completed' },
  { label: 'Archived',     value: 'archived' },
];

const SORT_OPTIONS = [
  { label: 'Newest First',  value: 'date-desc' },
  { label: 'Oldest First',  value: 'date-asc' },
  { label: 'Title A → Z',   value: 'title-asc' },
  { label: 'Title Z → A',   value: 'title-desc' },
  { label: 'By Status',     value: 'status' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function sortExams(list, sort) {
  return [...list].sort((a, b) => {
    switch (sort) {
      case 'date-desc':  return new Date(b.createdAt) - new Date(a.createdAt);
      case 'date-asc':   return new Date(a.createdAt) - new Date(b.createdAt);
      case 'title-asc':  return a.title.localeCompare(b.title);
      case 'title-desc': return b.title.localeCompare(a.title);
      case 'status':     return a.status.localeCompare(b.status);
      default:           return 0;
    }
  });
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function HistoryScreen() {
  const { isDark } = useTheme();
  const C = isDark ? Colors.dark : Colors.light;
  const { width } = useWindowDimensions();
  const isWide = Platform.OS === 'web' && width >= 900;
  const router = useRouter();
  const { showToast } = useToast();

  const [exams, setExams]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sort, setSort]             = useState('date-desc');
  const [page, setPage]             = useState(1);
  const [shareExam, setShareExam]   = useState(null);
  const [deleteExam, setDeleteExam] = useState(null);
  const [deleting, setDeleting]     = useState(false);

  // ── Load exams ──────────────────────────────────────────────────────────────
  const loadExams = useCallback(async () => {
    setLoading(true);
    try {
      const res = await examService.getMyExams();
      setExams(res.data?.exams ?? []);
    } catch (_) {
      setExams([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadExams(); }, [loadExams]);

  // ── Filtered + sorted + paginated ───────────────────────────────────────────
  const filtered = useMemo(() => {
    let data = exams;
    if (statusFilter) data = data.filter(e => e.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(e => e.title.toLowerCase().includes(q) || (e.subject || '').toLowerCase().includes(q));
    }
    return sortExams(data, sort);
  }, [exams, statusFilter, search, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const pageItems  = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Reset to page 1 when filters change
  useEffect(() => setPage(1), [search, statusFilter, sort]);

  // ── Stats ───────────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:     exams.length,
    active:    exams.filter(e => e.status === 'active').length,
    draft:     exams.filter(e => e.status === 'draft').length,
    completed: exams.filter(e => e.status === 'completed').length,
  }), [exams]);

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteExam) return;
    setDeleting(true);
    // Optimistic remove
    setExams(prev => prev.filter(e => e.id !== deleteExam.id));
    setDeleteExam(null);
    try {
      await examService.deleteExam(deleteExam.id);
      showToast('Exam deleted', 'success');
    } catch (err) {
      showToast(err.message || 'Delete failed', 'error');
      loadExams(); // rollback
    } finally {
      setDeleting(false);
    }
  };

  // ── Copy code ───────────────────────────────────────────────────────────────
  const copyCode = async (code) => {
    if (Platform.OS === 'web' && navigator?.clipboard) {
      await navigator.clipboard.writeText(code).catch(() => {});
    } else {
      try { await Share.share({ message: `Exam code: ${code}` }); } catch (_) {}
    }
    showToast(`Code ${code} copied!`, 'success');
  };

  // ── Clear filters ────────────────────────────────────────────────────────────
  const clearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setSort('date-desc');
  };
  const hasFilters = search.trim() || statusFilter || sort !== 'date-desc';

  // ── Exam row / card component ────────────────────────────────────────────────
  const ExamItem = ({ item }) => {
    const icon  = SUBJECT_ICONS[item.subject] || DEFAULT_ICON;
    const color = SUBJECT_COLORS[item.subject] || DEFAULT_COLOR;
    const canEdit    = ['scheduled', 'draft', 'active'].includes(item.status);
    const canResults = ['active', 'completed'].includes(item.status);

    if (isWide) {
      // ── Wide: table row ──
      return (
        <View style={[S.tableRow, { borderBottomColor: C.border }]}>
          {/* Title + subject */}
          <View style={[S.titleCell, { flex: 2.5 }]}>
            <View style={[S.examIcon, { backgroundColor: color + '20' }]}>
              <Text style={{ fontSize: 16 }}>{icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[S.examTitle, { color: C.foreground }]} numberOfLines={1}>{item.title}</Text>
              <Text style={[S.examSubject, { color: C.textSubtle }]}>{item.subject}</Text>
            </View>
          </View>
          {/* Status */}
          <View style={{ width: 100 }}>
            <Badge label={item.status} variant={item.status} />
          </View>
          {/* Access code */}
          <TouchableOpacity onPress={() => copyCode(item.accessCode)} style={[S.codeChip, { backgroundColor: 'rgba(99,102,241,0.10)' }]} activeOpacity={0.7}>
            <Text style={S.codeText}>{item.accessCode}</Text>
          </TouchableOpacity>
          {/* Date */}
          <Text style={[S.cellText, { color: C.textSubtle, width: 110 }]}>{formatDate(item.createdAt)}</Text>
          {/* Questions */}
          <Text style={[S.cellNum, { color: '#818CF8', width: 60, textAlign: 'center' }]}>{item.questionCount}</Text>
          {/* Actions */}
          <View style={S.actionGroup}>
            {canEdit && (
              <TouchableOpacity onPress={() => router.push('/dashboard/create-exam')} style={[S.actionBtn, { borderColor: 'rgba(99,102,241,0.3)', backgroundColor: 'rgba(99,102,241,0.07)' }]} activeOpacity={0.7}>
                <Feather name="edit-2" size={11} color="#818CF8" />
                <Text style={[S.actionBtnText, { color: '#818CF8' }]}>Edit</Text>
              </TouchableOpacity>
            )}
            {canResults && (
              <TouchableOpacity onPress={() => router.push({ pathname: '/dashboard/results', params: { examId: item.id } })} style={[S.actionBtn, { borderColor: 'rgba(16,185,129,0.3)', backgroundColor: 'rgba(16,185,129,0.07)' }]} activeOpacity={0.7}>
                <Feather name="bar-chart-2" size={11} color="#10B981" />
                <Text style={[S.actionBtnText, { color: '#10B981' }]}>Results</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => setShareExam(item)} style={[S.actionBtn, { borderColor: 'rgba(6,182,212,0.3)', backgroundColor: 'rgba(6,182,212,0.07)' }]} activeOpacity={0.7}>
              <Feather name="share-2" size={11} color="#06B6D4" />
              <Text style={[S.actionBtnText, { color: '#06B6D4' }]}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setDeleteExam(item)} style={[S.actionBtn, { borderColor: 'rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.06)' }]} activeOpacity={0.7}>
              <Feather name="trash-2" size={11} color="#EF4444" />
              <Text style={[S.actionBtnText, { color: '#EF4444' }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    // ── Narrow: card ──
    return (
      <View style={[S.card, { backgroundColor: C.card, borderColor: C.border }]}>
        <View style={S.cardTop}>
          <View style={[S.examIcon, { backgroundColor: color + '20' }]}>
            <Text style={{ fontSize: 18 }}>{icon}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[S.examTitle, { color: C.foreground }]} numberOfLines={2}>{item.title}</Text>
            <Text style={[S.examSubject, { color: C.textSubtle }]}>{item.subject}</Text>
          </View>
          <Badge label={item.status} variant={item.status} />
        </View>
        <View style={S.cardMeta}>
          <TouchableOpacity onPress={() => copyCode(item.accessCode)} style={[S.codeChip, { backgroundColor: 'rgba(99,102,241,0.10)' }]} activeOpacity={0.7}>
            <Text style={S.codeText}>{item.accessCode}</Text>
          </TouchableOpacity>
          <Text style={[S.cellText, { color: C.textSubtle }]}>{formatDate(item.createdAt)}</Text>
          <View style={[S.qBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
            <Feather name="file-text" size={11} color="#818CF8" />
            <Text style={S.qBadgeText}>{item.questionCount}Q</Text>
          </View>
        </View>
        <View style={[S.cardActions, { borderTopColor: C.border }]}>
          {canEdit && (
            <TouchableOpacity onPress={() => router.push('/dashboard/create-exam')} style={[S.actionBtn, { borderColor: 'rgba(99,102,241,0.3)', backgroundColor: 'rgba(99,102,241,0.07)' }]} activeOpacity={0.7}>
              <Feather name="edit-2" size={11} color="#818CF8" />
              <Text style={[S.actionBtnText, { color: '#818CF8' }]}>Edit</Text>
            </TouchableOpacity>
          )}
          {canResults && (
            <TouchableOpacity onPress={() => router.push({ pathname: '/dashboard/results', params: { examId: item.id } })} style={[S.actionBtn, { borderColor: 'rgba(16,185,129,0.3)', backgroundColor: 'rgba(16,185,129,0.07)' }]} activeOpacity={0.7}>
              <Feather name="bar-chart-2" size={11} color="#10B981" />
              <Text style={[S.actionBtnText, { color: '#10B981' }]}>Results</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => setShareExam(item)} style={[S.actionBtn, { borderColor: 'rgba(6,182,212,0.3)', backgroundColor: 'rgba(6,182,212,0.07)' }]} activeOpacity={0.7}>
            <Feather name="share-2" size={11} color="#06B6D4" />
            <Text style={[S.actionBtnText, { color: '#06B6D4' }]}>Share</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setDeleteExam(item)} style={[S.actionBtn, { borderColor: 'rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.06)' }]} activeOpacity={0.7}>
            <Feather name="trash-2" size={11} color="#EF4444" />
            <Text style={[S.actionBtnText, { color: '#EF4444' }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ── Pagination ───────────────────────────────────────────────────────────────
  const Pagination = () => {
    const start = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
    const end   = Math.min(safePage * PAGE_SIZE, filtered.length);
    const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
    // Show max 5 page buttons
    const visiblePages = pages.length <= 5 ? pages : pages.slice(Math.max(0, safePage - 3), Math.min(pages.length, safePage + 2));

    return (
      <View style={[S.pagination, { borderTopColor: C.border }]}>
        <Text style={[S.paginationInfo, { color: C.textSubtle }]}>
          Showing <Text style={{ fontFamily: Typography.fontFamily.bold, color: C.foreground }}>{start}–{end}</Text> of{' '}
          <Text style={{ fontFamily: Typography.fontFamily.bold, color: C.foreground }}>{filtered.length}</Text> exams
        </Text>
        <View style={S.paginationBtns}>
          <TouchableOpacity
            onPress={() => setPage(p => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            style={[S.pageBtn, { borderColor: C.border, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', opacity: safePage <= 1 ? 0.35 : 1 }]}
            activeOpacity={0.7}
          >
            <Feather name="chevron-left" size={13} color={C.textMuted} />
          </TouchableOpacity>
          {visiblePages.map(p => (
            <TouchableOpacity
              key={p}
              onPress={() => setPage(p)}
              style={[S.pageBtn, { borderColor: p === safePage ? '#4F46E5' : C.border, backgroundColor: p === safePage ? '#4F46E5' : isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]}
              activeOpacity={0.7}
            >
              <Text style={[S.pageBtnText, { color: p === safePage ? '#fff' : C.textMuted }]}>{p}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            onPress={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
            style={[S.pageBtn, { borderColor: C.border, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', opacity: safePage >= totalPages ? 0.35 : 1 }]}
            activeOpacity={0.7}
          >
            <Feather name="chevron-right" size={13} color={C.textMuted} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.background }}
      contentContainerStyle={[S.content, { padding: isWide ? 32 : 16 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Page header */}
      <View style={[S.pageHeader, { borderBottomColor: C.border }]}>
        <View>
          <Text style={[S.pageTitle, { color: C.foreground }]}>Exam History</Text>
          <Text style={[S.pageSub, { color: C.textSubtle }]}>All exams you have created — filter, sort, and manage from one place.</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/dashboard/create-exam')} style={S.newBtn} activeOpacity={0.85}>
          <LinearGradient colors={['#4F46E5', '#7C3AED']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={S.newBtnGrad}>
            <Feather name="plus-circle" size={15} color="#fff" />
            <Text style={S.newBtnText}>Create New Exam</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Stats row */}
      <View style={[S.statsRow, { flexDirection: isWide ? 'row' : 'row', flexWrap: 'wrap' }]}>
        {[
          { icon: 'clipboard', label: 'Total Exams',  value: stats.total,     color: '#818CF8', bg: 'rgba(99,102,241,0.12)' },
          { icon: 'clock',     label: 'Active Now',   value: stats.active,    color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
          { icon: 'edit',      label: 'Drafts',       value: stats.draft,     color: '#60A5FA', bg: 'rgba(59,130,246,0.12)' },
          { icon: 'check',     label: 'Completed',    value: stats.completed, color: '#94A3B8', bg: 'rgba(100,116,139,0.12)' },
        ].map((s, i) => (
          <View key={i} style={[S.statChip, { backgroundColor: C.card, borderColor: C.border, flex: 1, minWidth: 100 }]}>
            <View style={[S.statChipIcon, { backgroundColor: s.bg }]}>
              <Feather name={s.icon} size={16} color={s.color} />
            </View>
            <View>
              <Text style={[S.statChipVal, { color: s.color }]}>{s.value}</Text>
              <Text style={[S.statChipLbl, { color: C.textSubtle }]}>{s.label}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Toolbar */}
      <View style={[S.toolbar, { flexDirection: isWide ? 'row' : 'column' }]}>
        {/* Search */}
        <View style={[S.searchWrap, { backgroundColor: C.surface2, borderColor: C.border }]}>
          <Feather name="search" size={14} color={C.textSubtle} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by exam title…"
            placeholderTextColor={C.textSubtle}
            style={[S.searchInput, { color: C.foreground, outlineStyle: 'none' }]}
            autoComplete="off"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x" size={13} color={C.textSubtle} />
            </TouchableOpacity>
          )}
        </View>
        {/* Filters row */}
        <View style={[S.toolbarRight, { flexDirection: 'row', gap: 8, flexWrap: 'wrap' }]}>
          <View style={{ minWidth: 150 }}>
            <Select value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} />
          </View>
          <View style={{ minWidth: 160 }}>
            <Select value={sort} onChange={setSort} options={SORT_OPTIONS} />
          </View>
          {hasFilters && (
            <TouchableOpacity onPress={clearFilters} style={[S.clearBtn, { borderColor: C.border, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }]} activeOpacity={0.7}>
              <Feather name="x" size={13} color={C.textMuted} />
              <Text style={[S.clearBtnText, { color: C.textMuted }]}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Table / List */}
      <View style={[S.tableWrap, { backgroundColor: C.card, borderColor: C.border }]}>
        {/* Wide: table header */}
        {isWide && (
          <View style={[S.tableHead, { backgroundColor: isDark ? Colors.dark.surface : Colors.light.surface, borderBottomColor: C.border }]}>
            {[
              { label: 'Exam Title',  flex: 2.5 },
              { label: 'Status',      w: 100 },
              { label: 'Access Code', w: 110 },
              { label: 'Created On',  w: 110 },
              { label: 'Questions',   w: 60 },
              { label: 'Actions',     flex: 1 },
            ].map((h, i) => (
              <Text
                key={i}
                style={[S.tableHeadCell, { color: C.textSubtle, flex: h.flex, width: h.w, textAlign: h.label === 'Questions' ? 'center' : 'left' }]}
              >
                {h.label}
              </Text>
            ))}
          </View>
        )}

        {/* Items */}
        {loading ? (
          <View style={{ gap: 10, padding: 16 }}>
            {[1, 2, 3, 4].map(i => <SkeletonCard key={i} height={isWide ? 56 : 110} />)}
          </View>
        ) : pageItems.length === 0 ? (
          <EmptyState
            icon="clock"
            title={hasFilters ? 'No exams match your filters' : 'No exams yet'}
            subtitle={hasFilters ? 'Try adjusting your search or filters.' : 'Create your first exam to get started.'}
            action={!hasFilters ? { label: 'Create Exam', onPress: () => router.push('/dashboard/create-exam') } : { label: 'Clear Filters', onPress: clearFilters }}
          />
        ) : (
          <View style={isWide ? undefined : { gap: 12, padding: 12 }}>
            {pageItems.map(item => <ExamItem key={item.id} item={item} />)}
          </View>
        )}

        {/* Pagination */}
        {!loading && filtered.length > 0 && <Pagination />}
      </View>

      {/* ── Share Modal ── */}
      <Modal visible={!!shareExam} onClose={() => setShareExam(null)} title="Share Exam" maxWidth={420}>
        {shareExam && (
          <View style={{ gap: 16 }}>
            <Text style={[S.shareTitle, { color: C.foreground }]}>{shareExam.title}</Text>
            <View>
              <Text style={[S.shareLabel, { color: C.textSubtle }]}>ACCESS CODE</Text>
              <View style={[S.codeDisplay, { backgroundColor: 'rgba(99,102,241,0.08)', borderColor: 'rgba(99,102,241,0.2)' }]}>
                <Text style={S.codeDisplayText}>{shareExam.accessCode}</Text>
                <TouchableOpacity onPress={() => copyCode(shareExam.accessCode)} style={{ padding: 6 }}>
                  <Feather name="copy" size={16} color="#6366F1" />
                </TouchableOpacity>
              </View>
            </View>
            <View>
              <Text style={[S.shareLabel, { color: C.textSubtle }]}>SHARE LINK</Text>
              <View style={[S.linkRow, { backgroundColor: C.surface2, borderColor: C.border }]}>
                <Feather name="link" size={13} color={C.textSubtle} />
                <Text style={[S.linkText, { color: '#818CF8' }]} numberOfLines={1}>
                  examflow.ai/e/{shareExam.accessCode}
                </Text>
                <TouchableOpacity onPress={async () => {
                  const url = `examflow.ai/e/${shareExam.accessCode}`;
                  if (Platform.OS === 'web' && navigator?.clipboard) await navigator.clipboard.writeText(url).catch(() => {});
                  showToast('Link copied!', 'success');
                }}>
                  <Feather name="copy" size={13} color={C.textMuted} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
        <Modal.Footer>
          <Button title="Close" variant="secondary" fullWidth={false} onPress={() => setShareExam(null)} style={{ paddingHorizontal: 20 }} />
          <Button title="Copy Code" variant="primary" fullWidth={false} onPress={() => { copyCode(shareExam?.accessCode); setShareExam(null); }} style={{ paddingHorizontal: 20 }} />
        </Modal.Footer>
      </Modal>

      {/* ── Delete Modal ── */}
      <Modal visible={!!deleteExam} onClose={() => setDeleteExam(null)} title="Delete Exam" maxWidth={400}>
        {deleteExam && (
          <View style={{ gap: 14 }}>
            <View style={S.deleteRow}>
              <View style={[S.deleteIcon, { backgroundColor: 'rgba(239,68,68,0.12)' }]}>
                <Feather name="trash-2" size={20} color="#EF4444" />
              </View>
              <Text style={[S.deleteText, { color: C.textSubtle, flex: 1 }]}>
                You are about to permanently delete{' '}
                <Text style={{ color: C.foreground, fontFamily: Typography.fontFamily.bold }}>{deleteExam.title}</Text>.
                All student responses will be removed.
              </Text>
            </View>
          </View>
        )}
        <Modal.Footer>
          <Button title="Cancel" variant="secondary" fullWidth={false} onPress={() => setDeleteExam(null)} style={{ paddingHorizontal: 20 }} />
          <Button title="Delete" variant="danger" fullWidth={false} loading={deleting} onPress={handleDelete} style={{ paddingHorizontal: 20 }} />
        </Modal.Footer>
      </Modal>
    </ScrollView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  content:        { flexGrow: 1, paddingBottom: 40, gap: 20 },
  pageHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, paddingBottom: 20, borderBottomWidth: 1 },
  pageTitle:      { fontSize: Typography.size['2xl'], fontFamily: Typography.fontFamily.extraBold },
  pageSub:        { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.regular, marginTop: 3, maxWidth: 440 },
  newBtn:         { borderRadius: 10, overflow: 'hidden' },
  newBtnGrad:     { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 16, paddingVertical: 11 },
  newBtnText:     { color: '#fff', fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.semiBold },
  // Stats
  statsRow:       { gap: 10 },
  statChip:       { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, borderWidth: 1, padding: 14 },
  statChipIcon:   { width: 36, height: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  statChipVal:    { fontSize: Typography.size.xl, fontFamily: Typography.fontFamily.extraBold, lineHeight: 24 },
  statChipLbl:    { fontSize: 11, fontFamily: Typography.fontFamily.regular, marginTop: 1 },
  // Toolbar
  toolbar:        { gap: 10 },
  searchWrap:     { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, height: 40 },
  searchInput:    { flex: 1, fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.regular },
  toolbarRight:   { flexShrink: 0 },
  clearBtn:       { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, height: 40 },
  clearBtnText:   { fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.semiBold },
  // Table wrap
  tableWrap:      { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  tableHead:      { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, gap: 8 },
  tableHeadCell:  { fontSize: 10, fontFamily: Typography.fontFamily.bold, textTransform: 'uppercase', letterSpacing: 0.5 },
  // Wide table row
  tableRow:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, gap: 8 },
  titleCell:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  examIcon:       { width: 36, height: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  examTitle:      { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.semiBold, lineHeight: 18 },
  examSubject:    { fontSize: 11, fontFamily: Typography.fontFamily.regular, marginTop: 1 },
  codeChip:       { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, width: 110 },
  codeText:       { color: '#818CF8', fontSize: 11, fontFamily: Typography.fontFamily.bold, letterSpacing: 1 },
  cellText:       { fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.regular },
  cellNum:        { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.bold },
  actionGroup:    { flexDirection: 'row', flexWrap: 'wrap', gap: 4, flex: 1 },
  actionBtn:      { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6, borderWidth: 1 },
  actionBtnText:  { fontSize: 11, fontFamily: Typography.fontFamily.semiBold },
  // Mobile card
  card:           { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  cardTop:        { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  cardMeta:       { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  cardActions:    { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  qBadge:         { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  qBadgeText:     { fontSize: 10, fontFamily: Typography.fontFamily.bold, color: '#818CF8' },
  // Pagination
  pagination:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: 1, flexWrap: 'wrap', gap: 10 },
  paginationInfo: { fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.regular },
  paginationBtns: { flexDirection: 'row', gap: 4 },
  pageBtn:        { minWidth: 32, height: 32, paddingHorizontal: 8, borderRadius: 7, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  pageBtnText:    { fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.bold },
  // Share modal
  shareTitle:     { fontSize: Typography.size.base, fontFamily: Typography.fontFamily.bold },
  shareLabel:     { fontSize: 10, fontFamily: Typography.fontFamily.bold, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  codeDisplay:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 14 },
  codeDisplayText:{ fontSize: Typography.size.xl, fontFamily: Typography.fontFamily.extraBold, color: '#818CF8', letterSpacing: 5 },
  linkRow:        { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
  linkText:       { flex: 1, fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.medium },
  // Delete modal
  deleteRow:      { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  deleteIcon:     { width: 42, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  deleteText:     { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.regular, lineHeight: 21 },
});
