import { Platform } from 'react-native';

export const Shadows = {
  xs: Platform.select({
    web: { boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },
    default: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 1 },
  }),
  sm: Platform.select({
    web: { boxShadow: '0 2px 10px rgba(0,0,0,0.08)' },
    default: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 3 },
  }),
  md: Platform.select({
    web: { boxShadow: '0 4px 24px rgba(0,0,0,0.10)' },
    default: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.10, shadowRadius: 24, elevation: 6 },
  }),
  lg: Platform.select({
    web: { boxShadow: '0 8px 48px rgba(0,0,0,0.12)' },
    default: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 48, elevation: 10 },
  }),
  glow: Platform.select({
    web: { boxShadow: '0 0 40px rgba(79,70,229,0.25)' },
    default: { shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.25, shadowRadius: 40, elevation: 8 },
  }),
  glowSm: Platform.select({
    web: { boxShadow: '0 0 20px rgba(79,70,229,0.15)' },
    default: { shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 4 },
  }),
};
