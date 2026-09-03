import React from 'react';
import { View } from 'react-native';

interface Props {
  progress: number;
  color: string;
  track: string;
  height?: number;
}

export function ProgressBar({ progress, color, track, height = 8 }: Props) {
  const clamped = Math.max(0, Math.min(1, progress));
  return (
    <View
      className="w-full overflow-hidden rounded-full"
      style={{ backgroundColor: track, height }}
    >
      <View
        className="h-full rounded-full"
        style={{ backgroundColor: color, width: `${clamped * 100}%` }}
      />
    </View>
  );
}
