import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Platform,
  Share, TextInput, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { Colors } from '../../../constants/colors';
import { Typography } from '../../../constants/typography';
import { useToast } from '../../../context/ToastContext';
import { Toggle } from '../../ui/Toggle';
import { Select } from '../../ui/Select';

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateCode() {
  const alpha = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return 'EXM-' + Array.from({ length: 4 }, () => alpha[Math.floor(Math.random() * alpha.length)]).join('');
}

// ── Mini accordion section ────────────────────────────────────────────────────

function Section({ title, icon, open, onToggle, C, children }) {
  return (
    <View style={[secStyles.wrap, { borderColor: C.border }]}>
      <TouchableOpacity
        onPress={onToggle}
        style={[secStyles.header, { backgroundColor: C.surface2 }]}
        activeOpacity={0.8}
      >
        <View style={secStyles.headerLeft}>
          <Feather name={icon} size={13} color={C.textMuted} />
          <Text style={[secStyles.title, { color: C.foreground }]}>{title}</Text>
        </View>
        <Feather name={open ? 'chevron-up' : 'chevron-down'} size={13} color={C.textMuted} />
      </TouchableOpacity>
      {open && <View style={secStyles.body}>{children}</View>}
    </View>
  );
}

const secStyles = StyleSheet.create({
  wrap:       { borderRadius: 10, borderWidth: 1, overflow: 'hidden' },
  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 11 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title:      { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.bold },
  body:       { padding: 14, gap: 12 },
});

// ── Form input helpers ────────────────────────────────────────────────────────

function FieldInput({ label, value, onChange, placeholder, C }) {
  return (
    <View style={{ gap: 4 }}>
      {label && <Text style={{ fontSize: 11, fontFamily: Typography.fontFamily.bold, color: C.textSubtle, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Text>}
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={C.textSubtle}
        style={{ fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.regular, color: C.foreground, borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: C.surface2 }}
        autoComplete="off"
      />
    </View>
  );
}

// ── Template style picker ─────────────────────────────────────────────────────

const TEMPLATES = ['Minimal', 'School Standard', 'University', 'Coaching Institute', 'Modern Clean'];

function TemplatePicker({ value, onChange, C }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
      {TEMPLATES.map(t => {
        const active = value === t;
        return (
          <TouchableOpacity
            key={t}
            onPress={() => onChange(t)}
            style={[tplStyles.chip, active
              ? { borderColor: '#4F46E5', backgroundColor: 'rgba(79,70,229,0.1)' }
              : { borderColor: C.border, backgroundColor: 'transparent' },
            ]}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: Typography.size.xs, fontFamily: active ? Typography.fontFamily.bold : Typography.fontFamily.medium, color: active ? '#818CF8' : C.textMuted }}>
              {t}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const tplStyles = StyleSheet.create({
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
});

// ── Export type radio selector ────────────────────────────────────────────────

function ExportTypeOption({ id, title, desc, badge, active, onSelect, C }) {
  return (
    <TouchableOpacity
      onPress={onSelect}
      style={[expTypeStyles.row, { borderColor: C.border, backgroundColor: active ? (C.navActive || 'rgba(79,70,229,0.06)') : 'transparent' }]}
      activeOpacity={0.8}
    >
      <View style={[expTypeStyles.dot, { borderColor: active ? '#4F46E5' : C.borderMedium, backgroundColor: active ? '#4F46E5' : 'transparent' }]}>
        {active && <View style={expTypeStyles.dotInner} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[expTypeStyles.title, { color: C.foreground }]}>{title}</Text>
        <Text style={[expTypeStyles.desc, { color: C.textSubtle }]}>{desc}</Text>
      </View>
      <View style={[expTypeStyles.badge, { backgroundColor: id === 'questions-only' ? 'rgba(59,130,246,0.15)' : 'rgba(16,185,129,0.15)' }]}>
        <Text style={{ fontSize: 10, fontFamily: Typography.fontFamily.bold, color: id === 'questions-only' ? '#60A5FA' : '#34D399' }}>{badge}</Text>
      </View>
    </TouchableOpacity>
  );
}

const expTypeStyles = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, borderWidth: 1, gap: 10 },
  dot:      { width: 16, height: 16, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  dotInner: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  title:    { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.semiBold },
  desc:     { fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.regular, marginTop: 1 },
  badge:    { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, flexShrink: 0 },
});

// ── Web print preview builder ─────────────────────────────────────────────────

function buildPrintHTML(exportData, form) {
  const { exportType, templateStyle, showStudentName, showRollNo, showSignature,
          showMarks, showDiffLabels, sectionBreak, answerSpace, showPageNums,
          watermark, paperSize, schoolName, subject, grade, session,
          examDate, duration, totalMarks, examTitle, instructions } = exportData;

  const isSolutions = exportType === 'questions-solutions';
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const blueprint = form.blueprint ?? [];
  const questions = form.questions ?? [];

  const wmText = { confidential:'CONFIDENTIAL', sample:'SAMPLE PAPER', draft:'DRAFT', 'do-not-copy':'DO NOT COPY' }[watermark] || '';
  const wmHTML = wmText
    ? `<div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-35deg);font-size:72px;font-weight:900;color:rgba(0,0,0,0.04);pointer-events:none;white-space:nowrap;z-index:0;">${wmText}</div>`
    : '';

  const instrLines = (instructions || '').split('\n').filter(l => l.trim());
  const instrHTML = instrLines.length
    ? instrLines.map(l => `<li>${l.trim()}</li>`).join('')
    : '<li>Read all questions carefully.</li><li>Attempt all questions.</li>';

  const renderQ = (q, num, bp) => {
    const marksHtml = showMarks && bp ? ` <span style="font-size:11px;color:#666;">(${bp.marksPerQ} Mark${bp.marksPerQ > 1 ? 's' : ''})</span>` : '';
    const diffHtml = showDiffLabels && q.bloomsLevel ? ` <span style="font-size:10px;border:1px solid #999;padding:1px 5px;border-radius:3px;">${q.bloomsLevel}</span>` : '';
    let body = '';
    if (q.type === 'mcq' && q.options) {
      body = `<ol type="A" style="margin:6px 0 6px 20px;font-size:13px;">${q.options.map(o => `<li style="margin-bottom:3px;">${o || '___'}</li>`).join('')}</ol>`;
    } else if (q.type === 'true-false') {
      body = `<div style="margin:6px 0;font-size:13px;">○ True &nbsp;&nbsp;&nbsp; ○ False</div>`;
    }
    let space = '';
    if (!isSolutions && answerSpace && q.type !== 'mcq' && q.type !== 'true-false') {
      space = '<div style="border-bottom:1px solid #ccc;margin:8px 0;height:18px;"></div>'.repeat(4);
    }
    let answer = '';
    if (isSolutions) {
      answer = `<div style="margin-top:8px;padding:8px 12px;background:#f0f7f0;border-left:3px solid #2d8a2d;border-radius:3px;font-size:12.5px;"><strong>Answer:</strong> ${q.correctAnswer ?? q.options?.[q.correctIndex ?? 0] ?? '—'}${q.bloomsLevel ? `<br><em style="color:#555;">Bloom's: ${q.bloomsLevel}</em>` : ''}</div>`;
    }
    return `<div style="margin-bottom:16px;page-break-inside:avoid;"><div style="font-size:13.5px;font-weight:500;">Q${num}. ${q.text || '(Question text not set)'}${marksHtml}${diffHtml}</div>${body}${space}${answer}</div>`;
  };

  const sections = blueprint.length > 0
    ? blueprint.map((bp, i) => ({
        title: `SECTION ${letters[i]} — ${bp.name.toUpperCase()} (${bp.type.toUpperCase()})`,
        questions: questions.filter((q, qi) => qi % blueprint.length === i),
        bp,
      }))
    : [{ title: 'QUESTIONS', questions, bp: null }];
  if (sections.every(s => s.questions.length === 0) && questions.length > 0) {
    sections[0].questions = questions;
  }

  let qNum = 1;
  const sectionsHTML = sections.map((sec, si) => {
    const brk = sectionBreak && si > 0 ? 'page-break-before:always;' : '';
    const qs = sec.questions.map(q => renderQ(q, qNum++, sec.bp)).join('');
    return `<div style="${brk}margin-bottom:28px;"><div style="font-size:14px;font-weight:800;letter-spacing:0.08em;border-bottom:2px solid #222;padding-bottom:4px;margin-bottom:14px;">${sec.title}</div>${qs || '<p style="color:#888;font-size:13px;font-style:italic;">No questions in this section.</p>'}</div>`;
  }).join('');

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>${examTitle || 'Exam'}</title>
<style>
@page { size: ${paperSize || 'A4'}; margin: 20mm 18mm 18mm 18mm; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 13.5px; color: #111; line-height: 1.6; }
.header { text-align: center; border-bottom: 2px solid #111; padding-bottom: 12px; margin-bottom: 16px; }
.header h1 { font-size: 20px; font-weight: 800; margin: 6px 0 4px; }
.header h2 { font-size: 14px; font-weight: 600; color: #444; }
.meta-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4px 16px; font-size: 12px; border: 1px solid #ccc; border-radius: 4px; padding: 10px 14px; margin-bottom: 14px; }
.student-box { border: 1px solid #aaa; border-radius: 4px; padding: 10px 14px; margin-bottom: 14px; display: flex; gap: 28px; font-size: 13px; }
.student-box div { border-bottom: 1px solid #aaa; padding-bottom: 4px; flex: 1; }
.instructions { border: 1px solid #aaa; border-radius: 4px; padding: 10px 14px; margin-bottom: 18px; font-size: 12.5px; }
.instructions h3 { font-size: 12.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 8px; }
.instructions ol { padding-left: 18px; }
.instructions li { margin-bottom: 3px; }
@media print { button { display: none !important; } }
</style></head>
<body>
${wmHTML}
<div class="header">
  ${schoolName ? `<h2>${schoolName}</h2>` : ''}
  <h1>${examTitle || form.title || 'Exam'}</h1>
  ${subject ? `<h2>${subject}${grade ? ' | ' + grade : ''}</h2>` : ''}
</div>
<div class="meta-grid">
  ${session   ? `<div><strong>Session:</strong> ${session}</div>` : ''}
  ${examDate  ? `<div><strong>Date:</strong> ${examDate}</div>` : ''}
  ${duration  ? `<div><strong>Duration:</strong> ${duration}</div>` : ''}
  ${totalMarks? `<div><strong>Total Marks:</strong> ${totalMarks}</div>` : ''}
  <div><strong>Questions:</strong> ${questions.length}</div>
</div>
${(showStudentName || showRollNo || showSignature) ? `<div class="student-box">${showStudentName ? '<div><strong>Name:</strong></div>' : ''}${showRollNo ? '<div><strong>Roll No:</strong></div>' : ''}${showSignature ? '<div><strong>Signature:</strong></div>' : ''}</div>` : ''}
<div class="instructions"><h3>Instructions</h3><ol>${instrHTML}</ol></div>
${sectionsHTML}
${showPageNums ? '<footer style="position:fixed;bottom:0;left:0;right:0;display:flex;justify-content:space-between;font-size:11px;color:#666;padding:6px 18mm;border-top:1px solid #ddd;"><span>' + (schoolName || 'ExamFlow AI') + '</span><span>Page</span></footer>' : ''}
<div style="text-align:center;margin-top:24px;"><button onclick="window.print()" style="padding:10px 24px;font-size:14px;background:#4F46E5;color:white;border:none;border-radius:8px;cursor:pointer;">🖨️ Print / Save as PDF</button></div>
</body></html>`;
}

// ── Main Step 8 component ─────────────────────────────────────────────────────

export function Step8Publish({ form, onUpdate, onPublish, onSaveDraft, draftSaving = false, onDone }) {
  const { isDark } = useTheme();
  const C = isDark ? Colors.dark : Colors.light;
  const { showToast } = useToast();

  const [published,  setPublished]  = useState(!!form.code);
  const [publishing, setPublishing] = useState(false);
  const [code,       setCode]       = useState(form.code || '');
  const [exportOpen, setExportOpen] = useState(false);

  // Export config state (mirrors HTML design options)
  const [exportType,    setExportType]    = useState('questions-only');
  const [tplStyle,      setTplStyle]      = useState('Minimal');
  const [headerOpen,    setHeaderOpen]    = useState(false);
  const [candOpen,      setCandOpen]      = useState(false);
  const [instrOpen,     setInstrOpen]     = useState(false);
  const [fmtOpen,       setFmtOpen]       = useState(false);
  const [layoutOpen,    setLayoutOpen]    = useState(false);
  const [schoolName,    setSchoolName]    = useState('');
  const [subject,       setSubject]       = useState('');
  const [grade,         setGrade]         = useState('');
  const [session,       setSession]       = useState('');
  const [examDate,      setExamDate]      = useState('');
  const [duration,      setDuration]      = useState('');
  const [totalMarks,    setTotalMarks]    = useState('');
  const [examTitleOvr,  setExamTitleOvr]  = useState('');
  const [showName,      setShowName]      = useState(true);
  const [showRoll,      setShowRoll]      = useState(true);
  const [showSig,       setShowSig]       = useState(false);
  const [instructions,  setInstructions]  = useState(
    'Read all questions carefully.\nAttempt all questions.\nWrite your roll number clearly on the paper.'
  );
  const [showMarks,     setShowMarks]     = useState(true);
  const [showDiffLabels,setShowDiffLabels]= useState(false);
  const [sectionBreak,  setSectionBreak]  = useState(true);
  const [answerSpace,   setAnswerSpace]   = useState(true);
  const [paperSize,     setPaperSize]     = useState('A4');
  const [watermark,     setWatermark]     = useState('');
  const [showPageNums,  setShowPageNums]  = useState(true);

  const handlePublish = async () => {
    setPublishing(true);
    try {
      if (onPublish) await onPublish();
      setCode(form.code || generateCode());
      setPublished(true);
      showToast('Exam published successfully!', 'success');
    } catch (_) {}
    finally { setPublishing(false); }
  };

  const copyCode = async () => {
    const c = form.code || code;
    if (Platform.OS === 'web' && navigator?.clipboard) {
      await navigator.clipboard.writeText(c).catch(() => {});
    } else {
      try { await Share.share({ message: `Exam code: ${c}` }); } catch (_) {}
    }
    showToast(`Code ${c} copied!`, 'success');
  };

  const copyLink = async () => {
    const link = `https://examflow.ai/e/${form.code || code}`;
    if (Platform.OS === 'web' && navigator?.clipboard) {
      await navigator.clipboard.writeText(link).catch(() => {});
    } else {
      try { await Share.share({ message: link }); } catch (_) {}
    }
    showToast('Link copied!', 'success');
  };

  const displayCode = form.code || code;
  const shareLink   = `examflow.ai/e/${displayCode}`;

  const handleExport = (format) => {
    if (Platform.OS !== 'web') {
      showToast('PDF export is available on the web app — examflow.ai', 'info');
      return;
    }
    const exportData = {
      exportType, templateStyle: tplStyle, showStudentName: showName, showRollNo: showRoll,
      showSignature: showSig, showMarks, showDiffLabels, sectionBreak, answerSpace,
      showPageNums, watermark, paperSize, schoolName, subject, grade, session,
      examDate, duration, totalMarks, examTitle: examTitleOvr || form.title,
      instructions,
    };
    if (format === 'print' || format === 'pdf') {
      const html = buildPrintHTML(exportData, form);
      const win = window.open('', '_blank');
      if (win) { win.document.write(html); win.document.close(); }
      else showToast('Allow pop-ups for this page to open the print preview', 'warning');
    } else {
      showToast('DOCX export coming soon', 'info');
    }
  };

  // Section preview from blueprint
  const sectionPreview = (form.blueprint ?? []).map((bp, i) => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const total = (parseInt(bp.count) || 0) * (parseInt(bp.marksPerQ) || 1);
    return `§${letters[i]} — ${bp.name} (${bp.type}) — ${bp.count}q × ${bp.marksPerQ}m = ${total} marks`;
  });

  return (
    <>
      {/* ── Main publish card ── */}
      <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
        {!published ? (
          <>
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
                onPress={onSaveDraft}
                disabled={draftSaving}
                style={[styles.draftBtn, { backgroundColor: C.surface2, borderColor: C.borderMedium, opacity: draftSaving ? 0.6 : 1 }]}
                activeOpacity={0.8}
              >
                <Feather name={draftSaving ? 'loader' : 'save'} size={15} color={C.textMuted} />
                <Text style={[styles.draftBtnText, { color: C.textMuted }]}>{draftSaving ? 'Saving…' : 'Save Draft'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handlePublish}
                disabled={publishing}
                style={[styles.publishBtn, { flex: 1, opacity: publishing ? 0.7 : 1 }]}
                activeOpacity={0.85}
              >
                <LinearGradient colors={['#4F46E5', '#7C3AED']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[StyleSheet.absoluteFillObject, { borderRadius: 12 }]} />
                <Feather name={publishing ? 'loader' : 'send'} size={15} color="#fff" />
                <Text style={styles.publishBtnText}>{publishing ? 'Publishing…' : 'Publish Exam'}</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            {/* Success banner */}
            <View style={styles.successBanner}>
              <LinearGradient colors={['rgba(16,185,129,0.12)', 'rgba(16,185,129,0.06)']} style={StyleSheet.absoluteFillObject} />
              <LinearGradient colors={['#4F46E5', '#7C3AED']} style={styles.successIconWrap}>
                <Feather name="check" size={28} color="#fff" />
              </LinearGradient>
              <Text style={[styles.successTitle, { color: C.foreground }]}>Exam Ready to Publish!</Text>
              <Text style={[styles.successSub, { color: C.textSubtle }]}>
                {form.title || 'Your exam'} is now live. Share the code below with your students.
              </Text>
            </View>

            {/* Exam code */}
            <View>
              <Text style={[styles.codeLabel, { color: C.textSubtle }]}>EXAM CODE</Text>
              <TouchableOpacity
                onPress={copyCode}
                style={[styles.codeBox, { borderColor: 'rgba(99,102,241,0.25)', backgroundColor: isDark ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.05)' }]}
                activeOpacity={0.7}
              >
                <Text style={styles.codeText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{displayCode}</Text>
                <View style={[styles.copyChip, { backgroundColor: 'rgba(99,102,241,0.15)' }]}>
                  <Feather name="copy" size={13} color="#818CF8" />
                  <Text style={styles.copyChipText}>Copy Code</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Share link + QR row */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {/* Share link */}
              <View style={{ flex: 1 }}>
                <Text style={[styles.codeLabel, { color: C.textSubtle }]}>SHARE LINK</Text>
                <View style={[styles.linkRow, { backgroundColor: C.surface2, borderColor: C.borderMedium }]}>
                  <Feather name="link" size={13} color={C.textSubtle} />
                  <Text style={[styles.linkText, { color: '#818CF8' }]} numberOfLines={1}>{shareLink}</Text>
                </View>
                <TouchableOpacity
                  onPress={copyLink}
                  style={[styles.smBtn, { borderColor: C.borderMedium, backgroundColor: C.surface2, marginTop: 6 }]}
                  activeOpacity={0.8}
                >
                  <Feather name="copy" size={12} color={C.textMuted} />
                  <Text style={[styles.smBtnText, { color: C.textMuted }]}>Copy Link</Text>
                </TouchableOpacity>
              </View>

              {/* QR code placeholder */}
              <View style={{ alignItems: 'center' }}>
                <Text style={[styles.codeLabel, { color: C.textSubtle }]}>QR CODE</Text>
                <View style={[styles.qrBox, { borderColor: C.border, backgroundColor: C.surface2 }]}>
                  {/* QR visual placeholder — real QR needs a library */}
                  <View style={styles.qrInner}>
                    {[...Array(5)].map((_, row) => (
                      <View key={row} style={{ flexDirection: 'row', gap: 2 }}>
                        {[...Array(5)].map((_, col) => (
                          <View key={col} style={[styles.qrCell, {
                            backgroundColor: (row === 0 || row === 4 || col === 0 || col === 4 || (row === 2 && col === 2))
                              ? C.foreground : 'transparent',
                          }]} />
                        ))}
                      </View>
                    ))}
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => showToast('QR download coming soon', 'info')}
                  style={[styles.smBtn, { borderColor: C.borderMedium, backgroundColor: C.surface2, marginTop: 6 }]}
                  activeOpacity={0.8}
                >
                  <Feather name="download" size={12} color={C.textMuted} />
                  <Text style={[styles.smBtnText, { color: C.textMuted }]}>Download</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Quick stats */}
            <View style={[styles.statsRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderColor: C.border }]}>
              {[
                { label: 'Questions',  value: String(form.questions.length), color: '#818CF8' },
                { label: 'Duration',   value: `${form.duration}m`,            color: '#F59E0B' },
                { label: 'Pass Mark',  value: `${form.passingScore}%`,         color: '#10B981' },
              ].map((s, i) => (
                <View key={i} style={styles.statItem}>
                  <Text style={[styles.statVal, { color: s.color }]}>{s.value}</Text>
                  <Text style={[styles.statLabel, { color: C.textSubtle }]}>{s.label}</Text>
                </View>
              ))}
            </View>

            {/* Save draft + back */}
            <View style={styles.actions}>
              <TouchableOpacity
                onPress={onSaveDraft}
                disabled={draftSaving}
                style={[styles.draftBtn, { backgroundColor: C.surface2, borderColor: C.borderMedium, opacity: draftSaving ? 0.6 : 1, flex: 1 }]}
                activeOpacity={0.8}
              >
                <Feather name="save" size={15} color={C.textMuted} />
                <Text style={[styles.draftBtnText, { color: C.textMuted }]}>Save as Draft</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onDone}
                style={[styles.draftBtn, { backgroundColor: C.surface2, borderColor: C.borderMedium, flex: 1 }]}
                activeOpacity={0.8}
              >
                <Feather name="check-circle" size={15} color={C.textMuted} />
                <Text style={[styles.draftBtnText, { color: C.textMuted }]}>Back to My Exams</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* ── Export Physical Exam card (shown after publish) ── */}
      {published && (
        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <View style={styles.exportHeader}>
            <View style={[styles.exportIconWrap, { backgroundColor: 'rgba(79,70,229,0.12)' }]}>
              <Feather name="file-text" size={18} color="#818CF8" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.exportTitle, { color: C.foreground }]}>Export Physical Exam</Text>
              <Text style={[styles.exportSub, { color: C.textSubtle }]}>
                Generate a printable PDF paper for classroom or exam hall use.
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setExportOpen(v => !v)}
              style={[styles.configBtn, { borderColor: C.border, backgroundColor: C.surface2 }]}
              activeOpacity={0.8}
            >
              <Text style={[styles.configBtnText, { color: C.textMuted }]}>{exportOpen ? 'Collapse' : 'Configure'}</Text>
              <Feather name={exportOpen ? 'chevron-up' : 'chevron-down'} size={12} color={C.textMuted} />
            </TouchableOpacity>
          </View>

          {exportOpen && (
            <View style={{ gap: 14 }}>
              {/* Export Type */}
              <View style={{ gap: 8 }}>
                <Text style={[styles.sectionLabel, { color: C.textSubtle }]}>EXPORT TYPE</Text>
                <ExportTypeOption
                  id="questions-only"
                  title="Questions Only"
                  desc="Printable student exam paper with answer writing space"
                  badge="Student Copy"
                  active={exportType === 'questions-only'}
                  onSelect={() => setExportType('questions-only')}
                  C={C}
                />
                <ExportTypeOption
                  id="questions-solutions"
                  title="Questions + Solutions"
                  desc="Teacher answer key with answers and explanations"
                  badge="Answer Key"
                  active={exportType === 'questions-solutions'}
                  onSelect={() => setExportType('questions-solutions')}
                  C={C}
                />
              </View>

              {/* Template style */}
              <View style={{ gap: 8 }}>
                <Text style={[styles.sectionLabel, { color: C.textSubtle }]}>TEMPLATE STYLE</Text>
                <TemplatePicker value={tplStyle} onChange={setTplStyle} C={C} />
              </View>

              {/* Header Information */}
              <Section title="Header Information" icon="layout" open={headerOpen} onToggle={() => setHeaderOpen(v => !v)} C={C}>
                <View style={styles.grid2}>
                  <FieldInput label="School / Institute" value={schoolName} onChange={setSchoolName} placeholder="e.g. Green Valley School" C={C} />
                  <FieldInput label="Subject" value={subject} onChange={setSubject} placeholder="e.g. Physics" C={C} />
                  <FieldInput label="Class / Grade" value={grade} onChange={setGrade} placeholder="e.g. Grade 11" C={C} />
                  <FieldInput label="Academic Session" value={session} onChange={setSession} placeholder="e.g. 2024–2025" C={C} />
                  <FieldInput label="Exam Date" value={examDate} onChange={setExamDate} placeholder="e.g. 15-Jan-2025" C={C} />
                  <FieldInput label="Duration" value={duration} onChange={setDuration} placeholder="e.g. 3 Hours" C={C} />
                  <FieldInput label="Total Marks" value={totalMarks} onChange={setTotalMarks} placeholder="e.g. 100" C={C} />
                  <FieldInput label="Exam Title Override" value={examTitleOvr} onChange={setExamTitleOvr} placeholder={form.title || 'Defaults to exam title'} C={C} />
                </View>
              </Section>

              {/* Candidate Information */}
              <Section title="Candidate Information" icon="user" open={candOpen} onToggle={() => setCandOpen(v => !v)} C={C}>
                <Toggle value={showName} onChange={setShowName} label="Student Name Field"  description='Show "Name: ___" line on paper' />
                <View style={[styles.divider, { borderColor: C.border }]} />
                <Toggle value={showRoll} onChange={setShowRoll} label="Roll Number Field"   description='Show "Roll No: ___" line on paper' />
                <View style={[styles.divider, { borderColor: C.border }]} />
                <Toggle value={showSig}  onChange={setShowSig}  label="Signature Field"     description='Show "Signature: ___" line on paper' />
              </Section>

              {/* Instructions */}
              <Section title="Exam Instructions" icon="info" open={instrOpen} onToggle={() => setInstrOpen(v => !v)} C={C}>
                <Text style={{ fontSize: Typography.size.xs, color: C.textSubtle, marginBottom: 6 }}>Each line becomes a numbered instruction on the paper.</Text>
                <TextInput
                  value={instructions}
                  onChangeText={setInstructions}
                  multiline
                  numberOfLines={5}
                  style={{ fontSize: Typography.size.sm, color: C.foreground, borderWidth: 1, borderColor: C.border, borderRadius: 8, padding: 10, backgroundColor: C.surface2, minHeight: 100, textAlignVertical: 'top' }}
                  placeholder="Read all questions carefully.&#10;Use blue or black pen only.&#10;Mobile phones are not allowed."
                  placeholderTextColor={C.textSubtle}
                />
              </Section>

              {/* Question Formatting */}
              <Section title="Question Formatting" icon="align-left" open={fmtOpen} onToggle={() => setFmtOpen(v => !v)} C={C}>
                <Toggle value={showMarks}      onChange={setShowMarks}      label="Show Marks Beside Question"   description="e.g. Q1. What is… (2 Marks)" />
                <View style={[styles.divider, { borderColor: C.border }]} />
                <Toggle value={showDiffLabels} onChange={setShowDiffLabels} label="Show Difficulty Labels"       description="Print [Easy] / [Hard] next to each question" />
                <View style={[styles.divider, { borderColor: C.border }]} />
                <Toggle value={sectionBreak}   onChange={setSectionBreak}   label="Start Each Section on New Page" description="Section A, B, C each begin on a fresh page" />
                <View style={[styles.divider, { borderColor: C.border }]} />
                <Toggle value={answerSpace}    onChange={setAnswerSpace}    label="Add Writing Space for Answers" description="Insert blank lines under each open-ended question" />
              </Section>

              {/* Print Layout */}
              <Section title="Print Layout & Watermark" icon="printer" open={layoutOpen} onToggle={() => setLayoutOpen(v => !v)} C={C}>
                <View style={styles.grid2}>
                  <View>
                    <Text style={[styles.sectionLabel, { color: C.textSubtle }]}>PAPER SIZE</Text>
                    <Select
                      value={paperSize}
                      onChange={setPaperSize}
                      options={[{ label: 'A4 (210 × 297 mm)', value: 'A4' }, { label: 'Letter (8.5 × 11 in)', value: 'letter' }]}
                    />
                  </View>
                  <View>
                    <Text style={[styles.sectionLabel, { color: C.textSubtle }]}>WATERMARK</Text>
                    <Select
                      value={watermark}
                      onChange={setWatermark}
                      options={[
                        { label: 'None', value: '' },
                        { label: 'Confidential', value: 'confidential' },
                        { label: 'Sample Paper', value: 'sample' },
                        { label: 'Draft', value: 'draft' },
                        { label: 'Do Not Copy', value: 'do-not-copy' },
                      ]}
                    />
                  </View>
                </View>
                <Toggle value={showPageNums} onChange={setShowPageNums} label="Show Page Numbers" description="Print page numbers in the footer" />
              </Section>

              {/* Section preview */}
              {sectionPreview.length > 0 && (
                <View style={[styles.sectionPreview, { backgroundColor: 'rgba(79,70,229,0.06)', borderColor: 'rgba(79,70,229,0.15)' }]}>
                  <Text style={[styles.sectionLabel, { color: '#818CF8', marginBottom: 8 }]}>PAPER SECTIONS (FROM BLUEPRINT)</Text>
                  {sectionPreview.map((line, i) => (
                    <Text key={i} style={{ fontSize: Typography.size.xs, color: C.textSubtle, lineHeight: 20 }}>• {line}</Text>
                  ))}
                </View>
              )}

              {/* Generate buttons */}
              <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                <TouchableOpacity
                  onPress={() => handleExport('pdf')}
                  style={styles.exportPdfBtn}
                  activeOpacity={0.85}
                >
                  <LinearGradient colors={['#4F46E5', '#7C3AED']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[StyleSheet.absoluteFillObject, { borderRadius: 10 }]} />
                  <Feather name="file-text" size={15} color="#fff" />
                  <Text style={styles.exportPdfBtnText}>Generate PDF</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleExport('print')}
                  style={[styles.exportSecBtn, { borderColor: C.borderMedium, backgroundColor: C.surface2 }]}
                  activeOpacity={0.8}
                >
                  <Feather name="printer" size={13} color={C.textMuted} />
                  <Text style={[styles.exportSecBtnText, { color: C.textMuted }]}>Print Preview</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleExport('docx')}
                  style={[styles.exportSecBtn, { borderColor: C.borderMedium, backgroundColor: C.surface2 }]}
                  activeOpacity={0.8}
                >
                  <Feather name="file" size={13} color={C.textMuted} />
                  <Text style={[styles.exportSecBtnText, { color: C.textMuted }]}>DOCX</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 20, gap: 18 },
  // Pre-publish
  cardTitle:     { fontSize: Typography.size.lg, fontFamily: Typography.fontFamily.bold },
  summaryGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  summaryItem:   { flex: 1, minWidth: 80, alignItems: 'center', gap: 4, padding: 12, borderRadius: 12, borderWidth: 1 },
  summaryVal:    { fontSize: Typography.size.xl, fontFamily: Typography.fontFamily.extraBold },
  summaryLabel:  { fontSize: 10, fontFamily: Typography.fontFamily.medium },
  actions:       { flexDirection: 'row', gap: 12 },
  draftBtn:      { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 13 },
  draftBtnText:  { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.semiBold },
  publishBtn:    { borderRadius: 12, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13 },
  publishBtnText:{ color: '#fff', fontSize: Typography.size.base, fontFamily: Typography.fontFamily.semiBold },
  // Published success
  successBanner: { borderRadius: 14, overflow: 'hidden', padding: 20, alignItems: 'center', gap: 10 },
  successIconWrap: { width: 72, height: 72, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  successTitle:  { fontSize: Typography.size['2xl'], fontFamily: Typography.fontFamily.extraBold },
  successSub:    { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.regular, textAlign: 'center', lineHeight: 20 },
  // Code
  codeLabel:     { fontSize: 10, fontFamily: Typography.fontFamily.bold, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  codeBox:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 14, borderWidth: 1, paddingVertical: 16, paddingHorizontal: 16 },
  codeText:      { flexShrink: 1, fontSize: 26, fontFamily: Typography.fontFamily.extraBold, color: '#818CF8', letterSpacing: 4 },
  copyChip:      { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, flexShrink: 0, marginLeft: 8 },
  copyChipText:  { fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.semiBold, color: '#818CF8' },
  // Share link
  linkRow:       { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
  linkText:      { flex: 1, fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.medium },
  smBtn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 8, borderWidth: 1, paddingVertical: 7, paddingHorizontal: 12 },
  smBtnText:     { fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.semiBold },
  // QR placeholder
  qrBox:         { width: 72, height: 72, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center', padding: 6 },
  qrInner:       { gap: 2 },
  qrCell:        { width: 8, height: 8, borderRadius: 1 },
  // Stats
  statsRow:      { flexDirection: 'row', justifyContent: 'space-around', borderRadius: 12, borderWidth: 1, padding: 14 },
  statItem:      { alignItems: 'center', gap: 4 },
  statVal:       { fontSize: Typography.size.xl, fontFamily: Typography.fontFamily.extraBold },
  statLabel:     { fontSize: 10, fontFamily: Typography.fontFamily.medium },
  // Export card
  exportHeader:  { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  exportIconWrap:{ width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  exportTitle:   { fontSize: Typography.size.base, fontFamily: Typography.fontFamily.bold },
  exportSub:     { fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.regular, marginTop: 2, lineHeight: 16 },
  configBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, flexShrink: 0 },
  configBtnText: { fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.semiBold },
  sectionLabel:  { fontSize: 10, fontFamily: Typography.fontFamily.bold, textTransform: 'uppercase', letterSpacing: 0.6 },
  grid2:         { gap: 10 },
  divider:       { borderTopWidth: 1, marginVertical: 2 },
  sectionPreview:{ borderRadius: 10, borderWidth: 1, padding: 12, gap: 2 },
  exportPdfBtn:  { flex: 1, borderRadius: 10, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 12 },
  exportPdfBtnText: { color: '#fff', fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.semiBold },
  exportSecBtn:  { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12 },
  exportSecBtnText: { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.semiBold },
});
