/**
 * Gemini API configuration service (frontend).
 *
 * Key management calls still route through /api/gemini/key because the
 * Settings → AI Integration tab is Gemini-specific. The generic
 * /api/ai/keys/:provider routes are available for future multi-provider UI.
 *
 * Usage data is now served by /api/ai/usage (see aiService.getUsage).
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
    const err = new Error(data.message || 'Request failed');
    err.status = res.status;
    throw err;
  }
  return data;
}

export const geminiService = {

  async saveKey(apiKey) {
    const headers = await authHeaders();
    const res = await fetch(`${API_URL}/api/gemini/key`, {
      method:  'POST',
      headers,
      body:    JSON.stringify({ apiKey }),
    });
    return handleResponse(res);
  },

  async getKeyStatus() {
    const headers = await authHeaders();
    const res = await fetch(`${API_URL}/api/gemini/key`, { headers });
    return handleResponse(res);
  },

  async revalidateKey() {
    const headers = await authHeaders();
    const res = await fetch(`${API_URL}/api/gemini/key/validate`, {
      method: 'POST',
      headers,
    });
    return handleResponse(res);
  },

  async deleteKey() {
    const headers = await authHeaders();
    const res = await fetch(`${API_URL}/api/gemini/key`, {
      method: 'DELETE',
      headers,
    });
    return handleResponse(res);
  },

  /** @deprecated — use aiService.getUsage() which returns model/provider breakdown */
  async getUsage() {
    const headers = await authHeaders();
    const res = await fetch(`${API_URL}/api/ai/usage`, { headers });
    return handleResponse(res);
  },
};
