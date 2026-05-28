import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Platform, useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { Colors } from '../../../constants/colors';
import { Typography } from '../../../constants/typography';
import { Input } from '../../ui/Input';
import { Select } from '../../ui/Select';

const DIFFICULTY_LABELS = {
  1: 'Very Easy', 2: 'Easy', 3: 'Easy-Moderate', 4: 'Moderate-Easy', 5: 'Moderate',
  6: 'Moderate-Hard', 7: 'Hard', 8: 'Hard', 9: 'Very Hard', 10: 'Extreme',
};
const DIFFICULTY_COLOR = (v) =>
  v <= 3 ? '#10B981' : v <= 5 ? '#F59E0B' : v <= 7 ? '#F97316' : '#EF4444';

const ATTEMPTS_OPTIONS = [
  { label: '1 attempt', value: '1' },
  { label: '2 attempts', value: '2' },
  { label: '3 attempts', value: '3' },
  { label: 'Unlimited', value: 'unlimited' },
];

export function Step1Details({ form, onUpdate, onNext, onManual }) {
  const { isDark } = useTheme();
  const C = isDark ? Colors.dark : Colors.light;
  const { width } = useWindowDimensions();
  const isWide = Platform.OS === 'web' && width >= 768;
  const [tagInput, setTagInput] = useState('');

  const addTag = (text) => {
    const trimmed = text.trim();
    if (trimmed && !form.tags.includes(trimmed)) {
      onUpdate({ tags: [...form.tags, trimmed] });
    }
    setTagInput('');
  };

  const removeTag = (tag) => onUpdate({ tags: form.tags.filter(t => t !== tag) });

  const color = DIFFICULTY_COLOR(form.difficulty);

  const isValid = form.title.trim().length > 0;

  return (
    <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
      <Text style={[styles.cardTitle, { color: C.foreground }]}>📋 Exam Details</Text>

      <Input
        label="Exam Title *"
        value={form.title}
        onChangeText={v => onUpdate({ title: v })}
        placeholder="e.g. Mathematics Final Exam — Grade 10"
        autoComplete="off"
      />

      {/* Description */}
      <View style={styles.group}>
        <Text style={[styles.label, { color: C.textSubtle }]}>Description</Text>
        <TextInput
          value={form.description}
          onChangeText={v => onUpdate({ description: v })}
          placeholder="Brief description, coverage, and instructions for students…"
          placeholderTextColor={C.textSubtle}
          multiline
          numberOfLines={3}
          style={[styles.textarea, { color: C.foreground, borderColor: C.borderMedium, backgroundColor: C.surface2 }]}
        />
      </View>

      {/* Duration / Passing Score / Max Attempts */}
      <View style={[styles.row3, { flexDirection: isWide ? 'row' : 'column' }]}>
        <View style={{ flex: 1 }}>
          <Input
            label="Duration (minutes)"
            value={String(form.duration)}
            onChangeText={v => onUpdate({ duration: parseInt(v) || 60 })}
            keyboardType="number-pad"
            icon={<Feather name="clock" size={15} color={C.textSubtle} />}
            autoComplete="off"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Input
            label="Passing Score (%)"
            value={String(form.passingScore)}
            onChangeText={v => onUpdate({ passingScore: parseInt(v) || 60 })}
            keyboardType="number-pad"
            autoComplete="off"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Select
            label="Max Attempts"
            value={form.maxAttempts}
            onChange={v => onUpdate({ maxAttempts: v })}
            options={ATTEMPTS_OPTIONS}
          />
        </View>
      </View>

      {/* Schedule date */}
      <View style={styles.group}>
        <Text style={[styles.label, { color: C.textSubtle }]}>Scheduled Date & Time</Text>
        <TextInput
          value={form.scheduledAt}
          onChangeText={v => onUpdate({ scheduledAt: v })}
          placeholder="YYYY-MM-DD HH:MM"
          placeholderTextColor={C.textSubtle}
          style={[styles.input, { color: C.foreground, borderColor: C.borderMedium, backgroundColor: C.surface2 }]}
          autoComplete="off"
        />
      </View>

      {/* Tags */}
      <View style={styles.group}>
        <Text style={[styles.label, { color: C.textSubtle }]}>Tags</Text>
        <View style={[styles.tagWrap, { backgroundColor: C.surface2, borderColor: C.borderMedium }]}>
          {form.tags.map(tag => (
            <View key={tag} style={styles.tagChip}>
              <Text style={styles.tagText}>{tag}</Text>
              <TouchableOpacity onPress={() => removeTag(tag)} hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}>
                <Feather name="x" size={11} color="#818CF8" />
              </TouchableOpacity>
            </View>
          ))}
          <TextInput
            value={tagInput}
            onChangeText={setTagInput}
            placeholder={form.tags.length === 0 ? 'Add tag…' : ''}
            placeholderTextColor={C.textSubtle}
            style={[styles.tagInput, { color: C.foreground, outlineStyle: 'none' }]}
            onSubmitEditing={() => addTag(tagInput)}
            blurOnSubmit={false}
            autoComplete="off"
          />
        </View>
        <Text style={[styles.hint, { color: C.textSubtle }]}>Press Enter to add a tag</Text>
      </View>

      {/* Difficulty */}
      <View style={styles.group}>
        <View style={styles.diffHeader}>
          <Text style={[styles.label, { color: C.textSubtle }]}>Difficulty Level</Text>
          <View style={[styles.diffBadge, { backgroundColor: color + '18' }]}>
            <Text style={[styles.diffBadgeText, { color }]}>
              Level {form.difficulty} — {DIFFICULTY_LABELS[form.difficulty]}
            </Text>
          </View>
          <Text style={[styles.diffNum, { color: C.foreground }]}>
            {form.difficulty}<Text style={[styles.diffTotal, { color: C.textSubtle }]}>/10</Text>
          </Text>
        </View>

        {/* Segments selector — works on all platforms */}
        <View style={styles.diffSegments}>
          {Array.from({ length: 10 }, (_, i) => i + 1).map(n => {
            const active = n === form.difficulty;
            const below  = n <= form.difficulty;
            const c = DIFFICULTY_COLOR(n);
            return (
              <TouchableOpacity
                key={n}
                onPress={() => onUpdate({ difficulty: n })}
                style={[styles.diffSeg, { backgroundColor: below ? c + '25' : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', borderColor: active ? c : 'transparent', borderWidth: active ? 2 : 0 }]}
                activeOpacity={0.7}
              >
                <Text style={[styles.diffSegText, { color: below ? c : C.textSubtle }]}>{n}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={styles.diffLabels}>
          <Text style={[styles.diffLabelText, { color: '#10B981' }]}>Easy</Text>
          <Text style={[styles.diffLabelText, { color: C.textSubtle }]}>Moderate</Text>
          <Text style={[styles.diffLabelText, { color: '#EF4444' }]}>Hard</Text>
        </View>
      </View>

      {/* Path choice */}
      <View style={[styles.pathRow, { flexDirection: isWide ? 'row' : 'column' }]}>
        <TouchableOpacity
          onPress={isValid ? onManual : undefined}
          activeOpacity={isValid ? 0.8 : 0.5}
          style={[styles.pathBtn, { backgroundColor: C.surface2, borderColor: C.border, opacity: isValid ? 1 : 0.5 }]}
        >
          <Feather name="edit-2" size={22} color={C.textMuted} />
          <Text style={[styles.pathBtnTitle, { color: C.foreground }]}>Add Manually</Text>
          <Text style={[styles.pathBtnSub, { color: C.textSubtle }]}>Create & add questions yourself</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={isValid ? onNext : undefined}
          activeOpacity={isValid ? 0.8 : 0.5}
          style={[styles.pathBtn, { opacity: isValid ? 1 : 0.5, overflow: 'hidden', borderWidth: 0 }]}
        >
          <LinearGradient
            colors={['rgba(79,70,229,0.12)', 'rgba(124,58,237,0.08)']}
            style={[StyleSheet.absoluteFillObject, { borderRadius: 14 }]}
          />
          <View style={[StyleSheet.absoluteFillObject, { borderRadius: 14, borderWidth: 1, borderColor: 'rgba(99,102,241,0.3)' }]} />
          <Feather name="cpu" size={22} color="#818CF8" />
          <Text style={[styles.pathBtnTitle, { color: '#818CF8' }]}>Generate with AI</Text>
          <Text style={[styles.pathBtnSub, { color: '#818CF8', opacity: 0.7 }]}>Auto-generate from topic & context</Text>
        </TouchableOpacity>
      </View>

      {!isValid && (
        <Text style={[styles.hint, { color: '#EF4444', textAlign: 'center', marginTop: 8 }]}>
          Please enter an exam title to continue
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 20, gap: 16 },
  cardTitle: { fontSize: Typography.size.lg, fontFamily: Typography.fontFamily.bold, marginBottom: 4 },
  group: { gap: 6 },
  label: { fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.semiBold, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.regular, outlineStyle: 'none' },
  textarea: { borderRadius: 12, borderWidth: 1, padding: 12, fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.regular, lineHeight: 20, minHeight: 80, textAlignVertical: 'top', outlineStyle: 'none' },
  row3: { gap: 12 },
  hint: { fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.regular, marginTop: 2 },
  // Tags
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, padding: 10, borderRadius: 12, borderWidth: 1, minHeight: 48 },
  tagChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: 'rgba(79,70,229,0.15)', borderRadius: 20 },
  tagText: { fontSize: 12, fontFamily: Typography.fontFamily.semiBold, color: '#818CF8' },
  tagInput: { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.regular, minWidth: 80, flex: 1 },
  // Difficulty
  diffHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  diffBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  diffBadgeText: { fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.bold },
  diffNum: { marginLeft: 'auto', fontSize: Typography.size['2xl'], fontFamily: Typography.fontFamily.extraBold, lineHeight: 28 },
  diffTotal: { fontSize: Typography.size.xs },
  diffSegments: { flexDirection: 'row', gap: 4 },
  diffSeg: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  diffSegText: { fontSize: 11, fontFamily: Typography.fontFamily.bold },
  diffLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  diffLabelText: { fontSize: 10, fontFamily: Typography.fontFamily.semiBold },
  // Path
  pathRow: { gap: 12, marginTop: 4 },
  pathBtn: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 18, gap: 8, alignItems: 'center' },
  pathBtnTitle: { fontSize: Typography.size.base, fontFamily: Typography.fontFamily.bold },
  pathBtnSub: { fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.regular, textAlign: 'center' },
});
