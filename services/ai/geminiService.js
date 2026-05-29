/**
 * Gemini API configuration service (frontend).
 *
 * All API key management (save, validate, delete, status) goes through here.
 * The frontend NEVER stores or transmits the raw key directly to Gemini —
 * it always proxies through the backend, which handles encryption.
 */

import { API_URL } from '../../constants/api';
import { storage } from '../../utils/storage';

// ── Auth headers ──────────────────────────────────────────────────────────────

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

// ── Key management ────────────────────────────────────────────────────────────

/**
 * Saves (and validates) the Gemini API key via the backend.
 * The key is encrypted server-side — never stored plaintext.
 *
 * @returns { keyPreview, isValid, validationMessage, lastVerifiedAt }
 */
export const geminiService = {

  async saveKey(apiKey) {
    const headers = await authHeaders();
    const res = await fetch(`${API_URL}/api/gemini/key`, {
      method:  'POST',
      headers,
      body:    JSON.stringify({ apiKey }),
    });
    return handleResponse(res);
    // data.data: { keyPreview, isValid, validationMessage, lastVerifiedAt }
  },

  async getKeyStatus() {
    const headers = await authHeaders();
    const res = await fetch(`${API_URL}/api/gemini/key`, { headers });
    return handleResponse(res);
    // data.data: { hasKey, keyPreview?, isValid?, validationMessage?, lastVerifiedAt? }
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

  async getUsage() {
    const headers = await authHeaders();
    const res = await fetch(`${API_URL}/api/gemini/usage`, { headers });
    return handleResponse(res);
    // data.data.usage: { today, last30, history }
  },
};
