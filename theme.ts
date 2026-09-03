import { useColorScheme } from 'react-native';
import type { ComponentProps } from 'react';
import type Ionicons from '@expo/vector-icons/Ionicons';

type IconName = ComponentProps<typeof Ionicons>['name'];

export type ThemeName = 'light' | 'dark';

export interface Theme {
  name: ThemeName;
  canvas: string;
  surface: string;
  surfaceAlt: string;
  ink: string;
  inkSoft: string;
  inkFaint: string;
  border: string;
  primary: string;
  primarySoft: string;
  heroFrom: string;
  heroTo: string;
  onHeroSoft: string;
  stable: string;
  stableSoft: string;
  watch: string;
  watchSoft: string;
  risk: string;
  riskSoft: string;
  tabBar: string;
  shadow: string;
}

const light: Theme = {
  name: 'light',
  canvas: '#F1F5F9',
  surface: '#FFFFFF',
  surfaceAlt: '#F8FAFC',
  ink: '#0F172A',
  inkSoft: '#475569',
  inkFaint: '#94A3B8',
  border: '#E2E8F0',
  primary: '#0B57D0',
  primarySoft: '#E8F0FE',
  heroFrom: '#0B2E6F',
  heroTo: '#1A73E8',
  onHeroSoft: 'rgba(255,255,255,0.72)',
  stable: '#137333',
  stableSoft: '#E6F4EA',
  watch: '#B26A00',
  watchSoft: '#FEF7E0',
  risk: '#C5221F',
  riskSoft: '#FCE8E6',
  tabBar: '#FFFFFF',
  shadow: '#0F172A',
};

const dark: Theme = {
  name: 'dark',
  canvas: '#070C16',
  surface: '#101A2C',
  surfaceAlt: '#16233A',
  ink: '#E8EEF9',
  inkSoft: '#A9B7CC',
  inkFaint: '#6B7B93',
  border: '#1F2E47',
  primary: '#8AB4F8',
  primarySoft: '#16233A',
  heroFrom: '#0A1730',
  heroTo: '#123A85',
  onHeroSoft: 'rgba(232,238,249,0.72)',
  stable: '#5DBB7A',
  stableSoft: '#10281A',
  watch: '#F0B429',
  watchSoft: '#2A2110',
  risk: '#F28B82',
  riskSoft: '#2C1517',
  tabBar: '#0B1220',
  shadow: '#000000',
};

export const themes: Record<ThemeName, Theme> = { light, dark };

export function useTheme(): Theme {
  const scheme = useColorScheme();
  return scheme === 'dark' ? dark : light;
}

export type Tier = 'high' | 'watch' | 'stable';

export interface TierMeta {
  key: Tier;
  label: string;
  short: string;
  color: string;
  soft: string;
  icon: IconName;
  blurb: string;
}

export function tierMeta(tier: Tier, theme: Theme): TierMeta {
  if (tier === 'stable') {
    return {
      key: 'stable',
      label: 'Stable',
      short: 'STABLE',
      color: theme.name === 'dark' ? '#5DBB7A' : '#34A853',
      soft: theme.stableSoft,
      icon: 'shield-checkmark',
      blurb: 'Your cash flow can absorb a bad week.',
    };
  }
  if (tier === 'watch') {
    return {
      key: 'watch',
      label: 'Watch',
      short: 'NEEDS WATCH',
      color: theme.name === 'dark' ? '#F0B429' : '#F9AB00',
      soft: theme.watchSoft,
      icon: 'eye',
      blurb: 'One slow month could push you into arrears.',
    };
  }
  return {
    key: 'high',
    label: 'High risk',
    short: 'HIGH RISK',
    color: theme.name === 'dark' ? '#F28B82' : '#EA4335',
    soft: theme.riskSoft,
    icon: 'warning',
    blurb: 'A single missed payout could trigger a default.',
  };
}
