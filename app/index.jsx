import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Platform, useWindowDimensions, Alert, KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Colors } from '../constants/colors';
import { Typography } from '../constants/typography';
import { ENDPOINTS, GOOGLE_CLIENT_ID, GOOGLE_EXPO_CLIENT_ID } from '../constants/api';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { ThemeToggle } from '../components/ui/ThemeToggle';

WebBrowser.maybeCompleteAuthSession();

const FEATURES = [
  { icon: 'radio', text: 'AI Quiz Generation in seconds' },
  { icon: 'shield', text: 'Anti-cheating & proctoring built-in' },
  { icon: 'bar-chart-2', text: 'Deep analytics & performance insights' },
  { icon: 'users', text: 'Unlimited students, one platform' },
];

export default function AuthScreen() {
  const { isDark } = useTheme();
  const { login } = useAuth();
  const router = useRouter();
  const C = isDark ? Colors.dark : Colors.light;
  const { width } = useWindowDimensions();
  const isWide = Platform.OS === 'web' && width >= 768;
  const insets = useSafeAreaInsets();

  const [formType, setFormType] = useState('login');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [userEmail, setUserEmail] = useState('');

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [otp, setOtp] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [remember, setRemember] = useState(false);

  // Google Auth
  const [googleRequest, googleResponse, promptGoogleAsync] = Google.useAuthRequest({
    clientId: GOOGLE_CLIENT_ID,
    iosClientId: GOOGLE_CLIENT_ID,
    androidClientId: GOOGLE_CLIENT_ID,
    webClientId: GOOGLE_CLIENT_ID,
    expoClientId: GOOGLE_EXPO_CLIENT_ID,
    redirectUri: makeRedirectUri({ useProxy: true }),
    scopes: ['profile', 'email'],
  });

  React.useEffect(() => {
    if (googleResponse?.type === 'success') {
      const { authentication } = googleResponse;
      handleGoogleAuth(authentication.accessToken);
    }
  }, [googleResponse]);

  const handleGoogleAuth = async (accessToken) => {
    setLoading(true);
    try {
      const userInfo = await fetch('https://www.googleapis.com/userinfo/v2/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      }).then(r => r.json());

      const res = await fetch(`${ENDPOINTS.login.replace('/login', '/google')}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: accessToken, email: userInfo.email, name: userInfo.name }),
      });
      const result = await res.json();
      if (res.ok) {
        await login(result.data.token, result.data.user);
        // AuthGate in _layout.jsx will redirect to /dashboard automatically
      } else {
        setErrorMsg(result.message || 'Google sign-in failed');
      }
    } catch (_) {
      setErrorMsg('Google sign-in failed. Please try email login.');
    }
    setLoading(false);
  };

  const handleLogin = async () => {
    setLoading(true); setErrorMsg(''); setSuccessMsg('');
    try {
      const res = await fetch(ENDPOINTS.login, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const result = await res.json();
      if (res.ok) {
        await login(result.data.token, result.data.user);
        // AuthGate in _layout.jsx will redirect to /dashboard automatically
      } else {
        if (result.requiresVerification) { setUserEmail(email); setFormType('otp'); setErrorMsg('Please verify your email first.'); }
        else setErrorMsg(result.message || 'Login failed');
      }
    } catch (_) { setErrorMsg('Failed to connect to the server.'); }
    setLoading(false);
  };

  const handleSignup = async () => {
    setLoading(true); setErrorMsg(''); setSuccessMsg('');
    try {
      const res = await fetch(ENDPOINTS.register, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, firstName, lastName }),
      });
      const result = await res.json();
      if (res.ok) { setUserEmail(email); setSuccessMsg(result.message); setFormType('otp'); }
      else setErrorMsg(result.message || result.errors?.[0]?.msg || 'Registration failed');
    } catch (_) { setErrorMsg('Failed to connect to the server.'); }
    setLoading(false);
  };

  const handleVerifyOtp = async () => {
    setLoading(true); setErrorMsg(''); setSuccessMsg('');
    try {
      const res = await fetch(ENDPOINTS.verifyOtp, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, otp }),
      });
      const result = await res.json();
      if (res.ok) {
        await login(result.data.token, result.data.user);
        // AuthGate in _layout.jsx will redirect to /dashboard automatically
      } else setErrorMsg(result.message || 'Verification failed');
    } catch (_) { setErrorMsg('Failed to connect to the server.'); }
    setLoading(false);
  };

  const handleResendOtp = async () => {
    setLoading(true);
    try {
      const res = await fetch(ENDPOINTS.resendOtp, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: userEmail }) });
      const data = await res.json();
      if (res.ok) setSuccessMsg(data.message); else setErrorMsg(data.message);
    } catch (_) { setErrorMsg('Connection failed'); }
    setLoading(false);
  };

  const handleForgot = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    setSuccessMsg('If an account exists, a reset link was sent.');
    setLoading(false);
  };

  const GoogleButton = ({ label }) => (
    <TouchableOpacity
      onPress={() => promptGoogleAsync()}
      disabled={!googleRequest}
      style={[styles.googleBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', borderColor: C.borderMedium }]}
      activeOpacity={0.8}
    >
      <View style={styles.googleIcon}>
        <Text style={{ fontSize: 16 }}>G</Text>
      </View>
      <Text style={[styles.googleText, { color: C.foreground }]}>{label}</Text>
    </TouchableOpacity>
  );

  const Divider = ({ label }) => (
    <View style={styles.divider}>
      <View style={[styles.dividerLine, { backgroundColor: C.border }]} />
      <Text style={[styles.dividerText, { color: C.textSubtle }]}>{label}</Text>
      <View style={[styles.dividerLine, { backgroundColor: C.border }]} />
    </View>
  );

  const renderForm = () => {
    if (formType === 'login') return (
      <View>
        <View style={styles.dots}>
          <View style={[styles.dot, styles.dotActive, { backgroundColor: '#4F46E5' }]} />
          <View style={[styles.dot, { backgroundColor: isDark ? '#334155' : '#CBD5E1' }]} />
          <View style={[styles.dot, { backgroundColor: isDark ? '#334155' : '#CBD5E1' }]} />
        </View>
        <Text style={[styles.formTitle, { color: C.foreground }]}>Welcome back 👋</Text>
        <Text style={[styles.formSubtitle, { color: C.textMuted }]}>Sign in to your ExamFlow AI account</Text>
        <GoogleButton label="Continue with Google" />
        <Divider label="or" />
        <View style={styles.fieldGroup}>
          <Input label="Email address" placeholder="you@school.edu" value={email} onChangeText={setEmail} icon="mail" keyboardType="email-address" />
        </View>
        <View style={styles.fieldGroup}>
          <View style={styles.labelRow}>
            <Text style={[styles.fieldLabel, { color: C.textMuted }]}>Password</Text>
            <TouchableOpacity onPress={() => setFormType('forgot')}>
              <Text style={[styles.link, { color: '#6366F1' }]}>Forgot password?</Text>
            </TouchableOpacity>
          </View>
          <Input placeholder="••••••••" value={password} onChangeText={setPassword} icon="lock" secureTextEntry={!showPassword} rightIcon={showPassword ? 'eye-off' : 'eye'} onRightIconPress={() => setShowPassword(!showPassword)} />
        </View>
        <TouchableOpacity onPress={() => setRemember(!remember)} style={styles.checkRow}>
          <View style={[styles.checkbox, { borderColor: C.borderMedium, backgroundColor: remember ? '#4F46E5' : C.surface2 }]}>
            {remember && <Feather name="check" size={10} color="#fff" />}
          </View>
          <Text style={[styles.checkLabel, { color: C.textMuted }]}>Remember me for 30 days</Text>
        </TouchableOpacity>
        <Button title="Sign in to ExamFlow" onPress={handleLogin} loading={loading} style={{ marginTop: 8 }} />
        <View style={styles.switchRow}>
          <Text style={[styles.switchText, { color: C.textMuted }]}>Don't have an account?</Text>
          <TouchableOpacity onPress={() => setFormType('signup')}>
            <Text style={[styles.link, { color: '#6366F1' }]}> Create free account</Text>
          </TouchableOpacity>
        </View>
      </View>
    );

    if (formType === 'signup') return (
      <View>
        <View style={styles.dots}>
          <View style={[styles.dot, { backgroundColor: isDark ? '#334155' : '#CBD5E1' }]} />
          <View style={[styles.dot, styles.dotActive, { backgroundColor: '#7C3AED' }]} />
          <View style={[styles.dot, { backgroundColor: isDark ? '#334155' : '#CBD5E1' }]} />
        </View>
        <Text style={[styles.formTitle, { color: C.foreground }]}>Create account ✨</Text>
        <Text style={[styles.formSubtitle, { color: C.textMuted }]}>Start your 14-day free trial. No credit card needed.</Text>
        <GoogleButton label="Sign up with Google" />
        <Divider label="or sign up with email" />
        <View style={[styles.fieldGroup, { flexDirection: 'row', gap: 12 }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.fieldLabel, { color: C.textMuted }]}>First name</Text>
            <Input placeholder="John" value={firstName} onChangeText={setFirstName} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.fieldLabel, { color: C.textMuted }]}>Last name</Text>
            <Input placeholder="Doe" value={lastName} onChangeText={setLastName} />
          </View>
        </View>
        <View style={styles.fieldGroup}>
          <Input label="Work email" placeholder="you@school.edu" value={email} onChangeText={setEmail} icon="mail" keyboardType="email-address" />
        </View>
        <View style={styles.fieldGroup}>
          <Input label="Password" placeholder="Min 8 characters" value={password} onChangeText={setPassword} icon="lock" secureTextEntry={!showPassword} rightIcon={showPassword ? 'eye-off' : 'eye'} onRightIconPress={() => setShowPassword(!showPassword)} />
        </View>
        <Button title="Create Free Account" onPress={handleSignup} loading={loading} variant="primary" style={{ marginTop: 8 }} />
        <View style={styles.switchRow}>
          <Text style={[styles.switchText, { color: C.textMuted }]}>Already have an account?</Text>
          <TouchableOpacity onPress={() => setFormType('login')}>
            <Text style={[styles.link, { color: '#7C3AED' }]}> Sign in</Text>
          </TouchableOpacity>
        </View>
      </View>
    );

    if (formType === 'otp') return (
      <View>
        <Text style={[styles.formTitle, { color: C.foreground }]}>Check your email 📧</Text>
        <Text style={[styles.formSubtitle, { color: C.textMuted }]}>
          We've sent a 6-digit code to <Text style={{ color: C.foreground, fontFamily: Typography.fontFamily.bold }}>{userEmail}</Text>
        </Text>
        <View style={styles.fieldGroup}>
          <Input label="Verification Code" placeholder="123456" value={otp} onChangeText={setOtp} keyboardType="number-pad" maxLength={6} textAlign="center" inputStyle={{ fontSize: 28, letterSpacing: 12, fontFamily: Typography.fontFamily.bold }} />
        </View>
        <Button title="Verify Account" onPress={handleVerifyOtp} loading={loading} variant="success" style={{ marginTop: 8 }} />
        <View style={styles.switchRow}>
          <Text style={[styles.switchText, { color: C.textMuted }]}>Didn't receive the email?</Text>
          <TouchableOpacity onPress={handleResendOtp}>
            <Text style={[styles.link, { color: '#10B981' }]}> Click to resend</Text>
          </TouchableOpacity>
        </View>
      </View>
    );

    if (formType === 'forgot') return (
      <View>
        <TouchableOpacity onPress={() => setFormType('login')} style={styles.backBtn}>
          <Feather name="chevron-left" size={16} color={C.textMuted} />
          <Text style={[styles.backText, { color: C.textMuted }]}>Back to sign in</Text>
        </TouchableOpacity>
        <Text style={[styles.formTitle, { color: C.foreground }]}>Forgot password? 🔑</Text>
        <Text style={[styles.formSubtitle, { color: C.textMuted }]}>Enter your email and we'll send you a reset link.</Text>
        <View style={styles.fieldGroup}>
          <Input label="Email address" placeholder="you@school.edu" value={forgotEmail} onChangeText={setForgotEmail} icon="mail" keyboardType="email-address" />
        </View>
        <Button title="Send Reset Link" onPress={handleForgot} loading={loading} style={{ marginTop: 8 }} />
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[styles.root, { backgroundColor: C.background, flexDirection: isWide ? 'row' : 'column', paddingTop: isWide ? 0 : insets.top }]}>

        {/* Brand Panel — wide only */}
        {isWide && (
          <View style={[styles.brandPanel, { backgroundColor: C.surface, borderRightColor: C.border }]}>
            <LinearGradient colors={['rgba(79,70,229,0.08)', 'rgba(124,58,237,0.04)']} style={StyleSheet.absoluteFillObject} />
            <View style={{ flex: 1, justifyContent: 'space-between' }}>
              <View>
                <View style={styles.brandLogoRow}>
                  <LinearGradient colors={['#4F46E5', '#7C3AED']} style={styles.brandLogoIcon}>
                    <Feather name="layers" size={20} color="#fff" />
                  </LinearGradient>
                  <Text style={[styles.brandName, { color: '#6366F1' }]}>ExamFlow AI</Text>
                </View>
                <Text style={[styles.brandH1, { color: C.foreground }]}>
                  The Smartest Way to{'\n'}
                  <Text style={{ color: '#818CF8' }}>Create & Manage{'\n'}</Text>
                  Online Exams
                </Text>
                <Text style={[styles.brandDesc, { color: C.textMuted }]}>
                  AI-powered exam creation, real-time proctoring, deep analytics — everything you need to run modern assessments at scale.
                </Text>
                {FEATURES.map((f, i) => (
                  <View key={i} style={styles.featureRow}>
                    <View style={styles.featureIcon}>
                      <Feather name={f.icon} size={14} color="#818CF8" />
                    </View>
                    <Text style={[styles.featureText, { color: C.textMuted }]}>{f.text}</Text>
                  </View>
                ))}
                <View style={[styles.statsRow, { borderTopColor: C.border }]}>
                  {[['50K+', 'Exams Created'], ['2M+', 'Students'], ['98%', 'Satisfaction']].map(([val, lab], i) => (
                    <View key={i}>
                      <Text style={[styles.statVal, { color: C.foreground }]}>{val}</Text>
                      <Text style={[styles.statLabel, { color: C.textSubtle }]}>{lab}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <Text style={[styles.brandFooter, { color: C.textSubtle }]}>© 2026 ExamFlow AI</Text>
            </View>
          </View>
        )}

        {/* Auth Panel */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.authContainer, { minHeight: isWide ? undefined : '100%' }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Theme toggle */}
          <View style={styles.themeToggleRow}>
            {!isWide && (
              <View style={styles.mobileLogo}>
                <LinearGradient colors={['#4F46E5', '#7C3AED']} style={styles.mobileLogoIcon}>
                  <Feather name="layers" size={16} color="#fff" />
                </LinearGradient>
                <Text style={[styles.mobileLogoText, { color: '#6366F1' }]}>ExamFlow AI</Text>
              </View>
            )}
            <ThemeToggle />
          </View>

          <View style={styles.formCard}>
            {/* Messages */}
            {errorMsg !== '' && (
              <View style={[styles.alert, { backgroundColor: 'rgba(239,68,68,0.10)', borderColor: 'rgba(239,68,68,0.20)' }]}>
                <Text style={{ color: '#EF4444', fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.medium }}>{errorMsg}</Text>
              </View>
            )}
            {successMsg !== '' && (
              <View style={[styles.alert, { backgroundColor: 'rgba(16,185,129,0.10)', borderColor: 'rgba(16,185,129,0.20)' }]}>
                <Text style={{ color: '#10B981', fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.medium }}>{successMsg}</Text>
              </View>
            )}
            {renderForm()}
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  brandPanel: { width: '48%', padding: 48, borderRightWidth: 1, overflow: 'hidden' },
  brandLogoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 40 },
  brandLogoIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  brandName: { fontSize: Typography.size.xl, fontFamily: Typography.fontFamily.bold },
  brandH1: { fontSize: 38, fontFamily: Typography.fontFamily.extraBold, lineHeight: 48, marginBottom: 16 },
  brandDesc: { fontSize: Typography.size.md, lineHeight: 26, marginBottom: 28, fontFamily: Typography.fontFamily.regular },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  featureIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(99,102,241,0.10)', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  featureText: { fontSize: Typography.size.base, fontFamily: Typography.fontFamily.medium },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, paddingTop: 24, marginTop: 24 },
  statVal: { fontSize: Typography.size['2xl'], fontFamily: Typography.fontFamily.extraBold, marginBottom: 2 },
  statLabel: { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.medium },
  brandFooter: { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.medium, marginTop: 24 },
  authContainer: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  themeToggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', maxWidth: 440, marginBottom: 16 },
  mobileLogo: { flexDirection: 'row', alignItems: 'center' },
  mobileLogoIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  mobileLogoText: { fontSize: Typography.size.md, fontFamily: Typography.fontFamily.bold },
  formCard: { width: '100%', maxWidth: 440 },
  alert: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 16 },
  dots: { flexDirection: 'row', gap: 6, marginBottom: 24 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dotActive: { width: 20, height: 6, borderRadius: 3 },
  formTitle: { fontSize: Typography.size['3xl'], fontFamily: Typography.fontFamily.extraBold, marginBottom: 6 },
  formSubtitle: { fontSize: Typography.size.base, fontFamily: Typography.fontFamily.regular, marginBottom: 24, lineHeight: 22 },
  googleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 12, paddingVertical: 13, marginBottom: 20 },
  googleIcon: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginRight: 10, borderWidth: 1, borderColor: '#ddd' },
  googleText: { fontSize: Typography.size.base, fontFamily: Typography.fontFamily.semiBold },
  divider: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 12 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.medium },
  fieldGroup: { marginBottom: 16 },
  fieldLabel: { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.semiBold, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.3 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  link: { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.semiBold },
  checkRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 10 },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  checkLabel: { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.regular },
  switchRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20, flexWrap: 'wrap' },
  switchText: { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.regular },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 },
  backText: { fontSize: Typography.size.sm, fontFamily: Typography.fontFamily.medium },
});
