import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Platform, Share,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { Colors } from '../../../constants/colors';
import { Typography } from '../../../constants/typography';
import { useToast } from '../../../context/ToastContext';

function generateCode() {
  const alpha = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return 'EXM-' + Array.from({ length: 4 }, () => alpha[Math.floor(Math.random() * alpha.length)]).join('');
}

export function Step8Publish({ form, onUpdate, onPublish, onDone }) {
  const { isDark } = useTheme();
  const C = isDark ? Colors.dark : Colors.light;
  const { showToast } = useToast();

  const [published, setPublished] = useState(!!form.code);
  const [publishing, setPublishing] = useState(false);
  const [code, setCode] = useState(form.code || '');

  const handlePublish = async () => {
    setPublishing(true);
    try {
      if (onPublish) await onPublish();
      // code is set via onUpdate({ code }) inside publishToAPI
      setCode(form.code || generateCode());
      setPublished(true);
      showToast('Exam published successfully!', 'success');
    } catch (_) {
      // error toast already shown by publishToAPI
    } finally {
      setPublishing(false);
    }
  };

  const copyCode = async () => {
    if (Platform.OS === 'web' && navigator?.clipboard) {
      await navigator.clipboard.writeText(displayCode).catch(() => {});
    } else {
      try { await Share.share({ message: `Exam code: ${displayCode}` }); } catch (_) {}
    }
    showToast(`Code ${displayCode} copied!`, 'success');
  };

  const displayCode = form.code || code;
  const shareLink = `examflow.ai/e/${displayCode}`;

  const copyLink = async () => {
    if (Platform.OS === 'web' && navigator?.clipboard) {
      await navigator.clipboard.writeText(shareLink).catch(() => {});
    } else {
      try { await Share.share({ message: `Join exam: https://${shareLink}` }); } catch (_) {}
    }
    showToast('Link copied!', 'success');
  };

  return (
    <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
      {!published ? (
        <>
          {/* Pre-publish summary */}
          <Text style={[styles.cardTitle, { color: C.foreground }]}>🚀 Ready to Publish</Text>
          <View style={styles.summaryGrid}>
            {[
              { icon: 'file-text', label: 'Questions',  value: String(form.questions.length) },
              { icon: 'clock',     label: 'Duration',   value: `${form.duration} min` },
              { icon: 'star',      label: 'Pass Score', value: `${form.passingScore}%` },
              { icon: 'users',     label: 'Attempts',   value: form.maxAttempts === 'unlimited' ? '∞' : form.maxAttempts },
            ].map((s, i) => (
              <View key={i} style={[styles.summaryItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', borderColor: C.border }]}>
                <Feather name={s.icon} size={18} color="#818CF8" />
                <Text style={[styles.summaryVal, { color: C.foreground }]}>{s.value}</Text>
                <Text style={[styles.summaryLabel, { color: C.textSubtle }]}>{s.label}</Text>
              </View>
            ))}
          </View>
          <View style={styles.actions}>
            <TouchableOpacity
              onPress={() => showToast('Draft saved!', 'info')}
              style={[styles.draftBtn, { backgroundColor: C.surface2, borderColor: C.borderMedium }]}
              activeOpacity={0.8}
            >
              <Feather name="save" size={15} color={C.textMuted} />
              <Text style={[styles.draftBtnText, { color: C.textMuted }]}>Save Draft</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handlePublish} disabled={publishing} style={[styles.publishBtn, { flex: 1, opacity: publishing ? 0.7 : 1 }]} activeOpacity={0.85}>
              <LinearGradient colors={['#4F46E5', '#7C3AED']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[StyleSheet.absoluteFillObject, { borderRadius: 12 }]} />
              <Feather name={publishing ? 'loader' : 'send'} size={15} color="#fff" />
              <Text style={styles.publishBtnText}>{publishing ? 'Publishing…' : 'Publish Exam'}</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <>
          {/* Published state */}
          <View style={styles.successBanner}>
            <LinearGradient colors={['rgba(16,185,129,0.12)', 'rgba(16,185,129,0.06)']} style={StyleSheet.absoluteFillObject} />
            <View style={[styles.successIcon, { backgroundColor: 'rgba(16,185,129,0.2)' }]}>
              <Feather name="check" size={28} color="#10B981" />
            </View>
            <Text style={[styles.successTitle, { color: '#10B981' }]}>Exam Published!</Text>
            <Text style={[styles.successSub, { color: C.textSubtle }]}>
              {form.title || 'Your exam'} is now live and accessible to students.
            </Text>
          </View>

          {/* Access code */}
          <View>
            <Text style={[styles.codeLabel, { color: C.textSubtle }]}>ACCESS CODE</Text>
            <TouchableOpacity
              onPress={copyCode}
              style={[styles.codeBox, { backgroundColor: isDark ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.05)', borderColor: 'rgba(99,102,241,0.25)' }]}
              activeOpacity={0.7}
            >
              <Text style={styles.codeText}>{displayCode}</Text>
              <View style={[styles.copyChip, { backgroundColor: 'rgba(99,102,241,0.15)' }]}>
                <Feather name="copy" size={13} color="#818CF8" />
                <Text style={styles.copyChipText}>Copy</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Share link */}
          <View>
            <Text style={[styles.codeLabel, { color: C.textSubtle }]}>DIRECT LINK</Text>
            <View style={[styles.linkRow, { backgroundColor: C.surface2, borderColor: C.borderMedium }]}>
              <Feather name="link" size={14} color={C.textSubtle} />
              <Text style={[styles.linkText, { color: '#818CF8' }]} numberOfLines={1}>{shareLink}</Text>
              <TouchableOpacity onPress={copyLink} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Feather name="copy" size={14} color={C.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick stats */}
          <View style={[styles.statsRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderColor: C.border }]}>
            {[
              { label: 'Questions',  value: String(form.questions.length), color: '#818CF8' },
              { label: 'Duration',   value: `${form.duration}m`,           color: '#F59E0B' },
              { label: 'Pass Mark',  value: `${form.passingScore}%`,        color: '#10B981' },
            ].map((s, i) => (
              <View key={i} style={styles.statItem}>
                <Text style={[styles.statVal, { color: s.color }]}>{s.value}</Text>
                <Text style={[styles.statLabel, { color: C.textSubtle }]}>{s.label}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity onPress={onDone} style={[styles.doneBtn, { borderColor: C.borderMedium, backgroundColor: C.surface2 }]} activeOpacity={0.8}>
            <Feather name="check-circle" size={15} color={C.textMuted} />
            <Text style={[styles.doneBtnText, { color: C.textMuted }]}>Back to My Exams</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 20, gap: 18 },
  cardTitle: { fontSize: Typography.size.lg, fontFamily: Typography.fontFamily.bold },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  summaryItem: { flex: 1, minWidth: 100, alignItems: 'center', gap: 4, padding: 14, borderRadius: 12, borderWidth: 1 },
  summaryVal: { fontSize: Typography.size.xl, fontFamily: Typography.fontFamily.extraBold },
  summaryLabel: { fontSize: 10, fontFamily: Typography.fontFamily.medium },
  actions: { flexDirection: 'row', gap: 12 },
  draftBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 13 },
  draftBtnText: { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.semiBold },
  publishBtn: { borderRadius: 12, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13 },
  publishBtnText: { color: '#fff', fontSize: Typography.size.base, fontFamily: Typography.fontFamily.semiBold },
  // Published
  successBanner: { borderRadius: 14, overflow: 'hidden', padding: 20, alignItems: 'center', gap: 10 },
  successIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  successTitle: { fontSize: Typography.size.xl, fontFamily: Typography.fontFamily.extraBold },
  successSub: { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.regular, textAlign: 'center', lineHeight: 20 },
  codeLabel: { fontSize: 10, fontFamily: Typography.fontFamily.bold, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  codeBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 14, borderWidth: 1, paddingVertical: 16, paddingHorizontal: 20 },
  codeText: { fontSize: 28, fontFamily: Typography.fontFamily.extraBold, color: '#818CF8', letterSpacing: 6 },
  copyChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  copyChipText: { fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.semiBold, color: '#818CF8' },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12 },
  linkText: { flex: 1, fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.medium },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', borderRadius: 12, borderWidth: 1, padding: 14 },
  statItem: { alignItems: 'center', gap: 4 },
  statVal: { fontSize: Typography.size.xl, fontFamily: Typography.fontFamily.extraBold },
  statLabel: { fontSize: 10, fontFamily: Typography.fontFamily.medium },
  doneBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, borderWidth: 1, paddingVertical: 13 },
  doneBtnText: { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.semiBold },
});
