import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Card } from '../components/Card';
import { Chip } from '../components/Chip';
import { PrimaryButton } from '../components/PrimaryButton';
import { ProgressBar } from '../components/ProgressBar';
import { SectionTitle } from '../components/SectionTitle';
import { useApp } from '../context/AppContext';
import { buildActionPlan, loanShield } from '../lib/plan';
import { money } from '../lib/format';
import { tierMeta, useTheme } from '../lib/theme';
import type { TabParamList } from '../navigation/types';

export function PlanScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<TabParamList>>();
  const { metrics, result, checklist, toggleCheck, requestCoach, sending } = useApp();
  const [expanded, setExpanded] = useState<string | null>(null);

  const plan = useMemo(() => buildActionPlan(metrics, result), [metrics, result]);
  const done = plan.filter((item) => checklist[item.id]).length;
  const shield = loanShield(metrics);
  const meta = tierMeta(result.tier, t);
  const bufferProgress = metrics.bufferTarget > 0 ? metrics.savingsBalance / metrics.bufferTarget : 0;
  const dueDate = new Date(Date.now() + shield.dueInDays * 24 * 60 * 60 * 1000);
  const dueLabel = dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const askCoach = () => {
    requestCoach('Walk me through executing my action plan this week, in order.');
    navigation.navigate('Coach');
  };

  return (
    <ScrollView
      className="flex-1"
      style={{ backgroundColor: t.canvas }}
      contentContainerStyle={{
        paddingTop: insets.top + 12,
        paddingHorizontal: 16,
        paddingBottom: 40,
      }}
      showsVerticalScrollIndicator={false}
    >
      <Text className="text-[11px] font-bold uppercase" style={{ color: t.inkFaint, letterSpacing: 0.8 }}>
        Default prevention
      </Text>
      <Text className="mt-0.5 mb-5 text-2xl font-extrabold" style={{ color: t.ink }}>
        Action plan
      </Text>

      <Card className="mb-5 p-5">
        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-extrabold" style={{ color: t.ink }}>
            {done} of {plan.length} moves complete
          </Text>
          <Chip
            small
            label={meta.short}
            icon={meta.icon}
            color={meta.color}
            background={meta.soft}
          />
        </View>
        <View className="mt-3">
          <ProgressBar
            progress={plan.length ? done / plan.length : 0}
            color={t.primary}
            track={t.border}
            height={10}
          />
        </View>
        <Text className="mt-3 text-[12px] leading-5" style={{ color: t.inkSoft }}>
          Each completed move is reflected in AI #1's score. Clearing the top two usually
          lifts a Needs-watch profile into Stable within two pay cycles.
        </Text>
      </Card>

      <Card className="mb-5 p-5">
        <SectionTitle title="1-month buffer goal" caption="Your single best defence against a missed payment" />
        <View className="flex-row items-end justify-between">
          <Text className="text-2xl font-extrabold" style={{ color: t.ink }}>
            {money(metrics.savingsBalance)}
          </Text>
          <Text className="text-sm font-semibold" style={{ color: t.inkSoft }}>
            of {money(metrics.bufferTarget)}
          </Text>
        </View>
        <View className="mt-3">
          <ProgressBar
            progress={bufferProgress}
            color={bufferProgress >= 1 ? t.stable : bufferProgress >= 0.4 ? t.watch : t.risk}
            track={t.border}
            height={10}
          />
        </View>
        <Text className="mt-3 text-[12px]" style={{ color: t.inkSoft }}>
          {bufferProgress >= 1
            ? `Fully funded — ${metrics.runwayMonths.toFixed(1)} months of cover. Protect it.`
            : `${money(Math.max(0, metrics.bufferTarget - metrics.savingsBalance))} to go · ${metrics.runwayMonths.toFixed(1)} months of cover today.`}
        </Text>
      </Card>

      <Card className="mb-5 p-5">
        <SectionTitle title="Loan default shield" caption={`Next repayment · ${dueLabel}`} />
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-2xl font-extrabold" style={{ color: t.ink }}>
              {money(shield.amount)}
            </Text>
            <Text className="mt-0.5 text-[11px]" style={{ color: t.inkSoft }}>
              ring-fenced {money(shield.reserved)}
            </Text>
          </View>
          <Chip
            small
            label={shield.short > 0 ? `Short ${money(shield.short)}` : 'Covered'}
            icon={shield.short > 0 ? 'alert-circle' : 'checkmark-circle'}
            color={shield.short > 0 ? t.risk : t.stable}
            background={shield.short > 0 ? t.riskSoft : t.stableSoft}
          />
        </View>
        <View className="mt-3">
          <ProgressBar
            progress={shield.amount > 0 ? shield.reserved / shield.amount : 1}
            color={shield.short > 0 ? t.risk : t.stable}
            track={t.border}
            height={10}
          />
        </View>
        <Text className="mt-3 text-[12px] leading-5" style={{ color: t.inkSoft }}>
          {shield.short > 0
            ? `Move ${money(shield.short)} into the repayment account before ${dueLabel}. A payment arranged before the due date is a payment made.`
            : 'The repayment is covered by cash you already hold. Do not spend it — it is not yours.'}
        </Text>
      </Card>

      <SectionTitle
        title="Your personalised moves"
        caption="Ranked by impact on your resilience score"
      />
      {plan.map((item) => {
        const checked = !!checklist[item.id];
        const isOpen = expanded === item.id;
        return (
          <Pressable
            key={item.id}
            onPress={() => setExpanded(isOpen ? null : item.id)}
            accessibilityRole="button"
            className="mb-3 rounded-3xl border p-4"
            style={{
              backgroundColor: checked ? t.primarySoft : t.surface,
              borderColor: item.urgent && !checked ? t.risk : t.border,
            }}
          >
            <View className="flex-row items-start" style={{ gap: 12 }}>
              <Pressable
                onPress={() => toggleCheck(item.id)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked }}
                accessibilityLabel={item.title}
                className="mt-0.5 h-7 w-7 items-center justify-center rounded-full"
                style={{
                  borderWidth: 2,
                  borderColor: checked ? t.primary : t.inkFaint,
                  backgroundColor: checked ? t.primary : 'transparent',
                }}
              >
                {checked ? <Ionicons name="checkmark" size={15} color="#FFFFFF" /> : null}
              </Pressable>
              <View className="flex-1">
                <View className="flex-row items-center" style={{ gap: 6 }}>
                  <Ionicons name={item.icon} size={14} color={checked ? t.primary : t.inkSoft} />
                  <Text
                    className="flex-1 text-[14px] font-extrabold leading-5"
                    style={{ color: t.ink, textDecorationLine: checked ? 'line-through' : 'none' }}
                  >
                    {item.title}
                  </Text>
                </View>
                <Text className="mt-1 text-[11px] font-semibold" style={{ color: t.inkFaint }}>
                  {item.impact}
                </Text>
                {isOpen ? (
                  <Text className="mt-2 text-[12px] leading-5" style={{ color: t.inkSoft }}>
                    {item.detail}
                  </Text>
                ) : null}
                <Text className="mt-2 text-[11px] font-bold" style={{ color: t.primary }}>
                  {isOpen ? 'Hide detail' : 'Why this matters'}
                </Text>
              </View>
            </View>
          </Pressable>
        );
      })}

      <View className="mt-2">
        <PrimaryButton
          label={sending ? 'Coach is thinking…' : 'Get coached on this plan'}
          icon="sparkles"
          loading={sending}
          onPress={askCoach}
        />
      </View>
    </ScrollView>
  );
}
