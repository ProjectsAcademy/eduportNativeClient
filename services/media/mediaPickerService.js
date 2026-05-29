/**
 * MediaPickerService — reusable image selection and compression.
 *
 * All media entry points (profile photo, exam attachments, student documents)
 * must go through this service. No component should call ImagePicker directly.
 *
 * Returns a MediaResult or throws a typed error.
 */

import * as ImagePicker from 'expo-image-picker';
import {
  requestCameraPermission,
  requestMediaLibraryPermission,
  PERMISSION_STATUS,
  CAMERA_DENIED_MESSAGE,
  GALLERY_DENIED_MESSAGE,
} from './permissionService';

// ── Result type ───────────────────────────────────────────────────────────────

/**
 * @typedef MediaResult
 * @property {string} uri        - Local file URI or data URI
 * @property {string} base64     - Base64-encoded image data (for API upload)
 * @property {string} mimeType   - e.g. 'image/jpeg'
 * @property {number} width
 * @property {number} height
 * @property {number} fileSize   - approximate bytes (may be 0 on web)
 */

// ── Shared picker config ──────────────────────────────────────────────────────

const SHARED_OPTIONS = {
  mediaTypes:      ImagePicker.MediaTypeOptions.Images,
  allowsEditing:   true,
  aspect:          [1, 1],      // square crop for profile photos
  quality:         0.75,        // 75 % JPEG quality — good balance of size vs clarity
  base64:          true,        // always return base64 for API upload
  exif:            false,       // strip EXIF for privacy
};

// ── Pick from gallery ─────────────────────────────────────────────────────────

/**
 * Opens the system photo picker.
 * Requests permission first; throws if denied.
 * Returns null if the user cancels.
 */
export async function pickFromGallery() {
  const status = await requestMediaLibraryPermission();

  if (status === PERMISSION_STATUS.DENIED) {
    throw Object.assign(new Error(GALLERY_DENIED_MESSAGE), { code: 'PERMISSION_DENIED' });
  }
  if (status === PERMISSION_STATUS.UNAVAILABLE) {
    throw Object.assign(new Error('Photo library is not available on this device.'), { code: 'UNAVAILABLE' });
  }

  const result = await ImagePicker.launchImageLibraryAsync(SHARED_OPTIONS);

  if (result.canceled || !result.assets?.[0]) return null;

  return buildResult(result.assets[0]);
}

// ── Take photo with camera ────────────────────────────────────────────────────

/**
 * Opens the camera for capture.
 * Requests permission first; throws if denied.
 * Returns null if the user cancels.
 */
export async function takePhoto() {
  const status = await requestCameraPermission();

  if (status === PERMISSION_STATUS.DENIED) {
    throw Object.assign(new Error(CAMERA_DENIED_MESSAGE), { code: 'PERMISSION_DENIED' });
  }
  if (status === PERMISSION_STATUS.UNAVAILABLE) {
    throw Object.assign(new Error('Camera is not available on this device.'), { code: 'UNAVAILABLE' });
  }

  const result = await ImagePicker.launchCameraAsync(SHARED_OPTIONS);

  if (result.canceled || !result.assets?.[0]) return null;

  return buildResult(result.assets[0]);
}

// ── Build result ──────────────────────────────────────────────────────────────

function buildResult(asset) {
  const mimeType = asset.mimeType ?? 'image/jpeg';
  const base64   = asset.base64 ?? '';

  return {
    uri:       asset.uri,
    base64:    base64 ? `data:${mimeType};base64,${base64}` : '',
    mimeType,
    width:     asset.width  ?? 0,
    height:    asset.height ?? 0,
    fileSize:  asset.fileSize ?? 0,
  };
}

// ── Error classification ──────────────────────────────────────────────────────

/**
 * Returns a user-friendly message for a media picker error.
 * Never exposes internal stack traces.
 */
export function getMediaErrorMessage(err) {
  if (!err) return 'An unknown error occurred.';
  if (err.code === 'PERMISSION_DENIED') return err.message;
  if (err.code === 'UNAVAILABLE')       return err.message;
  return 'Could not open media picker. Please try again.';
}
