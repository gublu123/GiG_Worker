import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../lib/theme';

/** Renders the coach's structured plain-text reply (## headings, • bullets). */
export function CoachBlocks({ text }: { text: string }) {
  const t = useTheme();
  const lines = text.split('\n');

  return (
    <View>
      {lines.map((line, index) => {
        if (!line.trim()) return <View key={`sp-${index}`} style={{ height: 8 }} />;

        if (line.startsWith('## ')) {
          return (
            <Text
              key={`h-${index}`}
              className="mt-4 text-[11px] font-extrabold uppercase"
              style={{ color: t.primary, letterSpacing: 0.8 }}
            >
              {line.replace('## ', '').trim()}
            </Text>
          );
        }

        if (line.startsWith('• ')) {
          return (
            <View key={`b-${index}`} className="mt-2 flex-row" style={{ gap: 8 }}>
              <View
                className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: t.primary }}
              />
              <Text className="flex-1 text-[13px] leading-5" style={{ color: t.inkSoft }}>
                {line.replace('• ', '')}
              </Text>
            </View>
          );
        }

        return (
          <Text key={`p-${index}`} className="mt-1.5 text-[13px] leading-5" style={{ color: t.inkSoft }}>
            {line}
          </Text>
        );
      })}
    </View>
  );
}
