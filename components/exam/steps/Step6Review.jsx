import React, { useState, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { Colors } from '../../../constants/colors';
import { Typography } from '../../../constants/typography';
import { QuestionCard } from '../QuestionCard';
import { EmptyState } from '../../ui/EmptyState';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { Select } from '../../ui/Select';

const TYPE_OPTIONS = [
  { label: 'MCQ',          value: 'mcq' },
  { label: 'True / False', value: 'true-false' },
];

function newQuestion(type = 'mcq') {
  return {
    id: String(Date.now()),
    text: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
    type,
    bloomsLevel: 'Remember',
    subtopic: '',
  };
}

export function Step6Review({ form, onUpdate }) {
  const { isDark } = useTheme();
  const C = isDark ? Colors.dark : Colors.light;

  const [activeSubtopic, setActiveSubtopic] = useState('all');
  const [addModal, setAddModal] = useState(false);
  const [newType, setNewType] = useState('mcq');

  const subtopics = useMemo(() => {
    const all = [...new Set(form.questions.map(q => q.subtopic).filter(Boolean))];
    return all;
  }, [form.questions]);

  const displayed = activeSubtopic === 'all'
    ? form.questions
    : form.questions.filter(q => q.subtopic === activeSubtopic);

  const updateQuestion = (updated) => {
    onUpdate({ questions: form.questions.map(q => q.id === updated.id ? updated : q) });
  };

  const deleteQuestion = (id) => {
    onUpdate({ questions: form.questions.filter(q => q.id !== id) });
  };

  const addQuestion = () => {
    const q = newQuestion(newType);
    onUpdate({ questions: [...form.questions, q] });
    setAddModal(false);
  };

  return (
    <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { color: C.foreground }]}>📝 Review & Edit Questions</Text>
          <Text style={[styles.cardSub, { color: C.textSubtle }]}>
            {form.questions.length} question{form.questions.length !== 1 ? 's' : ''} — review, edit, or add more.
          </Text>
        </View>
        <TouchableOpacity onPress={() => setAddModal(true)} style={styles.addBtn} activeOpacity={0.8}>
          <Feather name="plus" size={14} color="#fff" />
          <Text style={styles.addBtnText}>Add Question</Text>
        </TouchableOpacity>
      </View>

      {/* Subtopic filter chips */}
      {subtopics.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {['all', ...subtopics].map(st => {
            const active = activeSubtopic === st;
            return (
              <TouchableOpacity
                key={st}
                onPress={() => setActiveSubtopic(st)}
                style={[
                  styles.chip,
                  { backgroundColor: active ? '#4F46E5' : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', borderColor: active ? '#4F46E5' : C.border },
                ]}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, { color: active ? '#fff' : C.textMuted }]}>
                  {st === 'all' ? `All (${form.questions.length})` : st}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Question cards */}
      {displayed.length === 0 ? (
        <EmptyState
          icon="file-text"
          title="No questions yet"
          subtitle={form.questions.length === 0
            ? 'Add questions manually or go back to generate with AI.'
            : `No questions tagged "${activeSubtopic}".`
          }
        />
      ) : (
        displayed.map((q, i) => (
          <QuestionCard
            key={q.id}
            question={q}
            index={form.questions.indexOf(q)}
            onUpdate={updateQuestion}
            onDelete={deleteQuestion}
          />
        ))
      )}

      {/* Add Question Modal */}
      <Modal visible={addModal} onClose={() => setAddModal(false)} title="Add Question" maxWidth={400}>
        <View style={{ gap: 14 }}>
          <Text style={[styles.modalLabel, { color: C.textSubtle }]}>Choose question type:</Text>
          <Select
            label="Question Type"
            value={newType}
            onChange={setNewType}
            options={TYPE_OPTIONS}
          />
          <Text style={[styles.modalHint, { color: C.textSubtle }]}>
            A blank question card will be added at the bottom of the list for you to fill in.
          </Text>
        </View>
        <Modal.Footer>
          <Button title="Cancel" variant="secondary" fullWidth={false} onPress={() => setAddModal(false)} style={{ paddingHorizontal: 20 }} />
          <Button title="Add Question" variant="primary" fullWidth={false} onPress={addQuestion} style={{ flex: 1 }} />
        </Modal.Footer>
      </Modal>
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
  filterRow: { gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.semiBold },
  modalLabel: { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.medium },
  modalHint: { fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.regular, lineHeight: 17 },
});
