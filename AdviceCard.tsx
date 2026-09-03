import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Chip } from './Chip';
import { PrimaryButton } from './PrimaryButton';
import { useTheme, tierMeta, type Tier } from '../lib/theme';

interface Props {
  text?: string;
  source?: 'gemini' | 'on-device';
  generating?: boolean;
  tier: Tier;
  onOpenCoach: () => void;
  onRegenerate: () => void;
}

function TypingDot({ delay, color }: { delay: number; color: string }) {
  const opacity = useSharedValue(0.25);
  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(withTiming(1, { duration: 380 }), withTiming(0.25, { duration: 380 })),
        -1,
        false,
      ),
    );
  }, [delay, opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      style={[style, { width: 7, height: 7, borderRadius: 4, backgroundColor: color }]}
    />
  );
}

function Line({ line, index }: { line: string; index: number }) {
  const t = useTheme();
  if (!line.trim()) return <View key={index} style={{ height: 10 }} />;

  if (line.startsWith('## ')) {
    const title = line.replace('## ', '').trim();
    return (
      <Text
        key={index}
        className="mt-4 text-[11px] font-extrabold uppercase"
        style={{ color: t.primary, letterSpacing: 0.8 }}
      >
        {title}
      </Text>
    );
  }

  if (line.startsWith('• ')) {
    return (
      <View key={index} className="mt-2 flex-row" style={{ gap: 8 }}>
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
    <Text key={index} className="mt-1.5 text-[13px] leading-5" style={{ color: t.inkSoft }}>
      {line}
    </Text>
  );
}

export function AdviceCard({
  text,
  source,
  generating,
  tier,
  onOpenCoach,
  onRegenerate,
}: Props) {
  const t = useTheme();
  const meta = tierMeta(tier, t);
  const entering = useSharedValue(0);

  useEffect(() => {
    entering.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) });
  }, [entering]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: entering.value,
    transform: [{ translateY: (1 - entering.value) * 12 }],
  }));

  return (
    <Animated.View
      style={[
        cardStyle,
        {
          borderRadius: 24,
          borderWidth: 1,
          borderColor: t.border,
          backgroundColor: t.surface,
          shadowColor: t.shadow,
          shadowOpacity: t.name === 'dark' ? 0.4 : 0.1,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 10 },
          elevation: 4,
        },
      ]}
    >
      <View
        className="flex-row items-center justify-between rounded-t-3xl px-5 py-4"
        style={{ backgroundColor: meta.soft }}
      >
        <View className="flex-row items-center" style={{ gap: 8 }}>
          <Ionicons name="sparkles" size={16} color={meta.color} />
          <Text className="text-sm font-extrabold" style={{ color: t.ink }}>
            Coach session
          </Text>
        </View>
        <Chip
          small
          label={source === 'gemini' ? 'Gemini' : 'On-device'}
          icon={source === 'gemini' ? 'logo-google' : 'phone-portrait'}
          color={t.inkSoft}
          background="rgba(127,146,178,0.14)"
        />
      </View>

      <View className="px-5 pb-5 pt-1">
        {generating ? (
          <View className="py-6">
            <View className="flex-row items-center" style={{ gap: 6 }}>
              <TypingDot delay={0} color={t.primary} />
              <TypingDot delay={140} color={t.primary} />
              <TypingDot delay={280} color={t.primary} />
            </View>
            <Text className="mt-4 text-[13px]" style={{ color: t.inkSoft }}>
              Reading your cash flow, ranking the risks and drafting moves you can
              actually make this week...
            </Text>
          </View>
        ) : (
          (text ?? '').split('\n').map((line, index) => (
            <Line key={`${index}-${line.slice(0, 8)}`} line={line} index={index} />
          ))
        )}

        {!generating && text ? (
          <View className="mt-5" style={{ gap: 10 }}>
            <PrimaryButton
              label="Continue in Coach"
              icon="chatbubbles"
              variant="tonal"
              onPress={onOpenCoach}
            />
            <PrimaryButton label="Re-generate advice" icon="refresh" variant="ghost" onPress={onRegenerate} />
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
}
