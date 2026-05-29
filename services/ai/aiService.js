/**
 * AIService — centralized AI generation layer (frontend).
 *
 * All AI calls in the app (exam generation, question generation, analysis)
 * must go through this service. Never call the Gemini API or backend AI
 * endpoints directly from a component or screen.
 *
 * Architecture:
 * - Component calls aiService.generateQuestions(params)
 * - aiService builds the prompt + calls backend /api/ai/generate
 * - Backend decrypts the stored Gemini key, calls Gemini, tracks usage, returns result
 * - Component receives clean structured data
 *
 * This layer handles:
 * - Prompt building
 * - Response parsing
 * - Error normalisation
 * - Retry logic (future)
 * - Provider replacement (swap Gemini for OpenAI without touching any screen)
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
   * Generate MCQ questions for an exam.
   *
   * @param {object} params
   * @param {string} params.topic         - Main topic/subject
   * @param {number} params.count         - Number of questions (1–50)
   * @param {string} params.subject       - Subject area
   * @param {string} params.difficulty    - 'easy' | 'moderate' | 'hard'
   * @param {string} params.bloomsLevel   - 'remember' | 'understand' | 'apply' | ...
   * @param {string} [params.context]     - Additional context / constraints
   * @returns {Array} Array of question objects
   */
  async generateQuestions(params) {
    const headers = await authHeaders();
    const res = await fetch(`${API_URL}/api/ai/generate/questions`, {
      method:  'POST',
      headers,
      body:    JSON.stringify(params),
    });
    return handleResponse(res);
    // data.data: { questions: [...], inputTokens, outputTokens }
  },

  /**
   * Analyse a topic and suggest subtopics with coverage percentages.
   *
   * @param {string} topic
   * @param {string} [context]
   */
  async analyseSubtopics(topic, context = '') {
    const headers = await authHeaders();
    const res = await fetch(`${API_URL}/api/ai/analyse/subtopics`, {
      method:  'POST',
      headers,
      body:    JSON.stringify({ topic, context }),
    });
    return handleResponse(res);
    // data.data: { subtopics: [{ name, percentage }] }
  },

  /**
   * Generic generation — for future AI features.
   * @param {string} prompt
   * @param {object} [options]
   */
  async generate(prompt, options = {}) {
    const headers = await authHeaders();
    const res = await fetch(`${API_URL}/api/ai/generate`, {
      method:  'POST',
      headers,
      body:    JSON.stringify({ prompt, ...options }),
    });
    return handleResponse(res);
    // data.data: { text, inputTokens, outputTokens }
  },
};
