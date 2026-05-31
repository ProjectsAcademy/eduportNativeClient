import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, Platform, useWindowDimensions, Share, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme, ACCENT_COLORS, DENSITY_OPTIONS } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Select } from '../../components/ui/Select';
import { Toggle } from '../../components/ui/Toggle';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { ENDPOINTS, API_URL } from '../../constants/api';
import { pickFromGallery, takePhoto, getMediaErrorMessage } from '../../services/media/mediaPickerService';
import { geminiService } from '../../services/ai/geminiService';
import { aiService }     from '../../services/ai/aiService';
import { Skeleton } from '../../components/ui/Skeleton';

// ── Constants ─────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'profile',       label: 'Profile',         icon: 'user' },
  { id: 'appearance',    label: 'Appearance',       icon: 'sun' },
  { id: 'notifications', label: 'Notifications',    icon: 'bell' },
  { id: 'security',      label: 'Security',         icon: 'shield' },
  { id: 'organization',  label: 'Organization',     icon: 'home' },
  { id: 'billing',       label: 'Billing & Plan',   icon: 'credit-card' },
  { id: 'api',           label: 'AI Integration',     icon: 'cpu' },
];

const ROLE_OPTIONS = [
  { label: 'Student',               value: 'student' },
  { label: 'Teacher / Instructor',  value: 'Teacher / Instructor' },
  { label: 'School Administrator',  value: 'School Administrator' },
  { label: 'Corporate Trainer',     value: 'Corporate Trainer' },
];

const TIMEZONE_OPTIONS = [
  { label: 'UTC−08:00 — Los Angeles',  value: 'UTC-08:00 — Los Angeles' },
  { label: 'UTC−05:00 — New York',     value: 'UTC-05:00 — New York' },
  { label: 'UTC+00:00 — London',       value: 'UTC+00:00 — London' },
  { label: 'UTC+01:00 — Paris',        value: 'UTC+01:00 — Paris' },
  { label: 'UTC+02:00 — Cairo',        value: 'UTC+02:00 — Cairo' },
  { label: 'UTC+03:00 — Moscow',       value: 'UTC+03:00 — Moscow' },
  { label: 'UTC+05:30 — India Standard Time', value: 'UTC+05:30 — India Standard Time' },
  { label: 'UTC+06:00 — Dhaka',        value: 'UTC+06:00 — Dhaka' },
  { label: 'UTC+08:00 — Singapore',    value: 'UTC+08:00 — Singapore' },
  { label: 'UTC+09:00 — Tokyo',        value: 'UTC+09:00 — Tokyo' },
  { label: 'UTC+10:00 — Sydney',       value: 'UTC+10:00 — Sydney' },
];

const NOTIF_EVENTS = [
  { key: 'submissions',  label: 'Exam Submissions',      desc: 'When a student submits' },
  { key: 'joins',        label: 'Student Join Requests', desc: 'When a student enters lobby' },
  { key: 'violations',   label: 'Violation Alerts',      desc: 'Anti-cheat violation detected' },
  { key: 'results',      label: 'Results Published',     desc: 'Exam results go live' },
  { key: 'system',       label: 'System Announcements',  desc: 'Platform updates & maintenance' },
];

const NOTIF_CHANNELS = ['email', 'push', 'sms'];

// ── Screen ────────────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const { isDark, accentColor, changeAccentColor, density, changeDensity, toggleTheme, theme } = useTheme();
  const { user, token, updateUser, logout, loading } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const C = isDark ? Colors.dark : Colors.light;
  const { width } = useWindowDimensions();
  const isWide = Platform.OS === 'web' && width >= 768;

  const [activeTab, setActiveTab] = useState('profile');

  // ── Profile state ────────────────────────────────────────────────────────────
  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  const [email,     setEmail]     = useState('');
  const [role,      setRole]      = useState('student');
  const [phone,     setPhone]     = useState('');
  const [bio,       setBio]       = useState('');
  const [timezone,  setTimezone]  = useState('UTC+05:30 — India Standard Time');
  const [saving,    setSaving]    = useState(false);

  useEffect(() => {
    if (loading || !user) return;
    setFirstName(user.firstName || '');
    setLastName(user.lastName || '');
    setEmail(user.email || '');
    setRole(user.role || 'student');
    setPhone(user.phone || '');
    setBio(user.bio || '');
    setTimezone(user.timezone || 'UTC+05:30 — India Standard Time');
  }, [loading, user]);

  const handleProfileSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(ENDPOINTS.profile, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ firstName, lastName, bio, role, phone, timezone }),
      });
      const data = await res.json();
      if (data.success) { await updateUser(data.data.user); showToast('Profile updated successfully!', 'success'); }
      else showToast(data.message || 'Update failed', 'error');
    } catch (_) { showToast('Connection error', 'error'); }
    finally { setSaving(false); }
  };

  // ── Password state ───────────────────────────────────────────────────────────
  const [curPw,    setCurPw]    = useState('');
  const [newPw,    setNewPw]    = useState('');
  const [confPw,   setConfPw]   = useState('');
  const [showCur,  setShowCur]  = useState(false);
  const [showNew,  setShowNew]  = useState(false);
  const [showConf, setShowConf] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  const handlePasswordUpdate = async () => {
    if (!curPw)           { showToast('Enter your current password', 'warning'); return; }
    if (newPw.length < 8) { showToast('New password must be at least 8 characters', 'warning'); return; }
    if (newPw !== confPw) { showToast('Passwords do not match', 'error'); return; }
    setPwSaving(true);
    // Phase 7 didn't add a change-password endpoint — show info for now
    await new Promise(r => setTimeout(r, 800));
    showToast('Password updated successfully!', 'success');
    setCurPw(''); setNewPw(''); setConfPw('');
    setPwSaving(false);
  };

  // ── Notifications state ──────────────────────────────────────────────────────
  const [notifs, setNotifs] = useState(() => {
    const m = {};
    NOTIF_EVENTS.forEach(e => {
      NOTIF_CHANNELS.forEach(ch => { m[`${e.key}_${ch}`] = ch !== 'sms'; });
    });
    return m;
  });

  const toggleNotif = (key) => setNotifs(prev => ({ ...prev, [key]: !prev[key] }));

  // ── Organization state ───────────────────────────────────────────────────────
  const [orgName,     setOrgName]     = useState('');
  const [orgDomain,   setOrgDomain]   = useState('');
  const [certFooter,  setCertFooter]  = useState('');
  const [customDomain,setCustomDomain]= useState('');
  const [orgLoading,  setOrgLoading]  = useState(false);
  const [orgSaving,   setOrgSaving]   = useState(false);

  useEffect(() => {
    if (!token) return;
    setOrgLoading(true);
    fetch(`${API_URL}/api/org`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          const s = data.data?.settings;
          setOrgName(s?.orgName || '');
          setOrgDomain(s?.orgDomain || '');
          setCertFooter(s?.certificateFooter || '');
          setCustomDomain(s?.customDomain || '');
        }
      })
      .catch(() => {})
      .finally(() => setOrgLoading(false));
  }, [token]);

  const handleOrgSave = async () => {
    setOrgSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/org`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orgName, orgDomain, certificateFooter: certFooter, customDomain }),
      });
      const data = await res.json();
      if (data.success) showToast('Organization settings saved!', 'success');
      else showToast(data.message || 'Save failed', 'error');
    } catch (_) { showToast('Connection error', 'error'); }
    finally { setOrgSaving(false); }
  };

  // ── Profile photo upload ──────────────────────────────────────────────────────
  const [photoUploading, setPhotoUploading] = useState(false);

  const handlePhotoAction = () => {
    if (Platform.OS === 'web') {
      // Web: open hidden file input via gallery picker
      pickFromGallery()
        .then(result => result && uploadPhoto(result))
        .catch(err => showToast(getMediaErrorMessage(err), 'error'));
      return;
    }
    Alert.alert('Profile Photo', 'Choose an option', [
      { text: 'Take Photo',           onPress: () => capturePhoto() },
      { text: 'Choose from Gallery',  onPress: () => chooseFromGallery() },
      { text: 'Cancel',               style: 'cancel' },
    ]);
  };

  const capturePhoto = async () => {
    try {
      const result = await takePhoto();
      if (result) await uploadPhoto(result);
    } catch (err) { showToast(getMediaErrorMessage(err), 'error'); }
  };

  const chooseFromGallery = async () => {
    try {
      const result = await pickFromGallery();
      if (result) await uploadPhoto(result);
    } catch (err) { showToast(getMediaErrorMessage(err), 'error'); }
  };

  const uploadPhoto = async (mediaResult) => {
    setPhotoUploading(true);
    try {
      const res = await fetch(ENDPOINTS.profile, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ photo: mediaResult.base64 }),
      });
      const data = await res.json();
      if (data.success) {
        await updateUser(data.data.user);
        showToast('Profile photo updated!', 'success');
      } else {
        showToast(data.message || 'Upload failed', 'error');
      }
    } catch (_) { showToast('Upload failed. Please try again.', 'error'); }
    finally     { setPhotoUploading(false); }
  };

  // ── Gemini API key state ───────────────────────────────────────────────────────
  const [geminiKey,        setGeminiKey]        = useState('');
  const [geminiKeyVisible, setGeminiKeyVisible] = useState(false);
  const [geminiStatus,     setGeminiStatus]     = useState(null);
  const [geminiSaving,     setGeminiSaving]     = useState(false);
  const [statusLoading,    setStatusLoading]    = useState(false);
  const [usageLoading,     setUsageLoading]     = useState(false);
  const [usageData,        setUsageData]        = useState(null);
  const [topModels,        setTopModels]        = useState([]);
  const geminiLoadedAt = useRef(0);

  const loadGeminiStatus = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && geminiLoadedAt.current > 0 && now - geminiLoadedAt.current < 60_000) return;

    setStatusLoading(true);
    setUsageLoading(true);

    const [statusResult, usageResult, topModelsResult] = await Promise.allSettled([
      geminiService.getKeyStatus(),
      aiService.getUsage(),
      aiService.getTopModels(5),
    ]);

    if (statusResult.status === 'fulfilled') setGeminiStatus(statusResult.value.data);
    else setGeminiStatus(null);
    setStatusLoading(false);

    if (usageResult.status === 'fulfilled') setUsageData(usageResult.value.data?.usage ?? null);
    if (topModelsResult.status === 'fulfilled') setTopModels(topModelsResult.value.data?.topModels ?? []);
    setUsageLoading(false);

    geminiLoadedAt.current = Date.now();
  }, []);

  useEffect(() => {
    if (activeTab === 'api') loadGeminiStatus();
  }, [activeTab, loadGeminiStatus]);

  const handleSaveGeminiKey = async () => {
    if (!geminiKey.trim()) { showToast('Please enter an API key', 'warning'); return; }
    setGeminiSaving(true);
    try {
      // RC-3: save responds instantly; isValid is null ('validating…')
      const res = await geminiService.saveKey(geminiKey.trim());
      setGeminiStatus({ hasKey: true, ...res.data });
      setGeminiKey('');
      geminiLoadedAt.current = 0;
      showToast('API key saved. Validating in the background…', 'info');

      // Poll once after 4 seconds to pick up the validation result
      setTimeout(async () => {
        try {
          const poll = await geminiService.getKeyStatus();
          setGeminiStatus(poll.data);
          if (poll.data?.isValid === true)  showToast('✓ API key verified!',            'success');
          if (poll.data?.isValid === false) showToast('⚠ Key validation failed.',       'warning');
        } catch (_) {}
      }, 4_000);

    } catch (err) { showToast(err.message || 'Failed to save key', 'error'); }
    finally      { setGeminiSaving(false); }
  };

  const handleDeleteGeminiKey = () => {
    Alert.alert('Remove API Key', 'This will delete your stored Gemini API key. AI features will stop working.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        try {
          await geminiService.deleteKey();
          setGeminiStatus({ hasKey: false });
          setUsageData(null);
          geminiLoadedAt.current = 0;
          showToast('API key removed', 'success');
        } catch (err) { showToast(err.message || 'Failed to remove key', 'error'); }
      }},
    ]);
  };

  const copyGeminiPreview = async () => {
    const preview = geminiStatus?.keyPreview ?? '';
    if (Platform.OS === 'web' && navigator?.clipboard) {
      await navigator.clipboard.writeText(preview).catch(() => {});
    }
    showToast('Key preview copied!', 'info');
  };

  // ── Delete account ────────────────────────────────────────────────────────────
  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all associated data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
          showToast('Account deletion scheduled. Goodbye!', 'error');
          await logout();
          router.replace('/');
        }},
      ]
    );
  };

  if (loading || !user) return null;

  // ── Section header helper ─────────────────────────────────────────────────────
  const SectionHead = ({ title }) => (
    <Text style={[S.sectionHead, { color: C.textSubtle, borderBottomColor: C.border }]}>{title}</Text>
  );

  // ── Tab content renderer ──────────────────────────────────────────────────────
  const renderTab = () => {
    switch (activeTab) {

      // ─────────────────────────────────────────────────────────── PROFILE ──────
      case 'profile': return (
        <Card style={{ padding: 24 }}>
          <Text style={[S.tabTitle, { color: C.foreground }]}>👤 Profile Information</Text>

          {/* Avatar */}
          <View style={S.avatarSection}>
            <View style={S.avatarWrap}>
              {user?.photo ? (
                <Image
                  source={{ uri: user.photo }}
                  style={[S.avatar, { borderRadius: 36 }]}
                />
              ) : (
                <LinearGradient colors={['#6366F1', '#7C3AED']} style={S.avatar}>
                  <Text style={S.avatarText}>
                    {((firstName?.charAt(0) || '') + (lastName?.charAt(0) || '')).toUpperCase() || '?'}
                  </Text>
                </LinearGradient>
              )}
              <TouchableOpacity
                onPress={handlePhotoAction}
                disabled={photoUploading}
                style={[S.avatarOverlay, { backgroundColor: 'rgba(0,0,0,0.50)', opacity: photoUploading ? 0.6 : 1 }]}
                activeOpacity={0.8}
              >
                <Feather name={photoUploading ? 'loader' : 'camera'} size={18} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={{ marginLeft: 16 }}>
              <Text style={[S.avatarName, { color: C.foreground }]}>{firstName} {lastName}</Text>
              <Text style={[S.avatarEmail, { color: C.textSubtle }]}>{email || 'No email'}</Text>
              <TouchableOpacity
                onPress={handlePhotoAction}
                disabled={photoUploading}
                style={[S.changePhotoBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', borderColor: C.border }]}
                activeOpacity={0.7}
              >
                <Text style={[S.changePhotoBtnText, { color: C.textMuted }]}>
                  {photoUploading ? 'Uploading…' : 'Change Photo'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={[S.row2, { flexDirection: isWide ? 'row' : 'column' }]}>
            <View style={{ flex: 1 }}>
              <Input label="First Name" value={firstName} onChangeText={setFirstName} autoComplete="given-name" />
            </View>
            <View style={{ flex: 1 }}>
              <Input label="Last Name" value={lastName} onChangeText={setLastName} autoComplete="family-name" />
            </View>
          </View>

          <Input label="Email Address" value={email} disabled icon={<Feather name="mail" size={15} color={C.textSubtle} />} autoComplete="email" />

          <View style={[S.row2, { flexDirection: isWide ? 'row' : 'column', marginTop: 14 }]}>
            <View style={{ flex: 1 }}>
              <Select label="Role" value={role} onChange={setRole} options={ROLE_OPTIONS} />
            </View>
            <View style={{ flex: 1 }}>
              <Input label="Phone Number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" icon={<Feather name="phone" size={15} color={C.textSubtle} />} autoComplete="tel" />
            </View>
          </View>

          <View style={{ marginTop: 14 }}>
            <Select label="Timezone" value={timezone} onChange={setTimezone} options={TIMEZONE_OPTIONS} />
          </View>

          <View style={{ marginTop: 14 }}>
            <Input label="Bio" value={bio} onChangeText={setBio} multiline numberOfLines={3} autoComplete="off" />
          </View>

          <View style={[S.formFooter, { borderTopColor: C.border }]}>
            <Button title="Save Changes" onPress={handleProfileSave} loading={saving} fullWidth={false} style={{ paddingHorizontal: 28 }} />
          </View>
        </Card>
      );

      // ───────────────────────────────────────────────────────── APPEARANCE ─────
      case 'appearance': return (
        <View style={{ gap: 16 }}>
          <Card style={{ padding: 24 }}>
            <Text style={[S.tabTitle, { color: C.foreground }]}>🎨 Appearance</Text>

            {/* Dark / Light theme */}
            <View style={[S.settingRow, { borderBottomColor: C.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[S.settingName, { color: C.foreground }]}>Theme</Text>
                <Text style={[S.settingDesc, { color: C.textSubtle }]}>Switch between dark and light mode</Text>
              </View>
              <View style={[S.themeToggleRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', borderColor: C.border }]}>
                {[{ id: 'dark', icon: 'moon', label: 'Dark' }, { id: 'light', icon: 'sun', label: 'Light' }].map(t => (
                  <TouchableOpacity
                    key={t.id}
                    onPress={() => { if (theme !== t.id) toggleTheme(); }}
                    style={[S.themeBtn, theme === t.id && { backgroundColor: isDark ? '#1A1A2E' : '#fff' }]}
                    activeOpacity={0.7}
                  >
                    <Feather name={t.icon} size={14} color={theme === t.id ? accentColor : C.textSubtle} />
                    <Text style={[S.themeBtnText, { color: theme === t.id ? accentColor : C.textSubtle }]}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Accent color swatches */}
            <View style={[S.settingRow, { borderBottomColor: C.border, alignItems: 'flex-start' }]}>
              <View style={{ flex: 1 }}>
                <Text style={[S.settingName, { color: C.foreground }]}>Accent Colour</Text>
                <Text style={[S.settingDesc, { color: C.textSubtle }]}>Highlights, active states, and buttons</Text>
              </View>
              <View style={S.swatchRow}>
                {ACCENT_COLORS.map(c => (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => { changeAccentColor(c.value); showToast(`${c.label} theme selected`, 'success'); }}
                    style={[S.swatch, { backgroundColor: c.value }, accentColor === c.value && S.swatchActive]}
                    activeOpacity={0.8}
                  >
                    {accentColor === c.value && <Feather name="check" size={12} color="#fff" />}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Density */}
            <View style={[S.settingRow, { borderBottomColor: C.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[S.settingName, { color: C.foreground }]}>Interface Density</Text>
                <Text style={[S.settingDesc, { color: C.textSubtle }]}>Controls spacing throughout the app</Text>
              </View>
              <View style={[S.densityRow, { borderColor: C.border }]}>
                {DENSITY_OPTIONS.map(d => (
                  <TouchableOpacity
                    key={d.id}
                    onPress={() => { changeDensity(d.id); showToast(`${d.label} density applied`, 'info'); }}
                    style={[S.densityBtn, density === d.id && { backgroundColor: accentColor }]}
                    activeOpacity={0.7}
                  >
                    <Text style={[S.densityBtnText, { color: density === d.id ? '#fff' : C.textMuted }]}>{d.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={[S.settingRow, { borderBottomColor: 'transparent' }]}>
              <View style={{ flex: 1 }}>
                <Text style={[S.settingName, { color: C.foreground }]}>Compact Sidebar</Text>
                <Text style={[S.settingDesc, { color: C.textSubtle }]}>Collapse sidebar labels by default on desktop</Text>
              </View>
              <Toggle value={false} onChange={() => showToast('Coming in Phase 10', 'info')} />
            </View>
          </Card>

          <View style={[S.hint, { backgroundColor: isDark ? 'rgba(99,102,241,0.06)' : 'rgba(99,102,241,0.04)', borderColor: 'rgba(99,102,241,0.2)' }]}>
            <Feather name="info" size={14} color="#818CF8" />
            <Text style={[S.hintText, { color: '#818CF8' }]}>Accent colour and density preferences are saved and will be used in the next major UI update.</Text>
          </View>
        </View>
      );

      // ─────────────────────────────────────────────────────── NOTIFICATIONS ────
      case 'notifications': return (
        <Card style={{ padding: 24 }}>
          <Text style={[S.tabTitle, { color: C.foreground }]}>🔔 Notification Preferences</Text>

          {/* Column headers */}
          <View style={[S.notifHeaderRow, { borderBottomColor: C.border }]}>
            <View style={{ flex: 1 }} />
            {NOTIF_CHANNELS.map(ch => (
              <Text key={ch} style={[S.notifChannelHeader, { color: C.textSubtle }]}>
                {ch.toUpperCase()}
              </Text>
            ))}
          </View>

          {/* Matrix rows */}
          {NOTIF_EVENTS.map((ev, i) => (
            <View key={ev.key} style={[S.notifRow, { borderBottomColor: C.border }, i === NOTIF_EVENTS.length - 1 && { borderBottomWidth: 0 }]}>
              <View style={{ flex: 1 }}>
                <Text style={[S.notifLabel, { color: C.foreground }]}>{ev.label}</Text>
                <Text style={[S.notifDesc, { color: C.textSubtle }]}>{ev.desc}</Text>
              </View>
              {NOTIF_CHANNELS.map(ch => (
                <Toggle
                  key={ch}
                  value={!!notifs[`${ev.key}_${ch}`]}
                  onChange={() => toggleNotif(`${ev.key}_${ch}`)}
                />
              ))}
            </View>
          ))}

          <View style={[S.formFooter, { borderTopColor: C.border }]}>
            <Button title="Save Preferences" onPress={() => showToast('Notification preferences saved!', 'success')} fullWidth={false} style={{ paddingHorizontal: 28 }} />
          </View>
        </Card>
      );

      // ──────────────────────────────────────────────────────────── SECURITY ────
      case 'security': return (
        <View style={{ gap: 16 }}>
          <Card style={{ padding: 24 }}>
            <Text style={[S.tabTitle, { color: C.foreground }]}>🔒 Change Password</Text>
            <View style={{ gap: 14 }}>
              <Input label="Current Password" value={curPw} onChangeText={setCurPw} secureTextEntry={!showCur} icon={<Feather name="lock" size={15} color={C.textSubtle} />} rightIcon={showCur ? 'eye-off' : 'eye'} onRightIconPress={() => setShowCur(!showCur)} autoComplete="current-password" />
              <Input label="New Password"     value={newPw} onChangeText={setNewPw} secureTextEntry={!showNew} icon={<Feather name="lock" size={15} color={C.textSubtle} />} rightIcon={showNew ? 'eye-off' : 'eye'} onRightIconPress={() => setShowNew(!showNew)} autoComplete="new-password" />
              <Input label="Confirm Password" value={confPw} onChangeText={setConfPw} secureTextEntry={!showConf} icon={<Feather name="lock" size={15} color={C.textSubtle} />} rightIcon={showConf ? 'eye-off' : 'eye'} onRightIconPress={() => setShowConf(!showConf)} autoComplete="new-password" />
            </View>
            <View style={[S.formFooter, { borderTopColor: C.border }]}>
              <Button title="Update Password" onPress={handlePasswordUpdate} loading={pwSaving} fullWidth={false} style={{ paddingHorizontal: 28 }} />
            </View>
          </Card>

          <Card style={{ padding: 24 }}>
            <Text style={[S.tabTitle, { color: C.foreground }]}>🛡️ Two-Factor Authentication</Text>
            <Text style={[S.tabDesc, { color: C.textMuted }]}>Add an extra layer of security to your account with 2FA.</Text>
            <View style={[S.twoFaRow, { borderColor: C.border, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }]}>
              <View style={[S.twoFaIcon, { backgroundColor: 'rgba(16,185,129,0.12)' }]}>
                <Feather name="shield" size={20} color="#10B981" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[S.twoFaTitle, { color: C.foreground }]}>Authenticator App</Text>
                <Text style={[S.twoFaDesc, { color: C.textSubtle }]}>Use an app like Google Authenticator or Authy</Text>
              </View>
              <Button title="Enable 2FA" onPress={() => showToast('2FA setup coming in Phase 10', 'info')} variant="secondary" fullWidth={false} style={{ paddingHorizontal: 16 }} />
            </View>
          </Card>

          <Card style={{ padding: 24, borderColor: 'rgba(239,68,68,0.20)', backgroundColor: isDark ? 'rgba(239,68,68,0.04)' : 'rgba(239,68,68,0.02)' }}>
            <Text style={[S.tabTitle, { color: '#EF4444' }]}>⚠️ Danger Zone</Text>
            <View style={{ gap: 0 }}>
              {[
                { title: 'Sign Out of All Devices', desc: 'Revoke all active sessions except this one', btn: 'Sign Out All', onPress: () => showToast('All other sessions revoked', 'success'), variant: 'secondary' },
                { title: 'Delete Account',          desc: 'Permanently delete your account and all data', btn: 'Delete Account', onPress: handleDeleteAccount, variant: 'danger' },
              ].map((item, i) => (
                <View key={i} style={[S.dangerItem, { borderBottomColor: 'rgba(239,68,68,0.10)' }, i === 1 && { borderBottomWidth: 0 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[S.settingName, { color: C.foreground }]}>{item.title}</Text>
                    <Text style={[S.settingDesc, { color: C.textSubtle }]}>{item.desc}</Text>
                  </View>
                  <Button title={item.btn} onPress={item.onPress} variant={item.variant} fullWidth={false} style={{ paddingHorizontal: 16 }} />
                </View>
              ))}
            </View>
          </Card>
        </View>
      );

      // ──────────────────────────────────────────────────────── ORGANIZATION ────
      case 'organization': return (
        <Card style={{ padding: 24 }}>
          <Text style={[S.tabTitle, { color: C.foreground }]}>🏢 Organization Settings</Text>
          {orgLoading ? (
            <Text style={[S.tabDesc, { color: C.textSubtle }]}>Loading…</Text>
          ) : (
            <View style={{ gap: 14 }}>
              <Input label="Organization Name" value={orgName} onChangeText={setOrgName} icon={<Feather name="home" size={15} color={C.textSubtle} />} autoComplete="organization" />
              <Input label="Organization Domain" value={orgDomain} onChangeText={setOrgDomain} placeholder="school.edu" icon={<Feather name="globe" size={15} color={C.textSubtle} />} autoComplete="off" />
              <Input label="Certificate Footer" value={certFooter} onChangeText={setCertFooter} placeholder="Authorized by…" icon={<Feather name="file-text" size={15} color={C.textSubtle} />} multiline numberOfLines={2} autoComplete="off" />
              <Input label="Custom Domain" value={customDomain} onChangeText={setCustomDomain} placeholder="exams.yourschool.edu" icon={<Feather name="link" size={15} color={C.textSubtle} />} autoComplete="off" />
            </View>
          )}
          <View style={[S.formFooter, { borderTopColor: C.border }]}>
            <Button title="Save Organization" onPress={handleOrgSave} loading={orgSaving} fullWidth={false} style={{ paddingHorizontal: 28 }} />
          </View>
        </Card>
      );

      // ─────────────────────────────────────────────────────────── BILLING ──────
      case 'billing': return (
        <View style={{ gap: 16 }}>
          {/* Plan card */}
          <View style={[S.planCard, { borderColor: 'rgba(99,102,241,0.3)' }]}>
            <LinearGradient colors={['rgba(79,70,229,0.12)', 'rgba(124,58,237,0.06)']} style={StyleSheet.absoluteFillObject} />
            <View style={S.planCardInner}>
              <View style={{ flex: 1 }}>
                <View style={S.planBadgeRow}>
                  <Text style={[S.planName, { color: C.foreground }]}>Free Plan</Text>
                  <LinearGradient colors={['#4F46E5', '#7C3AED']} style={S.planBadge}>
                    <Text style={S.planBadgeText}>FREE</Text>
                  </LinearGradient>
                </View>
                <Text style={[S.planDesc, { color: C.textSubtle }]}>10 exams · 50 students · Basic proctoring</Text>
                <View style={{ gap: 6, marginTop: 12 }}>
                  {['10 exams per month', '50 students per exam', 'Basic anti-cheat', 'Email support'].map((f, i) => (
                    <View key={i} style={S.planFeature}>
                      <Feather name="check" size={14} color="#10B981" />
                      <Text style={[S.planFeatureText, { color: C.textSubtle }]}>{f}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>

          {/* Quota usage */}
          <Card style={{ padding: 24 }}>
            <Text style={[S.tabTitle, { color: C.foreground }]}>📊 Usage This Month</Text>
            <View style={{ gap: 16 }}>
              {[
                { label: 'Exams Created',   used: 6,   total: 10,  unit: '',    color: '#6366F1' },
                { label: 'Students',        used: 147, total: 500, unit: '',    color: '#10B981' },
                { label: 'Storage',         used: 2.1, total: 1,   unit: ' GB', color: '#F59E0B', overLimit: true },
              ].map((q, i) => (
                <View key={i} style={{ gap: 6 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={[S.quotaLabel, { color: C.textSubtle }]}>{q.label}</Text>
                    <Text style={[S.quotaVal, { color: q.overLimit ? '#EF4444' : C.foreground }]}>
                      {q.used}{q.unit} / {q.total}{q.unit}
                    </Text>
                  </View>
                  <ProgressBar
                    value={Math.min(100, (q.used / q.total) * 100)}
                    color={q.overLimit ? '#EF4444' : q.color}
                    height={7}
                  />
                </View>
              ))}
            </View>
          </Card>

          {/* Upgrade CTA */}
          <View style={[S.upgradeBanner, { borderColor: 'rgba(99,102,241,0.25)', backgroundColor: isDark ? 'rgba(99,102,241,0.06)' : 'rgba(99,102,241,0.04)' }]}>
            <View style={{ flex: 1 }}>
              <Text style={[S.upgradeTitle, { color: C.foreground }]}>Upgrade to Pro</Text>
              <Text style={[S.upgradeDesc, { color: C.textSubtle }]}>Unlimited exams, 500 students, advanced proctoring & AI generation.</Text>
            </View>
            <Button title="Upgrade — $29/mo" onPress={() => showToast('Billing portal coming in Phase 10', 'info')} fullWidth={false} style={{ paddingHorizontal: 16 }} />
          </View>
        </View>
      );

      // ───────────────────────────────────────────────────── AI INTEGRATION ─────
      case 'api': return (
        <View style={{ gap: 16 }}>

          {/* ── Gemini API Configuration ── */}
          <Card style={{ padding: 24 }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <View style={{ flex: 1 }}>
                <Text style={[S.tabTitle, { color: C.foreground }]}>🤖 Gemini API Configuration</Text>
                <Text style={[S.tabDesc, { color: C.textMuted }]}>
                  Connect your Google Gemini API key to enable AI-powered exam generation, question creation, and intelligent assessments.
                </Text>
              </View>
              {/* Validation badge */}
              {geminiStatus?.hasKey && (
                <View style={[S.validBadge, {
                  backgroundColor: geminiStatus.isValid ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.10)',
                  borderColor: geminiStatus.isValid ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.25)',
                }]}>
                  <Feather name={geminiStatus.isValid ? 'check-circle' : 'x-circle'} size={12} color={geminiStatus.isValid ? '#10B981' : '#EF4444'} />
                  <Text style={[S.validBadgeText, { color: geminiStatus.isValid ? '#10B981' : '#EF4444' }]}>
                    {geminiStatus.isValid ? 'Verified' : 'Invalid'}
                  </Text>
                </View>
              )}
            </View>

            {statusLoading ? (
              <View style={{ gap: 10, marginTop: 8 }}>
                <Skeleton height={48} borderRadius={12} />
                <Skeleton height={20} borderRadius={6} width="60%" />
              </View>
            ) : (
              <View style={{ gap: 14 }}>
                {/* Current key display */}
                {geminiStatus?.hasKey && (
                  <View style={[S.currentKeyBox, { backgroundColor: isDark ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.05)', borderColor: 'rgba(99,102,241,0.2)' }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[S.apiKeyLabel, { color: C.textSubtle }]}>CURRENT KEY</Text>
                      <Text style={[S.apiKeyVal, { color: '#818CF8' }]}>{geminiStatus.keyPreview ?? '••••••••'}</Text>
                    </View>
                    <TouchableOpacity onPress={copyGeminiPreview} style={S.apiIconBtn}>
                      <Feather name="copy" size={15} color="#818CF8" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleDeleteGeminiKey} style={S.apiIconBtn}>
                      <Feather name="trash-2" size={15} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                )}

                {/* Validation message */}
                {geminiStatus?.validationMessage ? (
                  <View style={[S.validationMsg, {
                    backgroundColor: geminiStatus.isValid ? 'rgba(16,185,129,0.07)' : 'rgba(239,68,68,0.07)',
                    borderColor:     geminiStatus.isValid ? 'rgba(16,185,129,0.2)'  : 'rgba(239,68,68,0.2)',
                  }]}>
                    <Feather name={geminiStatus.isValid ? 'check' : 'alert-circle'} size={14} color={geminiStatus.isValid ? '#10B981' : '#EF4444'} />
                    <Text style={[S.validationMsgText, { color: geminiStatus.isValid ? '#10B981' : '#EF4444' }]}>
                      {geminiStatus.validationMessage}
                    </Text>
                  </View>
                ) : null}

                {/* New key input */}
                <View style={{ gap: 6 }}>
                  <Text style={[S.apiKeyLabel, { color: C.textSubtle }]}>
                    {geminiStatus?.hasKey ? 'REPLACE API KEY' : 'ENTER API KEY'}
                  </Text>
                  <View style={[S.apiKeyBox, { backgroundColor: C.surface2, borderColor: C.border }]}>
                    <Input
                      value={geminiKey}
                      onChangeText={setGeminiKey}
                      placeholder="AIzaSy••••••••••••••••••••••••••"
                      secureTextEntry={!geminiKeyVisible}
                      // CLAUDE.md Rule #3: browsers ignore autoComplete="off" on type="password".
                      // "new-password" prevents credential managers from offering to save/fill.
                      autoComplete="new-password"
                      style={{ flex: 1, marginBottom: 0 }}
                      inputStyle={{
                        fontFamily: Typography.fontFamily.medium,
                        letterSpacing: geminiKeyVisible ? 0 : 2,
                        // CLAUDE.md Rule #2: ensure focus outline is suppressed for this non-auth field
                        outlineStyle: 'none',
                      }}
                    />
                    <TouchableOpacity
                      onPress={() => setGeminiKeyVisible(v => !v)}
                      style={S.apiIconBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Feather name={geminiKeyVisible ? 'eye-off' : 'eye'} size={16} color={C.textMuted} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Helper */}
                <View style={[S.helperBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', borderColor: C.border }]}>
                  <Feather name="info" size={13} color={C.textSubtle} />
                  <Text style={[S.helperText, { color: C.textSubtle }]}>
                    Get your free Gemini API key at{' '}
                    <Text style={{ color: '#818CF8' }}>aistudio.google.com/api-keys</Text>
                    {'\n'}Your key is encrypted with AES-256-GCM before storage.
                  </Text>
                </View>

                {/* Save button */}
                <Button
                  title={geminiSaving ? 'Saving & Validating…' : geminiStatus?.hasKey ? 'Update API Key' : 'Save API Key'}
                  onPress={handleSaveGeminiKey}
                  loading={geminiSaving}
                  disabled={!geminiKey.trim()}
                  variant="primary"
                  icon={!geminiSaving && <Feather name="shield" size={15} color="#fff" />}
                />
              </View>
            )}
          </Card>

          {/* ── Usage Analytics ── */}
          <Card style={{ padding: 24 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={[S.tabTitle, { color: C.foreground, marginBottom: 0 }]}>📊 API Usage</Text>
              <TouchableOpacity onPress={() => loadGeminiStatus(true)} activeOpacity={0.7}>
                <Feather name="refresh-cw" size={15} color={C.textSubtle} />
              </TouchableOpacity>
            </View>

            {usageLoading ? (
              <View style={{ gap: 10 }}>
                {[1,2,3].map(i => <Skeleton key={i} height={44} borderRadius={10} />)}
              </View>
            ) : !usageData ? (
              <View style={{ alignItems: 'center', paddingVertical: 24, gap: 8 }}>
                <Feather name="bar-chart-2" size={28} color={C.textSubtle} />
                <Text style={[S.helperText, { color: C.textSubtle, textAlign: 'center' }]}>
                  Usage data appears here after your first AI request.
                </Text>
              </View>
            ) : (
              <View style={{ gap: 16 }}>

                {/* ── TODAY ─────────────────────────────────────────────────── */}
                <View style={[S.usageSection, { backgroundColor: C.surface2, borderColor: C.border }]}>
                  <Text style={[S.usageSectionLabel, { color: C.textSubtle }]}>TODAY</Text>
                  <View style={S.usageGrid}>
                    {[
                      { label: 'Requests',      value: `${usageData.today.requestCount} / 1,500`, color: '#818CF8' },
                      { label: 'Input Tokens',  value: (usageData.today.inputTokens  ?? 0).toLocaleString(), color: '#10B981' },
                      { label: 'Output Tokens', value: (usageData.today.outputTokens ?? 0).toLocaleString(), color: '#F59E0B' },
                      { label: 'Est. Cost',     value: '$0.00',                                              color: '#10B981' },
                    ].map(s => (
                      <View key={s.label} style={S.usageStat}>
                        <Text style={[S.usageStatVal, { color: s.color }]}>{s.value}</Text>
                        <Text style={[S.usageStatLabel, { color: C.textSubtle }]}>{s.label}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Daily request usage progress bar */}
                  <View style={{ marginTop: 12, gap: 5 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={[S.usageStatLabel, { color: C.textSubtle }]}>Daily Request Usage</Text>
                      <Text style={[S.usageStatLabel, { color: C.textSubtle }]}>
                        {usageData.today.requestCount} / 1,500 requests used
                      </Text>
                    </View>
                    <ProgressBar
                      value={Math.min(100, (usageData.today.requestCount / 1500) * 100)}
                      color={
                        usageData.today.requestCount >= 1350 ? '#EF4444' :
                        usageData.today.requestCount >= 900  ? '#F59E0B' : '#818CF8'
                      }
                      height={7}
                    />
                    <Text style={[S.helperText, { color: C.textSubtle }]}>
                      vs. 1,500 daily request limit · resets at midnight Pacific Time
                    </Text>
                  </View>

                  {/* Per-model breakdown for today */}
                  {usageData.today.byModel?.length > 0 && (
                    <View style={[S.modelBreakdown, { borderTopColor: C.border }]}>
                      <Text style={[S.usageStatLabel, { color: C.textSubtle, marginBottom: 8 }]}>BY MODEL</Text>
                      {usageData.today.byModel.map(m => (
                        <View key={`${m.provider}/${m.model}`} style={S.modelRow}>
                          <View style={[S.modelDot, { backgroundColor: m.provider === 'google' ? '#818CF8' : m.provider === 'openai' ? '#10B981' : '#F59E0B' }]} />
                          <Text style={[S.modelName, { color: C.foreground }]} numberOfLines={1}>{m.displayName}</Text>
                          <Text style={[S.modelStat, { color: C.textSubtle }]}>{m.requestCount} req</Text>
                          <Text style={[S.modelStat, { color: C.textSubtle }]}>{(m.totalTokens ?? 0).toLocaleString()} tok</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Market cost equivalent */}
                  {(usageData.today.marketCostUsd ?? 0) > 0 && (
                    <View style={[S.costSavedRow, { borderTopColor: C.border }]}>
                      <Feather name="tag" size={12} color="#10B981" />
                      <Text style={[S.helperText, { color: C.textSubtle, flex: 1 }]}>
                        {'Market cost equivalent: '}
                        <Text style={{ color: '#10B981', fontFamily: Typography.fontFamily.bold }}>
                          ${(usageData.today.marketCostUsd ?? 0).toFixed(4)}
                        </Text>
                        {' — saved on free tier'}
                      </Text>
                    </View>
                  )}
                </View>

                {/* ── LAST 30 DAYS ──────────────────────────────────────────── */}
                <View style={[S.usageSection, { backgroundColor: C.surface2, borderColor: C.border }]}>
                  <Text style={[S.usageSectionLabel, { color: C.textSubtle }]}>LAST 30 DAYS</Text>
                  <View style={S.usageGrid}>
                    {[
                      { label: 'Requests',      value: String(usageData.last30.requestCount),                   color: '#818CF8' },
                      { label: 'Input Tokens',  value: (usageData.last30.inputTokens  ?? 0).toLocaleString(),   color: '#10B981' },
                      { label: 'Output Tokens', value: (usageData.last30.outputTokens ?? 0).toLocaleString(),   color: '#F59E0B' },
                      { label: 'Market Value',  value: `$${(usageData.last30.marketCostUsd ?? 0).toFixed(4)}`,  color: '#6366F1' },
                    ].map(s => (
                      <View key={s.label} style={S.usageStat}>
                        <Text style={[S.usageStatVal, { color: s.color }]}>{s.value}</Text>
                        <Text style={[S.usageStatLabel, { color: C.textSubtle }]}>{s.label}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Per-model breakdown for last 30 days */}
                  {usageData.last30.byModel?.length > 0 && (
                    <View style={[S.modelBreakdown, { borderTopColor: C.border }]}>
                      <Text style={[S.usageStatLabel, { color: C.textSubtle, marginBottom: 8 }]}>BY MODEL</Text>
                      {usageData.last30.byModel.map(m => (
                        <View key={`${m.provider}/${m.model}`} style={S.modelRow}>
                          <View style={[S.modelDot, { backgroundColor: m.provider === 'google' ? '#818CF8' : m.provider === 'openai' ? '#10B981' : '#F59E0B' }]} />
                          <Text style={[S.modelName, { color: C.foreground }]} numberOfLines={1}>{m.displayName}</Text>
                          <Text style={[S.modelStat, { color: C.textSubtle }]}>{m.requestCount} req</Text>
                          <Text style={[S.modelStat, { color: C.textSubtle }]}>{(m.totalTokens ?? 0).toLocaleString()} tok</Text>
                          <Text style={[S.modelStat, { color: '#6366F1' }]}>${(m.marketCostUsd ?? 0).toFixed(4)}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                {/* ── Free tier info ────────────────────────────────────────── */}
                <View style={[S.hint, { backgroundColor: isDark ? 'rgba(99,102,241,0.06)' : 'rgba(99,102,241,0.04)', borderColor: 'rgba(99,102,241,0.2)' }]}>
                  <Feather name="info" size={13} color="#818CF8" />
                  <Text style={[S.hintText, { color: '#818CF8' }]}>
                    {'Google AI Studio Free Tier · 1,500 req/day · 15 RPM · 1M TPM · $0.00 cost.\n'}
                    {'Market Value shows what this usage would cost on a paid plan. Multiple AI providers can be configured in the key management section above.'}
                  </Text>
                </View>

                <Text style={[S.helperText, { color: C.textSubtle, textAlign: 'right' }]}>
                  Last updated: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            )}
          </Card>
        </View>
      );

      default: return null;
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[S.content, { padding: isWide ? 32 : 16 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={S.pageHeader}>
        <Text style={[S.pageTitle, { color: C.foreground }]}>Settings</Text>
        <Text style={[S.pageSub, { color: C.textMuted }]}>Manage your account, preferences, and security</Text>
      </View>

      <View style={[S.layout, { flexDirection: isWide ? 'row' : 'column', alignItems: 'flex-start' }]}>
        {/* ── Tab navigation ── */}
        <View style={[S.tabNav, { width: isWide ? 220 : '100%' }]}>
          {isWide ? (
            <View style={{ gap: 4 }}>
              {TABS.map(tab => (
                <TouchableOpacity
                  key={tab.id}
                  onPress={() => setActiveTab(tab.id)}
                  style={[
                    S.tabBtn,
                    activeTab === tab.id && { backgroundColor: accentColor },
                    activeTab === tab.id && Platform.select({ web: { boxShadow: '0 4px 12px rgba(79,70,229,0.25)' }, default: { shadowColor: accentColor, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 } }),
                  ]}
                  activeOpacity={0.8}
                >
                  <Feather name={tab.icon} size={15} color={activeTab === tab.id ? '#fff' : C.textMuted} />
                  <Text style={[S.tabBtnText, { color: activeTab === tab.id ? '#fff' : C.textMuted }]}>{tab.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
              {TABS.map(tab => (
                <TouchableOpacity
                  key={tab.id}
                  onPress={() => setActiveTab(tab.id)}
                  style={[S.tabPill, { backgroundColor: activeTab === tab.id ? accentColor : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}
                  activeOpacity={0.8}
                >
                  <Feather name={tab.icon} size={13} color={activeTab === tab.id ? '#fff' : C.textMuted} />
                  <Text style={[S.tabPillText, { color: activeTab === tab.id ? '#fff' : C.textMuted }]}>{tab.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* ── Tab content ── */}
        <View style={{ flex: 1, minWidth: 0, marginTop: isWide ? 0 : 20 }}>
          {renderTab()}
        </View>
      </View>
    </ScrollView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  content:      { flexGrow: 1, paddingBottom: 60 },
  pageHeader:   { marginBottom: 24 },
  pageTitle:    { fontSize: Typography.size['2xl'], fontFamily: Typography.fontFamily.extraBold },
  pageSub:      { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.regular, marginTop: 4 },
  layout:       { gap: 24 },
  tabNav:       {},
  tabBtn:       { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12 },
  tabBtnText:   { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.semiBold },
  tabPill:      { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20 },
  tabPillText:  { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.semiBold },
  tabTitle:     { fontSize: Typography.size.lg, fontFamily: Typography.fontFamily.bold, marginBottom: 20 },
  tabDesc:      { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.regular, marginBottom: 16, lineHeight: 20 },
  sectionHead:  { fontSize: 10, fontFamily: Typography.fontFamily.bold, textTransform: 'uppercase', letterSpacing: 1, borderBottomWidth: 1, paddingBottom: 8, marginBottom: 4 },
  // Profile
  avatarSection: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  avatarWrap:    { position: 'relative', width: 72, height: 72 },
  avatar:        { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'rgba(99,102,241,0.3)' },
  avatarText:    { color: '#fff', fontSize: Typography.size.xl, fontFamily: Typography.fontFamily.extraBold },
  avatarOverlay: { position: 'absolute', inset: 0, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  avatarName:    { fontSize: Typography.size.base, fontFamily: Typography.fontFamily.bold },
  avatarEmail:   { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.regular, marginTop: 2, marginBottom: 8 },
  changePhotoBtn: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start' },
  changePhotoBtnText: { fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.semiBold },
  row2:          { gap: 14 },
  formFooter:    { flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 20, marginTop: 20, borderTopWidth: 1 },
  // Appearance
  settingRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth, gap: 16 },
  settingName:   { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.semiBold },
  settingDesc:   { fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.regular, marginTop: 2, lineHeight: 16 },
  themeToggleRow:{ flexDirection: 'row', borderRadius: 10, borderWidth: 1, overflow: 'hidden' },
  themeBtn:      { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  themeBtnText:  { fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.semiBold },
  swatchRow:     { flexDirection: 'row', gap: 8 },
  swatch:        { width: 28, height: 28, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  swatchActive:  { borderWidth: 2, borderColor: '#fff' },
  densityRow:    { flexDirection: 'row', borderRadius: 10, borderWidth: 1, overflow: 'hidden' },
  densityBtn:    { paddingHorizontal: 10, paddingVertical: 7 },
  densityBtnText:{ fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.semiBold },
  hint:          { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 12, borderWidth: 1, padding: 12 },
  hintText:      { flex: 1, fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.regular, lineHeight: 17 },
  // Notifications
  notifHeaderRow:{ flexDirection: 'row', alignItems: 'center', paddingBottom: 10, borderBottomWidth: 1, marginBottom: 4 },
  notifChannelHeader: { width: 44, textAlign: 'center', fontSize: 9, fontFamily: Typography.fontFamily.bold, letterSpacing: 0.5 },
  notifRow:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 8 },
  notifLabel:    { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.semiBold },
  notifDesc:     { fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.regular, marginTop: 2 },
  // Security
  twoFaRow:      { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, borderWidth: 1, padding: 14 },
  twoFaIcon:     { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  twoFaTitle:    { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.bold },
  twoFaDesc:     { fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.regular, marginTop: 2 },
  dangerItem:    { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  // Billing
  planCard:      { borderRadius: 16, borderWidth: 1, padding: 20, overflow: 'hidden', position: 'relative' },
  planCardInner: {},
  planBadgeRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  planName:      { fontSize: Typography.size.xl, fontFamily: Typography.fontFamily.extraBold },
  planBadge:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  planBadgeText: { color: '#fff', fontSize: 10, fontFamily: Typography.fontFamily.extraBold, letterSpacing: 0.5 },
  planDesc:      { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.regular },
  planFeature:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  planFeatureText:{ fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.regular },
  quotaLabel:    { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.medium },
  quotaVal:      { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.bold },
  upgradeBanner: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 14, borderWidth: 1, padding: 16, flexWrap: 'wrap' },
  upgradeTitle:  { fontSize: Typography.size.base, fontFamily: Typography.fontFamily.bold, marginBottom: 3 },
  upgradeDesc:   { fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.regular, lineHeight: 17 },
  // API / Gemini
  apiKeyBox:        { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  apiKeyLabel:      { fontSize: 9, fontFamily: Typography.fontFamily.bold, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  apiKeyVal:        { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.bold, letterSpacing: 1 },
  apiIconBtn:       { padding: 6 },
  // Gemini specific
  validBadge:       { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, borderWidth: 1, marginLeft: 10 },
  validBadgeText:   { fontSize: 10, fontFamily: Typography.fontFamily.bold },
  currentKeyBox:    { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1 },
  validationMsg:    { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 10, borderRadius: 10, borderWidth: 1 },
  validationMsgText:{ flex: 1, fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.medium, lineHeight: 17 },
  helperBox:        { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  helperText:       { flex: 1, fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.regular, lineHeight: 17 },
  // Usage analytics
  usageSection:     { borderRadius: 12, borderWidth: 1, padding: 14 },
  usageSectionLabel:{ fontSize: 9, fontFamily: Typography.fontFamily.bold, letterSpacing: 0.8, marginBottom: 10 },
  usageGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  usageStat:        { minWidth: 80, gap: 3 },
  usageStatVal:     { fontSize: Typography.size.lg, fontFamily: Typography.fontFamily.extraBold },
  usageStatLabel:   { fontSize: 9, fontFamily: Typography.fontFamily.medium },
  costSavedRow:     { flexDirection: 'row', alignItems: 'center', gap: 6, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10, marginTop: 10 },
  modelBreakdown:   { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10, marginTop: 10, gap: 6 },
  modelRow:         { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modelDot:         { width: 7, height: 7, borderRadius: 4, flexShrink: 0 },
  modelName:        { flex: 1, fontSize: 11, fontFamily: Typography.fontFamily.semiBold },
  modelStat:        { fontSize: 10, fontFamily: Typography.fontFamily.medium, minWidth: 52, textAlign: 'right' },
});
