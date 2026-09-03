import React from 'react';
import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';

type IconName = ComponentProps<typeof Ionicons>['name'];

interface Props {
  label: string;
  icon?: IconName;
  color: string;
  background: string;
  small?: boolean;
}

export function Chip({ label, icon, color, background, small }: Props) {
  return (
    <View
      className="flex-row items-center rounded-full"
      style={{
        backgroundColor: background,
        paddingHorizontal: small ? 8 : 12,
        paddingVertical: small ? 3 : 6,
        gap: 4,
      }}
    >
      {icon ? <Ionicons name={icon} size={small ? 11 : 14} color={color} /> : null}
      <Text
        className="font-bold uppercase"
        style={{ color, fontSize: small ? 10 : 12, letterSpacing: 0.6 }}
      >
        {label}
      </Text>
    </View>
  );
}
