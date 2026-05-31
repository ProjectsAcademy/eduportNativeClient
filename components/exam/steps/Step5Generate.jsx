import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, Animated, TouchableOpacity, StyleSheet,
  Platform, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { Colors } from '../../../constants/colors';
import { Typography } from '../../../constants/typography';
import { useTypewriter } from '../../../hooks/useTypewriter';
import { aiService } from '../../../services/ai/aiService';
import { Select } from '../../ui/Select';
import { Toggle } from '../../ui/Toggle';

// ── Pipeline stages ───────────────────────────────────────────────────────────

const PIPELINE_STAGES = [
  { id: 'analyse',   icon: '🔍', name: 'Analysing Topic',      desc: 'Understanding curriculum context and subtopics' },
  { id: 'blueprint', icon: '📐', name: 'Reading Blueprint',     desc: 'Mapping sections and difficulty distribution' },
  { id: 'generate',  icon: '⚡', name: 'Generating Questions',  desc: 'Creating questions with intelligent distractors' },
  { id: 'quality',   icon: '✅', name: 'Finalising',              desc: 'Structuring questions and preparing for review' },
];

const TYPING_TEXT = 'Generating curriculum-aligned questions based on your blueprint. Applying Bloom\'s taxonomy levels and cognitive design parameters…';

// ── Default advanced params ───────────────────────────────────────────────────

const DEFAULT_PARAMS = {
  // Cognitive Design
  difficulty:        'Moderate',
  cognitiveLoad:     'Medium',
  bloomsLevels:      ['Remember', 'Understand', 'Apply'],
  skillFocus:        'Mixed',
  conceptualFocus:   'Mixed',
  conceptWeightage:  'Equal Distribution',
  // Content Balance (0 = all first label, 100 = all second label)
  theoryNumerical:   50,
  conceptNumerical:  50,
  theoryProblem:     50,
  // Quality & Style
  progressionStyle:  'Random',
  topicDepth:        'Moderate',
  originality:       'Modified (paraphrased)',
  distractorQuality: 'Good (plausible errors)',
  curriculumStandard:'None / General',
  // Constraints
  misconceptions:    false,
  criticalThinking:  true,
};

// ── Ratio slider — cross-platform ────────────────────────────────────────────

function RatioSlider({ leftLabel, rightLabel, value, onChange, C, isDark }) {
  const pct = value;
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.medium, color: C.textMuted }}>
          {leftLabel} / {rightLabel}
        </Text>
        <Text style={{ fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.bold, color: '#818CF8' }}>
          {pct}% {leftLabel} · {100 - pct}% {rightLabel}
        </Text>
      </View>

      {Platform.OS === 'web' ? (
        // Native HTML range input on web — full drag support, accent-color matches brand
        <input
          type="range" min={0} max={100} step={5} value={pct}
          onChange={e => onChange(Number(e.target.value))}
          style={{ width: '100%', accentColor: '#4F46E5', cursor: 'pointer', height: 6 }}
        />
      ) : (
        // Mobile: visual bar with −10 / +10 step buttons
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity
            onPress={() => onChange(Math.max(0, pct - 10))}
            style={[ratioStyles.stepBtn, { borderColor: C.border, backgroundColor: C.surface2 }]}
          >
            <Text style={{ color: C.textMuted, fontSize: 14, fontFamily: Typography.fontFamily.bold }}>−</Text>
          </TouchableOpacity>
          <View style={[ratioStyles.barTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }]}>
            <View style={[ratioStyles.barFill, { width: `${pct}%` }]} />
          </View>
          <TouchableOpacity
            onPress={() => onChange(Math.min(100, pct + 10))}
            style={[ratioStyles.stepBtn, { borderColor: C.border, backgroundColor: C.surface2 }]}
          >
            <Text style={{ color: C.textMuted, fontSize: 14, fontFamily: Typography.fontFamily.bold }}>+</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 10, color: '#818CF8', fontFamily: Typography.fontFamily.semiBold }}>{leftLabel}</Text>
        <Text style={{ fontSize: 10, color: C.textSubtle, fontFamily: Typography.fontFamily.semiBold }}>{rightLabel}</Text>
      </View>
    </View>
  );
}

const ratioStyles = StyleSheet.create({
  stepBtn:  { width: 32, height: 32, borderRadius: 6, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  barTrack: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  barFill:  { height: '100%', backgroundColor: '#4F46E5', borderRadius: 3 },
});

// ── Blooms level chips ────────────────────────────────────────────────────────

const BLOOMS_LEVELS = ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'];

function BloomsChips({ selected, onToggle, C }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
      {BLOOMS_LEVELS.map(level => {
        const active = selected.includes(level);
        return (
          <TouchableOpacity
            key={level}
            onPress={() => onToggle(level)}
            style={[
              bloomStyles.chip,
              active
                ? { backgroundColor: 'rgba(99,102,241,0.15)', borderColor: 'rgba(99,102,241,0.4)' }
                : { backgroundColor: 'transparent', borderColor: C.border },
            ]}
            activeOpacity={0.7}
          >
            {active && <Feather name="check" size={10} color="#818CF8" />}
            <Text style={[
              bloomStyles.chipText,
              { color: active ? '#818CF8' : C.textMuted },
            ]}>{level}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const bloomStyles = StyleSheet.create({
  chip:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.semiBold },
});

// ── Accordion section header ──────────────────────────────────────────────────

function AccordionSection({ title, open, onToggle, C, children }) {
  return (
    <View style={[accordStyles.wrap, { borderColor: C.border }]}>
      <TouchableOpacity
        onPress={onToggle}
        style={[accordStyles.header, { backgroundColor: C.surface2 }]}
        activeOpacity={0.8}
      >
        <Text style={[accordStyles.title, { color: C.foreground }]}>{title}</Text>
        <Feather name={open ? 'chevron-up' : 'chevron-down'} size={14} color={C.textMuted} />
      </TouchableOpacity>
      {open && <View style={accordStyles.body}>{children}</View>}
    </View>
  );
}

const accordStyles = StyleSheet.create({
  wrap:   { borderRadius: 10, borderWidth: 1, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 11 },
  title:  { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.bold },
  body:   { padding: 14, gap: 14 },
});

// ── Main Step 5 component ─────────────────────────────────────────────────────

export function Step5Generate({ form, onUpdate, onNext }) {
  const { isDark } = useTheme();
  const C = isDark ? Colors.dark : Colors.light;

  const [running,   setRunning]   = useState(false);
  const [stageIdx,  setStageIdx]  = useState(-1);
  const [done,      setDone]      = useState(false);
  const [genError,  setGenError]  = useState('');
  const [stageProgress] = useState(PIPELINE_STAGES.map(() => new Animated.Value(0)));

  // Advanced params UI state
  const [advOpen,  setAdvOpen]  = useState(false);
  const [cogOpen,  setCogOpen]  = useState(true);
  const [balOpen,  setBalOpen]  = useState(false);
  const [qualOpen, setQualOpen] = useState(false);
  const [conOpen,  setConOpen]  = useState(false);
  const [params,   setParams]   = useState({ ...DEFAULT_PARAMS });

  const apiPromiseRef = useRef(null);
  const { displayed: typedText } = useTypewriter(TYPING_TEXT, 14, running);

  const setParam = (key, val) => setParams(prev => ({ ...prev, [key]: val }));

  const toggleBlooms = (level) => {
    setParams(prev => {
      const cur = prev.bloomsLevels;
      return {
        ...prev,
        bloomsLevels: cur.includes(level)
          ? cur.length > 1 ? cur.filter(l => l !== level) : cur  // keep at least one
          : [...cur, level],
      };
    });
  };

  const qCount = form.blueprint.reduce((s, b) => s + (parseInt(b.count) || 0), 0) || 10;
  const difficultyLabel = form.difficulty >= 7 ? 'hard' : form.difficulty >= 4 ? 'moderate' : 'easy';

  const startGeneration = () => {
    stageProgress.forEach(a => a.setValue(0));
    setRunning(true);
    setStageIdx(0);
    setDone(false);
    setGenError('');

    apiPromiseRef.current = aiService.generateQuestions({
      topic:             form.topic,
      subject:           form.subject      || '',
      context:           form.topicContext || '',
      subtopics:         form.subtopics,
      count:             qCount,
      difficulty:        difficultyLabel,
      blueprint:         form.blueprint,
      // Advanced params
      bloomsLevels:      params.bloomsLevels,
      progressionStyle:  params.progressionStyle,
      topicDepth:        params.topicDepth,
      originality:       params.originality,
      distractorQuality: params.distractorQuality,
      curriculumStandard: params.curriculumStandard,
      theoryNumerical:   params.theoryNumerical,
      misconceptions:    params.misconceptions,
      criticalThinking:  params.criticalThinking,
    });
  };

  useEffect(() => {
    if (stageIdx < 0 || stageIdx >= PIPELINE_STAGES.length) return;
    Animated.timing(stageProgress[stageIdx], {
      toValue: 1, duration: 1200, useNativeDriver: false,
    }).start(async () => {
      if (stageIdx + 1 < PIPELINE_STAGES.length) {
        setTimeout(() => setStageIdx(i => i + 1), 200);
      } else {
        try {
          const res          = await apiPromiseRef.current;
          const rawQuestions = res.data?.questions ?? [];
          if (rawQuestions.length === 0) throw new Error('No questions returned. Please try again.');
          const normalised = rawQuestions.map((q, i) => ({
            id:            q.id || String(i + 1),
            text:          q.text,
            options:       q.options,
            correctAnswer: q.correctAnswer,
            type:          q.type || 'mcq',
            bloomsLevel:   q.bloomsLevel
              ? q.bloomsLevel.charAt(0).toUpperCase() + q.bloomsLevel.slice(1)
              : 'Remember',
            subtopic: q.subtopic || '',
          }));
          onUpdate({ questions: normalised });
          setStageIdx(PIPELINE_STAGES.length);
          setDone(true);
        } catch (err) {
          const isNoKey = err?.status === 404 || String(err?.message).includes('No Gemini');
          setGenError(
            isNoKey
              ? 'Add your Gemini API key in Settings → AI Integration to generate real questions.'
              : (err?.message || 'Generation failed. Please try again.')
          );
        } finally {
          setRunning(false);
        }
      }
    });
  }, [stageIdx]);

  const getStageStatus = (i) => {
    if (stageIdx < 0) return 'idle';
    if (i < stageIdx)  return 'done';
    if (i === stageIdx) return 'running';
    return 'idle';
  };

  return (
    <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
      <Text style={[styles.cardTitle, { color: C.foreground }]}>🤖 Generate Questions</Text>
      <Text style={[styles.cardSub, { color: C.textSubtle }]}>
        Fine-tune AI parameters then generate questions based on your blueprint — {qCount} questions total.
      </Text>

      {/* ── Advanced Generation Parameters ── */}
      <View style={[styles.advWrap, { borderColor: C.border }]}>
        <TouchableOpacity
          onPress={() => setAdvOpen(v => !v)}
          style={[styles.advHeader, { backgroundColor: C.surface2 }]}
          activeOpacity={0.8}
        >
          <View style={styles.advHeaderLeft}>
            <Feather name="sliders" size={14} color={C.textMuted} />
            <Text style={[styles.advHeaderText, { color: C.foreground }]}>Advanced Generation Parameters</Text>
          </View>
          <Feather name={advOpen ? 'chevron-up' : 'chevron-down'} size={14} color={C.textMuted} />
        </TouchableOpacity>

        {advOpen && (
          <View style={[styles.advBody, { borderTopColor: C.border }]}>

            {/* Cognitive Design */}
            <AccordionSection title="Cognitive Design" open={cogOpen} onToggle={() => setCogOpen(v => !v)} C={C}>
              <View style={styles.row2}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.paramLabel, { color: C.textMuted }]}>Difficulty</Text>
                  <Select
                    value={params.difficulty}
                    onChange={v => setParam('difficulty', v)}
                    options={['Very Easy','Easy','Moderate','Hard','Very Hard'].map(l => ({ label: l, value: l }))}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.paramLabel, { color: C.textMuted }]}>Cognitive Load</Text>
                  <Select
                    value={params.cognitiveLoad}
                    onChange={v => setParam('cognitiveLoad', v)}
                    options={['Low','Medium','High'].map(l => ({ label: l, value: l }))}
                  />
                </View>
              </View>

              <View>
                <Text style={[styles.paramLabel, { color: C.textMuted }]}>Bloom's Taxonomy Levels</Text>
                <BloomsChips selected={params.bloomsLevels} onToggle={toggleBlooms} C={C} />
              </View>

              <View style={styles.row2}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.paramLabel, { color: C.textMuted }]}>Skill Assessment Focus</Text>
                  <Select
                    value={params.skillFocus}
                    onChange={v => setParam('skillFocus', v)}
                    options={['Mixed','Problem Solving','Conceptual Understanding','Memory Recall','Critical Analysis','Practical Application'].map(l => ({ label: l, value: l }))}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.paramLabel, { color: C.textMuted }]}>Conceptual Focus</Text>
                  <Select
                    value={params.conceptualFocus}
                    onChange={v => setParam('conceptualFocus', v)}
                    options={['Mixed','Definitions & Theory','Formulas & Derivations','Real-world Applications','Proofs & Reasoning'].map(l => ({ label: l, value: l }))}
                  />
                </View>
              </View>

              <View>
                <Text style={[styles.paramLabel, { color: C.textMuted }]}>Concept Weightage</Text>
                <Select
                  value={params.conceptWeightage}
                  onChange={v => setParam('conceptWeightage', v)}
                  options={[
                    'Equal Distribution',
                    'Core Heavy — 70% Core / 30% Applied',
                    'Applied Heavy — 30% Core / 70% Applied',
                    'Foundations First — 80% Basic / 20% Advanced',
                    'Advanced Focus — 20% Basic / 80% Advanced',
                    'Topic Proportional (by subtopic %)',
                  ].map(l => ({ label: l, value: l }))}
                />
              </View>
            </AccordionSection>

            {/* Content Balance */}
            <AccordionSection title="Content Balance" open={balOpen} onToggle={() => setBalOpen(v => !v)} C={C}>
              <RatioSlider
                leftLabel="Theory" rightLabel="Numerical"
                value={params.theoryNumerical}
                onChange={v => setParam('theoryNumerical', v)}
                C={C} isDark={isDark}
              />
              <RatioSlider
                leftLabel="Conceptual" rightLabel="Numerical"
                value={params.conceptNumerical}
                onChange={v => setParam('conceptNumerical', v)}
                C={C} isDark={isDark}
              />
              <RatioSlider
                leftLabel="Theory" rightLabel="Problem-Solving"
                value={params.theoryProblem}
                onChange={v => setParam('theoryProblem', v)}
                C={C} isDark={isDark}
              />
            </AccordionSection>

            {/* Quality & Style */}
            <AccordionSection title="Quality & Style" open={qualOpen} onToggle={() => setQualOpen(v => !v)} C={C}>
              <View style={styles.row2}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.paramLabel, { color: C.textMuted }]}>Progression Style</Text>
                  <Select
                    value={params.progressionStyle}
                    onChange={v => setParam('progressionStyle', v)}
                    options={['Random','Easy to Hard','Bloom\'s Progression','Topic-wise','Concept-by-Concept'].map(l => ({ label: l, value: l }))}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.paramLabel, { color: C.textMuted }]}>Topic Depth</Text>
                  <Select
                    value={params.topicDepth}
                    onChange={v => setParam('topicDepth', v)}
                    options={['Surface','Moderate','Deep','Expert'].map(l => ({ label: l, value: l }))}
                  />
                </View>
              </View>

              <View style={styles.row2}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.paramLabel, { color: C.textMuted }]}>Question Originality</Text>
                  <Select
                    value={params.originality}
                    onChange={v => setParam('originality', v)}
                    options={['Standard (textbook-style)','Modified (paraphrased)','Original (AI-crafted)','Novel (unique scenarios)'].map(l => ({ label: l, value: l }))}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.paramLabel, { color: C.textMuted }]}>Distractor Quality (MCQ)</Text>
                  <Select
                    value={params.distractorQuality}
                    onChange={v => setParam('distractorQuality', v)}
                    options={['Basic (obviously wrong)','Good (plausible errors)','Excellent (common misconceptions)','Expert (near-correct traps)'].map(l => ({ label: l, value: l }))}
                  />
                </View>
              </View>

              <View>
                <Text style={[styles.paramLabel, { color: C.textMuted }]}>Curriculum Standard</Text>
                <Select
                  value={params.curriculumStandard}
                  onChange={v => setParam('curriculumStandard', v)}
                  options={['None / General','CBSE','Cambridge (IGCSE/A-Level)','Common Core (CCSS)','IB (International Baccalaureate)','Edexcel','AQA','SAT / ACT Aligned'].map(l => ({ label: l, value: l }))}
                />
              </View>
            </AccordionSection>

            {/* Constraints & Focus */}
            <AccordionSection title="Constraints & Focus" open={conOpen} onToggle={() => setConOpen(v => !v)} C={C}>
              <Toggle
                value={params.misconceptions}
                onChange={v => setParam('misconceptions', v)}
                label="Misconception-Based Questions"
                description="Include questions that target common student misconceptions"
              />
              <View style={[styles.divider, { borderColor: C.border }]} />
              <Toggle
                value={params.criticalThinking}
                onChange={v => setParam('criticalThinking', v)}
                label="Emphasise Critical Thinking"
                description="Prioritise questions that require analysis and evaluation"
              />
            </AccordionSection>

          </View>
        )}
      </View>

      {/* ── Pipeline & Generate ── */}

      {running && (
        <View style={[styles.typingBox, { backgroundColor: isDark ? 'rgba(99,102,241,0.06)' : 'rgba(99,102,241,0.04)', borderColor: 'rgba(99,102,241,0.2)' }]}>
          <View style={styles.typingHeader}>
            <View style={styles.aiDot} />
            <Text style={[styles.typingLabel, { color: '#818CF8' }]}>AI is working…</Text>
          </View>
          <Text style={[styles.typingText, { color: C.foreground }]}>
            {typedText}<Text style={{ color: '#4F46E5' }}>▌</Text>
          </Text>
        </View>
      )}

      {!!genError && (
        <View style={[styles.errorBanner, { backgroundColor: 'rgba(239,68,68,0.07)', borderColor: 'rgba(239,68,68,0.25)' }]}>
          <Feather name="alert-circle" size={14} color="#EF4444" />
          <Text style={[styles.errorText, { color: '#EF4444' }]}>{genError}</Text>
        </View>
      )}

      <View style={{ gap: 8 }}>
        {PIPELINE_STAGES.map((stage, i) => {
          const status = getStageStatus(i);
          return (
            <View
              key={stage.id}
              style={[
                styles.stage,
                status === 'running' && { borderColor: 'rgba(79,70,229,0.4)', backgroundColor: isDark ? 'rgba(79,70,229,0.06)' : 'rgba(79,70,229,0.04)' },
                status === 'done'    && { borderColor: 'rgba(16,185,129,0.3)',  backgroundColor: isDark ? 'rgba(16,185,129,0.04)' : 'rgba(16,185,129,0.02)' },
                status === 'idle'    && { borderColor: C.border, backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' },
              ]}
            >
              <View style={[styles.stageAccent, { backgroundColor: status === 'done' ? '#10B981' : status === 'running' ? '#4F46E5' : 'transparent' }]} />
              <View style={[
                styles.stageIcon,
                status === 'running' && { backgroundColor: 'rgba(79,70,229,0.15)' },
                status === 'done'    && { backgroundColor: 'rgba(16,185,129,0.15)' },
                status === 'idle'    && { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
              ]}>
                <Text style={{ fontSize: 18 }}>{stage.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.stageName, { color: C.foreground }]}>{stage.name}</Text>
                <Text style={[styles.stageDesc, { color: C.textSubtle }]}>{stage.desc}</Text>
                {status === 'running' && (
                  <Animated.View style={[styles.stageBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
                    <Animated.View style={[styles.stageBarFill, {
                      width: stageProgress[i].interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                    }]} />
                  </Animated.View>
                )}
              </View>
              <Text style={[
                styles.stageStatus,
                status === 'running' && { color: '#818CF8' },
                status === 'done'    && { color: '#10B981' },
                status === 'idle'    && { color: C.textSubtle },
              ]}>
                {status === 'idle' ? 'Waiting' : status === 'running' ? 'Running…' : 'Done ✓'}
              </Text>
            </View>
          );
        })}
      </View>

      {done && (
        <View style={[styles.doneBox, { backgroundColor: 'rgba(16,185,129,0.06)', borderColor: 'rgba(16,185,129,0.3)' }]}>
          <Feather name="check-circle" size={20} color="#10B981" />
          <View style={{ flex: 1 }}>
            <Text style={[styles.doneTile, { color: '#10B981' }]}>Generation Complete!</Text>
            <Text style={[styles.doneSub, { color: C.textSubtle }]}>
              {form.questions.length} questions generated. Review them in the next step.
            </Text>
          </View>
        </View>
      )}

      {!running && !done && (
        <TouchableOpacity onPress={startGeneration} style={styles.genBtn} activeOpacity={0.85}>
          <LinearGradient colors={['#4F46E5', '#7C3AED']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[StyleSheet.absoluteFillObject, { borderRadius: 12 }]} />
          <Feather name="zap" size={16} color="#fff" />
          <Text style={styles.genBtnText}>Generate Questions with AI</Text>
        </TouchableOpacity>
      )}
      {done && (
        <TouchableOpacity onPress={onNext} style={styles.genBtn} activeOpacity={0.85}>
          <LinearGradient colors={['#10B981', '#059669']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[StyleSheet.absoluteFillObject, { borderRadius: 12 }]} />
          <Text style={styles.genBtnText}>Review Questions →</Text>
        </TouchableOpacity>
      )}
      {!!genError && !running && (
        <TouchableOpacity onPress={startGeneration} style={styles.genBtn} activeOpacity={0.85}>
          <LinearGradient colors={['#4F46E5', '#7C3AED']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[StyleSheet.absoluteFillObject, { borderRadius: 12 }]} />
          <Feather name="refresh-cw" size={15} color="#fff" />
          <Text style={styles.genBtnText}>Try Again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card:        { borderRadius: 16, borderWidth: 1, padding: 20, gap: 16 },
  cardTitle:   { fontSize: Typography.size.lg, fontFamily: Typography.fontFamily.bold },
  cardSub:     { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.regular, lineHeight: 19, marginTop: -8 },
  // Advanced params
  advWrap:     { borderRadius: 10, borderWidth: 1, overflow: 'hidden' },
  advHeader:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12 },
  advHeaderLeft:{ flexDirection: 'row', alignItems: 'center', gap: 8 },
  advHeaderText:{ fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.semiBold },
  advBody:     { padding: 14, gap: 12, borderTopWidth: 1 },
  row2:        { flexDirection: 'row', gap: 12 },
  paramLabel:  { fontSize: 11, fontFamily: Typography.fontFamily.bold, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 },
  divider:     { borderTopWidth: 1 },
  // Pipeline
  typingBox:   { borderRadius: 12, borderWidth: 1, padding: 14, gap: 8 },
  typingHeader:{ flexDirection: 'row', alignItems: 'center', gap: 8 },
  aiDot:       { width: 8, height: 8, borderRadius: 4, backgroundColor: '#818CF8' },
  typingLabel: { fontSize: 11, fontFamily: Typography.fontFamily.bold, textTransform: 'uppercase', letterSpacing: 0.5 },
  typingText:  { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.regular, lineHeight: 20 },
  errorBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  errorText:   { flex: 1, fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.medium, lineHeight: 17 },
  stage:       { flexDirection: 'row', alignItems: 'flex-start', borderRadius: 12, borderWidth: 1, padding: 12, gap: 10, overflow: 'hidden' },
  stageAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, borderRadius: 2 },
  stageIcon:   { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  stageName:   { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.bold },
  stageDesc:   { fontSize: 11, fontFamily: Typography.fontFamily.regular, marginTop: 2 },
  stageBar:    { height: 3, borderRadius: 4, marginTop: 8, overflow: 'hidden' },
  stageBarFill:{ height: '100%', backgroundColor: '#4F46E5', borderRadius: 4 },
  stageStatus: { fontSize: 11, fontFamily: Typography.fontFamily.bold, flexShrink: 0, marginTop: 2 },
  doneBox:     { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderRadius: 12, borderWidth: 1, padding: 14 },
  doneTile:    { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.bold },
  doneSub:     { fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.regular, lineHeight: 17, marginTop: 2 },
  genBtn:      { borderRadius: 12, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  genBtnText:  { color: '#fff', fontSize: Typography.size.base, fontFamily: Typography.fontFamily.semiBold },
});
