/**
 * PermissionService — centralizes all media-related permission requests.
 *
 * Why separate:
 * - Permission state is per-platform (iOS needs NSPhotoLibraryUsageDescription,
 *   Android handles at runtime, web has no concept of these permissions).
 * - By isolating permission logic here, every consumer gets consistent
 *   denied/unavailable handling without duplicating code.
 */

import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

// ── Status constants ──────────────────────────────────────────────────────────

export const PERMISSION_STATUS = {
  GRANTED:      'granted',
  DENIED:       'denied',
  UNAVAILABLE:  'unavailable',
};

// ── Camera ────────────────────────────────────────────────────────────────────

/**
 * Requests camera permission.
 * Returns a status string from PERMISSION_STATUS.
 */
export async function requestCameraPermission() {
  if (Platform.OS === 'web') return PERMISSION_STATUS.GRANTED; // web uses browser prompt

  try {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status === 'granted') return PERMISSION_STATUS.GRANTED;
    return PERMISSION_STATUS.DENIED;
  } catch (_) {
    return PERMISSION_STATUS.UNAVAILABLE;
  }
}

/**
 * Checks (without prompting) whether camera permission is currently granted.
 */
export async function checkCameraPermission() {
  if (Platform.OS === 'web') return PERMISSION_STATUS.GRANTED;

  try {
    const { status } = await ImagePicker.getCameraPermissionsAsync();
    if (status === 'granted') return PERMISSION_STATUS.GRANTED;
    return PERMISSION_STATUS.DENIED;
  } catch (_) {
    return PERMISSION_STATUS.UNAVAILABLE;
  }
}

// ── Media library ─────────────────────────────────────────────────────────────

/**
 * Requests media library (gallery) permission.
 */
export async function requestMediaLibraryPermission() {
  if (Platform.OS === 'web') return PERMISSION_STATUS.GRANTED;

  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status === 'granted') return PERMISSION_STATUS.GRANTED;
    return PERMISSION_STATUS.DENIED;
  } catch (_) {
    return PERMISSION_STATUS.UNAVAILABLE;
  }
}

// ── Denial helpers ────────────────────────────────────────────────────────────

/** Human-readable message for a denied camera permission. */
export const CAMERA_DENIED_MESSAGE =
  'Camera access is required to take a profile photo. Go to Settings → ExamFlow AI → Camera to enable it.';

/** Human-readable message for a denied media library permission. */
export const GALLERY_DENIED_MESSAGE =
  'Photo library access is required to choose a profile photo. Go to Settings → ExamFlow AI → Photos to enable it.';
