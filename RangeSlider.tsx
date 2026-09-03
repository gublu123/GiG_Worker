import React from 'react';
import { Text, View } from 'react-native';
import Slider from '@react-native-community/slider';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { useTheme } from '../lib/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

interface Props {
  label: string;
  icon: IconName;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  format: (value: number) => string;
  caption?: string;
}

export function RangeSlider({
  label,
  icon,
  value,
  min,
  max,
  step,
  onChange,
  format,
  caption,
}: Props) {
  const t = useTheme();
  return (
    <View className="mb-5 last:mb-0">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center" style={{ gap: 6 }}>
          <Ionicons name={icon} size={15} color={t.inkSoft} />
          <Text className="text-sm font-semibold" style={{ color: t.ink }}>
            {label}
          </Text>
        </View>
        <Text className="text-sm font-extrabold tabular-nums" style={{ color: t.primary }}>
          {format(value)}
        </Text>
      </View>
      <Slider
        style={{ width: '100%', height: 38 }}
        minimumValue={min}
        maximumValue={max}
        step={step}
        value={value}
        onValueChange={onChange}
        minimumTrackTintColor={t.primary}
        maximumTrackTintColor={t.border}
        thumbTintColor={t.primary}
      />
      <View className="flex-row justify-between">
        <Text className="text-[10px]" style={{ color: t.inkFaint }}>
          {format(min)}
        </Text>
        {caption ? (
          <Text className="text-[10px] font-semibold" style={{ color: t.inkFaint }}>
            {caption}
          </Text>
        ) : null}
        <Text className="text-[10px]" style={{ color: t.inkFaint }}>
          {format(max)}
        </Text>
      </View>
    </View>
  );
}
