/**
 * Super Admin API service.
 *
 * All requests require a super_admin JWT — the backend enforces
 * this via requireSuperAdmin middleware. If called with a regular
 * user token, every request returns 403 Forbidden.
 */

import { API_URL } from '../constants/api';
import { storage } from '../utils/storage';

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
    const err = new Error(data.message || 'Admin request failed');
    err.status = res.status;
    throw err;
  }
  return data;
}

function qs(params = {}) {
  const filtered = Object.entries(params).filter(([, v]) => v != null && v !== '');
  if (!filtered.length) return '';
  return '?' + new URLSearchParams(filtered.map(([k, v]) => [k, String(v)])).toString();
}

const BASE = `${API_URL}/api/super`;

export const superAdminService = {

  // ── Platform ──────────────────────────────────────────────────────────────
  async getPlatformStats() {
    const headers = await authHeaders();
    const res = await fetch(`${BASE}/stats`, { headers });
    return handleResponse(res);
  },

  // ── Users ─────────────────────────────────────────────────────────────────
  async listUsers(params = {}) {
    const headers = await authHeaders();
    const res = await fetch(`${BASE}/users${qs(params)}`, { headers });
    return handleResponse(res);
  },

  async getUserById(id) {
    const headers = await authHeaders();
    const res = await fetch(`${BASE}/users/${id}`, { headers });
    return handleResponse(res);
  },

  async suspendUser(id) {
    const headers = await authHeaders();
    const res = await fetch(`${BASE}/users/${id}/suspend`, { method: 'PATCH', headers });
    return handleResponse(res);
  },

  async activateUser(id) {
    const headers = await authHeaders();
    const res = await fetch(`${BASE}/users/${id}/activate`, { method: 'PATCH', headers });
    return handleResponse(res);
  },

  async changeUserRole(id, role) {
    const headers = await authHeaders();
    const res = await fetch(`${BASE}/users/${id}/role`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ role }),
    });
    return handleResponse(res);
  },

  async deleteUser(id) {
    const headers = await authHeaders();
    const res = await fetch(`${BASE}/users/${id}`, { method: 'DELETE', headers });
    return handleResponse(res);
  },

  // ── Organizations ─────────────────────────────────────────────────────────
  async listOrganizations(params = {}) {
    const headers = await authHeaders();
    const res = await fetch(`${BASE}/organizations${qs(params)}`, { headers });
    return handleResponse(res);
  },

  async getOrganizationByUser(userId) {
    const headers = await authHeaders();
    const res = await fetch(`${BASE}/organizations/${userId}`, { headers });
    return handleResponse(res);
  },

  async changePlan(userId, plan) {
    const headers = await authHeaders();
    const res = await fetch(`${BASE}/organizations/${userId}/plan`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ plan }),
    });
    return handleResponse(res);
  },

  // ── AI Usage ──────────────────────────────────────────────────────────────
  async getPlatformAIUsage(params = {}) {
    const headers = await authHeaders();
    const res = await fetch(`${BASE}/ai/usage${qs(params)}`, { headers });
    return handleResponse(res);
  },

  async getUserAIUsage(userId) {
    const headers = await authHeaders();
    const res = await fetch(`${BASE}/ai/usage/${userId}`, { headers });
    return handleResponse(res);
  },

  async getTopAIUsers(limit = 10) {
    const headers = await authHeaders();
    const res = await fetch(`${BASE}/ai/top-users?limit=${limit}`, { headers });
    return handleResponse(res);
  },

  // ── Audit Logs ────────────────────────────────────────────────────────────
  async getAuditLogs(params = {}) {
    const headers = await authHeaders();
    const res = await fetch(`${BASE}/audit${qs(params)}`, { headers });
    return handleResponse(res);
  },

  // ── System ────────────────────────────────────────────────────────────────
  async getSystemHealth() {
    const headers = await authHeaders();
    const res = await fetch(`${BASE}/health`, { headers });
    return handleResponse(res);
  },
};
