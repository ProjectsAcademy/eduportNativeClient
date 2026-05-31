import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
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
];
const DIFF_OPTIONS = [
  { label: 'Easy',     value: 'easy' },
  { label: 'Moderate', value: 'moderate' },
  { label: 'Hard',     value: 'hard' },
  { label: 'Mixed',    value: 'mixed' },
];
const TEMPLATES = {
  quiz:     [{ name: 'General Knowledge', type: 'mcq',  count: 10, marksPerQ: 1, difficulty: 'easy' }],
  midterm:  [{ name: 'Section A — MCQ',   type: 'mcq',  count: 20, marksPerQ: 1, difficulty: 'moderate' },
             { name: 'Section B — Short', type: 'short-answer', count: 5, marksPerQ: 4, difficulty: 'moderate' }],
  final:    [{ name: 'Part I — MCQ',      type: 'mcq',  count: 30, marksPerQ: 1, difficulty: 'mixed' },
             { name: 'Part II — Essays',  type: 'essay', count: 5,  marksPerQ: 10, difficulty: 'hard' }],
};

export function Step4Blueprint({ form, onUpdate }) {
  const { isDark } = useTheme();
  const C = isDark ? Colors.dark : Colors.light;

  const sections = form.blueprint;

  // Raw string state for number inputs — allows empty/partial strings while typing.
  // Key format: `${sectionId}|${field}`. Draft is cleared on blur after commit.
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
    onUpdate({ blueprint: [...sections, { id, name: 'New Section', type: 'mcq', count: 10, marksPerQ: 1, difficulty: 'moderate' }] });
  };

  const updateSection = (id, key, value) => {
    onUpdate({ blueprint: sections.map(s => s.id === id ? { ...s, [key]: value } : s) });
  };

  const removeSection = (id) => onUpdate({ blueprint: sections.filter(s => s.id !== id) });

  const totalQ = sections.reduce((s, x) => s + (parseInt(x.count) || 0), 0);
  const totalM = sections.reduce((s, x) => s + (parseInt(x.count) || 0) * (parseInt(x.marksPerQ) || 1), 0);

  return (
    <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { color: C.foreground }]}>📐 Paper Blueprint</Text>
          <Text style={[styles.cardSub, { color: C.textSubtle }]}>
            Define the structure and marks distribution for your exam.
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
            <Text style={[styles.templateChipText, { color: C.textMuted }]}>{key.charAt(0).toUpperCase() + key.slice(1)}</Text>
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
      </View>

      {/* Section rows */}
      {sections.length === 0 ? (
        <View style={[styles.empty, { backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', borderColor: C.border }]}>
          <Feather name="layout" size={32} color={C.textSubtle} style={{ opacity: 0.35 }} />
          <Text style={[styles.emptyTitle, { color: C.textSubtle }]}>No sections yet</Text>
          <Text style={[styles.emptySub, { color: C.textSubtle }]}>Click <Text style={{ fontFamily: Typography.fontFamily.bold }}>Add Section</Text> or choose a template.</Text>
        </View>
      ) : (
        sections.map((s, i) => (
          <View key={s.id} style={[styles.sectionRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderColor: C.border }]}>
            {/* Left: index + name */}
            <View style={[styles.secNum, { backgroundColor: 'rgba(99,102,241,0.12)' }]}>
              <Text style={styles.secNumText}>{i + 1}</Text>
            </View>
            <TextInput
              value={s.name}
              onChangeText={v => updateSection(s.id, 'name', v)}
              style={[styles.secName, { color: C.foreground, outlineStyle: 'none' }]}
              autoComplete="off"
              textContentType="none"
              importantForAutofill="no"
            />
            {/* Type */}
            <View style={{ width: 120 }}>
              <Select value={s.type} onChange={v => updateSection(s.id, 'type', v)} options={TYPE_OPTIONS} />
            </View>
            {/* Count */}
            <View style={[styles.numWrap, { borderColor: C.borderMedium, backgroundColor: C.surface2 }]}>
              <TextInput
                value={getDraft(s.id, 'count', s.count)}
                onChangeText={v => setDraft(s.id, 'count', v.replace(/[^0-9]/g, ''))}
                onBlur={() => commitDraft(s.id, 'count', 1)}
                keyboardType="number-pad"
                style={[styles.numInput, { color: C.foreground, outlineStyle: 'none' }]}
                maxLength={3}
                autoComplete="off"
                importantForAutofill="no"
              />
              <Text style={[styles.numLabel, { color: C.textSubtle }]}>Qs</Text>
            </View>
            {/* Marks per Q */}
            <View style={[styles.numWrap, { borderColor: C.borderMedium, backgroundColor: C.surface2 }]}>
              <TextInput
                value={getDraft(s.id, 'marksPerQ', s.marksPerQ)}
                onChangeText={v => setDraft(s.id, 'marksPerQ', v.replace(/[^0-9]/g, ''))}
                onBlur={() => commitDraft(s.id, 'marksPerQ', 1)}
                keyboardType="number-pad"
                style={[styles.numInput, { color: C.foreground, outlineStyle: 'none' }]}
                maxLength={2}
                autoComplete="off"
                importantForAutofill="no"
              />
              <Text style={[styles.numLabel, { color: C.textSubtle }]}>Marks</Text>
            </View>
            {/* Total */}
            <Text style={[styles.secTotal, { color: C.foreground }]}>{(parseInt(s.count)||0) * (parseInt(s.marksPerQ)||1)}</Text>
            {/* Delete */}
            <TouchableOpacity onPress={() => removeSection(s.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="trash-2" size={14} color={C.textSubtle} />
            </TouchableOpacity>
          </View>
        ))
      )}

      {/* Tip */}
      <View style={[styles.tip, { backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', borderColor: C.border }]}>
        <Text style={[styles.tipText, { color: C.textSubtle }]}>
          💡 Each section becomes an AI generation batch with the specified type and difficulty.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 20, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  cardTitle: { fontSize: Typography.size.lg, fontFamily: Typography.fontFamily.bold },
  cardSub: { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.regular, lineHeight: 19, marginTop: 2 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#4F46E5', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, flexShrink: 0 },
  addBtnText: { color: '#fff', fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.semiBold },
  templateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  templateLabel: { fontSize: 10, fontFamily: Typography.fontFamily.bold, textTransform: 'uppercase', letterSpacing: 0.5 },
  templateChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  templateChipText: { fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.medium },
  badges: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  badgeText: { fontSize: 12, fontFamily: Typography.fontFamily.bold },
  // Section rows
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, borderWidth: 1, padding: 10, flexWrap: 'wrap' },
  secNum: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  secNumText: { fontSize: 11, fontFamily: Typography.fontFamily.bold, color: '#818CF8' },
  secName: { flex: 1, fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.semiBold, minWidth: 80 },
  numWrap: { flexDirection: 'row', alignItems: 'center', borderRadius: 6, borderWidth: 1, paddingHorizontal: 6, paddingVertical: 4, gap: 3 },
  numInput: { width: 30, fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.bold, textAlign: 'center' },
  numLabel: { fontSize: 10, fontFamily: Typography.fontFamily.medium },
  secTotal: { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.extraBold, minWidth: 24, textAlign: 'center' },
  // Empty
  empty: { alignItems: 'center', gap: 8, paddingVertical: 28, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed' },
  emptyTitle: { fontSize: Typography.size.base, fontFamily: Typography.fontFamily.semiBold },
  emptySub: { fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.regular, textAlign: 'center' },
  // Tip
  tip: { borderRadius: 10, borderWidth: 1, padding: 12 },
  tipText: { fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.regular, lineHeight: 18 },
});
