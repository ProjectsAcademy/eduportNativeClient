import { API_URL } from '../constants/api';

// Sessions are public (no auth token required) — identity is the sessionId itself

async function handleResponse(res) {
  const data = await res.json().catch(() => ({ success: false, message: 'Invalid server response' }));
  if (!data.success) {
    const err = new Error(data.message || 'Request failed');
    err.status = res.status;
    throw err;
  }
  return data;
}

export const sessionService = {

  /**
   * POST /api/exams/:examId/sessions
   * Start a new exam session. Returns questions (without correct answers) + sessionId.
   */
  async startSession(examId, { studentName, studentEmail, rollNumber = '' }) {
    const res = await fetch(`${API_URL}/api/exams/${examId}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentName, studentEmail, rollNumber }),
    });
    return handleResponse(res);
    // Returns: { data: { sessionId, examId, examTitle, questions, settings, proctoring, startedAt } }
  },

  /**
   * PATCH /api/exams/:examId/sessions/:sessionId
   * Save/update a single answer (called as student answers each question).
   */
  async submitAnswer(examId, sessionId, { questionIndex, selectedOption, flagged = false }) {
    const res = await fetch(`${API_URL}/api/exams/${examId}/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionIndex, selectedOption, flagged }),
    });
    return handleResponse(res);
  },

  /**
   * POST /api/exams/:examId/sessions/:sessionId/violations
   * Log a proctoring violation.
   * type: 'tab_switch' | 'right_click' | 'copy_paste' | 'fullscreen_exit' | 'app_background'
   */
  async logViolation(examId, sessionId, type) {
    const res = await fetch(`${API_URL}/api/exams/${examId}/sessions/${sessionId}/violations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type }),
    });
    return handleResponse(res);
    // Returns: { data: { violationCount, autoSubmitted } }
  },

  /**
   * POST /api/exams/:examId/sessions/:sessionId/submit
   * Final submission. Server calculates score and returns results.
   */
  async submitExam(examId, sessionId) {
    const res = await fetch(`${API_URL}/api/exams/${examId}/sessions/${sessionId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    return handleResponse(res);
    // Returns: { data: { score, scorePercentage, passed, timeTaken, violations, qaReview? } }
  },
};
