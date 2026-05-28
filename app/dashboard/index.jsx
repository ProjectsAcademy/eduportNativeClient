import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  FlatList, Platform, useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';

const UPCOMING_EXAMS = [
  { title: 'Mathematics Final Exam', subject: 'Mathematics', status: 'scheduled', code: 'EXM-1042', date: '20 May 2026', duration: '90 min', questions: 50 },
  { title: 'Physics Midterm Test', subject: 'Physics', status: 'active', code: 'EXM-2187', date: '22 May 2026', duration: '60 min', questions: 40 },
  { title: 'English Literature Essay', subject: 'English', status: 'scheduled', code: 'EXM-3391', date: '25 May 2026', duration: '120 min', questions: 20 },
];

const STATS = [
  { value: '24', label: 'Total Exams', icon: 'clipboard', color: '#6366F1', bg: 'rgba(99,102,241,0.10)', badge: '+3 this month', badgeColor: '#10B981', badgeBg: 'rgba(16,185,129,0.10)' },
  { value: '7', label: 'Upcoming Exams', icon: 'calendar', color: '#F59E0B', bg: 'rgba(245,158,11,0.10)', badge: 'Next in 3 days', badgeColor: '#F59E0B', badgeBg: 'rgba(245,158,11,0.10)', pulse: true },
];

export default function DashboardIndex() {
  const { isDark } = useTheme();
  const { user, loading } = useAuth();
  const C = isDark ? Colors.dark : Colors.light;

  // AuthGate in _layout.jsx handles redirect if !user
  if (loading || !user) return null;

  const ExamRow = ({ item }) => (
    <View style={[styles.examRow, { borderBottomColor: C.border }]}>
      <View style={{ flex: 2 }}>
        <Text style={[styles.examTitle, { color: C.foreground }]} numberOfLines={1}>{item.title}</Text>
        <Text style={[styles.examSub, { color: C.textSubtle }]}>{item.subject} · {item.questions} questions</Text>
      </View>
      <View style={{ flex: 1, alignItems: 'flex-start' }}>
        <Badge label={item.status} variant={item.status === 'active' ? 'active' : 'scheduled'} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.codeChip}>
          <Text style={styles.codeText}>{item.code}</Text>
        </View>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.examDate, { color: C.foreground }]}>{item.date}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
          <Feather name="clock" size={11} color={C.textSubtle} />
          <Text style={[styles.examSub, { color: C.textSubtle }]}>{item.duration}</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
          <Feather name="edit-2" size={14} color={C.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
          <Feather name="bar-chart-2" size={14} color={C.textMuted} />
        </TouchableOpacity>
      </View>
    </View>
  );

  // Mobile card layout for exam items (replaces table on small screens)
  const ExamCard = ({ item }) => (
    <View style={[styles.examCard, { backgroundColor: C.card, borderColor: C.border }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text style={[styles.examTitle, { color: C.foreground }]} numberOfLines={2}>{item.title}</Text>
          <Text style={[styles.examSub, { color: C.textSubtle }]}>{item.subject} · {item.questions} questions</Text>
        </View>
        <Badge label={item.status} variant={item.status === 'active' ? 'active' : 'scheduled'} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={styles.codeChip}><Text style={styles.codeText}>{item.code}</Text></View>
        <Text style={[styles.examSub, { color: C.textSubtle }]}>{item.date} · {item.duration}</Text>
      </View>
    </View>
  );

  const { width } = useWindowDimensions();
  const isWide = Platform.OS === 'web' && width >= 768;

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
              You have <Text style={{ color: C.foreground, fontFamily: Typography.fontFamily.bold }}>3 exams</Text> scheduled this week.
            </Text>
          </View>
          <View style={[styles.welcomeActions, { marginTop: isWide ? 0 : 16 }]}>
            <TouchableOpacity style={styles.createBtn}>
              <LinearGradient colors={['#4F46E5', '#7C3AED']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.createBtnGrad}>
                <Feather name="plus" size={15} color="#fff" />
                <Text style={styles.createBtnText}>Create Exam</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.joinBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)', borderColor: C.borderMedium }]}>
              <Feather name="users" size={15} color={C.foreground} />
              <Text style={[styles.joinBtnText, { color: C.foreground }]}>Join Exam</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Stats */}
      <View style={[styles.statsRow, { flexDirection: isWide ? 'row' : 'column', gap: 16, marginBottom: 24 }]}>
        {STATS.map((s, i) => (
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
        ))}
      </View>

      {/* Upcoming Exams */}
      <View style={[styles.tableCard, { backgroundColor: C.card, borderColor: C.border }]}>
        <View style={[styles.tableHeader, { borderBottomColor: C.border }]}>
          <Text style={[styles.tableTitle, { color: C.foreground }]}>Upcoming Exams</Text>
          <TouchableOpacity>
            <Text style={{ color: '#6366F1', fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.semiBold }}>View all →</Text>
          </TouchableOpacity>
        </View>

        {isWide ? (
          <>
            <View style={[styles.tableHead, { backgroundColor: isDark ? Colors.dark.surface : Colors.light.surface }]}>
              {['Exam Title', 'Status', 'Access Code', 'Date & Duration', 'Actions'].map((h) => (
                <Text key={h} style={[styles.tableHeadCell, { color: C.textSubtle, flex: h === 'Actions' ? 0.5 : h === 'Status' ? 0.8 : 1 }]}>{h}</Text>
              ))}
            </View>
            {UPCOMING_EXAMS.map((item, i) => <ExamRow key={i} item={item} />)}
          </>
        ) : (
          <View style={{ padding: 12, gap: 10 }}>
            {UPCOMING_EXAMS.map((item, i) => <ExamCard key={i} item={item} />)}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingBottom: 40 },
  welcomeBanner: { borderRadius: 20, borderWidth: 1, overflow: 'hidden', marginBottom: 24, position: 'relative' },
  welcomeGlow: { position: 'absolute', top: -30, right: -30, width: 140, height: 140, borderRadius: 70, opacity: 0.7 },
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
