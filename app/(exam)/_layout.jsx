import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../../context/ThemeContext';

/**
 * Exam route group layout.
 * No sidebar, no header bar — fullscreen focused environment.
 * The exam-taking screen manages its own navbar internally.
 */
export default function ExamLayout() {
  const { isDark } = useTheme();
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, animation: 'none' }} />
    </>
  );
}
