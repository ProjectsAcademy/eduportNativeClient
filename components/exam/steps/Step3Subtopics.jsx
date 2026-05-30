import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { Colors } from '../../../constants/colors';
import { Typography } from '../../../constants/typography';
import { ProgressBar } from '../../ui/ProgressBar';
import { aiService } from '../../../services/ai/aiService';

const SUBTOPIC_COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#8B5CF6', '#EC4899', '#14B8A6'];

// Fallback — used only when Gemini key is missing or the API call fails
function fallbackSubtopics() {
  const names = ['Core Concepts', 'Applications', 'Problem Solving', 'Theory & Definitions'];
  const baseP = Math.floor(100 / names.length);
  const rem   = 100 - baseP * names.length;
  return names.map((name, i) => ({
    id:         String(i + 1),
    name,
    percentage: baseP + (i === 0 ? rem : 0),
    color:      SUBTOPIC_COLORS[i % SUBTOPIC_COLORS.length],
  }));
}

function redistribute(subtopics, changedId, newPct) {
  const others = subtopics.filter(s => s.id !== changedId);
  const remaining = Math.max(0, 100 - newPct);
  const total = others.reduce((s, x) => s + x.percentage, 0);
  return subtopics.map(s => {
    if (s.id === changedId) return { ...s, percentage: newPct };
    const ratio = total > 0 ? s.percentage / total : 1 / others.length;
    return { ...s, percentage: Math.round(ratio * remaining) };
  });
}

export function Step3Subtopics({ form, onUpdate }) {
  const { isDark } = useTheme();
  const C = isDark ? Colors.dark : Colors.light;
  const [newName, setNewName] = useState('');
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError]     = useState('');

  // ── Call Gemini to generate subtopics when this step is first shown ──────────
  useEffect(() => {
    if (form.subtopics.length > 0 || !form.topic) return; // already have them

    const generate = async () => {
      setGenerating(true);
      setGenError('');
      try {
        const res = await aiService.analyseSubtopics(
          form.topic,
          form.subject || '',
          form.topicContext || '',
        );
        const raw = res.data?.subtopics ?? [];
        if (raw.length === 0) throw new Error('Empty response');

        const withIds = raw.map((s, i) => ({
          id:         String(i + 1),
          name:       s.name,
          percentage: Number(s.percentage) || Math.floor(100 / raw.length),
          color:      SUBTOPIC_COLORS[i % SUBTOPIC_COLORS.length],
        }));
        onUpdate({ subtopics: withIds });
      } catch (err) {
        // Gemini key not configured or API error — show fallback + inform user
        const msg = err?.status === 404 || err?.message?.includes('No Gemini')
          ? 'Add your Gemini API key in Settings → AI Integration to generate smart subtopics.'
          : 'Could not reach AI — showing default subtopics. You can edit them below.';
        setGenError(msg);
        onUpdate({ subtopics: fallbackSubtopics() });
      } finally {
        setGenerating(false);
      }
    };

    generate();
  }, []); // run once when step mounts

  const regenerate = () => {
    onUpdate({ subtopics: [] }); // clear triggers the effect… but effect won't re-run (deps=[])
    // Instead call directly
    setGenerating(true);
    setGenError('');
    aiService.analyseSubtopics(form.topic, form.subject || '', form.topicContext || '')
      .then(res => {
        const raw = res.data?.subtopics ?? [];
        if (raw.length === 0) throw new Error('Empty response');
        onUpdate({
          subtopics: raw.map((s, i) => ({
            id: String(i + 1),
            name: s.name,
            percentage: Number(s.percentage) || Math.floor(100 / raw.length),
            color: SUBTOPIC_COLORS[i % SUBTOPIC_COLORS.length],
          })),
        });
        setGenError('');
      })
      .catch(err => {
        const msg = err?.status === 404 || err?.message?.includes('No Gemini')
          ? 'Add your Gemini API key in Settings → AI Integration.'
          : 'Regeneration failed. Please try again.';
        setGenError(msg);
      })
      .finally(() => setGenerating(false));
  };

  const subtopics = form.subtopics;
  const total     = subtopics.reduce((s, x) => s + x.percentage, 0);
  const totalOk   = Math.abs(total - 100) <= 1;

  const updatePct = (id, raw) => {
    const pct = Math.min(99, Math.max(1, parseInt(raw) || 1));
    onUpdate({ subtopics: redistribute(subtopics, id, pct) });
  };

  const updateName = (id, name) => {
    onUpdate({ subtopics: subtopics.map(s => s.id === id ? { ...s, name } : s) });
  };

  const removeSubtopic = (id) => {
    const remaining = subtopics.filter(s => s.id !== id);
    if (remaining.length === 0) return;
    const freed   = subtopics.find(s => s.id === id)?.percentage || 0;
    const updated = remaining.map((s, i) =>
      i === 0 ? { ...s, percentage: Math.min(99, s.percentage + freed) } : s
    );
    onUpdate({ subtopics: updated });
  };

  const addSubtopic = () => {
    const name = newName.trim();
    if (!name) return;
    const newPct  = Math.floor(100 / (subtopics.length + 1));
    const adjusted = subtopics.map(s => ({
      ...s,
      percentage: Math.max(1, Math.floor(s.percentage * subtopics.length / (subtopics.length + 1))),
    }));
    const id = String(Date.now());
    onUpdate({ subtopics: [...adjusted, { id, name, percentage: newPct, color: SUBTOPIC_COLORS[subtopics.length % SUBTOPIC_COLORS.length] }] });
    setNewName('');
  };

  return (
    <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { color: C.foreground }]}>🗂️ Subtopics & Coverage</Text>
          <Text style={[styles.cardSub, { color: C.textSubtle }]}>
            AI-generated subtopics for{' '}
            <Text style={{ color: '#818CF8', fontFamily: Typography.fontFamily.semiBold }}>
              {form.topic || 'your topic'}
            </Text>.
            {' '}Adjust percentages — they redistribute automatically.
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <View style={styles.totalWrap}>
            <Text style={[styles.totalNum, { color: totalOk ? '#818CF8' : '#EF4444' }]}>{total}</Text>
            <Text style={[styles.totalLabel, { color: C.textSubtle }]}>/100%</Text>
          </View>
          {/* Regenerate button */}
          <TouchableOpacity
            onPress={regenerate}
            disabled={generating}
            style={[styles.regenBtn, { borderColor: 'rgba(99,102,241,0.3)', backgroundColor: 'rgba(99,102,241,0.08)', opacity: generating ? 0.5 : 1 }]}
            activeOpacity={0.7}
          >
            <Feather name={generating ? 'loader' : 'refresh-cw'} size={12} color="#818CF8" />
            <Text style={styles.regenText}>{generating ? 'Generating…' : 'Regenerate'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Total bar */}
      <ProgressBar value={totalOk ? 100 : Math.min(100, total)} color={totalOk ? '#4F46E5' : '#EF4444'} height={6} />

      {/* Loading state */}
      {generating && subtopics.length === 0 && (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color="#6366F1" />
          <Text style={[styles.loadingText, { color: C.textSubtle }]}>
            Gemini is analysing "{form.topic}"…
          </Text>
        </View>
      )}

      {/* Error / info message */}
      {!!genError && (
        <View style={[styles.errorBanner, { backgroundColor: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.25)' }]}>
          <Feather name="info" size={13} color="#F59E0B" />
          <Text style={[styles.errorText, { color: '#F59E0B' }]}>{genError}</Text>
        </View>
      )}

      {/* Subtopic rows */}
      {subtopics.map(s => (
        <View key={s.id} style={[styles.row, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderColor: C.border }]}>
          <View style={[styles.colorDot, { backgroundColor: s.color }]} />
          <TextInput
            value={s.name}
            onChangeText={v => updateName(s.id, v)}
            style={[styles.nameInput, { color: C.foreground, outlineStyle: 'none' }]}
            autoComplete="off"
            textContentType="none"
            importantForAutofill="no"
          />
          <View style={[styles.pctWrap, { backgroundColor: C.surface2, borderColor: C.borderMedium }]}>
            <TextInput
              value={String(s.percentage)}
              onChangeText={v => updatePct(s.id, v)}
              keyboardType="number-pad"
              style={[styles.pctInput, { color: C.foreground, outlineStyle: 'none' }]}
              maxLength={3}
              autoComplete="off"
              importantForAutofill="no"
            />
            <Text style={[styles.pctSign, { color: C.textSubtle }]}>%</Text>
          </View>
          <View style={styles.barWrap}>
            <ProgressBar value={s.percentage} color={s.color} height={5} animated={false} />
          </View>
          <TouchableOpacity onPress={() => removeSubtopic(s.id)} style={styles.removeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="x" size={14} color={C.textSubtle} />
          </TouchableOpacity>
        </View>
      ))}

      {/* Add row */}
      <View style={styles.addRow}>
        <TextInput
          value={newName}
          onChangeText={setNewName}
          placeholder="Add a subtopic…"
          placeholderTextColor={C.textSubtle}
          style={[styles.addInput, { color: C.foreground, borderColor: C.borderMedium, backgroundColor: C.surface2, outlineStyle: 'none' }]}
          onSubmitEditing={addSubtopic}
          blurOnSubmit={false}
          autoComplete="off"
        />
        <TouchableOpacity onPress={addSubtopic} style={styles.addBtn} activeOpacity={0.8}>
          <Feather name="plus" size={14} color="#fff" />
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Tip */}
      <View style={[styles.tip, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', borderColor: C.border }]}>
        <Text style={[styles.tipText, { color: C.textSubtle }]}>
          💡 Change any percentage and the rest redistribute automatically to total 100%.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card:       { borderRadius: 16, borderWidth: 1, padding: 20, gap: 14 },
  header:     { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  cardTitle:  { fontSize: Typography.size.lg, fontFamily: Typography.fontFamily.bold },
  cardSub:    { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.regular, lineHeight: 19, marginTop: 3 },
  totalWrap:  { alignItems: 'flex-end' },
  totalNum:   { fontSize: Typography.size['3xl'], fontFamily: Typography.fontFamily.extraBold, lineHeight: 36 },
  totalLabel: { fontSize: 10, fontFamily: Typography.fontFamily.medium },
  regenBtn:   { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  regenText:  { fontSize: 10, fontFamily: Typography.fontFamily.semiBold, color: '#818CF8' },
  // Loading
  loadingWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  loadingText: { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.regular },
  // Error banner
  errorBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 10, borderRadius: 8, borderWidth: 1 },
  errorText:   { flex: 1, fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.regular, lineHeight: 17 },
  // Subtopic row
  row:        { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, borderWidth: 1, padding: 10 },
  colorDot:   { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  nameInput:  { flex: 1, fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.semiBold },
  pctWrap:    { flexDirection: 'row', alignItems: 'center', borderRadius: 6, borderWidth: 1, paddingHorizontal: 6, paddingVertical: 3 },
  pctInput:   { width: 32, fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.bold, textAlign: 'right' },
  pctSign:    { fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.regular },
  barWrap:    { width: 70 },
  removeBtn:  { padding: 2 },
  // Add row
  addRow:    { flexDirection: 'row', gap: 10 },
  addInput:  { flex: 1, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: Typography.size.sm },
  addBtn:    { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#4F46E5', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  addBtnText:{ color: '#fff', fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.semiBold },
  // Tip
  tip:       { borderRadius: 10, borderWidth: 1, padding: 12 },
  tipText:   { fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.regular, lineHeight: 18 },
});
