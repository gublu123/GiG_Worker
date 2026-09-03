import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Card } from '../components/Card';
import { ScoreGauge } from '../components/ScoreGauge';
import { SectionTitle } from '../components/SectionTitle';
import { useApp } from '../context/AppContext';
import { SCORE_BANDS } from '../lib/resilienceModel';
import { money, pct } from '../lib/format';
import { tierMeta, useTheme } from '../lib/theme';

const BANDS = [
  { label: 'High risk', range: '0–39', key: 'high' as const },
  { label: 'Needs watch', range: '40–69', key: 'watch' as const },
  { label: 'Stable', range: '70–100', key: 'stable' as const },
];

export function ScoreDetailScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { result, metrics } = useApp();
  const meta = tierMeta(result.tier, t);
  const maxAbs = Math.max(0.12, ...result.contributions.map((c) => Math.abs(c.value)));

  const featureValues: Record<string, string> = {
    savings_ratio: pct(metrics.savingsRatio, 1),
    expense_to_income: pct(metrics.expenseRatio, 1),
    debt_burden: pct(metrics.debtRatio, 1),
    income_volatility: pct(metrics.incomeVolatility),
    emergency_runway: `${metrics.runwayMonths.toFixed(1)} mo`,
    income_level: money(metrics.monthlyIncome),
  };

  return (
    <ScrollView
      className="flex-1"
      style={{ backgroundColor: t.canvas }}
      contentContainerStyle={{
        paddingTop: insets.top + 8,
        paddingHorizontal: 16,
        paddingBottom: 40,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View className="mb-4 flex-row items-center justify-between">
        <Text className="text-lg font-extrabold" style={{ color: t.ink }}>
          Why this score
        </Text>
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Close"
          className="h-10 w-10 items-center justify-center rounded-full"
          style={{ backgroundColor: t.surface, borderWidth: 1, borderColor: t.border }}
        >
          <Ionicons name="close" size={18} color={t.inkSoft} />
        </Pressable>
      </View>

      <Card className="mb-5 items-center p-6">
        <ScoreGauge
          score={result.score}
          size={156}
          stroke={13}
          color={meta.color}
          trackColor={t.border}
        >
          <Text className="text-[40px] font-extrabold leading-none" style={{ color: t.ink }}>
            {result.score}
          </Text>
          <Text className="mt-1 text-[10px] font-bold uppercase" style={{ color: t.inkFaint, letterSpacing: 1 }}>
            of 100
          </Text>
        </ScoreGauge>
        <Text className="mt-4 text-[13px]" style={{ color: t.inkSoft }}>
          P(default-free next 60 days) = {(result.probability * 100).toFixed(1)}%
        </Text>
        <View className="mt-4 w-full">
          <View className="flex-row" style={{ gap: 6 }}>
            {BANDS.map((band) => {
              const bandMeta = tierMeta(band.key, t);
              const active = band.key === result.tier;
              return (
                <View
                  key={band.key}
                  className="flex-1 items-center rounded-2xl py-2"
                  style={{
                    backgroundColor: active ? bandMeta.soft : t.surfaceAlt,
                    borderWidth: active ? 1.5 : 1,
                    borderColor: active ? bandMeta.color : t.border,
                  }}
                >
                  <Text
                    className="text-[11px] font-extrabold"
                    style={{ color: active ? bandMeta.color : t.inkFaint }}
                  >
                    {band.range}
                  </Text>
                  <Text
                    className="mt-0.5 text-[10px] font-semibold"
                    style={{ color: active ? t.ink : t.inkFaint }}
                  >
                    {band.label}
                  </Text>
                </View>
              );
            })}
          </View>
          <Text className="mt-3 text-center text-[11px]" style={{ color: t.inkFaint }}>
            Bands: below {SCORE_BANDS.highMax} high risk · above {SCORE_BANDS.stableMin} stable
          </Text>
        </View>
      </Card>

      <Card className="mb-5 p-5">
        <SectionTitle
          title="What moved your score"
          caption="Per-feature attribution across 12 boosted splits"
        />
        {result.contributions.map((c) => {
          const width = `${(Math.abs(c.value) / maxAbs) * 50}%` as const;
          const positive = c.value >= 0;
          return (
            <View key={c.feature} className="mb-4">
              <View className="mb-1.5 flex-row items-center justify-between">
                <Text className="text-[12px] font-semibold" style={{ color: t.ink }}>
                  {c.label}
                </Text>
                <Text className="text-[11px] font-bold" style={{ color: t.inkFaint }}>
                  {featureValues[c.feature]}
                </Text>
              </View>
              <View className="relative h-3 w-full flex-row items-center">
                <View
                  className="absolute bottom-0 top-0 w-px"
                  style={{ left: '50%', backgroundColor: t.border }}
                />
                <View className="relative h-3 flex-1 flex-row justify-end">
                  {!positive ? (
                    <View
                      className="h-3 rounded-l-sm"
                      style={{ width, backgroundColor: t.risk }}
                    />
                  ) : null}
                </View>
                <View className="relative h-3 flex-1 flex-row justify-start">
                  {positive ? (
                    <View
                      className="h-3 rounded-r-sm"
                      style={{ width, backgroundColor: t.stable }}
                    />
                  ) : null}
                </View>
              </View>
              <Text className="mt-1 text-[10px]" style={{ color: positive ? t.stable : t.risk }}>
                {positive ? '+' : ''}
                {c.value.toFixed(2)} log-odds
              </Text>
            </View>
          );
        })}
      </Card>

      <Card className="mb-5 p-5" tone="soft">
        <SectionTitle title="How to read this" />
        <Text className="text-[12px] leading-5" style={{ color: t.inkSoft }}>
          The model sums 12 boosted decision stumps into a single log-odds margin, then
          squashes it with a sigmoid to get the 0–100 score. Green bars are features
          protecting you right now; red bars are dragging you towards arrears.
        </Text>
        <Text className="mt-3 text-[12px] leading-5" style={{ color: t.inkSoft }}>
          Move a slider on the dashboard and watch these bars shift — that is the same
          real-time inference the production pipeline runs server-side.
        </Text>
        <Text className="mt-3 text-[10px] leading-4" style={{ color: t.inkFaint }}>
          Prototype only. Not regulated financial advice.
        </Text>
      </Card>
    </ScrollView>
  );
}
