import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Switch, Alert, Platform, useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Toast } from '../../components/ui/Toast';
import { ENDPOINTS } from '../../constants/api';

const TABS = [
  { id: 'profile', label: 'Profile', icon: 'user' },
  { id: 'notifications', label: 'Notifications', icon: 'bell' },
  { id: 'security', label: 'Security', icon: 'shield' },
  { id: 'organization', label: 'Organization', icon: 'home' },
  { id: 'billing', label: 'Billing & Plan', icon: 'credit-card' },
  { id: 'api', label: 'API & Integrations', icon: 'code' },
];

export default function SettingsScreen() {
  const { isDark } = useTheme();
  const { user, token, updateUser, logout, loading } = useAuth();
  const router = useRouter();
  const C = isDark ? Colors.dark : Colors.light;
  const { width } = useWindowDimensions();
  const isWide = Platform.OS === 'web' && width >= 768;

  const [activeTab, setActiveTab] = useState('profile');
  const [toast, setToast] = useState(null);
  const [apiKeyVisible, setApiKeyVisible] = useState(false);

  // Profile form
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('student');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Notifications
  const [notifs, setNotifs] = useState({ submits: true, joins: true, violations: true, reminders: true, digest: false, email: true, push: true, sms: false });

  // Org
  const [orgName, setOrgName] = useState('DM Clinical');

  useEffect(() => {
    if (loading || !user) return;
    setFirstName(user.firstName || '');
    setLastName(user.lastName || '');
    setEmail(user.email || '');
    setRole(user.role || 'student');
    setPhone(user.phone || '');
    setBio(user.bio || '');
  }, [loading, user]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type, visible: true });
    setTimeout(() => setToast(null), 3000);
  };

  const handleProfileSave = async () => {
    try {
      const res = await fetch(ENDPOINTS.profile, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ firstName, lastName, bio, role, phone }),
      });
      const data = await res.json();
      if (data.success) { await updateUser(data.data.user); showToast('Profile updated successfully!'); }
      else showToast(data.message || 'Update failed', 'error');
    } catch { showToast('Connection error', 'error'); }
  };

  const handlePasswordUpdate = () => {
    if (!currentPassword) { showToast('Enter your current password', 'warning'); return; }
    if (newPassword.length < 8) { showToast('New password must be at least 8 characters', 'warning'); return; }
    if (newPassword !== confirmPassword) { showToast('Passwords do not match', 'error'); return; }
    showToast('Password updated successfully!');
    setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
  };

  const handleDeleteAccount = () => {
    Alert.alert('Delete Account', 'Type DELETE to confirm. This action is irreversible.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          showToast('Account deletion scheduled. Goodbye!', 'error');
          await logout();
          router.replace('/');
        }
      },
    ]);
  };

  const NotifRow = ({ label, desc, field }) => (
    <View style={[styles.notifRow, { borderBottomColor: C.border }]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.notifLabel, { color: C.foreground }]}>{label}</Text>
        {desc && <Text style={[styles.notifDesc, { color: C.textSubtle }]}>{desc}</Text>}
      </View>
      <Switch
        value={notifs[field]}
        onValueChange={(v) => setNotifs({ ...notifs, [field]: v })}
        trackColor={{ false: isDark ? '#334155' : '#CBD5E1', true: 'rgba(99,102,241,0.5)' }}
        thumbColor={notifs[field] ? '#6366F1' : '#94A3B8'}
      />
    </View>
  );

  const renderTab = () => {
    switch (activeTab) {
      case 'profile': return (
        <Card style={{ padding: 24 }}>
          <Text style={[styles.tabTitle, { color: C.foreground }]}>👤 Profile Information</Text>

          {/* Avatar */}
          <View style={styles.avatarSection}>
            <LinearGradient colors={['#6366F1', '#7C3AED']} style={styles.avatar}>
              <Text style={styles.avatarText}>
                {((firstName?.charAt(0) || '') + (lastName?.charAt(0) || '')).toUpperCase() || '?'}
              </Text>
            </LinearGradient>
            <View style={{ marginLeft: 16 }}>
              <Text style={[styles.avatarName, { color: C.foreground }]}>{firstName} {lastName}</Text>
              <Text style={[styles.avatarEmail, { color: C.textSubtle }]}>{email}</Text>
            </View>
          </View>

          <View style={[styles.grid, { flexDirection: isWide ? 'row' : 'column', gap: 16 }]}>
            <View style={{ flex: 1 }}>
              <Input label="First Name" value={firstName} onChangeText={setFirstName} />
            </View>
            <View style={{ flex: 1 }}>
              <Input label="Last Name" value={lastName} onChangeText={setLastName} />
            </View>
          </View>
          <View style={{ marginTop: 16 }}>
            <Input label="Email Address" value={email} disabled />
          </View>
          <View style={{ marginTop: 16 }}>
            <Input label="Phone Number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" icon="phone" />
          </View>
          <View style={{ marginTop: 16 }}>
            <Input label="Bio" value={bio} onChangeText={setBio} multiline numberOfLines={3} />
          </View>
          <View style={[styles.formFooter, { borderTopColor: C.border }]}>
            <Button title="Save Changes" onPress={handleProfileSave} fullWidth={false} style={{ paddingHorizontal: 24 }} />
          </View>
        </Card>
      );

      case 'notifications': return (
        <Card style={{ padding: 24 }}>
          <Text style={[styles.tabTitle, { color: C.foreground }]}>🔔 Notification Preferences</Text>
          <Text style={[styles.sectionHead, { color: C.textSubtle, borderBottomColor: C.border }]}>Exam Activity</Text>
          <NotifRow label="Student submits exam" desc="Get notified each time a student submits" field="submits" />
          <NotifRow label="Student joins exam" desc="Notify when a student enters the exam lobby" field="joins" />
          <NotifRow label="Violation detected" desc="Alert on anti-cheat proctoring violations" field="violations" />
          <Text style={[styles.sectionHead, { color: C.textSubtle, borderBottomColor: C.border, marginTop: 20 }]}>Reminders</Text>
          <NotifRow label="Upcoming exam reminder" desc="Alert 24 hours before a scheduled exam" field="reminders" />
          <NotifRow label="Weekly analytics digest" desc="Email summary of last week's exam stats" field="digest" />
          <Text style={[styles.sectionHead, { color: C.textSubtle, borderBottomColor: C.border, marginTop: 20 }]}>Channels</Text>
          <NotifRow label="Email notifications" field="email" />
          <NotifRow label="Push notifications" field="push" />
          <NotifRow label="Mobile SMS alerts" field="sms" />
          <View style={[styles.formFooter, { borderTopColor: C.border }]}>
            <Button title="Save Preferences" onPress={() => showToast('Notification preferences saved!')} fullWidth={false} style={{ paddingHorizontal: 24 }} />
          </View>
        </Card>
      );

      case 'security': return (
        <View style={{ gap: 16 }}>
          <Card style={{ padding: 24 }}>
            <Text style={[styles.tabTitle, { color: C.foreground }]}>🔒 Password & Authentication</Text>
            <View style={{ gap: 16 }}>
              <Input label="Current Password" value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry={!showCurrent} icon="lock" rightIcon={showCurrent ? 'eye-off' : 'eye'} onRightIconPress={() => setShowCurrent(!showCurrent)} />
              <Input label="New Password" value={newPassword} onChangeText={setNewPassword} secureTextEntry={!showNew} icon="lock" rightIcon={showNew ? 'eye-off' : 'eye'} onRightIconPress={() => setShowNew(!showNew)} />
              <Input label="Confirm Password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry={!showConfirm} icon="lock" rightIcon={showConfirm ? 'eye-off' : 'eye'} onRightIconPress={() => setShowConfirm(!showConfirm)} />
            </View>
            <View style={[styles.formFooter, { borderTopColor: C.border }]}>
              <Button title="Update Password" onPress={handlePasswordUpdate} fullWidth={false} style={{ paddingHorizontal: 24 }} />
            </View>
          </Card>
          <Card style={{ padding: 24 }}>
            <Text style={[styles.tabTitle, { color: C.foreground }]}>🛡️ Two-Factor Authentication</Text>
            <Text style={[styles.tabDesc, { color: C.textMuted }]}>Add an extra layer of security to your account with 2FA.</Text>
            <Button title="Enable 2FA" onPress={() => showToast('2FA setup coming soon', 'info')} variant="secondary" fullWidth={false} style={{ alignSelf: 'flex-start', paddingHorizontal: 20 }} />
          </Card>
          <Card style={{ padding: 24, borderColor: 'rgba(239,68,68,0.20)' }}>
            <Text style={[styles.tabTitle, { color: '#EF4444' }]}>⚠️ Danger Zone</Text>
            <Text style={[styles.tabDesc, { color: C.textMuted }]}>Permanently delete your account and all associated data.</Text>
            <Button title="Delete Account" onPress={handleDeleteAccount} variant="danger" fullWidth={false} style={{ alignSelf: 'flex-start', paddingHorizontal: 20 }} />
          </Card>
        </View>
      );

      case 'organization': return (
        <Card style={{ padding: 24 }}>
          <Text style={[styles.tabTitle, { color: C.foreground }]}>🏢 Organization Settings</Text>
          <View style={{ gap: 16 }}>
            <Input label="Organization Name" value={orgName} onChangeText={setOrgName} icon="home" />
            <Input label="Certificate Footer" value="Authorized by DM Clinical" icon="file-text" />
            <Input label="Custom Domain" placeholder="exams.yourschool.edu" icon="globe" />
          </View>
          <View style={[styles.formFooter, { borderTopColor: C.border }]}>
            <Button title="Save Organization" onPress={() => showToast('Organization settings saved!')} fullWidth={false} style={{ paddingHorizontal: 24 }} />
          </View>
        </Card>
      );

      case 'billing': return (
        <Card style={{ padding: 24 }}>
          <Text style={[styles.tabTitle, { color: C.foreground }]}>💳 Billing & Plan</Text>
          <View style={[styles.planCard, { borderColor: '#6366F1', backgroundColor: 'rgba(99,102,241,0.06)' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={[styles.planName, { color: C.foreground }]}>Pro Plan</Text>
                <Text style={[styles.planPrice, { color: '#6366F1' }]}>$29 / month</Text>
              </View>
              <View style={[styles.planBadge, { backgroundColor: 'rgba(99,102,241,0.15)' }]}>
                <Text style={{ color: '#6366F1', fontSize: 10, fontFamily: Typography.fontFamily.bold }}>ACTIVE</Text>
              </View>
            </View>
            <Text style={[styles.planDesc, { color: C.textMuted }]}>Unlimited exams · 500 students · Advanced proctoring</Text>
          </View>
          <Button title="Manage Subscription" onPress={() => showToast('Billing portal coming soon', 'info')} variant="secondary" style={{ marginTop: 16 }} />
        </Card>
      );

      case 'api': return (
        <Card style={{ padding: 24 }}>
          <Text style={[styles.tabTitle, { color: C.foreground }]}>⚡ API & Integrations</Text>
          <View style={[styles.apiKeyBox, { backgroundColor: C.surface2, borderColor: C.border }]}>
            <Text style={[styles.apiKeyLabel, { color: C.textSubtle }]}>Your API Key</Text>
            <Text style={[styles.apiKeyVal, { color: C.foreground }]} numberOfLines={1}>
              {apiKeyVisible ? 'ef_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' : '••••••••••••••••••••••••••••••••'}
            </Text>
            <TouchableOpacity onPress={() => setApiKeyVisible(!apiKeyVisible)} style={styles.apiToggle}>
              <Feather name={apiKeyVisible ? 'eye-off' : 'eye'} size={16} color={C.textMuted} />
            </TouchableOpacity>
          </View>
          <Button title="Regenerate Key" onPress={() => showToast('API key regenerated!', 'success')} variant="secondary" style={{ marginTop: 16 }} />
        </Card>
      );

      default: return null;
    }
  };

  if (loading || !user) return null;

  return (
    <View style={{ flex: 1, position: 'relative' }}>
      {toast && <Toast message={toast.message} type={toast.type} visible={toast.visible} />}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.content, { padding: isWide ? 32 : 16 }]} showsVerticalScrollIndicator={false}>

        <View style={{ marginBottom: 24 }}>
          <Text style={[styles.pageTitle, { color: C.foreground }]}>Settings</Text>
          <Text style={[styles.pageSub, { color: C.textMuted }]}>Manage your account, preferences, and security</Text>
        </View>

        <View style={[styles.layout, { flexDirection: isWide ? 'row' : 'column', alignItems: 'flex-start', gap: 24 }]}>
          {/* Tab nav */}
          <View style={[styles.tabNav, { width: isWide ? 220 : '100%' }]}>
            {isWide ? (
              TABS.map((tab) => (
                <TouchableOpacity
                  key={tab.id}
                  onPress={() => setActiveTab(tab.id)}
                  style={[
                    styles.tabBtn,
                    activeTab === tab.id && styles.tabBtnActive,
                    { backgroundColor: activeTab === tab.id ? '#4F46E5' : 'transparent' },
                  ]}
                >
                  <Feather name={tab.icon} size={15} color={activeTab === tab.id ? '#fff' : C.textMuted} />
                  <Text style={[styles.tabBtnText, { color: activeTab === tab.id ? '#fff' : C.textMuted }]}>{tab.label}</Text>
                </TouchableOpacity>
              ))
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
                {TABS.map((tab) => (
                  <TouchableOpacity
                    key={tab.id}
                    onPress={() => setActiveTab(tab.id)}
                    style={[
                      styles.tabPill,
                      { backgroundColor: activeTab === tab.id ? '#4F46E5' : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' },
                    ]}
                  >
                    <Feather name={tab.icon} size={13} color={activeTab === tab.id ? '#fff' : C.textMuted} />
                    <Text style={[styles.tabPillText, { color: activeTab === tab.id ? '#fff' : C.textMuted }]}>{tab.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Tab content */}
          <View style={{ flex: 1, minWidth: 0 }}>
            {renderTab()}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingBottom: 60 },
  pageTitle: { fontSize: Typography.size['2xl'], fontFamily: Typography.fontFamily.extraBold },
  pageSub: { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.regular, marginTop: 4 },
  layout: {},
  tabNav: { gap: 4 },
  tabBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12 },
  tabBtnActive: { shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
  tabBtnText: { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.semiBold },
  tabPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20 },
  tabPillText: { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.semiBold },
  tabTitle: { fontSize: Typography.size.lg, fontFamily: Typography.fontFamily.bold, marginBottom: 20 },
  tabDesc: { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.regular, marginBottom: 16, lineHeight: 20 },
  avatarSection: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  avatar: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: Typography.size.xl, fontFamily: Typography.fontFamily.bold },
  avatarName: { fontSize: Typography.size.base, fontFamily: Typography.fontFamily.bold },
  avatarEmail: { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.regular, marginTop: 2 },
  grid: {},
  formFooter: { flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 20, marginTop: 20, borderTopWidth: 1 },
  notifRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1 },
  notifLabel: { fontSize: Typography.size.base, fontFamily: Typography.fontFamily.semiBold },
  notifDesc: { fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.regular, marginTop: 2 },
  sectionHead: { fontSize: 10, fontFamily: Typography.fontFamily.bold, textTransform: 'uppercase', letterSpacing: 1, borderBottomWidth: 1, paddingBottom: 8, marginBottom: 4 },
  planCard: { borderRadius: 14, borderWidth: 1.5, padding: 18, marginTop: 8 },
  planName: { fontSize: Typography.size.md, fontFamily: Typography.fontFamily.bold },
  planPrice: { fontSize: Typography.size.xl, fontFamily: Typography.fontFamily.extraBold, marginTop: 2 },
  planDesc: { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.regular, marginTop: 8 },
  planBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  apiKeyBox: { borderRadius: 12, borderWidth: 1, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  apiKeyLabel: { fontSize: Typography.size.xs, fontFamily: Typography.fontFamily.semiBold, marginRight: 8 },
  apiKeyVal: { flex: 1, fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.medium },
  apiToggle: { padding: 4 },
});
