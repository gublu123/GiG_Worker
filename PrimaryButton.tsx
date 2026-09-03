import React from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { useTheme } from '../lib/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

interface Props {
  label: string;
  onPress: () => void;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'tonal' | 'ghost';
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function PrimaryButton({
  label,
  onPress,
  icon,
  loading,
  disabled,
  variant = 'primary',
}: Props) {
  const t = useTheme();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const isPrimary = variant === 'primary';
  const isTonal = variant === 'tonal';
  const background = isPrimary ? t.primary : isTonal ? t.primarySoft : 'transparent';
  const foreground = isPrimary ? '#FFFFFF' : t.primary;
  const inactive = disabled || loading;

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.97, { damping: 18, stiffness: 260 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 18, stiffness: 260 });
      }}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive }}
      style={[
        animatedStyle,
        {
          backgroundColor: background,
          opacity: inactive ? 0.55 : 1,
          borderRadius: 16,
          borderWidth: variant === 'ghost' ? 1 : 0,
          borderColor: t.border,
          paddingVertical: 14,
          paddingHorizontal: 18,
        },
      ]}
    >
      <View className="flex-row items-center justify-center" style={{ gap: 8 }}>
        {loading ? (
          <ActivityIndicator color={foreground} size="small" />
        ) : icon ? (
          <Ionicons name={icon} size={18} color={foreground} />
        ) : null}
        <Text className="text-base font-bold" style={{ color: foreground }}>
          {label}
        </Text>
      </View>
    </AnimatedPressable>
  );
}
