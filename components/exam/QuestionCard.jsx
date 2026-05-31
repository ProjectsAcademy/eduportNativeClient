import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';

const LETTERS = ['A', 'B', 'C', 'D'];
const BLOOMS = ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'];

export function QuestionCard({ question, index, onUpdate, onDelete, readOnly = false }) {
  const { isDark } = useTheme();
  const C = isDark ? Colors.dark : Colors.light;
  const [expanded, setExpanded] = useState(!readOnly);

  const isTF = question.type === 'true-false';
  const options = isTF ? ['True', 'False'] : question.options;

  const update = (key, value) => onUpdate?.({ ...question, [key]: value });
  const updateOption = (i, text) => {
    const opts = [...question.options];
    opts[i] = text;
    update('options', opts);
  };

  return (
    <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
      {/* ── Header ── */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        {/* Row 1: badge + question text + control icons
            RC-1 FIX: subtopicChip moved OUT of this row so qText gets full flex space.
            headerControls contains ONLY X and chevron (~40px fixed) instead of
            chip + X + chevron (~158px), giving qText ~204px on a 360px device. */}
        <View style={styles.headerRow}>
          <View style={[styles.qNumBadge, { backgroundColor: 'rgba(99,102,241,0.12)' }]}>
            <Text style={styles.qNum}>Q{index + 1}</Text>
          </View>

          <Text
            style={[styles.qText, { color: C.foreground }]}
            numberOfLines={expanded ? undefined : 2}
          >
            {question.text || (
              <Text style={{ color: C.textSubtle, fontStyle: 'italic' }}>New question…</Text>
            )}
          </Text>

          {/* Only icons here — no chip — keeps this row narrow */}
          <View style={styles.headerControls}>
            {!readOnly && (
              <TouchableOpacity
                onPress={() => onDelete?.(question.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="x" size={16} color={C.textSubtle} />
              </TouchableOpacity>
            )}
            <Feather
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={C.textSubtle}
            />
          </View>
        </View>

        {/* Row 2: subtopic chip — separate row so it never competes with qText width */}
        {question.subtopic ? (
          <View style={styles.headerMeta}>
            <View style={styles.subtopicChip}>
              <Text style={styles.subtopicChipText} numberOfLines={1}>
                {question.subtopic}
              </Text>
            </View>
          </View>
        ) : null}
      </TouchableOpacity>

      {/* ── Body ── */}
      {expanded && (
        <View style={[styles.body, { borderTopColor: C.border }]}>
          {/* Question text input */}
          {!readOnly ? (
            <TextInput
              value={question.text}
              onChangeText={text => update('text', text)}
              placeholder="Type your question here…"
              placeholderTextColor={C.textSubtle}
              multiline
              style={[styles.qInput, { color: C.foreground, borderColor: C.borderMedium, backgroundColor: C.surface2 }]}
              autoComplete="off"
              textContentType="none"
              importantForAutofill="no"
            />
          ) : null}

          {/* Options */}
          <View style={{ gap: 8, marginTop: readOnly ? 0 : 12 }}>
            {options.map((opt, i) => {
              const isCorrect = question.correctAnswer === i;
              return (
                <View key={i} style={[
                  styles.optRow,
                  {
                    borderColor: isCorrect ? 'rgba(16,185,129,0.4)' : C.border,
                    backgroundColor: isCorrect ? 'rgba(16,185,129,0.05)' : 'transparent',
                  },
                ]}>
                  {/* Letter badge — fixed width, never shrinks */}
                  <View style={[styles.letterBadge, {
                    backgroundColor: isCorrect
                      ? 'rgba(16,185,129,0.15)'
                      : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                  }]}>
                    <Text style={[styles.letter, { color: isCorrect ? '#10B981' : C.textSubtle }]}>
                      {LETTERS[i]}
                    </Text>
                  </View>

                  {/* Option text — flex:1 fills remaining space, wraps naturally */}
                  {!readOnly && !isTF ? (
                    <TextInput
                      value={opt}
                      onChangeText={text => updateOption(i, text)}
                      placeholder={`Option ${LETTERS[i]}`}
                      placeholderTextColor={C.textSubtle}
                      style={[styles.optInput, { color: C.foreground, outlineStyle: 'none' }]}
                      autoComplete="off"
                      textContentType="none"
                      importantForAutofill="no"
                    />
                  ) : (
                    <Text style={[styles.optText, { color: C.foreground }]}>{opt}</Text>
                  )}

                  {/* Correct answer radio — flex-shrink:0 but compact (no text label on narrow) */}
                  <TouchableOpacity
                    onPress={() => !readOnly && update('correctAnswer', i)}
                    style={styles.radioWrap}
                    activeOpacity={0.7}
                    disabled={readOnly}
                  >
                    <View style={[styles.radio, { borderColor: isCorrect ? '#10B981' : C.borderMedium }]}>
                      {isCorrect && <View style={styles.radioDot} />}
                    </View>
                    {/* "Correct" label only on wide screens to avoid crowding narrow devices */}
                    {isCorrect && Platform.OS === 'web' && (
                      <Text style={styles.correctLabel}>Correct</Text>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>

          {/* Footer: Bloom's level + type pill */}
          {!readOnly && (
            <View style={[styles.footer, { borderTopColor: C.border }]}>
              <View style={styles.footerLeft}>
                <Text style={[styles.footerLabel, { color: C.textSubtle }]}>Bloom's:</Text>
                <TouchableOpacity
                  onPress={() => {
                    const idx = BLOOMS.indexOf(question.bloomsLevel);
                    update('bloomsLevel', BLOOMS[(idx + 1) % BLOOMS.length]);
                  }}
                  style={[styles.bloomsChip, { backgroundColor: 'rgba(99,102,241,0.10)' }]}
                >
                  <Text style={[styles.bloomsText, { color: '#818CF8' }]}>
                    {question.bloomsLevel || 'Remember'}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.typePill, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }]}>
                <Text style={[styles.typeText, { color: C.textMuted }]}>
                  {question.type === 'true-false'   ? 'T/F'
                   : question.type === 'short-answer' ? 'Short Ans.'
                   : question.type === 'essay'        ? 'Essay'
                   : question.type === 'fill-blank'   ? 'Fill Blank'
                   : question.type === 'matching'     ? 'Matching'
                   : question.type === 'ordering'     ? 'Ordering'
                   : 'MCQ'}
                </Text>
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 14, borderWidth: 1, overflow: 'hidden', marginBottom: 12 },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: { padding: 14, gap: 6 },

  // Row 1: Q badge + question text + control icons
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  qNumBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    flexShrink: 0,   // fixed width
    marginTop: 1,
  },
  qNum: {
    fontSize: 10,
    fontFamily: Typography.fontFamily.extraBold,
    color: '#818CF8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  qText: {
    flex: 1,                              // takes ALL remaining space in row
    fontSize: Typography.size.sm,
    fontFamily: Typography.fontFamily.semiBold,
    lineHeight: 19,
  },
  // Only chevron + delete icon — ~40px fixed.
  // RC-1: keeping chip OUT of this view gives qText ~204px on 360px device.
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
    marginTop: 1,
  },

  // Row 2: subtopic chip on its own line — zero impact on qText width
  headerMeta: {
    flexDirection: 'row',
    paddingLeft: 2,  // slight indent to align under qText
  },
  subtopicChip: {
    backgroundColor: 'rgba(245,158,11,0.12)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    maxWidth: '70%',  // never wider than 70% of card width
  },
  subtopicChipText: {
    fontSize: 9,
    fontFamily: Typography.fontFamily.bold,
    color: '#FBBF24',
  },

  // ── Body ────────────────────────────────────────────────────────────────────
  body: { borderTopWidth: 1, padding: 14, paddingTop: 12 },
  qInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: Typography.size.sm,
    fontFamily: Typography.fontFamily.regular,
    lineHeight: 20,
    minHeight: 64,
    textAlignVertical: 'top',
    outlineStyle: 'none',
  },

  // ── Options ──────────────────────────────────────────────────────────────────
  optRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 8,
  },
  letterBadge: {
    width: 26,
    height: 26,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  letter: { fontSize: 11, fontFamily: Typography.fontFamily.extraBold },
  optInput: { flex: 1, fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.regular },
  optText:  { flex: 1, fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.regular, lineHeight: 18 },
  // Radio wrap — compact: no text label on native (saves ~50px per row on narrow screens)
  radioWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' },
  correctLabel: {
    fontSize: 10,
    fontFamily: Typography.fontFamily.bold,
    color: '#10B981',
  },

  // ── Footer ───────────────────────────────────────────────────────────────────
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  footerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  footerLabel: { fontSize: 11, fontFamily: Typography.fontFamily.medium },
  bloomsChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  bloomsText: { fontSize: 10, fontFamily: Typography.fontFamily.bold },
  typePill:   { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  typeText:   { fontSize: 10, fontFamily: Typography.fontFamily.bold, textTransform: 'uppercase', letterSpacing: 0.5 },
});
