import { useEffect, useRef } from 'react';
import { Platform, AppState } from 'react-native';

/**
 * Anti-cheat side-effect hook.
 *
 * Web:   detects tab visibility change, right-click, and Ctrl+C/V/X/A
 * Native: detects app going to background via AppState
 *
 * Usage:
 *   useAntiCheat({
 *     enabled: !loading && !submitted && proctoring.tabSwitchDetection,
 *     onViolation: (type) => { ... }
 *   });
 */
export function useAntiCheat({ enabled = true, onViolation }) {
  const onViolationRef = useRef(onViolation);
  onViolationRef.current = onViolation;  // always latest without re-running effect

  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    if (!enabled) return;

    if (Platform.OS === 'web') {
      const handleVisibility = () => {
        if (document.hidden) onViolationRef.current?.('tab_switch');
      };

      const handleContextMenu = (e) => {
        e.preventDefault();
        onViolationRef.current?.('right_click');
      };

      const handleKeyDown = (e) => {
        if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'x', 'a'].includes(e.key.toLowerCase())) {
          e.preventDefault();
          onViolationRef.current?.('copy_paste');
        }
      };

      // Warn before leaving/refreshing the page
      const handleBeforeUnload = (e) => {
        e.preventDefault();
        e.returnValue = 'Leaving will auto-submit your exam. Are you sure?';
      };

      document.addEventListener('visibilitychange', handleVisibility);
      document.addEventListener('contextmenu', handleContextMenu);
      document.addEventListener('keydown', handleKeyDown);
      window.addEventListener('beforeunload', handleBeforeUnload);

      return () => {
        document.removeEventListener('visibilitychange', handleVisibility);
        document.removeEventListener('contextmenu', handleContextMenu);
        document.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    } else {
      // Native: AppState tracks foreground/background
      const subscription = AppState.addEventListener('change', (nextState) => {
        const wasActive = appStateRef.current === 'active';
        const nowBackground = nextState === 'background' || nextState === 'inactive';
        if (wasActive && nowBackground) {
          onViolationRef.current?.('app_background');
        }
        appStateRef.current = nextState;
      });

      return () => subscription.remove();
    }
  }, [enabled]);
}
