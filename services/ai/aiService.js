/**
 * AIService — centralized AI generation layer (frontend).
 *
 * All AI calls in the app (exam generation, question generation, analysis)
 * must go through this service. Never call any AI endpoint directly from
 * a component or screen.
 *
 * Provider replacement: to swap Gemini for another provider, only the
 * backend llmService.ts needs updating. This file stays the same.
 *
 * Routes used:
 *   POST /api/ai/analyse/subtopics   — generic (any provider)
 *   POST /api/gemini/generate/questions — still Gemini-specific (uses advanced
 *                                         blueprint + responseSchema features)
 *   GET  /api/ai/usage               — usage with model/provider breakdown
 *   GET  /api/analytics/usage        — analytics breakdown
 *   GET  /api/analytics/usage/requests — per-request history
 */

import { API_URL } from '../../constants/api';
import { storage } from '../../utils/storage';

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
    const err = new Error(data.message || 'AI request failed');
    err.status = res.status;
    throw err;
  }
  return data;
}

export const aiService = {

  /**
   * Generate questions for an exam.
   * Uses the Gemini-specific route to retain responseSchema + blueprint support.
   */
  async generateQuestions(params) {
    const headers = await authHeaders();
    const res = await fetch(`${API_URL}/api/gemini/generate/questions`, {
      method:  'POST',
      headers,
      body:    JSON.stringify(params),
    });
    return handleResponse(res);
  },

  /**
   * Analyse a topic and suggest subtopics with coverage percentages.
   * Uses the generic /api/ai/ route — works with any configured provider.
   */
  async analyseSubtopics(topic, subject = '', context = '') {
    const headers = await authHeaders();
    const res = await fetch(`${API_URL}/api/ai/analyse/subtopics`, {
      method:  'POST',
      headers,
      body:    JSON.stringify({ topic, subject, context }),
    });
    return handleResponse(res);
  },

  /**
   * Get usage summary (today + last 30 days + by-model breakdown).
   * Now served from the generic /api/ai/usage route.
   */
  async getUsage() {
    const headers = await authHeaders();
    const res = await fetch(`${API_URL}/api/ai/usage`, { headers });
    return handleResponse(res);
  },

  /**
   * Get detailed analytics breakdown with optional date/model filters.
   * @param {object} [params] — { from, to, provider, model }
   */
  async getAnalytics(params = {}) {
    const headers = await authHeaders();
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)])
    ).toString();
    const res = await fetch(`${API_URL}/api/analytics/usage${qs ? `?${qs}` : ''}`, { headers });
    return handleResponse(res);
  },

  /**
   * Get paginated per-request history.
   * @param {object} [params] — { page, limit, provider, model, feature, status }
   */
  async getRequestHistory(params = {}) {
    const headers = await authHeaders();
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)])
    ).toString();
    const res = await fetch(`${API_URL}/api/analytics/usage/requests${qs ? `?${qs}` : ''}`, { headers });
    return handleResponse(res);
  },

  /**
   * Get most-used AI models for this user (last 30 days).
   */
  async getTopModels(limit = 5) {
    const headers = await authHeaders();
    const res = await fetch(`${API_URL}/api/analytics/usage/top-models?limit=${limit}`, { headers });
    return handleResponse(res);
  },
};
