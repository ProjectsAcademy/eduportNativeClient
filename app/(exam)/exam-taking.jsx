import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Platform, useWindowDimensions, BackHandler, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { ScoreRing } from '../../components/ui/charts/ScoreRing';
import { useCountdownTimer } from '../../hooks/useCountdownTimer';
import { useAntiCheat } from '../../hooks/useAntiCheat';
import { sessionService } from '../../services/sessionService';
import { storage } from '../../utils/storage';

// ─── Constants ────────────────────────────────────────────────────────────────

const LETTERS = ['A', 'B', 'C', 'D'];

const VIOLATION_MESSAGES = {
  tab_switch:       'Tab switch detected. Please stay on this page.',
  right_click:      'Right-click is disabled during the exam.',
  copy_paste:       'Copy/paste is not allowed during the exam.',
  fullscreen_exit:  'Please stay in fullscreen mode.',
  app_background:   'App switched to background. This has been logged.',
};

function getGrade(pct) {
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B+';
  if (pct >= 60) return 'B';
  if (pct >= 50) return 'C';
  if (pct >= 40) return 'D';
  return 'F';
}

function formatTimeTaken(seconds) {
  if (!seconds && seconds !== 0) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ExamTakingScreen() {
  const { isDark } = useTheme();
  const C = isDark ? Colors.dark : Colors.light;
  const { width } = useWindowDimensions();
  const isWide = Platform.OS === 'web' && width >= 768;
  const router = useRouter();
  const { examId, sessionId } = useLocalSearchParams();

  // ── Core state ───────────────────────────────────────────────────────────────
  const [loading, setLoading]               = useState(true);
  const [examTitle, setExamTitle]           = useState('');
  const [questions, setQuestions]           = useState([]);
  const [settings, setSettings]             = useState(null);
  const [proctoring, setProctoring]         = useState(null);
  const [answers, setAnswers]               = useState([]);     // null | 0-3
  const [flagged, setFlagged]               = useState([]);     // boolean[]
  const [currentIdx, setCurrentIdx]         = useState(0);
  const [violationCount, setViolationCount] = useState(0);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showNavModal, setShowNavModal]     = useState(false);  // mobile navigator
  const [submitting, setSubmitting]         = useState(false);
  const [submitted, setSubmitted]           = useState(false);
  const [result, setResult]                 = useState(null);
  const [violationMsg, setViolationMsg]     = useState('');
  const [showViolationBanner, setShowViolationBanner] = useState(false);

  const questionScrollRef = useRef(null);
  const violationFadeAnim = useRef(new Animated.Value(0)).current;

  // ── Timer ────────────────────────────────────────────────────────────────────
  const timer = useCountdownTimer();

  // ── Load session from AsyncStorage on mount ──────────────────────────────────
  useEffect(() => {
    storage.getObject('exam_session').then(data => {
      if (data && String(data.sessionId) === String(sessionId)) {
        setExamTitle(data.examTitle || 'Exam');
        setQuestions(data.questions || []);
        setSettings(data.settings || {});
        setProctoring(data.proctoring || {});
        const count = (data.questions || []).length;
        setAnswers(Array(count).fill(null));
        setFlagged(Array(count).fill(false));
        setLoading(false);
      } else {
        // Session not found — go back
        router.replace('/dashboard');
      }
    });
  }, [sessionId]);

  // Start timer once data is loaded
  useEffect(() => {
    if (!loading && settings) {
      const durationSecs = (settings.duration || 60) * 60;
      timer.start(durationSecs, () => handleSubmit(true));
    }
  }, [loading]);

  // ── Submission ────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async (auto = false) => {
    if (submitting || submitted) return;
    setSubmitting(true);
    setShowSubmitModal(false);
    setShowNavModal(false);
    timer.stop();

    // Remove beforeunload guard
    if (Platform.OS === 'web') {
      try { window.onbeforeunload = null; } catch (_) {}
    }

    try {
      const res = await sessionService.submitExam(examId, sessionId);
      setResult(res.data);
      await storage.removeItem('exam_session');
    } catch (_) {
      setResult({ scorePercentage: 0, passed: false, score: 0, timeTaken: 0, violations: violationCount });
    } finally {
      setSubmitted(true);
      setSubmitting(false);
    }
  }, [submitting, submitted, examId, sessionId, violationCount, timer]);

  // ── Violation handler ─────────────────────────────────────────────────────────
  const handleViolation = useCallback(async (type) => {
    const newCount = violationCount + 1;
    setViolationCount(newCount);
    setViolationMsg(VIOLATION_MESSAGES[type] || 'Violation detected.');

    // Animate banner in/out
    Animated.sequence([
      Animated.timing(violationFadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(2800),
      Animated.timing(violationFadeAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();

    // Log to API and check auto-submit
    try {
      const res = await sessionService.logViolation(examId, sessionId, type);
      if (res.data?.autoSubmitted) {
        handleSubmit(true);
      }
    } catch (_) {}

    // Local auto-submit check for block mode
    const maxV = proctoring?.hrtViolationLimit || 3;
    if (proctoring?.hrtMode === 'block' && newCount >= maxV) {
      setTimeout(() => handleSubmit(true), 1800);
    }
  }, [violationCount, proctoring, examId, sessionId, handleSubmit, violationFadeAnim]);

  // ── Anti-cheat ────────────────────────────────────────────────────────────────
  useAntiCheat({
    enabled: !loading && !submitted && (proctoring?.tabSwitchDetection !== false),
    onViolation: handleViolation,
  });

  // ── Android back button — open submit modal instead of leaving ───────────────
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') return;
      const handler = BackHandler.addEventListener('hardwareBackPress', () => {
        if (!submitted) { setShowSubmitModal(true); return true; }
        return false;
      });
      return () => handler.remove();
    }, [submitted])
  );

  // ── Answer + navigation ───────────────────────────────────────────────────────
  const selectAnswer = useCallback(async (optionIdx) => {
    if (submitted) return;
    setAnswers(prev => { const a = [...prev]; a[currentIdx] = optionIdx; return a; });
    // Fire-and-forget save
    sessionService.submitAnswer(examId, sessionId, {
      questionIndex: currentIdx,
      selectedOption: optionIdx,
      flagged: flagged[currentIdx],
    }).catch(() => {});
  }, [currentIdx, submitted, flagged, examId, sessionId]);

  const toggleFlag = useCallback(() => {
    setFlagged(prev => { const f = [...prev]; f[currentIdx] = !f[currentIdx]; return f; });
  }, [currentIdx]);

  const goToQuestion = useCallback((idx) => {
    setCurrentIdx(idx);
    setShowNavModal(false);
    questionScrollRef.current?.scrollTo({ y: 0, animated: false });
  }, []);

  const goPrev = useCallback(() => {
    if (currentIdx > 0) goToQuestion(currentIdx - 1);
  }, [currentIdx, goToQuestion]);

  const goNext = useCallback(() => {
    if (currentIdx < questions.length - 1) goToQuestion(currentIdx + 1);
  }, [currentIdx, questions.length, goToQuestion]);

  // ── Derived stats ─────────────────────────────────────────────────────────────
  const answeredCount  = answers.filter(a => a !== null).length;
  const flaggedCount   = flagged.filter(Boolean).length;
  const unansweredCount = questions.length - answeredCount;
  const progress       = questions.length > 0 ? (currentIdx + 1) / questions.length : 0;
  const currentQ       = questions[currentIdx];

  const timerColor = timer.isDanger ? '#EF4444' : timer.isWarning ? '#F59E0B' : C.foreground;

  // ── Loading screen ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.background, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <LinearGradient colors={['#4F46E5', '#7C3AED']} style={styles.loadingLogo}>
          <Feather name="layers" size={28} color="#fff" />
        </LinearGradient>
        <Text style={[styles.loadingText, { color: C.textSubtle }]}>Loading exam…</Text>
      </View>
    );
  }

  // ── Result overlay ────────────────────────────────────────────────────────────
  if (submitted && result) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.background }} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.resultScroll} showsVerticalScrollIndicator={false}>
          <LinearGradient
            colors={isDark ? ['rgba(79,70,229,0.12)', 'rgba(124,58,237,0.06)'] : ['rgba(79,70,229,0.08)', 'rgba(124,58,237,0.04)']}
            style={styles.resultBanner}
          >
            <Text style={[styles.resultTitle, { color: C.foreground }]}>
              {result.passed ? '🎉 You Passed!' : '📋 Exam Submitted'}
            </Text>
            <Text style={[styles.resultSub, { color: C.textSubtle }]}>{examTitle}</Text>
          </LinearGradient>

          <ScoreRing
            score={Math.round(result.scorePercentage || 0)}
            grade={getGrade(result.scorePercentage || 0)}
            size={180}
            animate
          />

          <View style={[styles.resultStats, { backgroundColor: C.card, borderColor: C.border }]}>
            {[
              { icon: 'check-circle', label: 'Score',      value: `${result.score ?? 0}/${questions.length}`, color: '#10B981' },
              { icon: 'clock',        label: 'Time Taken', value: formatTimeTaken(result.timeTaken),           color: '#818CF8' },
              { icon: 'alert-triangle', label: 'Violations', value: String(result.violations ?? violationCount), color: '#F59E0B' },
            ].map((s, i) => (
              <View key={i} style={styles.resultStatItem}>
                <Feather name={s.icon} size={18} color={s.color} />
                <Text style={[styles.resultStatVal, { color: C.foreground }]}>{s.value}</Text>
                <Text style={[styles.resultStatLabel, { color: C.textSubtle }]}>{s.label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.resultActions}>
            <Button
              title="Back to Dashboard"
              variant="primary"
              onPress={() => router.replace('/dashboard')}
            />
            <Button
              title="View Results"
              variant="secondary"
              onPress={() => router.replace('/dashboard/results')}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Main exam interface ───────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }} edges={['top']}>
      <View style={{ flex: 1 }}>

        {/* ── Navbar ── */}
        <View style={[styles.navbar, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
          {/* Left: navigator toggle (mobile) + title */}
          <View style={styles.navLeft}>
            {!isWide && (
              <TouchableOpacity onPress={() => setShowNavModal(true)} style={styles.navIconBtn} activeOpacity={0.7}>
                <Feather name="grid" size={18} color={C.textMuted} />
              </TouchableOpacity>
            )}
            <View style={{ flex: 1 }}>
              <Text style={[styles.examTitle, { color: C.foreground }]} numberOfLines={1}>{examTitle}</Text>
              <Text style={[styles.examMeta, { color: C.textSubtle }]}>{questions.length} questions</Text>
            </View>
          </View>

          {/* Center: timer */}
          <View style={[
            styles.timerWrap,
            timer.isWarning && { backgroundColor: 'rgba(245,158,11,0.12)', borderColor: 'rgba(245,158,11,0.3)' },
            timer.isDanger  && { backgroundColor: 'rgba(239,68,68,0.12)',  borderColor: 'rgba(239,68,68,0.3)'  },
            !timer.isWarning && !timer.isDanger && { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', borderColor: C.border },
          ]}>
            <Feather name="clock" size={13} color={timerColor} />
            <Text style={[styles.timerText, { color: timerColor }]}>{timer.display}</Text>
          </View>

          {/* Right: violations + submit */}
          <View style={styles.navRight}>
            {violationCount > 0 && (
              <View style={styles.violationBadge}>
                <Feather name="alert-triangle" size={12} color="#EF4444" />
                <Text style={styles.violationBadgeText}>{violationCount}</Text>
              </View>
            )}
            <TouchableOpacity
              onPress={() => setShowSubmitModal(true)}
              style={styles.submitNavBtn}
              activeOpacity={0.85}
            >
              <LinearGradient colors={['#4F46E5', '#7C3AED']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[StyleSheet.absoluteFillObject, { borderRadius: 8 }]} />
              <Text style={styles.submitNavBtnText}>{submitting ? '…' : 'Submit'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Progress bar ── */}
        <View style={[styles.progressTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>

        {/* ── Violation banner ── */}
        <Animated.View
          style={[styles.violationBanner, { opacity: violationFadeAnim }]}
          pointerEvents="none"
        >
          <Feather name="alert-triangle" size={14} color="#F59E0B" />
          <Text style={styles.violationBannerText}>{violationMsg}</Text>
          <Text style={styles.violationBannerCount}>
            Violation {violationCount}/{proctoring?.hrtViolationLimit || 3}
          </Text>
        </Animated.View>

        {/* ── Body ── */}
        <View style={[styles.body, { flexDirection: isWide ? 'row' : 'column' }]}>

          {/* ─ Question Panel ─ */}
          <ScrollView
            ref={questionScrollRef}
            style={styles.questionPanel}
            contentContainerStyle={styles.questionContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {currentQ ? (
              <>
                {/* Question header */}
                <View style={styles.qHeader}>
                  <Text style={[styles.qProgressText, { color: C.textSubtle }]}>
                    QUESTION {currentIdx + 1} OF {questions.length}
                  </Text>
                  <TouchableOpacity
                    onPress={toggleFlag}
                    style={[styles.flagBtn, flagged[currentIdx] && { backgroundColor: 'rgba(245,158,11,0.10)' }]}
                    activeOpacity={0.7}
                  >
                    <Feather name="flag" size={14} color={flagged[currentIdx] ? '#F59E0B' : C.textMuted} />
                    <Text style={[styles.flagBtnText, { color: flagged[currentIdx] ? '#F59E0B' : C.textMuted }]}>
                      {flagged[currentIdx] ? 'Flagged' : 'Flag for Review'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Question text */}
                <Text style={[styles.qText, { color: C.foreground }]}>{currentQ.text}</Text>

                {/* Options */}
                <View style={styles.optionsGrid}>
                  {currentQ.options.map((opt, i) => {
                    const selected = answers[currentIdx] === i;
                    return (
                      <TouchableOpacity
                        key={i}
                        onPress={() => selectAnswer(i)}
                        activeOpacity={0.8}
                        style={[
                          styles.optionCard,
                          { borderColor: selected ? '#4F46E5' : C.border, backgroundColor: selected ? 'rgba(79,70,229,0.08)' : C.card },
                        ]}
                      >
                        <View style={[
                          styles.optionLetter,
                          { backgroundColor: selected ? '#4F46E5' : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', borderColor: selected ? '#4F46E5' : C.border },
                        ]}>
                          <Text style={[styles.optionLetterText, { color: selected ? '#fff' : C.textSubtle }]}>
                            {LETTERS[i]}
                          </Text>
                        </View>
                        <Text style={[styles.optionText, { color: C.foreground }]}>{opt}</Text>
                        <View style={[styles.radio, { borderColor: selected ? '#4F46E5' : C.borderMedium }]}>
                          {selected && <View style={styles.radioDot} />}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            ) : (
              <Text style={{ color: C.textSubtle, textAlign: 'center', marginTop: 40 }}>No question data.</Text>
            )}

            {/* Spacer for bottom nav on mobile */}
            {!isWide && <View style={{ height: 80 }} />}
          </ScrollView>

          {/* ─ Desktop navigator sidebar ─ */}
          {isWide && (
            <View style={[styles.sidePanel, { backgroundColor: C.surface, borderLeftColor: C.border }]}>
              <NavigatorPanel
                questions={questions}
                answers={answers}
                flagged={flagged}
                currentIdx={currentIdx}
                onGoTo={goToQuestion}
                answeredCount={answeredCount}
                C={C}
                isDark={isDark}
                onSubmit={() => setShowSubmitModal(true)}
                submitting={submitting}
              />
            </View>
          )}
        </View>

        {/* ─ Mobile bottom navigation bar ─ */}
        {!isWide && (
          <View style={[styles.bottomNav, { backgroundColor: C.surface, borderTopColor: C.border }]}>
            <TouchableOpacity
              onPress={goPrev}
              disabled={currentIdx === 0}
              style={[styles.navDirectionBtn, { opacity: currentIdx === 0 ? 0.4 : 1 }]}
              activeOpacity={0.7}
            >
              <Feather name="arrow-left" size={16} color={C.textMuted} />
              <Text style={[styles.navDirectionText, { color: C.textMuted }]}>Prev</Text>
            </TouchableOpacity>

            <Text style={[styles.answeredLabel, { color: C.textSubtle }]}>
              <Text style={{ color: '#10B981', fontFamily: Typography.fontFamily.bold }}>{answeredCount}</Text>
              /{questions.length} answered
            </Text>

            <TouchableOpacity
              onPress={goNext}
              disabled={currentIdx === questions.length - 1}
              style={[styles.navDirectionBtn, { opacity: currentIdx === questions.length - 1 ? 0.4 : 1 }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.navDirectionText, { color: C.textMuted }]}>Next</Text>
              <Feather name="arrow-right" size={16} color={C.textMuted} />
            </TouchableOpacity>
          </View>
        )}

        {/* ─ Mobile navigator modal ─ */}
        <Modal visible={showNavModal} onClose={() => setShowNavModal(false)} title="Question Navigator" maxWidth={400}>
          <NavigatorPanel
            questions={questions}
            answers={answers}
            flagged={flagged}
            currentIdx={currentIdx}
            onGoTo={goToQuestion}
            answeredCount={answeredCount}
            C={C}
            isDark={isDark}
            onSubmit={() => { setShowNavModal(false); setShowSubmitModal(true); }}
            submitting={submitting}
          />
        </Modal>

        {/* ─ Submit confirmation modal ─ */}
        <Modal visible={showSubmitModal} onClose={() => setShowSubmitModal(false)} title="Submit Exam?" maxWidth={420}>
          <View style={{ gap: 14 }}>
            <Text style={[styles.submitModalSub, { color: C.textSubtle }]}>
              Once submitted you cannot change your answers.
            </Text>
            <View style={styles.submitStats}>
              {[
                { icon: 'check-circle', label: 'Answered',   value: answeredCount,   color: '#10B981' },
                { icon: 'minus-circle', label: 'Unanswered', value: unansweredCount, color: '#94A3B8' },
                { icon: 'flag',         label: 'Flagged',    value: flaggedCount,    color: '#F59E0B' },
              ].map((s, i) => (
                <View key={i} style={[styles.submitStat, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', borderColor: C.border }]}>
                  <Feather name={s.icon} size={18} color={s.color} />
                  <Text style={[styles.submitStatVal, { color: C.foreground }]}>{s.value}</Text>
                  <Text style={[styles.submitStatLabel, { color: C.textSubtle }]}>{s.label}</Text>
                </View>
              ))}
            </View>
          </View>
          <Modal.Footer>
            <Button title="Cancel" variant="secondary" fullWidth={false} onPress={() => setShowSubmitModal(false)} style={{ paddingHorizontal: 20 }} />
            <Button title="Submit Exam" variant="primary" fullWidth={false} loading={submitting} onPress={() => handleSubmit(false)} style={{ flex: 1 }} />
          </Modal.Footer>
        </Modal>

      </View>
    </SafeAreaView>
  );
}

// ─── Navigator panel (shared by desktop sidebar + mobile modal) ───────────────

function NavigatorPanel({ questions, answers, flagged, currentIdx, onGoTo, answeredCount, C, isDark, onSubmit, submitting }) {
  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.navGridScroll} showsVerticalScrollIndicator={false}>
        {/* Grid */}
        <View style={styles.qGrid}>
          {questions.map((_, i) => {
            const isAnswered = answers[i] !== null;
            const isFlagged  = flagged[i];
            const isCurrent  = i === currentIdx;
            return (
              <TouchableOpacity
                key={i}
                onPress={() => onGoTo(i)}
                style={[
                  styles.qNavBtn,
                  { borderColor: C.border, backgroundColor: C.card },
                  isAnswered && !isFlagged && !isCurrent && { backgroundColor: 'rgba(16,185,129,0.12)', borderColor: 'rgba(16,185,129,0.3)' },
                  isFlagged && !isCurrent && { backgroundColor: 'rgba(245,158,11,0.12)', borderColor: 'rgba(245,158,11,0.3)' },
                  isCurrent && { borderColor: 'transparent' },
                ]}
                activeOpacity={0.7}
              >
                {isCurrent ? (
                  <LinearGradient colors={['#4F46E5', '#7C3AED']} style={[StyleSheet.absoluteFillObject, { borderRadius: 5 }]} />
                ) : null}
                <Text style={[
                  styles.qNavBtnText,
                  isAnswered && !isFlagged && !isCurrent && { color: '#34D399' },
                  isFlagged  && !isCurrent && { color: '#FBBF24' },
                  isCurrent  && { color: '#fff' },
                  !isAnswered && !isFlagged && !isCurrent && { color: C.textSubtle },
                ]}>
                  {i + 1}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Legend */}
        <View style={[styles.legend, { borderTopColor: C.border }]}>
          {[
            { color: C.card, border: C.border,                     label: 'Unanswered',   count: questions.length - answeredCount - flagged.filter(Boolean).length },
            { color: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)', label: 'Answered', count: answeredCount },
            { color: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', label: 'Flagged',  count: flagged.filter(Boolean).length },
          ].map((l, i) => (
            <View key={i} style={styles.legendRow}>
              <View style={[styles.legendBox, { backgroundColor: l.color, borderWidth: 1, borderColor: l.border }]} />
              <Text style={[styles.legendLabel, { color: C.textSubtle }]}>{l.label}</Text>
              <Text style={[styles.legendCount, { color: C.foreground }]}>{l.count}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Submit button at bottom of panel */}
      <View style={[styles.panelSubmit, { borderTopColor: C.border }]}>
        <Text style={[styles.panelAnsweredText, { color: C.textSubtle }]}>
          <Text style={{ color: '#10B981', fontFamily: Typography.fontFamily.bold }}>{answeredCount}</Text>
          /{questions.length} answered
        </Text>
        <TouchableOpacity onPress={onSubmit} disabled={submitting} style={styles.panelSubmitBtn} activeOpacity={0.85}>
          <LinearGradient colors={['#4F46E5', '#7C3AED']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[StyleSheet.absoluteFillObject, { borderRadius: 10 }]} />
          <Feather name="send" size={14} color="#fff" />
          <Text style={styles.panelSubmitBtnText}>{submitting ? 'Submitting…' : 'Submit Exam'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Loading
  loadingLogo:  { width: 64, height: 64, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  loadingText:  { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.medium },

  // Result
  resultScroll:  { flexGrow: 1, alignItems: 'center', gap: 20, padding: 24, paddingBottom: 40 },
  resultBanner:  { width: '100%', borderRadius: 16, padding: 20, alignItems: 'center', gap: 6 },
  resultTitle:   { fontSize: Typography.size.xl, fontFamily: Typography.fontFamily.extraBold },
  resultSub:     { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.regular },
  resultStats:   { flexDirection: 'row', gap: 0, borderRadius: 16, borderWidth: 1, overflow: 'hidden', width: '100%' },
  resultStatItem:{ flex: 1, alignItems: 'center', gap: 6, padding: 16 },
  resultStatVal: { fontSize: Typography.size.xl, fontFamily: Typography.fontFamily.extraBold },
  resultStatLabel:{ fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.medium },
  resultActions: { width: '100%', gap: 10 },

  // Navbar
  navbar:        { height: 64, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, borderBottomWidth: 1, gap: 12 },
  navLeft:       { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, overflow: 'hidden' },
  navIconBtn:    { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  examTitle:     { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.bold },
  examMeta:      { fontSize: 10, fontFamily: Typography.fontFamily.regular, marginTop: 1 },
  timerWrap:     { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  timerText:     { fontSize: Typography.size.base, fontFamily: Typography.fontFamily.extraBold, letterSpacing: 1 },
  navRight:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  violationBadge:{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: 'rgba(239,68,68,0.10)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)' },
  violationBadgeText: { fontSize: 12, fontFamily: Typography.fontFamily.bold, color: '#EF4444' },
  submitNavBtn:  { overflow: 'hidden', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  submitNavBtnText: { color: '#fff', fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.bold, position: 'relative' },

  // Progress bar
  progressTrack: { height: 3 },
  progressFill:  { height: '100%', backgroundColor: '#4F46E5' },

  // Violation banner
  violationBanner: { position: 'absolute', top: 67, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, paddingHorizontal: 16, backgroundColor: 'rgba(245,158,11,0.15)', borderBottomWidth: 1, borderBottomColor: 'rgba(245,158,11,0.25)', zIndex: 50 },
  violationBannerText:  { flex: 1, fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.semiBold, color: '#F59E0B' },
  violationBannerCount: { fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.bold, color: '#F59E0B' },

  // Body
  body:          { flex: 1 },

  // Question panel
  questionPanel: { flex: 1 },
  questionContent:{ padding: 32, paddingHorizontal: 40, maxWidth: 820, alignSelf: 'center', width: '100%' },
  qHeader:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  qProgressText: { fontSize: 11, fontFamily: Typography.fontFamily.bold, textTransform: 'uppercase', letterSpacing: 0.5 },
  flagBtn:       { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  flagBtnText:   { fontSize: 12, fontFamily: Typography.fontFamily.semiBold },
  qText:         { fontSize: Typography.size.lg, fontFamily: Typography.fontFamily.semiBold, lineHeight: 28, marginBottom: 24 },
  optionsGrid:   { gap: 10 },
  optionCard:    { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 12, borderWidth: 2 },
  optionLetter:  { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, flexShrink: 0 },
  optionLetterText: { fontSize: 13, fontFamily: Typography.fontFamily.extraBold },
  optionText:    { flex: 1, fontSize: Typography.size.base, fontFamily: Typography.fontFamily.regular, lineHeight: 22 },
  radio:         { width: 18, height: 18, borderRadius: 9, borderWidth: 2, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  radioDot:      { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4F46E5' },

  // Mobile bottom nav
  bottomNav:     { position: 'absolute', bottom: 0, left: 0, right: 0, height: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, borderTopWidth: 1 },
  navDirectionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 10 },
  navDirectionText: { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.semiBold },
  answeredLabel: { fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.medium },

  // Side panel (desktop)
  sidePanel:     { width: 280, borderLeftWidth: 1, flexDirection: 'column' },

  // Navigator panel internals
  navGridScroll: { flex: 1, padding: 14 },
  qGrid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  qNavBtn:       { width: 40, height: 40, borderRadius: 6, borderWidth: 1, alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' },
  qNavBtnText:   { fontSize: 12, fontFamily: Typography.fontFamily.bold },
  legend:        { borderTopWidth: 1, paddingTop: 12, gap: 7, marginTop: 12 },
  legendRow:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendBox:     { width: 14, height: 14, borderRadius: 3, flexShrink: 0 },
  legendLabel:   { flex: 1, fontSize: 12, fontFamily: Typography.fontFamily.regular },
  legendCount:   { fontSize: 12, fontFamily: Typography.fontFamily.bold },
  panelSubmit:   { padding: 14, borderTopWidth: 1, gap: 10 },
  panelAnsweredText: { fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.medium, textAlign: 'center' },
  panelSubmitBtn:{ borderRadius: 10, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12 },
  panelSubmitBtnText: { color: '#fff', fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.semiBold, position: 'relative' },

  // Submit modal
  submitModalSub: { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.regular, lineHeight: 20 },
  submitStats:    { flexDirection: 'row', gap: 10 },
  submitStat:     { flex: 1, alignItems: 'center', gap: 6, padding: 14, borderRadius: 12, borderWidth: 1 },
  submitStatVal:  { fontSize: Typography.size.xl, fontFamily: Typography.fontFamily.extraBold },
  submitStatLabel:{ fontSize: 10, fontFamily: Typography.fontFamily.medium },
});
