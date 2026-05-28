import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../../context/ThemeContext';
import { Colors } from '../../../constants/colors';
import { Typography } from '../../../constants/typography';
import { Toggle } from '../../ui/Toggle';
import { Input } from '../../ui/Input';

const HRT_OPTIONS = [
  { value: 'disable', label: 'No Monitoring',    desc: 'Tab switches are allowed',                icon: '🔓' },
  { value: 'warn',    label: 'Warn Student',      desc: 'Log violations and warn, exam continues', icon: '⚠️' },
  { value: 'block',   label: 'Block After Limit', desc: 'Auto-submit after max violations',        icon: '🚫' },
];

function Section({ title, children }) {
  const { isDark } = useTheme();
  const C = isDark ? Colors.dark : Colors.light;
  return (
    <View style={[styles.section, { backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', borderColor: C.border }]}>
      <Text style={[styles.sectionTitle, { color: C.textSubtle }]}>{title}</Text>
      {children}
    </View>
  );
}

function SettingRow({ label, description, children }) {
  const { isDark } = useTheme();
  const C = isDark ? Colors.dark : Colors.light;
  return (
    <View style={[styles.settingRow, { borderBottomColor: C.border }]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.settingName, { color: C.foreground }]}>{label}</Text>
        {description && <Text style={[styles.settingDesc, { color: C.textSubtle }]}>{description}</Text>}
      </View>
      {children}
    </View>
  );
}

export function Step7Settings({ form, onUpdate }) {
  const { isDark } = useTheme();
  const C = isDark ? Colors.dark : Colors.light;
  const s = form.settings;
  const set = (key, value) => onUpdate({ settings: { ...s, [key]: value } });

  return (
    <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
      <Text style={[styles.cardTitle, { color: C.foreground }]}>⚙️ Exam Settings</Text>

      {/* General */}
      <Section title="GENERAL">
        <SettingRow label="Shuffle Questions" description="Randomise question order for each student">
          <Toggle value={s.shuffleQuestions} onChange={v => set('shuffleQuestions', v)} />
        </SettingRow>
        <SettingRow label="Shuffle Options" description="Randomise MCQ answer order">
          <Toggle value={s.shuffleOptions} onChange={v => set('shuffleOptions', v)} />
        </SettingRow>
        <SettingRow label="Show Results After Submission" description="Student sees score immediately">
          <Toggle value={s.showResultsAfter} onChange={v => set('showResultsAfter', v)} />
        </SettingRow>
        <SettingRow label="Show Correct Answers" description="Reveal answers in result review">
          <Toggle value={s.showCorrectAnswers} onChange={v => set('showCorrectAnswers', v)} />
        </SettingRow>
        <SettingRow label="Allow Back Navigation" description="Student can revisit previous questions">
          <Toggle value={s.allowBack} onChange={v => set('allowBack', v)} />
        </SettingRow>
        <SettingRow label="Require Student Email" description="Shown in join form; used to send results">
          <Toggle value={s.emailRequired} onChange={v => set('emailRequired', v)} />
        </SettingRow>
      </Section>

      {/* HRT */}
      <Section title="HONEST RESPONDENT TECHNOLOGY">
        <Text style={[styles.hrtDesc, { color: C.textSubtle }]}>
          How should tab-switching be handled during the exam?
        </Text>
        <View style={{ gap: 8 }}>
          {HRT_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.value}
              onPress={() => set('hrtMode', opt.value)}
              style={[
                styles.hrtOption,
                { borderColor: s.hrtMode === opt.value ? '#4F46E5' : C.border, backgroundColor: s.hrtMode === opt.value ? 'rgba(79,70,229,0.08)' : 'transparent' },
              ]}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 20 }}>{opt.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.hrtLabel, { color: C.foreground }]}>{opt.label}</Text>
                <Text style={[styles.hrtLabelDesc, { color: C.textSubtle }]}>{opt.desc}</Text>
              </View>
              <View style={[styles.radio, { borderColor: s.hrtMode === opt.value ? '#4F46E5' : C.borderMedium }]}>
                {s.hrtMode === opt.value && <View style={styles.radioDot} />}
              </View>
            </TouchableOpacity>
          ))}
        </View>
        {s.hrtMode === 'block' && (
          <View style={{ marginTop: 8 }}>
            <Input
              label="Violations before block"
              value={String(s.hrtViolationLimit)}
              onChangeText={v => set('hrtViolationLimit', parseInt(v) || 3)}
              keyboardType="number-pad"
              autoComplete="off"
            />
          </View>
        )}
      </Section>

      {/* Anti-cheat */}
      <Section title="ANTI-CHEATING">
        <SettingRow label="Detect Tab Switching">
          <Toggle value={s.tabSwitchDetection} onChange={v => set('tabSwitchDetection', v)} />
        </SettingRow>
        <SettingRow label="Disable Copy / Paste">
          <Toggle value={s.copyPasteDisabled} onChange={v => set('copyPasteDisabled', v)} />
        </SettingRow>
        <SettingRow label="Disable Right-Click">
          <Toggle value={s.rightClickDisabled} onChange={v => set('rightClickDisabled', v)} />
        </SettingRow>
        <SettingRow label="Force Fullscreen Mode">
          <Toggle value={s.fullscreenRequired} onChange={v => set('fullscreenRequired', v)} />
        </SettingRow>
      </Section>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 20, gap: 16 },
  cardTitle: { fontSize: Typography.size.lg, fontFamily: Typography.fontFamily.bold },
  section: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 0 },
  sectionTitle: { fontSize: 10, fontFamily: Typography.fontFamily.extraBold, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 16 },
  settingName: { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.semiBold },
  settingDesc: { fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.regular, marginTop: 2, lineHeight: 16 },
  hrtDesc: { fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.regular, lineHeight: 17, marginBottom: 4 },
  hrtOption: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 10, borderWidth: 1, padding: 12 },
  hrtLabel: { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.semiBold },
  hrtLabelDesc: { fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.regular, marginTop: 1 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4F46E5' },
});
