import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Platform, useWindowDimensions, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Tabs } from '../../components/ui/Tabs';
import { useToast } from '../../context/ToastContext';
import { examService } from '../../services/examService';
import { sessionService } from '../../services/sessionService';
import { storage } from '../../utils/storage';

const SCHEDULE = [
  { id: '1', title: 'Data Engineer (Copy)', sub: 'No additional information.', date: '5/16/2026', time: '10:12 PM', duration: '60 min', status: 'ongoing' },
  { id: '2', title: 'Data Engineer',        sub: 'No additional information.', date: '6/16/2026', time: '09:24 AM', duration: '60 min', status: 'upcoming' },
  { id: '3', title: 'Data Engineer',        sub: 'No additional information.', date: '6/16/2026', time: '08:24 PM', duration: '60 min', status: 'upcoming' },
  { id: '4', title: 'Data Bricks',          sub: 'No additional information.', date: '5/16/2026', time: '12:24 AM', duration: '60 min', status: 'completed' },
];

const SCHEDULE_TABS = [
  { id: 'ongoing',   label: 'Ongoing',   badge: SCHEDULE.filter(s => s.status === 'ongoing').length   },
  { id: 'upcoming',  label: 'Upcoming',  badge: SCHEDULE.filter(s => s.status === 'upcoming').length  },
  { id: 'completed', label: 'Completed', badge: SCHEDULE.filter(s => s.status === 'completed').length },
];

const CHECKLIST_ITEMS = [
  'I have a stable internet connection',
  'I will not switch browser tabs during the exam',
  'I agree to the exam rules and academic integrity policy',
];

// Auto-format input as EXM-XXXX
function formatCode(raw) {
  const clean = raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 7);
  return clean.length > 3 ? clean.slice(0, 3) + '-' + clean.slice(3) : clean;
}

const STATUS_ICON = {
  ongoing:   { name: 'edit-2',       color: '#818CF8', bg: 'rgba(99,102,241,0.12)',   border: 'rgba(99,102,241,0.2)' },
  upcoming:  { name: 'calendar',     color: '#94A3B8', bg: 'rgba(100,116,139,0.10)', border: 'rgba(100,116,139,0.15)' },
  completed: { name: 'check-circle', color: '#34D399', bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.2)' },
  missed:    { name: 'x-circle',     color: '#F87171', bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.2)' },
};

const LEFT_ACCENT = { ongoing: '#4F46E5', upcoming: 'transparent', completed: '#10B981', missed: '#EF4444' };

export default function JoinExamScreen() {
  const { isDark } = useTheme();
  const C = isDark ? Colors.dark : Colors.light;
  const { width } = useWindowDimensions();
  const isWide = Platform.OS === 'web' && width >= 768;
  const { showToast } = useToast();
  const router = useRouter();

  // ── Banner code state ────────────────────────────────────────────────────────
  const [bannerCode, setBannerCode] = useState('');

  // ── Schedule tab ─────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('ongoing');

  // ── Join modal state ─────────────────────────────────────────────────────────
  const [modalVisible, setModalVisible]   = useState(false);
  const [modalCode, setModalCode]         = useState('');
  const [modalStep, setModalStep]         = useState(1);  // 1 = code, 2 = info
  const [foundExam, setFoundExam]         = useState(null);
  const [codeError, setCodeError]         = useState('');
  const [studentName, setStudentName]     = useState('');
  const [studentEmail, setStudentEmail]   = useState('');
  const [rollNumber, setRollNumber]       = useState('');
  const [checklist, setChecklist]         = useState([false, false, false]);
  const [joining, setJoining]             = useState(false);

  // ── Open modal ────────────────────────────────────────────────────────────────
  const openModal = (prefill = '') => {
    const code = prefill || bannerCode;
    setModalCode(code);
    setModalStep(1);
    setFoundExam(null);
    setCodeError('');
    setStudentName('');
    setStudentEmail('');
    setRollNumber('');
    setChecklist([false, false, false]);
    setJoining(false);
    if (code) lookupCode(code);
    setModalVisible(true);
  };

  // ── Code lookup (debounced API call when code reaches 8 chars) ───────────────
  const lookupCode = async (code) => {
    const clean = code.replace(/[^A-Za-z0-9]/g, '');
    if (clean.length < 7) { setFoundExam(null); return; }
    try {
      const res = await examService.lookupByCode(code);
      const exam = res.data?.exam;
      if (exam) {
        setFoundExam({
          id: exam.id,
          code: exam.accessCode,
          title: exam.title,
          duration: exam.settings?.duration ?? 60,
          questions: exam.questionCount,
          subject: exam.subject,
        });
        setCodeError('');
      }
    } catch (_) {
      setFoundExam(null);
    }
  };

  const handleCodeChange = (text) => {
    const formatted = formatCode(text);
    setModalCode(formatted);
    lookupCode(formatted);
    setCodeError('');
  };

  const handleBannerCodeChange = (text) => {
    setBannerCode(formatCode(text));
  };

  // ── Proceed / Join ────────────────────────────────────────────────────────────
  const handleProceed = async () => {
    if (modalStep === 1) {
      if (!foundExam) {
        setCodeError('Invalid exam code. Please check and try again.');
        return;
      }
      setModalStep(2);
      return;
    }

    if (modalStep === 2) {
      if (!studentName.trim()) { showToast('Please enter your full name', 'warning'); return; }
      if (!studentEmail.trim() || !studentEmail.includes('@')) { showToast('Please enter a valid email', 'warning'); return; }
      if (!checklist.every(Boolean)) { showToast('Please complete all checklist items', 'warning'); return; }

      setJoining(true);
      try {
        const res = await sessionService.startSession(foundExam.id, {
          studentName: studentName.trim(),
          studentEmail: studentEmail.trim(),
          rollNumber: rollNumber.trim(),
        });
        const sessionData = res.data; // { sessionId, examId, examTitle, questions, settings, proctoring, startedAt }
        // Persist session for exam-taking screen (survives navigation)
        await storage.setObject('exam_session', sessionData);
        showToast(`Joined "${foundExam.title}" successfully!`, 'success');
        setModalVisible(false);
        // Navigate to fullscreen exam-taking screen
        router.push({
          pathname: '/exam-taking',
          params: { examId: foundExam.id, sessionId: sessionData.sessionId },
        });
      } catch (err) {
        showToast(err.message || 'Failed to join exam', 'error');
        setJoining(false);
      }
    }
  };

  const toggleCheck = (i) => {
    setChecklist(prev => prev.map((v, idx) => idx === i ? !v : v));
  };

  // ── Schedule item ──────────────────────────────────────────────────────────────
  const ScheduleItem = ({ item }) => {
    const ic = STATUS_ICON[item.status] || STATUS_ICON.upcoming;
    const accent = LEFT_ACCENT[item.status] ?? 'transparent';

    return (
      <View style={[
        styles.schedItem,
        { backgroundColor: C.card, borderColor: C.border },
        accent !== 'transparent' && { borderLeftWidth: 3, borderLeftColor: accent, paddingLeft: 17 },
      ]}>
        <View style={[styles.schedIcon, { backgroundColor: ic.bg, borderColor: ic.border }]}>
          <Feather name={ic.name} size={17} color={ic.color} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.schedTitle, { color: C.foreground }]} numberOfLines={1}>{item.title}</Text>
          <Text style={[styles.schedSub, { color: C.textSubtle }]}>{item.sub}</Text>
        </View>
        <View style={styles.schedMeta}>
          <View style={styles.schedMetaItem}>
            <Feather name="calendar" size={11} color={C.textSubtle} />
            <Text style={[styles.schedMetaText, { color: C.foreground }]}>{item.date}</Text>
          </View>
          <View style={styles.schedMetaItem}>
            <Feather name="clock" size={11} color={C.textSubtle} />
            <Text style={[styles.schedMetaText, { color: C.textSubtle }]}>{item.time} · {item.duration}</Text>
          </View>
        </View>
        <Badge label={item.status} variant={item.status} style={{ marginLeft: 12 }} />
        {item.status === 'ongoing' && (
          <TouchableOpacity
            onPress={() => { showToast('Redirecting to exam…', 'info'); setTimeout(() => router.push('/dashboard'), 800); }}
            style={styles.startBtn}
          >
            <LinearGradient colors={['#4F46E5', '#7C3AED']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.startBtnGrad}>
              <Text style={styles.startBtnText}>Start Now</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
        {item.status === 'completed' && (
          <TouchableOpacity
            onPress={() => router.push('/dashboard/results')}
            style={[styles.viewBtn, { borderColor: 'rgba(16,185,129,0.3)', backgroundColor: 'rgba(16,185,129,0.08)' }]}
          >
            <Text style={[styles.viewBtnText, { color: '#10B981' }]}>View Results</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const tabData = SCHEDULE.filter(s => s.status === activeTab);

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[styles.content, { padding: isWide ? 32 : 16 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Page header */}
      <View style={styles.pageHeader}>
        <Text style={[styles.pageTitle, { color: C.foreground }]}>Join Exam</Text>
        <Text style={[styles.pageSub, { color: C.textSubtle }]}>Enter an access code or select from your scheduled assessments</Text>
      </View>

      {/* Join Banner */}
      <View style={[styles.banner, { borderColor: 'rgba(79,70,229,0.20)' }]}>
        <LinearGradient
          colors={['rgba(79,70,229,0.10)', 'rgba(124,58,237,0.06)']}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        />
        <View style={[styles.bannerLeft, { flexDirection: isWide ? 'row' : 'column', alignItems: isWide ? 'center' : 'flex-start' }]}>
          <View style={styles.bannerIconRow}>
            <LinearGradient colors={['#4F46E5', '#7C3AED']} style={styles.bannerIcon}>
              <Feather name="clipboard" size={20} color="#fff" />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>JOIN SECURE ASSESSMENT</Text>
              <Text style={[styles.bannerSub, { color: C.textSubtle }]}>Enter the access code provided by your designated faculty member.</Text>
            </View>
          </View>
          <View style={[styles.bannerInput, { marginTop: isWide ? 0 : 14, marginLeft: isWide ? 20 : 0 }]}>
            <View style={[styles.codeInputWrap, { backgroundColor: C.surface2, borderColor: C.borderMedium }]}>
              <TextInput
                value={bannerCode}
                onChangeText={handleBannerCodeChange}
                placeholder="e.g. EXM-4821"
                placeholderTextColor={C.textSubtle}
                style={[styles.codeInput, { color: C.foreground }]}
                autoCapitalize="characters"
                autoCorrect={false}
                autoComplete="off"
                maxLength={8}
                onSubmitEditing={() => bannerCode && openModal()}
              />
            </View>
            <TouchableOpacity onPress={() => openModal()} style={styles.joinBannerBtn}>
              <LinearGradient colors={['#4F46E5', '#7C3AED']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.joinBannerBtnGrad}>
                <Feather name="chevron-right" size={15} color="#fff" />
                <Text style={styles.joinBannerBtnText}>Join Exam</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Schedule section */}
      <View style={[styles.schedSection, { backgroundColor: C.card, borderColor: C.border }]}>
        <View style={styles.schedHeader}>
          <View>
            <View style={styles.schedTitleRow}>
              <Text style={[styles.schedSectionTitle, { color: C.foreground }]}>Your Examination Schedule</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{SCHEDULE.length}</Text>
              </View>
            </View>
            <Text style={[styles.schedSectionSub, { color: C.textSubtle }]}>View, manage, and track your registered assessments and grades.</Text>
          </View>
        </View>

        {/* Tabs */}
        <Tabs tabs={SCHEDULE_TABS} activeTab={activeTab} onChange={setActiveTab} />

        {/* Tab content */}
        <View style={{ paddingTop: 4 }}>
          {tabData.length === 0 ? (
            <View style={styles.emptyTab}>
              <Feather name="inbox" size={24} color={C.textSubtle} />
              <Text style={[styles.emptyTabText, { color: C.textSubtle }]}>No {activeTab} exams</Text>
            </View>
          ) : (
            tabData.map(item => <ScheduleItem key={item.id} item={item} />)
          )}
        </View>
      </View>

      {/* Join Modal */}
      <Modal
        visible={modalVisible}
        onClose={() => !joining && setModalVisible(false)}
        title="Enter Exam Code"
        maxWidth={460}
      >
        <View style={{ gap: 16 }}>
          {/* Step indicator */}
          <View style={styles.stepRow}>
            {[1, 2].map(n => (
              <React.Fragment key={n}>
                <View style={[styles.stepDot, { backgroundColor: modalStep >= n ? '#4F46E5' : C.border }]}>
                  {modalStep > n
                    ? <Feather name="check" size={12} color="#fff" />
                    : <Text style={[styles.stepNum, { color: modalStep === n ? '#fff' : C.textSubtle }]}>{n}</Text>
                  }
                </View>
                {n < 2 && <View style={[styles.stepLine, { backgroundColor: modalStep > n ? '#4F46E5' : C.border }]} />}
              </React.Fragment>
            ))}
          </View>

          {/* Step 1 — Code input */}
          {modalStep === 1 && (
            <View style={{ gap: 12 }}>
              <Text style={[styles.modalStepTitle, { color: C.textSubtle }]}>Code is case-insensitive</Text>
              {/* Exam preview */}
              {foundExam && (
                <View style={[styles.previewBox, { backgroundColor: 'rgba(16,185,129,0.06)', borderColor: 'rgba(16,185,129,0.2)' }]}>
                  <View style={styles.previewCheckRow}>
                    <Feather name="check-circle" size={14} color="#34D399" />
                    <Text style={[styles.previewFound, { color: '#34D399' }]}>Exam Found!</Text>
                  </View>
                  <Text style={[styles.previewTitle, { color: C.foreground }]}>{foundExam.title}</Text>
                  <View style={styles.previewStats}>
                    <View style={styles.previewStat}>
                      <Feather name="clock" size={12} color={C.textSubtle} />
                      <Text style={[styles.previewStatText, { color: C.textSubtle }]}>{foundExam.duration} minutes</Text>
                    </View>
                    <View style={styles.previewStat}>
                      <Feather name="file-text" size={12} color={C.textSubtle} />
                      <Text style={[styles.previewStatText, { color: C.textSubtle }]}>{foundExam.questions} questions</Text>
                    </View>
                    <View style={styles.previewStat}>
                      <Feather name="book" size={12} color={C.textSubtle} />
                      <Text style={[styles.previewStatText, { color: C.textSubtle }]}>{foundExam.subject}</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Big code input */}
              <TextInput
                value={modalCode}
                onChangeText={handleCodeChange}
                placeholder="EXM-0000"
                placeholderTextColor={C.textSubtle}
                style={[
                  styles.bigCodeInput,
                  { backgroundColor: C.surface2, borderColor: codeError ? '#EF4444' : foundExam ? '#10B981' : C.borderMedium, color: C.foreground },
                ]}
                autoCapitalize="characters"
                autoCorrect={false}
                autoComplete="off"
                maxLength={8}
              />
              {codeError ? (
                <Text style={styles.codeError}>{codeError}</Text>
              ) : (
                <Text style={[styles.codeHint, { color: C.textSubtle }]}>e.g. EXM-4821</Text>
              )}
            </View>
          )}

          {/* Step 2 — Student info */}
          {modalStep === 2 && (
            <View style={{ gap: 14 }}>
              <Input
                label="Your Full Name"
                value={studentName}
                onChangeText={setStudentName}
                placeholder="Enter your full name"
                icon={<Feather name="user" size={16} color={C.textSubtle} />}
                autoComplete="name"
              />
              <Input
                label="Student Email"
                value={studentEmail}
                onChangeText={setStudentEmail}
                placeholder="student@school.edu"
                icon={<Feather name="mail" size={16} color={C.textSubtle} />}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
              <Input
                label="Roll Number / Student ID"
                value={rollNumber}
                onChangeText={setRollNumber}
                placeholder="e.g. 2024CS001"
                icon={<Feather name="hash" size={16} color={C.textSubtle} />}
                autoComplete="off"
              />

              {/* Checklist */}
              <View style={[styles.checklist, { backgroundColor: C.surface, borderColor: C.border }]}>
                <Text style={[styles.checklistTitle, { color: C.textSubtle }]}>BEFORE YOU START</Text>
                {CHECKLIST_ITEMS.map((item, i) => (
                  <TouchableOpacity key={i} onPress={() => toggleCheck(i)} style={styles.checkRow} activeOpacity={0.7}>
                    <View style={[
                      styles.checkbox,
                      { borderColor: checklist[i] ? '#4F46E5' : C.borderMedium, backgroundColor: checklist[i] ? '#4F46E5' : 'transparent' },
                    ]}>
                      {checklist[i] && <Feather name="check" size={11} color="#fff" />}
                    </View>
                    <Text style={[styles.checkText, { color: C.textSubtle }]}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        <Modal.Footer>
          {!joining && (
            <Button
              title="Back"
              variant="secondary"
              fullWidth={false}
              onPress={() => modalStep === 2 ? setModalStep(1) : setModalVisible(false)}
              style={{ paddingHorizontal: 20 }}
            />
          )}
          <Button
            title={joining ? 'Joining…' : modalStep === 1 ? 'Look Up Exam' : 'Continue to Exam'}
            variant="primary"
            fullWidth={false}
            loading={joining}
            onPress={handleProceed}
            style={{ flex: 1 }}
            icon={!joining && <Feather name="chevron-right" size={15} color="#fff" />}
          />
        </Modal.Footer>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingBottom: 40 },
  pageHeader: { marginBottom: 20 },
  pageTitle: { fontSize: Typography.size['2xl'], fontFamily: Typography.fontFamily.extraBold },
  pageSub: { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.regular, marginTop: 4 },

  // Banner
  banner: { borderRadius: 20, borderWidth: 1, overflow: 'hidden', padding: 24, marginBottom: 24 },
  bannerLeft: { gap: 0 },
  bannerIconRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, flex: 1 },
  bannerIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  bannerTitle: { fontSize: 12, fontFamily: Typography.fontFamily.extraBold, letterSpacing: 1, color: '#818CF8', textTransform: 'uppercase' },
  bannerSub: { fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.regular, marginTop: 3, lineHeight: 17 },
  bannerInput: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  codeInputWrap: { borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 16, paddingVertical: 11, minWidth: 160 },
  codeInput: { fontSize: Typography.size.base, fontFamily: Typography.fontFamily.bold, letterSpacing: 4, textTransform: 'uppercase', outlineStyle: 'none', minWidth: 120 },
  joinBannerBtn: { borderRadius: 12, overflow: 'hidden' },
  joinBannerBtnGrad: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 12 },
  joinBannerBtnText: { color: '#fff', fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.semiBold },

  // Schedule section
  schedSection: { borderRadius: 20, borderWidth: 1, overflow: 'hidden', marginBottom: 24 },
  schedHeader: { padding: 20, paddingBottom: 0 },
  schedTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  schedSectionTitle: { fontSize: Typography.size.base, fontFamily: Typography.fontFamily.bold },
  schedSectionSub: { fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.regular, marginBottom: 16 },
  countBadge: { backgroundColor: 'rgba(79,70,229,0.15)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  countBadgeText: { fontSize: 11, fontFamily: Typography.fontFamily.bold, color: '#818CF8' },

  // Schedule items
  schedItem: { flexDirection: 'row', alignItems: 'center', padding: 18, paddingLeft: 20, borderBottomWidth: StyleSheet.hairlineWidth, gap: 0 },
  schedIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginRight: 14, flexShrink: 0 },
  schedTitle: { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.bold },
  schedSub: { fontSize: 11, fontFamily: Typography.fontFamily.regular, marginTop: 2 },
  schedMeta: { gap: 3, marginRight: 12, alignItems: 'flex-end' },
  schedMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  schedMetaText: { fontSize: 11, fontFamily: Typography.fontFamily.medium },
  startBtn: { borderRadius: 8, overflow: 'hidden', marginLeft: 8 },
  startBtnGrad: { paddingHorizontal: 12, paddingVertical: 7 },
  startBtnText: { color: '#fff', fontSize: 11, fontFamily: Typography.fontFamily.semiBold },
  viewBtn: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7, marginLeft: 8 },
  viewBtnText: { fontSize: 11, fontFamily: Typography.fontFamily.semiBold },

  // Empty tab
  emptyTab: { alignItems: 'center', gap: 8, paddingVertical: 32 },
  emptyTabText: { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.regular },

  // Modal — step indicator
  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 4 },
  stepDot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  stepNum: { fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.bold },
  stepLine: { flex: 1, height: 2, marginHorizontal: 4, maxWidth: 48 },
  modalStepTitle: { fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.medium, textAlign: 'center' },

  // Exam preview
  previewBox: { borderRadius: 10, borderWidth: 1, padding: 12 },
  previewCheckRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  previewFound: { fontSize: 12, fontFamily: Typography.fontFamily.bold },
  previewTitle: { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.bold, marginBottom: 8 },
  previewStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  previewStat: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  previewStatText: { fontSize: 12, fontFamily: Typography.fontFamily.regular },

  // Big code input
  bigCodeInput: { borderRadius: 12, borderWidth: 2, paddingVertical: 14, paddingHorizontal: 20, fontSize: Typography.size['2xl'], fontFamily: Typography.fontFamily.extraBold, letterSpacing: 8, textAlign: 'center', textTransform: 'uppercase', outlineStyle: 'none' },
  codeError: { fontSize: Typography.size.xs, color: '#EF4444', fontFamily: Typography.fontFamily.regular, textAlign: 'center' },
  codeHint: { fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.regular, textAlign: 'center' },

  // Checklist
  checklist: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 12 },
  checklistTitle: { fontSize: 10, fontFamily: Typography.fontFamily.bold, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginTop: 1, flexShrink: 0 },
  checkText: { flex: 1, fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.regular, lineHeight: 18 },
});
