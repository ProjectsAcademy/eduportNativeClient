import { API_URL } from '../constants/api';
import { storage } from '../utils/storage';

// ─── Shared helpers ──────────────────────────────────────────────────────────

async function authHeaders() {
  const token = await storage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handleResponse(res) {
  const data = await res.json().catch(() => ({ success: false, message: 'Invalid server response' }));
  if (!data.success) {
    const err = new Error(data.message || 'Request failed');
    err.status = res.status;
    throw err;
  }
  return data;
}

// ─── Exam service ─────────────────────────────────────────────────────────────

export const examService = {

  /** GET /api/exams — List all exams owned by the logged-in teacher */
  async getMyExams() {
    const headers = await authHeaders();
    const res = await fetch(`${API_URL}/api/exams`, { headers });
    return handleResponse(res); // { data: { exams: ExamListItemDTO[], total } }
  },

  /** GET /api/exams/:id — Full exam detail with questions */
  async getExamById(id) {
    const headers = await authHeaders();
    const res = await fetch(`${API_URL}/api/exams/${id}`, { headers });
    return handleResponse(res); // { data: { exam: ExamDetailDTO } }
  },

  /** POST /api/exams — Create a new exam */
  async createExam(examData) {
    const headers = await authHeaders();
    const res = await fetch(`${API_URL}/api/exams`, {
      method: 'POST',
      headers,
      body: JSON.stringify(examData),
    });
    return handleResponse(res); // { data: { exam: ExamDetailDTO } }
  },

  /** PUT /api/exams/:id — Update an existing exam */
  async updateExam(id, data) {
    const headers = await authHeaders();
    const res = await fetch(`${API_URL}/api/exams/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  /** DELETE /api/exams/:id — Delete exam + all its sessions */
  async deleteExam(id) {
    const headers = await authHeaders();
    const res = await fetch(`${API_URL}/api/exams/${id}`, {
      method: 'DELETE',
      headers,
    });
    return handleResponse(res);
  },

  /** PATCH /api/exams/:id/publish — Toggle draft ↔ published */
  async togglePublish(id) {
    const headers = await authHeaders();
    const res = await fetch(`${API_URL}/api/exams/${id}/publish`, {
      method: 'PATCH',
      headers,
    });
    return handleResponse(res); // { data: { status, accessCode } }
  },

  /** POST /api/exams/lookup — Find a published exam by access code (public) */
  async lookupByCode(code) {
    const res = await fetch(`${API_URL}/api/exams/lookup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code.toUpperCase().trim() }),
    });
    return handleResponse(res); // { data: { exam: ExamLookupDTO } }
  },

  /** GET /api/exams/:examId/results — Teacher analytics for an exam */
  async getExamResults(examId) {
    const headers = await authHeaders();
    const res = await fetch(`${API_URL}/api/exams/${examId}/results`, { headers });
    return handleResponse(res);
  },

  /** GET /api/exams/:examId/results/:sessionId — Per-student report */
  async getSessionDetail(examId, sessionId) {
    const headers = await authHeaders();
    const res = await fetch(`${API_URL}/api/exams/${examId}/results/${sessionId}`, { headers });
    return handleResponse(res);
  },

  /** GET /api/history — Exam attempt history for the current user */
  async getHistory() {
    const headers = await authHeaders();
    const res = await fetch(`${API_URL}/api/history`, { headers });
    return handleResponse(res);
  },
};
