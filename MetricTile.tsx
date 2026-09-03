import React from 'react';
import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Card } from './Card';
import { useTheme } from '../lib/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

interface Props {
  icon: IconName;
  label: string;
  value: string;
  caption?: string;
  tone?: 'neutral' | 'good' | 'warn' | 'bad';
}

export function MetricTile({ icon, label, value, caption, tone = 'neutral' }: Props) {
  const t = useTheme();
  const toneColor =
    tone === 'good' ? t.stable : tone === 'warn' ? t.watch : tone === 'bad' ? t.risk : t.primary;
  const toneSoft =
    tone === 'good'
      ? t.stableSoft
      : tone === 'warn'
        ? t.watchSoft
        : tone === 'bad'
          ? t.riskSoft
          : t.primarySoft;

  return (
    <Card className="flex-1 p-4" tone="soft">
      <View
        className="mb-3 h-9 w-9 items-center justify-center rounded-xl"
        style={{ backgroundColor: toneSoft }}
      >
        <Ionicons name={icon} size={17} color={toneColor} />
      </View>
      <Text className="text-[11px] font-semibold uppercase" style={{ color: t.inkFaint, letterSpacing: 0.5 }}>
        {label}
      </Text>
      <Text className="mt-1 text-xl font-extrabold" style={{ color: t.ink }}>
        {value}
      </Text>
      {caption ? (
        <Text className="mt-0.5 text-[11px]" style={{ color: t.inkSoft }}>
          {caption}
        </Text>
      ) : null}
    </Card>
  );
}
