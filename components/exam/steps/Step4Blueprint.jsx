import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { Colors } from '../../../constants/colors';
import { Typography } from '../../../constants/typography';
import { Select } from '../../ui/Select';

const TYPE_OPTIONS = [
  { label: 'MCQ',           value: 'mcq' },
  { label: 'True / False',  value: 'true-false' },
  { label: 'Short Answer',  value: 'short-answer' },
  { label: 'Essay',         value: 'essay' },
  { label: 'Fill in Blank', value: 'fill-blank' },
];

const DIFF_OPTIONS = [
  { label: 'Easy',     value: 'easy' },
  { label: 'Moderate', value: 'moderate' },
  { label: 'Hard',     value: 'hard' },
  { label: 'Mixed',    value: 'mixed' },
];

const DIFF_COLORS = {
  easy:     '#10B981',
  moderate: '#F59E0B',
  hard:     '#EF4444',
  mixed:    '#8B5CF6',
};

const TEMPLATES = {
  quiz: [
    { name: 'Section A — Objective', type: 'mcq',          count: 10, marksPerQ: 1,  difficulty: 'easy' },
    { name: 'Section B — T/F',       type: 'true-false',   count: 5,  marksPerQ: 1,  difficulty: 'easy' },
  ],
  midterm: [
    { name: 'Section A — MCQ',       type: 'mcq',          count: 20, marksPerQ: 1,  difficulty: 'easy' },
    { name: 'Section B — Short Ans', type: 'short-answer', count: 10, marksPerQ: 3,  difficulty: 'moderate' },
    { name: 'Section C — Essay',     type: 'essay',        count: 2,  marksPerQ: 10, difficulty: 'hard' },
  ],
  final: [
    { name: 'Part I — MCQ',          type: 'mcq',          count: 30, marksPerQ: 1,  difficulty: 'easy' },
    { name: 'Part II — Short Ans',   type: 'short-answer', count: 10, marksPerQ: 4,  difficulty: 'moderate' },
    { name: 'Part III — Long Ans',   type: 'essay',        count: 5,  marksPerQ: 10, difficulty: 'hard' },
  ],
  jee: [
    { name: 'Physics — MCQ',         type: 'mcq',          count: 10, marksPerQ: 4,  difficulty: 'hard' },
    { name: 'Chemistry — MCQ',       type: 'mcq',          count: 10, marksPerQ: 4,  difficulty: 'hard' },
    { name: 'Mathematics — MCQ',     type: 'mcq',          count: 10, marksPerQ: 4,  difficulty: 'hard' },
    { name: 'Numerical Value',       type: 'fill-blank',   count: 15, marksPerQ: 4,  difficulty: 'hard' },
  ],
  semester: [
    { name: 'Part A — Objective',    type: 'mcq',          count: 20, marksPerQ: 1,  difficulty: 'easy' },
    { name: 'Part B — Short Qs',     type: 'short-answer', count: 8,  marksPerQ: 5,  difficulty: 'moderate' },
    { name: 'Part C — Long Qs',      type: 'essay',        count: 4,  marksPerQ: 15, difficulty: 'hard' },
  ],
};

export function Step4Blueprint({ form, onUpdate }) {
  const { isDark } = useTheme();
  const C = isDark ? Colors.dark : Colors.light;

  const sections = form.blueprint;

  const [numDrafts, setNumDrafts] = useState({});
  const draftKey  = (id, field) => `${id}|${field}`;
  const getDraft  = (id, field, stored) =>
    draftKey(id, field) in numDrafts ? numDrafts[draftKey(id, field)] : String(stored);
  const setDraft  = (id, field, raw) =>
    setNumDrafts(prev => ({ ...prev, [draftKey(id, field)]: raw }));
  const commitDraft = (id, field, min = 1) => {
    const key = draftKey(id, field);
    if (!(key in numDrafts)) return;
    const parsed = parseInt(numDrafts[key], 10);
    updateSection(id, field, isNaN(parsed) || parsed < min ? min : parsed);
    setNumDrafts(prev => { const n = { ...prev }; delete n[key]; return n; });
  };

  const applyTemplate = (key) => {
    const t = TEMPLATES[key];
    if (!t) return;
    onUpdate({ blueprint: t.map((s, i) => ({ ...s, id: String(i + 1) })) });
  };

  const addSection = () => {
    const id = String(Date.now());
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    onUpdate({
      blueprint: [
        ...sections,
        { id, name: `Section ${letters[sections.length] || sections.length + 1}`, type: 'mcq', count: 10, marksPerQ: 1, difficulty: 'moderate' },
      ],
    });
  };

  const updateSection = (id, key, value) =>
    onUpdate({ blueprint: sections.map(s => s.id === id ? { ...s, [key]: value } : s) });

  const removeSection = (id) =>
    onUpdate({ blueprint: sections.filter(s => s.id !== id) });

  const duplicateSection = (id) => {
    const idx = sections.findIndex(s => s.id === id);
    if (idx < 0) return;
    const copy = { ...sections[idx], id: String(Date.now()), name: sections[idx].name + ' (Copy)' };
    const next = [...sections];
    next.splice(idx + 1, 0, copy);
    onUpdate({ blueprint: next });
  };

  const moveSection = (id, dir) => {
    const idx = sections.findIndex(s => s.id === id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= sections.length) return;
    const next = [...sections];
    [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
    onUpdate({ blueprint: next });
  };

  const totalQ = sections.reduce((s, x) => s + (parseInt(x.count) || 0), 0);
  const totalM = sections.reduce((s, x) => s + (parseInt(x.count) || 0) * (parseInt(x.marksPerQ) || 1), 0);
  const easyQ  = sections.filter(s => s.difficulty === 'easy').reduce((s, x) => s + (parseInt(x.count) || 0), 0);
  const modQ   = sections.filter(s => s.difficulty === 'moderate').reduce((s, x) => s + (parseInt(x.count) || 0), 0);
  const hardQ  = sections.filter(s => s.difficulty === 'hard').reduce((s, x) => s + (parseInt(x.count) || 0), 0);

  return (
    <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { color: C.foreground }]}>📐 Paper Blueprint</Text>
          <Text style={[styles.cardSub, { color: C.textSubtle }]}>
            Define structure, marks distribution, and difficulty balance.
          </Text>
        </View>
        <TouchableOpacity onPress={addSection} style={styles.addBtn} activeOpacity={0.8}>
          <Feather name="plus" size={14} color="#fff" />
          <Text style={styles.addBtnText}>Add Section</Text>
        </TouchableOpacity>
      </View>

      {/* Template shortcuts */}
      <View style={styles.templateRow}>
        <Text style={[styles.templateLabel, { color: C.textSubtle }]}>TEMPLATES</Text>
        {Object.keys(TEMPLATES).map(key => (
          <TouchableOpacity
            key={key}
            onPress={() => applyTemplate(key)}
            style={[styles.templateChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', borderColor: C.border }]}
            activeOpacity={0.7}
          >
            <Text style={[styles.templateChipText, { color: C.textMuted }]}>
              {key === 'jee' ? 'JEE Style' : key.charAt(0).toUpperCase() + key.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Summary badges */}
      <View style={styles.badges}>
        <View style={[styles.badge, { backgroundColor: 'rgba(99,102,241,0.10)', borderColor: 'rgba(99,102,241,0.2)' }]}>
          <Feather name="file-text" size={12} color="#818CF8" />
          <Text style={[styles.badgeText, { color: '#818CF8' }]}>{totalQ} Questions</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: 'rgba(16,185,129,0.10)', borderColor: 'rgba(16,185,129,0.2)' }]}>
          <Feather name="star" size={12} color="#10B981" />
          <Text style={[styles.badgeText, { color: '#10B981' }]}>{totalM} Total Marks</Text>
        </View>
        {totalQ > 0 && (
          <View style={[styles.badge, { backgroundColor: 'rgba(245,158,11,0.10)', borderColor: 'rgba(245,158,11,0.2)' }]}>
            <Feather name="bar-chart-2" size={12} color="#F59E0B" />
            <Text style={[styles.badgeText, { color: '#F59E0B' }]}>
              E:{easyQ} M:{modQ} H:{hardQ}
            </Text>
          </View>
        )}
      </View>

      {/* Column headers — paddingLeft=32 skips the index bubble (24) + gap (8) */}
      {sections.length > 0 && (
        <View style={[styles.colHeaders, { paddingLeft: 32 }]}>
          <Text style={[styles.colHeader, { color: C.textSubtle, flex: 1 }]}>Section Name</Text>
          <Text style={[styles.colHeader, { color: C.textSubtle, width: 110 }]}>Type</Text>
          <Text style={[styles.colHeader, { color: C.textSubtle, width: 62, textAlign: 'center' }]}>Qs</Text>
          <Text style={[styles.colHeader, { color: C.textSubtle, width: 56, textAlign: 'center' }]}>Marks/Q</Text>
          <Text style={[styles.colHeader, { color: C.textSubtle, width: 90 }]}>Difficulty</Text>
          <Text style={[styles.colHeader, { color: C.textSubtle, width: 40, textAlign: 'center' }]}>Total</Text>
          <Text style={[styles.colHeader, { color: C.textSubtle, width: 108, textAlign: 'center' }]}>Actions</Text>
        </View>
      )}

      {/* Section rows */}
      {sections.length === 0 ? (
        <View style={[styles.empty, { backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', borderColor: C.border }]}>
          <Feather name="layout" size={32} color={C.textSubtle} style={{ opacity: 0.35 }} />
          <Text style={[styles.emptyTitle, { color: C.textSubtle }]}>No sections yet</Text>
          <Text style={[styles.emptySub, { color: C.textSubtle }]}>Click <Text style={{ fontFamily: Typography.fontFamily.bold }}>Add Section</Text> or choose a template.</Text>
        </View>
      ) : (
        sections.map((s, i) => {
          const diffColor = DIFF_COLORS[s.difficulty] ?? '#F59E0B';
          const totalPts  = (parseInt(s.count) || 0) * (parseInt(s.marksPerQ) || 1);
          return (
            <View
              key={s.id}
              style={[
                styles.sectionRow,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)', borderColor: C.border },
                Platform.OS === 'web' && { flexWrap: 'nowrap' },
              ]}
            >
              {/* Index bubble — fixed 24px, flex-shrink:0 */}
              <View style={[styles.secNum, { backgroundColor: 'rgba(99,102,241,0.12)', flexShrink: 0 }]}>
                <Text style={styles.secNumText}>{i + 1}</Text>
              </View>

              {/* Name — flex:1 fills remaining space */}
              <TextInput
                value={s.name}
                onChangeText={v => updateSection(s.id, 'name', v)}
                style={[styles.secName, { color: C.foreground, borderColor: C.border, backgroundColor: C.surface2 }]}
                autoComplete="off"
                textContentType="none"
                importantForAutofill="no"
                placeholder="Section name…"
                placeholderTextColor={C.textSubtle}
              />

              {/* Type — width matches col header 110 */}
              <View style={{ width: 110, flexShrink: 0 }}>
                <Select value={s.type} onChange={v => updateSection(s.id, 'type', v)} options={TYPE_OPTIONS} />
              </View>

              {/* Count — width:62 matches col header */}
              <View style={[styles.numWrap, { width: 62, flexShrink: 0, borderColor: C.borderMedium, backgroundColor: C.surface2 }]}>
                <TextInput
                  value={getDraft(s.id, 'count', s.count)}
                  onChangeText={v => setDraft(s.id, 'count', v.replace(/[^0-9]/g, ''))}
                  onBlur={() => commitDraft(s.id, 'count', 1)}
                  keyboardType="number-pad"
                  style={[styles.numInput, { color: C.foreground }]}
                  maxLength={3}
                  autoComplete="off"
                  importantForAutofill="no"
                />
                <Text style={[styles.numLabel, { color: C.textSubtle }]}>Qs</Text>
              </View>

              {/* Marks per Q — width:56 matches col header */}
              <View style={[styles.numWrap, { width: 56, flexShrink: 0, borderColor: C.borderMedium, backgroundColor: C.surface2 }]}>
                <TextInput
                  value={getDraft(s.id, 'marksPerQ', s.marksPerQ)}
                  onChangeText={v => setDraft(s.id, 'marksPerQ', v.replace(/[^0-9]/g, ''))}
                  onBlur={() => commitDraft(s.id, 'marksPerQ', 1)}
                  keyboardType="number-pad"
                  style={[styles.numInput, { color: C.foreground }]}
                  maxLength={2}
                  autoComplete="off"
                  importantForAutofill="no"
                />
                <Text style={[styles.numLabel, { color: C.textSubtle }]}>M</Text>
              </View>

              {/* Difficulty — width:90 matches col header */}
              <View style={{ width: 90, flexShrink: 0 }}>
                <Select
                  value={s.difficulty}
                  onChange={v => updateSection(s.id, 'difficulty', v)}
                  options={DIFF_OPTIONS}
                />
              </View>

              {/* Total — width:40 matches col header, centered */}
              <View style={{ width: 40, flexShrink: 0, alignItems: 'center' }}>
                <Text style={[styles.secTotal, { color: diffColor }]}>{totalPts}</Text>
              </View>

              {/* Action buttons — width:108 = 4×24 + 3×4gap, matches col header */}
              <View style={[styles.secActions, { flexShrink: 0 }]}>
                <TouchableOpacity
                  onPress={() => moveSection(s.id, -1)}
                  disabled={i === 0}
                  style={[styles.actionBtn, { borderColor: C.border, backgroundColor: C.surface2, opacity: i === 0 ? 0.3 : 1 }]}
                  hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                >
                  <Feather name="chevron-up" size={11} color={C.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => moveSection(s.id, 1)}
                  disabled={i === sections.length - 1}
                  style={[styles.actionBtn, { borderColor: C.border, backgroundColor: C.surface2, opacity: i === sections.length - 1 ? 0.3 : 1 }]}
                  hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                >
                  <Feather name="chevron-down" size={11} color={C.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => duplicateSection(s.id)}
                  style={[styles.actionBtn, { borderColor: C.border, backgroundColor: C.surface2 }]}
                  hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                >
                  <Feather name="copy" size={11} color={C.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => removeSection(s.id)}
                  style={[styles.actionBtn, { borderColor: 'rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.08)' }]}
                  hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                >
                  <Feather name="x" size={11} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}

      {/* Tip */}
      <View style={[styles.tip, { backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', borderColor: C.border }]}>
        <Text style={[styles.tipText, { color: C.textSubtle }]}>
          💡 Each section becomes an AI generation batch — type and difficulty guide question style and complexity.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card:          { borderRadius: 16, borderWidth: 1, padding: 20, gap: 14 },
  header:        { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  cardTitle:     { fontSize: Typography.size.lg, fontFamily: Typography.fontFamily.bold },
  cardSub:       { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.regular, lineHeight: 19, marginTop: 2 },
  addBtn:        { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#4F46E5', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, flexShrink: 0 },
  addBtnText:    { color: '#fff', fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.semiBold },
  templateRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  templateLabel: { fontSize: 10, fontFamily: Typography.fontFamily.bold, textTransform: 'uppercase', letterSpacing: 0.5 },
  templateChip:  { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  templateChipText: { fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.medium },
  badges:        { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  badge:         { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  badgeText:     { fontSize: 12, fontFamily: Typography.fontFamily.bold },
  colHeaders:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  colHeader:     { fontSize: 9, fontFamily: Typography.fontFamily.bold, textTransform: 'uppercase', letterSpacing: 0.6 },
  // On web: nowrap keeps all fields on one line. On native: wrap is fine for narrow screens.
  sectionRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, borderWidth: 1, padding: 10, ...Platform.select({ default: { flexWrap: 'wrap' } }) },
  secNum:        { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  secNumText:    { fontSize: 11, fontFamily: Typography.fontFamily.bold, color: '#818CF8' },
  secName: {
    flex: 1, minWidth: 60,
    fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.semiBold,
    borderWidth: 1, borderRadius: 7, paddingHorizontal: 8, paddingVertical: 6,
    ...Platform.select({ web: { outlineStyle: 'none' } }),
  },
  numWrap:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 6, borderWidth: 1, paddingHorizontal: 6, paddingVertical: 4, gap: 3 },
  numInput:      { width: 28, fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.bold, textAlign: 'center', ...Platform.select({ web: { outlineStyle: 'none' } }) },
  numLabel:      { fontSize: 10, fontFamily: Typography.fontFamily.medium },
  secTotal:      { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.extraBold, textAlign: 'center' },
  secActions:    { flexDirection: 'row', gap: 4 },
  actionBtn:     { width: 24, height: 24, borderRadius: 5, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  empty:         { alignItems: 'center', gap: 8, paddingVertical: 28, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed' },
  emptyTitle:    { fontSize: Typography.size.base, fontFamily: Typography.fontFamily.semiBold },
  emptySub:      { fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.regular, textAlign: 'center' },
  tip:           { borderRadius: 10, borderWidth: 1, padding: 12 },
  tipText:       { fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.regular, lineHeight: 18 },
});
