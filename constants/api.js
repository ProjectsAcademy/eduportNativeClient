import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra || {};

export const API_URL = extra.apiUrl || 'http://192.168.1.11:5000';

export const GOOGLE_CLIENT_ID = extra.googleClientId || '';
export const GOOGLE_EXPO_CLIENT_ID = extra.googleExpoClientId || '';

export const ENDPOINTS = {
  login: `${API_URL}/api/auth/login`,
  register: `${API_URL}/api/auth/register`,
  verifyOtp: `${API_URL}/api/auth/verify-otp`,
  resendOtp: `${API_URL}/api/auth/resend-otp`,
  me: `${API_URL}/api/auth/me`,          // GET — fetch current user
  profile: `${API_URL}/api/auth/profile`, // PUT — update profile
};
