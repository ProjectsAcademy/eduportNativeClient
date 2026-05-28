import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { Colors } from '../../../constants/colors';
import { Typography } from '../../../constants/typography';
import { Input } from '../../ui/Input';
import { Select } from '../../ui/Select';

const QUICK_TOPICS = [
  'Quadratic Equations', 'Laws of Motion', 'World War II',
  'Photosynthesis', 'French Revolution', 'Organic Chemistry',
  'Data Structures', 'Trigonometry', 'Cell Biology',
];

const GRADE_OPTIONS = [
  { label: '— Select —',      value: '' },
  { label: 'Grade 6',         value: 'grade-6' },
  { label: 'Grade 7',         value: 'grade-7' },
  { label: 'Grade 8',         value: 'grade-8' },
  { label: 'Grade 9',         value: 'grade-9' },
  { label: 'Grade 10',        value: 'grade-10' },
  { label: 'Grade 11',        value: 'grade-11' },
  { label: 'Grade 12',        value: 'grade-12' },
  { label: 'University',      value: 'university' },
  { label: 'Professional',    value: 'professional' },
];

export function Step2Context({ form, onUpdate, onNext }) {
  const { isDark } = useTheme();
  const C = isDark ? Colors.dark : Colors.light;

  const isValid = form.topic.trim().length > 0;

  return (
    <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, { color: C.foreground }]}>🎓 Academic Context</Text>
        <Text style={[styles.cardSub, { color: C.textSubtle }]}>
          Help AI generate curriculum-aligned questions by providing context.
        </Text>
      </View>

      <View style={styles.row2}>
        <View style={{ flex: 1 }}>
          <Input
            label="Subject / Category"
            value={form.subject}
            onChangeText={v => onUpdate({ subject: v })}
            placeholder="e.g. Mathematics, Physics…"
            icon={<Feather name="book" size={15} color={C.textSubtle} />}
            autoComplete="off"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Select
            label="Grade / Level"
            value={form.gradeLevel}
            onChange={v => onUpdate({ gradeLevel: v })}
            options={GRADE_OPTIONS}
          />
        </View>
      </View>

      <View style={styles.row2}>
        <View style={{ flex: 1 }}>
          <Input
            label="Curriculum"
            value={form.curriculum}
            onChangeText={v => onUpdate({ curriculum: v })}
            placeholder="e.g. CBSE, Cambridge, Common Core"
            autoComplete="off"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Input
            label="Reference Book"
            value={form.referenceBook}
            onChangeText={v => onUpdate({ referenceBook: v })}
            placeholder="e.g. NCERT, Thomas Calculus"
            autoComplete="off"
          />
        </View>
      </View>

      <Input
        label="Chapter"
        value={form.chapter}
        onChangeText={v => onUpdate({ chapter: v })}
        placeholder="e.g. Chapter 5 — Integration, Unit 3…"
        autoComplete="off"
      />

      {/* Main topic — most important field */}
      <View style={[styles.topicWrap, { borderColor: 'rgba(99,102,241,0.3)', backgroundColor: isDark ? 'rgba(99,102,241,0.05)' : 'rgba(99,102,241,0.03)' }]}>
        <Text style={[styles.topicLabel, { color: '#818CF8' }]}>MAIN TOPIC *</Text>
        <Input
          value={form.topic}
          onChangeText={v => onUpdate({ topic: v })}
          placeholder="e.g. Quadratic Equations, World War II…"
          autoComplete="off"
        />
        <Text style={[styles.hint, { color: C.textSubtle }]}>
          Be specific — a focused topic produces better AI subtopics
        </Text>
      </View>

      {/* Topic context */}
      <Input
        label="Topic Context (optional)"
        value={form.topicContext}
        onChangeText={v => onUpdate({ topicContext: v })}
        placeholder="Focus on numerical problems, emphasise real-world applications, include common misconceptions…"
        multiline
        numberOfLines={4}
        autoComplete="off"
      />

      {/* Quick topics */}
      <View style={{ gap: 8 }}>
        <Text style={[styles.quickLabel, { color: C.textSubtle }]}>QUICK TOPICS</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRow}>
          {QUICK_TOPICS.map(t => (
            <TouchableOpacity
              key={t}
              onPress={() => onUpdate({ topic: t })}
              style={[styles.quickChip, {
                backgroundColor: form.topic === t ? 'rgba(99,102,241,0.12)' : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                borderColor: form.topic === t ? 'rgba(99,102,241,0.3)' : C.border,
              }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.quickChipText, { color: form.topic === t ? '#818CF8' : C.textSubtle }]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Analyse button */}
      <TouchableOpacity
        onPress={isValid ? onNext : undefined}
        activeOpacity={isValid ? 0.85 : 0.5}
        style={[styles.analyseBtn, { opacity: isValid ? 1 : 0.5, overflow: 'hidden' }]}
      >
        <LinearGradient colors={['#4F46E5', '#7C3AED']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFillObject} />
        <Feather name="cpu" size={16} color="#fff" />
        <Text style={styles.analyseBtnText}>Analyse & Generate Subtopics</Text>
      </TouchableOpacity>

      {!isValid && (
        <Text style={[styles.hint, { color: '#EF4444', textAlign: 'center' }]}>
          Please enter a main topic to continue
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 20, gap: 14 },
  cardHeader: { gap: 4 },
  cardTitle: { fontSize: Typography.size.lg, fontFamily: Typography.fontFamily.bold },
  cardSub: { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.regular, lineHeight: 19 },
  row2: { flexDirection: 'row', gap: 12 },
  topicWrap: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 8 },
  topicLabel: { fontSize: 10, fontFamily: Typography.fontFamily.extraBold, letterSpacing: 1, textTransform: 'uppercase' },
  hint: { fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.regular, lineHeight: 16 },
  quickLabel: { fontSize: 10, fontFamily: Typography.fontFamily.bold, textTransform: 'uppercase', letterSpacing: 0.8 },
  quickRow: { gap: 8, paddingBottom: 4 },
  quickChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  quickChipText: { fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.medium },
  analyseBtn: { borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, marginTop: 4 },
  analyseBtnText: { color: '#fff', fontSize: Typography.size.base, fontFamily: Typography.fontFamily.semiBold },
});
