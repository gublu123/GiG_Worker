import React from 'react';
import { View, type ViewProps } from 'react-native';
import { useTheme } from '../lib/theme';

interface Props extends ViewProps {
  tone?: 'default' | 'soft';
}

export function Card({ style, className, tone = 'default', ...rest }: Props) {
  const t = useTheme();
  return (
    <View
      className={`rounded-3xl ${className ?? ''}`}
      style={[
        {
          backgroundColor: tone === 'soft' ? t.surfaceAlt : t.surface,
          borderWidth: 1,
          borderColor: t.border,
          shadowColor: t.shadow,
          shadowOpacity: t.name === 'dark' ? 0.4 : 0.08,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 6 },
          elevation: 3,
        },
        style,
      ]}
      {...rest}
    />
  );
}
