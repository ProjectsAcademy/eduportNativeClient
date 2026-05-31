import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, Animated, TouchableOpacity, StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { Colors } from '../../../constants/colors';
import { Typography } from '../../../constants/typography';
import { useTypewriter } from '../../../hooks/useTypewriter';
import { aiService } from '../../../services/ai/aiService';

const PIPELINE_STAGES = [
  { id: 'analyse',   icon: '🔍', name: 'Analysing Topic',      desc: 'Understanding curriculum context and subtopics' },
  { id: 'blueprint', icon: '📐', name: 'Reading Blueprint',     desc: 'Mapping sections and difficulty distribution' },
  { id: 'generate',  icon: '⚡', name: 'Generating Questions',  desc: 'Creating MCQ options with intelligent distractors' },
  { id: 'quality',   icon: '✅', name: 'Finalising',              desc: 'Structuring questions and preparing for review' },
];

const TYPING_TEXT = 'Generating curriculum-aligned questions based on your blueprint. Applying Bloom\'s taxonomy levels and cognitive design parameters…';

export function Step5Generate({ form, onUpdate, onNext }) {
  const { isDark } = useTheme();
  const C = isDark ? Colors.dark : Colors.light;

  const [running,   setRunning]   = useState(false);
  const [stageIdx,  setStageIdx]  = useState(-1);
  const [done,      setDone]      = useState(false);
  const [genError,  setGenError]  = useState('');
  const [stageProgress] = useState(PIPELINE_STAGES.map(() => new Animated.Value(0)));

  // The in-flight API promise — started immediately when user clicks Generate
  // so the network call runs in parallel with the pipeline animation.
  const apiPromiseRef = useRef(null);

  const { displayed: typedText } = useTypewriter(TYPING_TEXT, 14, running);

  const qCount = form.blueprint.reduce((s, b) => s + (parseInt(b.count) || 0), 0) || 10;
  const difficultyLabel = form.difficulty >= 7 ? 'hard' : form.difficulty >= 4 ? 'moderate' : 'easy';

  const startGeneration = () => {
    // Reset progress bars
    stageProgress.forEach(a => a.setValue(0));

    setRunning(true);
    setStageIdx(0);
    setDone(false);
    setGenError('');

    // Fire the real Gemini API call immediately — runs parallel to animation.
    // blueprint is passed so the backend generates the correct type per section.
    apiPromiseRef.current = aiService.generateQuestions({
      topic:      form.topic,
      subject:    form.subject      || '',
      context:    form.topicContext || '',
      subtopics:  form.subtopics,
      count:      qCount,
      difficulty: difficultyLabel,
      blueprint:  form.blueprint,   // carries type per section (MCQ, essay, etc.)
    });
  };

  useEffect(() => {
    if (stageIdx < 0 || stageIdx >= PIPELINE_STAGES.length) return;

    Animated.timing(stageProgress[stageIdx], {
      toValue:  1,
      duration: 1200,
      useNativeDriver: false,
    }).start(async () => {
      if (stageIdx + 1 < PIPELINE_STAGES.length) {
        setTimeout(() => setStageIdx(i => i + 1), 200);
      } else {
        // All stages animated — now await the API response
        try {
          const res          = await apiPromiseRef.current;
          const rawQuestions = res.data?.questions ?? [];

          if (rawQuestions.length === 0) throw new Error('No questions returned. Please try again.');

          // Capitalise bloomsLevel for the UI (backend sends lowercase)
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
          setStageIdx(PIPELINE_STAGES.length); // advance past all stages → Quality Check shows Done ✓
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
        AI will generate questions based on your blueprint — {qCount} questions total.
      </Text>

      {/* Typing animation */}
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

      {/* Error */}
      {!!genError && (
        <View style={[styles.errorBanner, { backgroundColor: 'rgba(239,68,68,0.07)', borderColor: 'rgba(239,68,68,0.25)' }]}>
          <Feather name="alert-circle" size={14} color="#EF4444" />
          <Text style={[styles.errorText, { color: '#EF4444' }]}>{genError}</Text>
        </View>
      )}

      {/* Pipeline stages */}
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

      {/* Done state */}
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

      {/* Buttons */}
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
