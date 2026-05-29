import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Platform, useWindowDimensions, ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import { useToast } from '../../context/ToastContext';
import { examService } from '../../services/examService';
import { StepProgress } from '../../components/exam/StepProgress';
import { Step1Details }   from '../../components/exam/steps/Step1Details';
import { Step2Context }   from '../../components/exam/steps/Step2Context';
import { Step3Subtopics } from '../../components/exam/steps/Step3Subtopics';
import { Step4Blueprint } from '../../components/exam/steps/Step4Blueprint';
import { Step5Generate }  from '../../components/exam/steps/Step5Generate';
import { Step6Review }    from '../../components/exam/steps/Step6Review';
import { Step7Settings }  from '../../components/exam/steps/Step7Settings';
import { Step8Publish }   from '../../components/exam/steps/Step8Publish';

// ── Step definitions ─────────────────────────────────────────────────────────
const STEPS_AI     = [1, 2, 3, 4, 5, 6, 7, 8];
const STEPS_MANUAL = [1, 6, 7, 8];

const STEP_META = {
  1: { label: 'Details'   },
  2: { label: 'Topic'     },
  3: { label: 'Subtopics' },
  4: { label: 'Blueprint' },
  5: { label: 'Generate'  },
  6: { label: 'Review'    },
  7: { label: 'Settings'  },
  8: { label: 'Publish'   },
};

// ── Initial form state (mirrors create-exam.md field spec) ────────────────────
const INITIAL_FORM = {
  // Persisted exam ID — set after first save/draft so subsequent saves update instead of create
  examId:        null,
  // Step 1
  title:         '',
  description:   '',
  duration:      60,
  passingScore:  60,
  maxAttempts:   '2',
  scheduledAt:   '',
  tags:          [],
  difficulty:    5,
  // Step 2
  subject:       '',
  gradeLevel:    '',
  curriculum:    '',
  referenceBook: '',
  chapter:       '',
  topic:         '',
  topicContext:  '',
  // Step 3
  subtopics:     [],
  // Step 4
  blueprint:     [],
  // Step 6 (questions)
  questions:     [],
  // Step 8
  code:          '',
  // Step 7 (settings)
  settings: {
    shuffleQuestions:    true,
    shuffleOptions:      true,
    showResultsAfter:    true,
    showCorrectAnswers:  false,
    allowBack:           true,
    emailRequired:       false,
    hrtMode:             'warn',
    hrtViolationLimit:   3,
    tabSwitchDetection:  true,
    copyPasteDisabled:   true,
    rightClickDisabled:  true,
    fullscreenRequired:  false,
  },
};

export default function CreateExamScreen() {
  const { isDark } = useTheme();
  const C = isDark ? Colors.dark : Colors.light;
  const { width } = useWindowDimensions();
  const isWide = Platform.OS === 'web' && width >= 768;
  const { showToast } = useToast();
  const router = useRouter();
  const scrollRef = useRef(null);
  const { examId: editExamId } = useLocalSearchParams();

  const [form, setForm]       = useState(INITIAL_FORM);
  const [path, setPath]       = useState(null);
  const [step, setStep]       = useState(1);
  const [editLoading, setEditLoading] = useState(!!editExamId);

  const updateForm = (updates) => setForm(prev => ({ ...prev, ...updates }));

  // ── Load existing exam when editing ──────────────────────────────────────────
  useEffect(() => {
    if (!editExamId) return;
    (async () => {
      try {
        const res = await examService.getExamById(editExamId);
        const e   = res.data?.exam;
        if (!e) throw new Error('Exam not found');

        // Map API response → INITIAL_FORM shape
        setForm({
          ...INITIAL_FORM,
          examId:        e.id,
          title:         e.title         || '',
          description:   e.description   || '',
          duration:      e.settings?.duration    || 60,
          passingScore:  e.settings?.passingScore || 60,
          maxAttempts:   e.settings?.maxAttempts === 0 ? 'unlimited' : String(e.settings?.maxAttempts ?? 2),
          scheduledAt:   e.scheduledAt   ? new Date(e.scheduledAt).toISOString().slice(0,16).replace('T',' ') : '',
          tags:          e.tags          || [],
          difficulty:    e.difficulty    || 5,
          subject:       e.subject       || '',
          gradeLevel:    e.gradeLevel    || '',
          curriculum:    e.curriculum    || '',
          referenceBook: e.referenceBook || '',
          chapter:       e.chapter       || '',
          topic:         e.topic         || '',
          topicContext:  e.topicContext  || '',
          code:          e.accessCode   || '',
          // Capitalize bloomsLevel back to UI format ('remember' → 'Remember')
          questions: (e.questions || []).map(q => ({
            id:            q._id,
            text:          q.text          || '',
            options:       q.options       || ['','','',''],
            correctAnswer: q.correctAnswer ?? 0,
            type:          q.type          || 'mcq',
            bloomsLevel:   q.bloomsLevel
              ? q.bloomsLevel.charAt(0).toUpperCase() + q.bloomsLevel.slice(1)
              : 'Remember',
            subtopic:      q.subtopic      || '',
          })),
          settings: {
            shuffleQuestions:    e.settings?.shuffleQuestions    ?? true,
            shuffleOptions:      e.settings?.shuffleOptions      ?? true,
            showResultsAfter:    e.settings?.showResultsAfterSubmit ?? true,
            showCorrectAnswers:  e.settings?.showCorrectAnswers  ?? false,
            allowBack:           e.settings?.allowBack           ?? true,
            emailRequired:       e.settings?.emailRequired       ?? false,
            hrtMode:             e.proctoring?.hrtMode           || 'warn',
            hrtViolationLimit:   e.proctoring?.hrtViolationLimit ?? 3,
            tabSwitchDetection:  e.proctoring?.tabSwitchDetection ?? true,
            copyPasteDisabled:   e.proctoring?.copyPasteDisabled  ?? true,
            rightClickDisabled:  e.proctoring?.rightClickDisabled ?? true,
            fullscreenRequired:  e.proctoring?.fullscreenRequired ?? false,
          },
        });

        // Go straight to question review if exam already has questions
        setPath('manual');
        setStep(e.questions?.length > 0 ? 6 : 1);
      } catch (err) {
        showToast(err.message || 'Failed to load exam', 'error');
        router.back();
      } finally {
        setEditLoading(false);
      }
    })();
  }, [editExamId]);

  const stepSequence = path === 'manual' ? STEPS_MANUAL : STEPS_AI;
  const stepMetas = stepSequence.map(n => STEP_META[n]);
  const currentIdxInSeq = stepSequence.indexOf(step);

  const scrollTop = () => scrollRef.current?.scrollTo({ y: 0, animated: true });

  const goNext = () => {
    const nextIdx = currentIdxInSeq + 1;
    if (nextIdx < stepSequence.length) {
      setStep(stepSequence[nextIdx]);
      scrollTop();
    }
  };

  const goPrev = () => {
    const prevIdx = currentIdxInSeq - 1;
    if (prevIdx >= 0) {
      setStep(stepSequence[prevIdx]);
      scrollTop();
    }
  };

  const chooseAI = () => {
    setPath('ai');
    setStep(2);
    scrollTop();
  };

  const chooseManual = () => {
    setPath('manual');
    setStep(6);
    scrollTop();
  };

  const isFirstStep = currentIdxInSeq === 0;
  const isLastStep  = step === 8;

  // ── Shared payload builder ────────────────────────────────────────────────────
  const buildPayload = () => ({
    title:         form.title,
    description:   form.description,
    subject:       form.subject,
    gradeLevel:    form.gradeLevel,
    curriculum:    form.curriculum,
    referenceBook: form.referenceBook,
    chapter:       form.chapter,
    topic:         form.topic,
    topicContext:  form.topicContext,
    tags:          form.tags,
    difficulty:    form.difficulty,
    scheduledAt:   form.scheduledAt || undefined,
    questions:     form.questions.map(q => ({
      text:          q.text,
      options:       q.options,
      correctAnswer: q.correctAnswer,
      type:          q.type,
      bloomsLevel:   (q.bloomsLevel || 'remember').toLowerCase(),
      subtopic:      q.subtopic,
      points:        1,
    })),
    settings: {
      duration:               form.duration,
      passingScore:           form.passingScore,
      maxAttempts:            form.maxAttempts === 'unlimited' ? 0 : parseInt(form.maxAttempts) || 2,
      shuffleQuestions:       form.settings.shuffleQuestions,
      shuffleOptions:         form.settings.shuffleOptions,
      showResultsAfterSubmit: form.settings.showResultsAfter,
      showCorrectAnswers:     form.settings.showCorrectAnswers,
      allowBack:              form.settings.allowBack,
      emailRequired:          form.settings.emailRequired,
    },
    proctoring: {
      hrtMode:            form.settings.hrtMode,
      hrtViolationLimit:  form.settings.hrtViolationLimit,
      tabSwitchDetection: form.settings.tabSwitchDetection,
      copyPasteDisabled:  form.settings.copyPasteDisabled,
      rightClickDisabled: form.settings.rightClickDisabled,
      fullscreenRequired: form.settings.fullscreenRequired,
    },
  });

  // ── Save as Draft ─────────────────────────────────────────────────────────────
  const [draftSaving, setDraftSaving] = useState(false);

  const handleSaveDraft = async () => {
    if (!form.title.trim()) { showToast('Please enter an exam title before saving', 'warning'); return; }
    setDraftSaving(true);
    try {
      let savedId = form.examId;
      if (savedId) {
        // Already created — update the existing draft
        await examService.updateExam(savedId, { ...buildPayload(), status: 'draft' });
      } else {
        // First save — create with status: 'draft'
        const res = await examService.createExam({ ...buildPayload(), status: 'draft' });
        savedId = res.data?.exam?.id;
        if (savedId) updateForm({ examId: savedId });
      }
      showToast('Draft saved to My Exams ✓', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to save draft', 'error');
    } finally {
      setDraftSaving(false);
    }
  };

  // ── Publish to API ────────────────────────────────────────────────────────────
  const publishToAPI = async () => {
    try {
      const payload = buildPayload();
      let examId = form.examId;

      if (examId) {
        // Already saved as draft — update then publish
        await examService.updateExam(examId, payload);
      } else {
        // Fresh create
        const createRes = await examService.createExam(payload);
        examId = createRes.data?.exam?.id;
        if (examId) updateForm({ examId });
      }

      if (examId) {
        const pubRes = await examService.togglePublish(examId);
        updateForm({ code: pubRes.data?.accessCode ?? '' });
      }
    } catch (err) {
      showToast(err.message || 'Failed to publish exam', 'error');
      throw err;
    }
  };

  // Labels for nav buttons
  const NEXT_LABEL = {
    2: 'Analyse & Generate',
    5: null,  // Step 5 has its own CTA
    8: null,  // Step 8 has its own Publish button
  };

  const showNavBar = step !== 8;
  const showNextBtn = step !== 5;  // Step 5 drives its own "Generate" CTA

  // Show a centred spinner while loading the exam for editing
  if (editLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.background, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={{ color: C.textSubtle, fontFamily: Typography.fontFamily.medium, fontSize: Typography.size.sm }}>
          Loading exam…
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { padding: isWide ? 32 : 16 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Page header */}
        <View style={[styles.pageHeader, { borderBottomColor: C.border }]}>
          <View>
            <Text style={[styles.pageTitle, { color: C.foreground }]}>
              {editExamId ? 'Edit Exam' : 'Create New Exam'}
            </Text>
            <Text style={[styles.pageSub, { color: C.textSubtle }]}>
              {editExamId ? 'Update your exam details, questions, and settings.' : 'Fill in the details, add questions, and publish when ready.'}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={handleSaveDraft}
              disabled={draftSaving}
              style={[styles.draftBtn, { backgroundColor: C.surface2, borderColor: C.borderMedium, opacity: draftSaving ? 0.6 : 1 }]}
              activeOpacity={0.8}
            >
              <Feather name={draftSaving ? 'loader' : 'save'} size={15} color={C.textMuted} />
              {isWide && <Text style={[styles.draftBtnText, { color: C.textMuted }]}>{draftSaving ? 'Saving…' : 'Save Draft'}</Text>}
            </TouchableOpacity>
          </View>
        </View>

        {/* Step progress — only show after path is chosen */}
        {path !== null && (
          <StepProgress steps={stepMetas} currentStep={currentIdxInSeq + 1} />
        )}
        {path === null && step === 1 && (
          <View style={[styles.stepHint, { backgroundColor: isDark ? 'rgba(99,102,241,0.06)' : 'rgba(99,102,241,0.04)', borderColor: 'rgba(99,102,241,0.2)' }]}>
            <Feather name="info" size={14} color="#818CF8" />
            <Text style={[styles.stepHintText, { color: '#818CF8' }]}>
              Choose <Text style={{ fontFamily: Typography.fontFamily.bold }}>Add Manually</Text> or{' '}
              <Text style={{ fontFamily: Typography.fontFamily.bold }}>Generate with AI</Text> at the bottom to begin.
            </Text>
          </View>
        )}

        {/* Step content */}
        {step === 1 && (
          <Step1Details form={form} onUpdate={updateForm} onNext={chooseAI} onManual={chooseManual} />
        )}
        {step === 2 && (
          <Step2Context form={form} onUpdate={updateForm} onNext={goNext} />
        )}
        {step === 3 && (
          <Step3Subtopics form={form} onUpdate={updateForm} />
        )}
        {step === 4 && (
          <Step4Blueprint form={form} onUpdate={updateForm} />
        )}
        {step === 5 && (
          <Step5Generate form={form} onUpdate={updateForm} onNext={goNext} />
        )}
        {step === 6 && (
          <Step6Review form={form} onUpdate={updateForm} />
        )}
        {step === 7 && (
          <Step7Settings form={form} onUpdate={updateForm} />
        )}
        {step === 8 && (
          <Step8Publish
            form={form}
            onUpdate={updateForm}
            onPublish={publishToAPI}
            onSaveDraft={handleSaveDraft}
            draftSaving={draftSaving}
            onDone={() => router.replace('/dashboard/exams')}
          />
        )}

        {/* Bottom navigation bar */}
        {showNavBar && (
          <View style={[styles.navBar, { borderTopColor: C.border, backgroundColor: C.background }]}>
            {!isFirstStep && path !== null ? (
              <TouchableOpacity onPress={goPrev} style={[styles.backBtn, { backgroundColor: C.surface2, borderColor: C.borderMedium }]} activeOpacity={0.8}>
                <Feather name="arrow-left" size={15} color={C.textMuted} />
                <Text style={[styles.backBtnText, { color: C.textMuted }]}>Back</Text>
              </TouchableOpacity>
            ) : <View />}

            {showNextBtn && path !== null && !isLastStep && (
              <TouchableOpacity
                onPress={goNext}
                style={[styles.nextBtn, { overflow: 'hidden' }]}
                activeOpacity={0.85}
              >
                <View style={[StyleSheet.absoluteFillObject, { borderRadius: 12, backgroundColor: '#4F46E5' }]} />
                <Text style={styles.nextBtnText}>{NEXT_LABEL[step] || 'Continue'}</Text>
                <Feather name="arrow-right" size={15} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingBottom: 80, gap: 16 },
  // Page header
  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 20, borderBottomWidth: 1 },
  pageTitle: { fontSize: Typography.size['2xl'], fontFamily: Typography.fontFamily.extraBold },
  pageSub: { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.regular, marginTop: 3 },
  headerActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  draftBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9 },
  draftBtnText: { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.semiBold },
  // Step hint
  stepHint: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 12, borderWidth: 1, padding: 12 },
  stepHintText: { flex: 1, fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.regular, lineHeight: 17 },
  // Nav bar
  navBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, borderTopWidth: 1, marginTop: 8 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12 },
  backBtnText: { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.semiBold },
  nextBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12 },
  nextBtnText: { color: '#fff', fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.semiBold },
});
