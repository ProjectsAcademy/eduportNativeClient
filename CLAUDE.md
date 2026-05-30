# ExamFlow AI — Mobile (nativeClient) Engineering Reference


> **Production system. Read all PART A, PART B, and PART C  sections before touching any file.**

---

# PART A: PROJECT ANALYSIS

## 1. Project Identity

| Field | Value |
|---|---|
| **App Name** | ExamFlow AI |
| **Bundle ID** | `com.examflowai.app` |
| **EAS Project ID** | `10fca0b8-4bcf-4d1e-87ab-6fc2543d9e8b` |
| **Framework** | Expo SDK 54 + Expo Router 6 |
| **React Native** | 0.81.5 |
| **React** | 19.1.0 |
| **Platforms** | iOS, Android, React Native Web |
| **Font** | Inter (via `@expo-google-fonts/inter`) |
| **Routing** | File-based via `expo-router` |
| **Storage** | `@react-native-async-storage/async-storage` |
| **Dev command** | `npx expo start --clear` |
| **Web bundler** | Metro (single output) |
| **Web host** | Netlify (`netlify.toml`) |

---

## 2. Directory Structure

```
nativeClient/
├── app.config.js           ← Expo config (reads EXPO_PUBLIC_API_URL from env)
├── app.json                ← Static Expo config (fallback)
├── babel.config.js
├── eas.json                ← EAS build profiles (development, preview, production)
├── netlify.toml            ← Web deployment config
├── CLAUDE.md               ← This file
├── app/
│   ├── _layout.jsx         ← ROOT LAYOUT — providers, auth guard, font loading
│   ├── index.jsx           ← Login/Register/OTP screens (23KB, single file)
│   ├── dashboard/
│   │   ├── _layout.jsx     ← Dashboard shell: Sidebar + Header + Stack router
│   │   ├── index.jsx       ← Dashboard home (stats, exam table)
│   │   ├── exams.jsx       ← Exam list management (25KB)
│   │   ├── create-exam.jsx ← 8-step exam creation wizard (18KB)
│   │   ├── join-exam.jsx   ← Student exam lookup + session start (27KB)
│   │   ├── results.jsx     ← Teacher exam analytics (18KB)
│   │   ├── student-report.jsx ← Per-student Q&A detail report (21KB)
│   │   ├── history.jsx     ← User attempt history (32KB)
│   │   └── settings.jsx    ← Settings: profile, theme, API key, org (58KB)
│   └── (exam)/
│       ├── _layout.jsx     ← Exam taking group (animation: none)
│       └── exam-taking.jsx ← Live exam screen with anti-cheat (35KB)
├── components/
│   ├── exam/
│   │   ├── QuestionCard.jsx   ← Single question renderer (MCQ + true-false)
│   │   ├── StepProgress.jsx   ← Wizard progress indicator
│   │   └── steps/             ← 8 wizard step components (Step1–Step8)
│   ├── layout/
│   │   ├── Header.jsx         ← Top bar with menu, breadcrumb, user avatar
│   │   └── Sidebar.jsx        ← Navigation sidebar (persistent/drawer)
│   └── ui/
│       ├── Badge.jsx          ← Status badges (draft/published/etc)
│       ├── Button.jsx         ← Primary, secondary, ghost, danger variants
│       ├── Card.jsx           ← Surface card wrapper
│       ├── DropdownMenu.jsx   ← Custom dropdown (Modal-based, NOT native select)
│       ├── EmptyState.jsx     ← Empty list placeholder with optional CTA
│       ├── Input.jsx          ← TextInput with label, error, icon support
│       ├── Modal.jsx          ← Bottom sheet / center modal
│       ├── PageLoader.jsx     ← Full-screen loading spinner
│       ├── ProgressBar.jsx    ← Percentage progress bar
│       ├── Select.jsx         ← Custom select picker (Modal-based)
│       ├── Skeleton.jsx       ← Skeleton loading placeholders
│       ├── Tabs.jsx           ← Tab switcher component
│       ├── ThemeToggle.jsx    ← Dark/light mode toggle button
│       ├── Toast.jsx          ← Toast notification card
│       ├── Toggle.jsx         ← Boolean toggle switch
│       ├── ViewToggle.jsx     ← Grid/list view toggle
│       └── charts/            ← Chart components (bar, distribution)
├── context/
│   ├── AuthContext.jsx     ← JWT + user state, AsyncStorage persistence
│   ├── ThemeContext.jsx    ← Dark/light mode, accent color, density
│   └── ToastContext.jsx    ← Global toast notification system
├── hooks/
│   ├── useAntiCheat.js     ← Tab/app-background violation detection
│   ├── useCountdownTimer.js← Exam countdown timer
│   └── useTypewriter.js    ← Typewriter text animation
├── services/
│   ├── examService.js      ← All exam CRUD API calls (JWT-authenticated)
│   ├── sessionService.js   ← Student session API calls (no auth required)
│   ├── ai/
│   │   ├── aiService.js    ← AI generation calls → backend /api/ai/*
│   │   └── geminiService.js← Gemini key management → backend /api/gemini/*
│   └── media/
│       ├── mediaPickerService.js  ← Image picker with compression
│       └── permissionService.js   ← Camera/media permission requests
├── constants/
│   ├── api.js       ← API_URL + ENDPOINTS (reads from expo-constants extra)
│   ├── colors.js    ← Design tokens: Colors.light / Colors.dark
│   ├── shadows.js   ← Cross-platform shadow tokens (boxShadow on web)
│   ├── typography.js← Font families, sizes
│   ├── radius.js    ← Border radius tokens
│   └── spacing.js   ← Spacing tokens
└── utils/
    └── storage.js   ← AsyncStorage wrapper (getItem, setItem, getObject, setObject)
```

---

## 3. Application Boot Sequence

`app/_layout.jsx` is the ROOT. Boot order:

```
1. RootLayout renders
2. useFonts() — loads Inter variants (400, 500, 600, 700, 800)
3. SplashScreen.preventAutoHideAsync() — holds splash until fonts ready
4. Provider tree mounts:
     GestureHandlerRootView
       SafeAreaProvider
         ThemeProvider      ← reads theme/accentColor/density from AsyncStorage
           AuthProvider     ← reads token + user from AsyncStorage (loading=true)
             ToastProvider  ← global toast layer (max 3 toasts, zIndex: 200)
               RootLayoutNav
                 AuthGate   ← routing logic (see §4)
                 Stack      ← 3 root screens: index, dashboard, (exam)
5. SplashScreen.hideAsync() when fonts loaded
```

---

## 4. Authentication & Routing

### AuthGate (`app/_layout.jsx` lines 24–44)

```jsx
// Single source of truth for routing
function AuthGate() {
  const { user, loading } = useAuth();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;                    // wait for AsyncStorage restore

    const inDashboard = segments[0] === 'dashboard';
    if (user && !inDashboard) router.replace('/dashboard');
    if (!user && inDashboard) router.replace('/');
  }, [user, loading, segments]);
}
```

**Rule**: NEVER add additional navigation guards in individual screens. `AuthGate` is the single routing authority.

### AuthContext (`context/AuthContext.jsx`)

State: `{ token, user, loading, login, logout, updateUser }`

```js
login(tokenVal, userData)  → writes to AsyncStorage + sets state
logout()                   → clears AsyncStorage + nulls state
updateUser(partialUser)    → merges + persists updated user
```

**Boot restore**: On mount, reads `token` + `user` from AsyncStorage simultaneously.
`loading` is `true` until restore completes. Screens must wait for `!authLoading` before rendering.

### Login Screen (`app/index.jsx`)

Three modes in a single file: `login` | `register` | `otp`

**Special case — unverified user**:
```js
// When login response has requiresVerification: true
// → store email in state → switch to 'otp' mode
if (data.requiresVerification) {
  setPendingEmail(data.email);
  setMode('otp');
}
```

---

## 5. API Communication

### API URL Resolution (`constants/api.js`)

```js
const extra = Constants.expoConfig?.extra || {};
export const API_URL = extra.apiUrl || 'http://192.168.1.11:5000';
```

The URL is set in `app.config.js`:
```js
extra: {
  apiUrl: process.env.EXPO_PUBLIC_API_URL || "http://192.168.1.15:5000"
}
```

**For production builds**: set `EXPO_PUBLIC_API_URL` env var in EAS secrets.
**For local dev**: the hardcoded LAN IP `192.168.1.15:5000` must match the dev machine IP.

### ENDPOINTS (`constants/api.js`)

```js
ENDPOINTS.login     = `${API_URL}/api/auth/login`
ENDPOINTS.register  = `${API_URL}/api/auth/register`
ENDPOINTS.verifyOtp = `${API_URL}/api/auth/verify-otp`
ENDPOINTS.resendOtp = `${API_URL}/api/auth/resend-otp`
ENDPOINTS.me        = `${API_URL}/api/auth/me`
ENDPOINTS.profile   = `${API_URL}/api/auth/profile`
```

Exam/session/gemini endpoints are constructed inline in their service files using `API_URL`.

### Service Pattern

All services follow this identical pattern:
```js
async function authHeaders() {
  const token = await storage.getItem('token');
  return { 'Content-Type': 'application/json',
           ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

async function handleResponse(res) {
  const data = await res.json().catch(() => ({ success: false, message: '...' }));
  if (!data.success) {
    const err = new Error(data.message || 'Request failed');
    err.status = res.status;
    throw err;
  }
  return data;
}
```

**Session service is public** (no auth token). Sessions are identified by `sessionId` alone.

---

## 6. Context System Deep Analysis

### ThemeContext (`context/ThemeContext.jsx`)

State persisted to AsyncStorage: `theme`, `accentColor`, `density`

```js
{ theme: 'light'|'dark', isDark: boolean,
  accentColor: '#4F46E5' (default),
  density: 'compact'|'default'|'comfortable',
  toggleTheme(), changeAccentColor(hex), changeDensity(d) }

ACCENT_COLORS = [indigo, violet, blue, green, amber, rose]
DENSITY_OPTIONS = [compact, default, comfortable]
```

**Pattern used everywhere**:
```js
const { isDark } = useTheme();
const C = isDark ? Colors.dark : Colors.light;
// then use C.background, C.foreground, C.border etc.
```

### ToastContext (`context/ToastContext.jsx`)

```js
showToast(message, type='info', duration=3500)
// type: 'info' | 'success' | 'error' | 'warning'
// max 3 toasts visible (oldest dropped when over limit)
// renders at top: 60, zIndex: 200, pointerEvents: 'box-none'
```

---

## 7. Design System (constants/)

### Colors (`constants/colors.js`)

Design tokens mirror the web ExamFlow AI theme exactly.

Key tokens (same names in both light + dark):
```
background, surface, surface2, card
foreground, textMuted, textSubtle
border, borderMedium
primary, primaryGradientStart (#4F46E5), primaryGradientEnd (#7C3AED)
success, successBg, warning, warningBg, error, errorBg, info, infoBg
navActive, navHover
sidebarBg, sidebarBorder, headerBg
```

Light background: `#F0F2FF` | Dark background: `#0D0D1A`

### Shadows (`constants/shadows.js`)

**CRITICAL RULE**: Use `Platform.select` — web gets `boxShadow`, native gets `shadowColor/Offset/etc`.

```js
Shadows.xs   // subtle card border shadow
Shadows.sm   // card shadow
Shadows.md   // elevated card
Shadows.lg   // modal / heavy elevation
Shadows.glow     // indigo glow (#4F46E5, 25% opacity)
Shadows.glowSm   // subtle indigo glow
```

**NEVER use raw `shadowColor/shadowOffset/shadowOpacity/shadowRadius` on web — use `Shadows.*`.**

### Typography (`constants/typography.js`)

```js
Typography.fontFamily.regular   = 'Inter_400Regular'
Typography.fontFamily.medium    = 'Inter_500Medium'
Typography.fontFamily.semiBold  = 'Inter_600SemiBold'
Typography.fontFamily.bold      = 'Inter_700Bold'
Typography.fontFamily.extraBold = 'Inter_800ExtraBold'
Typography.size.xs / sm / base / lg / xl / 2xl / 3xl
```

---

## 8. Screens Deep Analysis

### `app/index.jsx` — Auth Screen (23KB)

Three mode state machine: `login → otp` or `register → otp`.

Key behaviors:
- OTP input: 6 separate single-char `TextInput` boxes with auto-focus advance
- `requiresVerification: true` from backend → auto-switch to OTP mode
- Resend OTP: 60-second cooldown timer
- All TextInput on this screen: `autoComplete="current-password"` / `textContentType="password"` for auth fields — DO NOT disable autofill

### `app/dashboard/_layout.jsx` — Dashboard Shell

Breakpoint: `768px` (web only).
- Desktop (web ≥ 768): Persistent `Sidebar` + `Header` + nested `Stack`
- Mobile (< 768 or native): `Header` with hamburger → drawer `Sidebar`

```js
const MOBILE_BREAKPOINT = 768;
const isDesktop = Platform.OS === 'web' && width >= MOBILE_BREAKPOINT;
```

### `app/dashboard/create-exam.jsx` — 8-Step Wizard

Steps: Details → Context → Subtopics → Blueprint → Generate → Review → Settings → Publish

Each step is a separate component in `components/exam/steps/`:
- `Step1Details` — title, subject, grade, curriculum, tags
- `Step2Context` — topic context, reference book, chapter
- `Step3Subtopics` — AI-analysed subtopic distribution
- `Step4Blueprint` — question count per subtopic
- `Step5Generate` — AI question generation via `aiService.generateQuestions()`
- `Step6Review` — review/edit generated questions
- `Step7Settings` — duration, passing score, attempts, proctoring config
- `Step8Publish` — finalize and publish (calls `examService.createExam()`)

`StepProgress.jsx` renders the horizontal step indicator.

### `app/dashboard/join-exam.jsx` — Student Flow

1. Enter access code → `examService.lookupByCode(code)` → show exam info
2. Enter student name + email (+ roll number optional)
3. `sessionService.startSession(examId, studentData)` → navigate to exam-taking
4. Passes `{ sessionId, examId, examTitle, questions, settings, proctoring }` via router params

### `app/(exam)/exam-taking.jsx` — Live Exam (35KB)

Core exam screen. Uses:
- `useCountdownTimer()` — drives the exam timer
- `useAntiCheat()` — proctoring violation detection
- `sessionService.submitAnswer()` — called on every answer change
- `sessionService.logViolation()` — called on each detected violation
- `sessionService.submitExam()` — final submission

Anti-cheat checks `proctoring.tabSwitchDetection` before enabling.

Auto-submit triggered when backend returns `autoSubmitted: true` from `logViolation` response.

`QuestionCard.jsx` renders individual questions (MCQ/true-false with option highlighting).

### `app/dashboard/settings.jsx` — Settings (58KB, largest file)

Sections:
1. **Profile** — avatar, name, email, bio, phone, timezone, role
2. **Appearance** — theme toggle, accent color picker, density selector
3. **API Integration** — Gemini API key management via `geminiService.*`
4. **Organization** — org name, domain, certificate footer
5. **Notifications** — preferences (local only, no backend)

Gemini key flow:
```
1. User enters key → geminiService.saveKey(key)
2. Response: { isValid: null, validationMessage: 'Validating…' }
3. Poll getKeyStatus() every 2s × up to 15 tries to get validation result
4. Show 'Valid ✓' or 'Invalid ✗' with message
```

---

## 9. Custom Hooks

### `useAntiCheat({ enabled, onViolation })` — `hooks/useAntiCheat.js`

Platform-branched:
- **Web**: `visibilitychange` → `'tab_switch'`, `contextmenu` → `'right_click'`, `keydown(Ctrl+C/V/X/A)` → `'copy_paste'`, `beforeunload` → warning dialog
- **Native**: `AppState.addEventListener` → `'app_background'` when active→background

```js
useAntiCheat({
  enabled: !loading && !submitted && proctoring.tabSwitchDetection,
  onViolation: (type) => { /* call sessionService.logViolation() */ }
});
```

### `useCountdownTimer()` — `hooks/useCountdownTimer.js`

```js
const timer = useCountdownTimer();
timer.start(durationSeconds, onExpireCallback);
timer.stop();
timer.reset(seconds);

// Returns:
{ timeLeft, display: 'MM:SS',
  isWarning: timeLeft ≤ 300 && > 60,  // last 5 min
  isDanger: timeLeft ≤ 60,             // last minute
  isExpired, running }
```

---

## 10. Services Deep Analysis

### `services/examService.js` — Authenticated Exam Calls

All calls require JWT. Token read from AsyncStorage per-request.

| Method | Endpoint | Returns |
|---|---|---|
| `getMyExams()` | GET /api/exams | `{ exams: ExamListItemDTO[], total }` |
| `getExamById(id)` | GET /api/exams/:id | `{ exam: ExamDetailDTO }` (with correctAnswer) |
| `createExam(data)` | POST /api/exams | `{ exam: ExamDetailDTO }` |
| `updateExam(id, data)` | PUT /api/exams/:id | updated exam |
| `deleteExam(id)` | DELETE /api/exams/:id | success |
| `togglePublish(id)` | PATCH /api/exams/:id/publish | `{ status, accessCode }` |
| `lookupByCode(code)` | POST /api/exams/lookup | `{ exam: ExamLookupDTO }` |
| `getExamResults(examId)` | GET /api/exams/:id/results | analytics + leaderboard |
| `getSessionDetail(examId, sessionId)` | GET /api/exams/:id/results/:sid | Q&A detail |
| `getHistory()` | GET /api/history | `{ history[], total }` |

### `services/sessionService.js` — Public Session Calls

No JWT. No auth headers.

| Method | Endpoint | Notes |
|---|---|---|
| `startSession(examId, { studentName, studentEmail, rollNumber })` | POST | Returns questions WITHOUT correctAnswer |
| `submitAnswer(examId, sessionId, { questionIndex, selectedOption, flagged })` | PATCH | Called per answer change |
| `logViolation(examId, sessionId, type)` | POST | Returns `{ violationCount, autoSubmitted }` |
| `submitExam(examId, sessionId)` | POST | Returns score + optional qaReview |

### `services/ai/aiService.js` — AI Generation

```js
aiService.generateQuestions({ topic, count, subject, difficulty, bloomsLevel, context })
aiService.analyseSubtopics(topic, context)
aiService.generate(prompt, options)
// All call backend /api/ai/* — backend decrypts key + calls Gemini
```

### `services/ai/geminiService.js` — Key Management

```js
geminiService.saveKey(apiKey)     // POST /api/gemini/key
geminiService.getKeyStatus()      // GET /api/gemini/key
geminiService.revalidateKey()     // POST /api/gemini/key/validate
geminiService.deleteKey()         // DELETE /api/gemini/key
geminiService.getUsage()          // GET /api/gemini/usage
```

**Frontend NEVER sends the key to Gemini directly** — always via backend proxy.

---

## 11. Layout & Navigation Architecture

```
Stack (root): animation='fade'
├── index (auth screen)
├── dashboard/        ← DashboardLayout (_layout.jsx)
│   ├── index         ← Dashboard home
│   ├── exams         ← Exam list
│   ├── create-exam   ← 8-step wizard
│   ├── join-exam     ← Student flow
│   ├── results       ← Exam analytics
│   ├── student-report← Per-student detail
│   ├── history       ← Attempt history
│   └── settings      ← All settings
└── (exam)/           ← animation='none'
    └── exam-taking   ← Live exam
```

Navigation in screens: always `router.push('/dashboard/screen-name')` or `router.replace()`.
Pass params as: `router.push({ pathname: '/dashboard/results', params: { examId: item.id } })`.
Read params with: `const { examId } = useLocalSearchParams()`.

---

# PART B: ENGINEERING RULES

## Rule 1 — Root Cause Analysis First

Before ANY UI or platform fix:
1. Inspect actual rendered DOM/native hierarchy
2. Inspect computed CSS/styles
3. Identify exact element causing the issue
4. Explain WHY the issue occurs
5. Implement the smallest possible fix

DO NOT patch blindly, stack random styles, add unnecessary wrappers, or refactor unrelated components.

## Rule 2 — React Native Web TextInput

RNW TextInput renders native HTML `<input>`. Browser `:focus-visible` can create sharp inner borders inside rounded containers.

For NON-AUTH inputs on web:
```js
outlineStyle: 'none'
```
Focus indication must come from parent border/shadow/glow instead.

For AUTH inputs (login, register, OTP): DO NOT add `outlineStyle: 'none'`. Password managers need them.

## Rule 3 — Autofill Rules

ENABLED for: login forms, signup, password fields, email auth.

DISABLED for: search bars, filters, OTP utility inputs, settings search.

For non-auth inputs:
```js
autoComplete="new-password"   // preferred (browsers ignore "off")
textContentType="none"
importantForAutofill="no"
```

## Rule 4 — Shadows (Web vs Native)

```js
// NEVER use raw shadow props on web:
shadowColor, shadowOffset, shadowOpacity, shadowRadius  ← DEPRECATED ON WEB

// ALWAYS use Shadows.* from constants/shadows.js:
import { Shadows } from '../../constants/shadows';
// Shadows.sm, Shadows.md, Shadows.lg, Shadows.glow, etc.
// These use Platform.select internally (boxShadow web, shadowColor native)
```

## Rule 5 — Custom Dropdowns (NO native select)

Never use `<select>` or `@react-native-picker/picker` for styled UI elements. They ignore theme colors on web.

Always use: `components/ui/Select.jsx` or `components/ui/DropdownMenu.jsx` (Modal-based, fully themed).

Verify all states: closed, open, selected, hover (web), light mode, dark mode, iOS, Android, web.

## Rule 6 — Cross-Platform Safety

Every UI/style change must verify iOS + Android + Web behavior.

```js
Platform.OS === 'web'  // only when truly necessary
```

Prefer shared compatible styles. Never assume web fixes are safe for native.

## Rule 7 — Minimal Modification Policy

- Modify only affected files
- Preserve architecture
- Avoid broad refactors
- Avoid rewriting reusable components unless absolutely necessary

Every fix must answer: Why did it happen? Why is this the minimal fix? Why won't it regress native?

## Rule 8 — Code Quality

DO: keep fixes localized, preserve existing design system, maintain predictable behavior.
DO NOT: introduce hidden side effects, duplicate logic, create workaround chains, suppress warnings without understanding them.

## Rule 9 — Authentication UX Protection

NEVER accidentally break: password managers, autofill, keyboard navigation, accessibility focus.

If disabling browser focus outlines: ensure a visible replacement focus state exists.

## Rule 10 — Response Format

Before implementing changes:
1. State root cause
2. List exact affected files
3. Describe minimal safe fix strategy
4. Describe regression risks

Implementation comes AFTER analysis.

---

## Known Quirks & Gotchas

1. **API URL in dev**: Hardcoded to `192.168.1.15:5000` in `app.config.js`. Must match actual dev machine LAN IP. Change locally if connecting from a different machine.

2. **Session routes need no JWT**: `sessionService.js` sends no Authorization header by design. Students don't have accounts.

3. **Gemini key validation is async**: After `saveKey()`, `isValid` will be `null` for a few seconds. Poll `getKeyStatus()` to get the result. Implemented in `settings.jsx`.

4. **Login `requiresVerification` flag**: When backend returns this, the login screen must NOT show a generic error — it should navigate to OTP mode. Check for this in any auth flow changes.

5. **`(exam)` route group**: Uses `animation: 'none'` to prevent slide-in animation during exam transitions (prevents cheating perception).

6. **Auth screen (`app/index.jsx`) is 23KB**: All three modes (login/register/OTP) live in one file. This is intentional to share state without navigation.

7. **`settings.jsx` is 58KB**: Largest file. It manages 5 independent settings sections. When editing, use section comments to navigate. Do not split it without understanding the shared state.

8. **Dashboard breakpoint**: `768px` — below this, sidebar becomes a drawer even on web. `isDesktop = Platform.OS === 'web' && width >= 768`.

9. **Toast system**: Max 3 toasts visible simultaneously. `showToast(msg, type, duration)` — type defaults to `'info'`, duration defaults to `3500ms`.

10. **Font loading**: If fonts fail (`fontsError`), the app renders anyway (`if (!fontsLoaded && !fontsError) return null`). Splash hides when either condition is met.

# PART C: ADDITIONAL ENGINEERING RULES

These rules are mandatory for all code modifications.

---

# 1. Root Cause Analysis First

Before implementing ANY UI or platform fix:

MANDATORY PROCESS:

1. Inspect actual rendered DOM/native hierarchy
2. Inspect computed CSS/styles
3. Identify exact element causing the issue
4. Explain WHY the issue occurs
5. Implement the smallest possible fix

DO NOT:

* patch blindly
* stack random styles
* add unnecessary wrappers
* refactor unrelated components
* rewrite shared systems without evidence

Prefer surgical fixes over architectural rewrites.

---

# 2. React Native Web Input Rules

React Native Web TextInput renders native HTML `<input>` elements on web.

Known Issue:
Browser `:focus-visible` outlines can create sharp rectangular inner borders inside rounded React Native containers.

Rule:
For NON-AUTH TextInput components on web:

```js
outlineStyle: 'none'
```

Focus indication must instead come from:

* parent border color
* parent shadow
* parent glow
* explicit focus state styling

DO NOT:

* add fake background fixes
* add nested wrappers
* globally inject CSS hacks

Before fixing TextInput rendering:

* inspect browser UA styles
* inspect RNW generated DOM
* inspect computed CSS

---

# 3. Autofill & Password Manager Rules

Browsers aggressively classify inputs as auth fields.

NEVER globally disable autofill.

Autofill SHOULD remain enabled for:

* login forms
* signup forms
* password fields
* email authentication

Autofill SHOULD be disabled for:

* search bars
* filters
* OTP inputs
* utility inputs
* settings search fields

For NON-AUTH inputs use:

```js
autoComplete="off"
textContentType="none"
importantForAutofill="no"
```

For web search/filter inputs prefer:

```js
autoComplete="new-password"
```

because browsers often ignore `"off"`.

Before changing autofill behavior:

1. inspect generated HTML attributes
2. inspect browser heuristics
3. determine whether browser is classifying the field as authentication-related

DO NOT:

* globally disable autofill
* break password manager support

---

# 4. React Native Web Styling Rules

Avoid deprecated RN Web shadow props on web:

Deprecated:

* shadowColor
* shadowOffset
* shadowOpacity
* shadowRadius

Prefer:

```js
boxShadow
```

When fixing web visual issues:

* inspect computed CSS first
* inspect RNW atomic CSS output
* identify whether issue comes from:

  * browser UA stylesheet
  * RNW generated styles
  * shared component styles
  * platform-specific code
  * external CSS

---

# 5. Minimal Modification Policy

Rules:

* modify only affected files
* preserve architecture
* avoid broad refactors
* avoid rewriting reusable components unless absolutely necessary
* avoid introducing abstraction layers without need

Every fix must answer:

1. Why did the issue happen?
2. Why is this the minimal safe fix?
3. Why will this not regress native/mobile behavior?

---

# 6. Cross Platform Safety

Every UI/style change must explicitly verify:

* iOS behavior
* Android behavior
* Web behavior

Never assume web fixes are safe for native.

Use:

```js
Platform.OS === 'web'
```

only when truly necessary.

Prefer shared compatible styles first.

---

# 7. Debugging Standards

When debugging:

* identify exact source file
* identify exact rendered element
* identify exact computed style/property
* explain rendering chain step-by-step

DO NOT provide speculative fixes.

Evidence-first debugging only.

---

# 8. Code Quality Rules

DO:

* keep fixes localized
* preserve readability
* preserve existing design system
* maintain predictable behavior

DO NOT:

* introduce hidden side effects
* duplicate logic
* create workaround chains
* suppress warnings without understanding them

Warnings must be investigated before suppression.

---

# 9. Authentication UX Protection

Never accidentally break:

* password managers
* autofill
* keyboard navigation
* accessibility focus visibility

If disabling browser focus outlines:

* ensure visible replacement focus state exists.

---

# 10. Final Response Format

Before implementing changes, always provide:

1. Root cause
2. Exact affected files
3. Minimal safe fix strategy
4. Regression risk analysis

Implementation comes AFTER analysis.

# Dropdown / Select Architecture Rules

## React Native Web Dropdown Policy

Native browser select elements MUST NOT be used for production UI that requires:

* dark mode support
* light mode support
* custom styling
* design system consistency
* visual parity with mobile
* cross-platform behavior

Reason:

On React Native Web, native browser select dropdown popups are rendered by the browser/OS UI layer and are not fully controlled by React, RN Web, CSS, theme providers, or design tokens.

The opened dropdown popup may ignore:

* theme colors
* background colors
* spacing
* border radius
* typography
* hover styles
* selected state styling

As a result, browser-native select elements cannot guarantee visual parity across:

* iOS
* Android
* Web

---

## Required Implementation

For application dropdowns use a fully controlled custom component:

Trigger:

* Pressable
* TouchableOpacity

Popup:

* Modal
* Portal
* Popover
* Bottom Sheet

Options:

* FlatList
* ScrollView
* Pressable rows

All visual states must come from shared theme tokens.

---

## Verification Requirements

A dropdown implementation is NOT considered complete until all states are verified:

Closed state
Open state
Selected state
Hover state (Web)
Keyboard navigation (Web)
Light mode
Dark mode
iOS
Android
React Native Web

---

## Debugging Rule

When dropdown styling issues occur:

DO NOT:

* patch colors blindly
* add zIndex fixes
* add wrapper layers
* modify random theme tokens

FIRST determine:

1. Is the dropdown native or custom?
2. Is the popup rendered inside React?
3. Is the popup rendered by browser/OS?
4. Can the popup be styled through theme tokens?

Only then implement a fix.

