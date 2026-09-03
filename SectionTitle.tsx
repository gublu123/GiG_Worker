import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../lib/theme';

interface Props {
  title: string;
  caption?: string;
  right?: React.ReactNode;
}

export function SectionTitle({ title, caption, right }: Props) {
  const t = useTheme();
  return (
    <View className="mb-3 flex-row items-end justify-between">
      <View className="flex-1 pr-3">
        <Text className="text-lg font-extrabold" style={{ color: t.ink }}>
          {title}
        </Text>
        {caption ? (
          <Text className="mt-0.5 text-xs" style={{ color: t.inkSoft }}>
            {caption}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}
