import React, { useCallback } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from '@expo/vector-icons/Ionicons';

import { AdviceCard } from '../components/AdviceCard';
import { Card } from '../components/Card';
import { MetricTile } from '../components/MetricTile';
import { PrimaryButton } from '../components/PrimaryButton';
import { RangeSlider } from '../components/RangeSlider';
import { ScoreGauge } from '../components/ScoreGauge';
import { SectionTitle } from '../components/SectionTitle';
import { TrendChart } from '../components/TrendChart';
import { useApp } from '../context/AppContext';
import { INPUT_BOUNDS } from '../lib/metrics';
import { MODEL_META, topDriverSentence } from '../lib/resilienceModel';
import { money, pct, timeAgo } from '../lib/format';
import { tierMeta, useTheme } from '../lib/theme';
import type { RootStackParamList } from '../navigation/types';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function DashboardScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    inputs,
    setInputs,
    resetInputs,
    metrics,
    result,
    trend,
    baselineScore,
    refreshing,
    refresh,
    lastSynced,
    requestCoach,
    sending,
    messages,
  } = useApp();

  const meta = tierMeta(result.tier, t);
  const delta = result.score - baselineScore;
  const lastCoach = [...messages].reverse().find((m) => m.role === 'coach' && !m.pending);

  const savingsTone =
    metrics.savingsRatio >= 0.2 ? 'good' : metrics.savingsRatio >= 0.05 ? 'warn' : 'bad';
  const expenseTone =
    metrics.expenseRatio <= 0.7 ? 'good' : metrics.expenseRatio <= 0.9 ? 'warn' : 'bad';
  const debtTone = metrics.debtRatio <= 0.2 ? 'good' : metrics.debtRatio <= 0.3 ? 'warn' : 'bad';
  const runwayTone =
    metrics.runwayMonths >= 3 ? 'good' : metrics.runwayMonths >= 1 ? 'warn' : 'bad';

  const onRefresh = useCallback(() => {
    refresh();
  }, [refresh]);

  return (
    <View className="flex-1" style={{ backgroundColor: t.canvas }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 16,
          paddingBottom: 32,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.primary} />
        }
      >
        {/* Header */}
        <View className="mb-5 flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-[11px] font-bold uppercase" style={{ color: t.inkFaint, letterSpacing: 0.8 }}>
              {greeting()}, Alex
            </Text>
            <Text className="mt-0.5 text-2xl font-extrabold" style={{ color: t.ink }}>
              Resilience dashboard
            </Text>
          </View>
          <Pressable
            onPress={refresh}
            accessibilityRole="button"
            accessibilityLabel="Sync payouts"
            className="h-11 w-11 items-center justify-center rounded-2xl"
            style={{ backgroundColor: t.surface, borderWidth: 1, borderColor: t.border }}
          >
            <Ionicons name="sync" size={18} color={t.primary} />
          </Pressable>
        </View>

        {/* Hero: AI #1 score */}
        <LinearGradient
          colors={[t.heroFrom, t.heroTo]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            marginBottom: 20,
            borderRadius: 24,
            padding: 20,
            shadowColor: '#0B2E6F',
            shadowOpacity: 0.28,
            shadowRadius: 20,
            shadowOffset: { width: 0, height: 12 },
            elevation: 6,
          }}
        >
          <View className="flex-row items-center" style={{ gap: 18 }}>
            <ScoreGauge
              score={result.score}
              size={148}
              stroke={13}
              color={meta.color}
              trackColor="rgba(255,255,255,0.18)"
            >
              <Text className="text-[42px] font-extrabold leading-none" style={{ color: '#FFFFFF' }}>
                {result.score}
              </Text>
              <Text className="mt-1 text-[10px] font-bold uppercase" style={{ color: 'rgba(255,255,255,0.7)', letterSpacing: 1 }}>
                of 100
              </Text>
            </ScoreGauge>

            <View className="flex-1">
              <View
                className="self-start rounded-full px-3 py-1.5"
                style={{ backgroundColor: meta.color }}
              >
                <Text className="text-[11px] font-extrabold uppercase" style={{ color: '#0B2E6F', letterSpacing: 0.8 }}>
                  {meta.short}
                </Text>
              </View>
              <Text className="mt-2.5 text-[13px] leading-5" style={{ color: 'rgba(255,255,255,0.92)' }}>
                {meta.blurb}
              </Text>
              <Text className="mt-2 text-[11px] font-semibold" style={{ color: 'rgba(255,255,255,0.72)' }}>
                {delta > 0 ? `▲ ${delta} pts` : delta < 0 ? `▼ ${Math.abs(delta)} pts` : '— no change'}
                {' since last sync'}
              </Text>
              <Pressable
                onPress={() => navigation.navigate('ScoreDetail')}
                accessibilityRole="button"
                className="mt-3 self-start flex-row items-center rounded-full px-3 py-2"
                style={{ backgroundColor: 'rgba(255,255,255,0.16)', gap: 6 }}
              >
                <Ionicons name="stats-chart" size={13} color="#FFFFFF" />
                <Text className="text-[12px] font-bold" style={{ color: '#FFFFFF' }}>
                  Why this score
                </Text>
              </Pressable>
            </View>
          </View>

          <View
            className="mt-5 flex-row rounded-2xl"
            style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}
          >
            {[
              { label: 'Runway', value: `${metrics.runwayMonths.toFixed(1)} mo` },
              { label: 'Monthly surplus', value: money(metrics.netSurplus) },
              { label: 'Stability', value: pct(metrics.incomeStability) },
            ].map((mini, index) => (
              <View
                key={mini.label}
                className="flex-1 items-center px-2 py-3"
                style={
                  index > 0
                    ? { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.16)' }
                    : undefined
                }
              >
                <Text className="text-[15px] font-extrabold" style={{ color: '#FFFFFF' }}>
                  {mini.value}
                </Text>
                <Text className="mt-0.5 text-[10px] font-semibold" style={{ color: 'rgba(255,255,255,0.72)' }}>
                  {mini.label}
                </Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* Metrics grid */}
        <SectionTitle
          title="Your financial features"
          caption="The six inputs the XGBoost model consumes in real time"
        />
        <View className="mb-5 flex-row" style={{ gap: 12 }}>
          <MetricTile
            icon="cash"
            label="Avg monthly income"
            value={money(metrics.monthlyIncome)}
            caption={`Volatility ${pct(metrics.incomeVolatility)}`}
          />
          <MetricTile
            icon="trending-up"
            label="Savings ratio"
            value={pct(metrics.savingsRatio, 1)}
            caption="Net surplus ÷ gross"
            tone={savingsTone}
          />
        </View>
        <View className="mb-5 flex-row" style={{ gap: 12 }}>
          <MetricTile
            icon="swap-vertical"
            label="Expense-to-income"
            value={pct(metrics.expenseRatio, 1)}
            caption={money(metrics.monthlyExpenses) + ' of costs'}
            tone={expenseTone}
          />
          <MetricTile
            icon="card"
            label="Debt burden"
            value={pct(metrics.debtRatio, 1)}
            caption={money(metrics.debtPayments) + ' per month'}
            tone={debtTone}
          />
        </View>
        <View className="mb-6 flex-row" style={{ gap: 12 }}>
          <MetricTile
            icon="umbrella"
            label="Emergency runway"
            value={`${metrics.runwayMonths.toFixed(1)} mo`}
            caption={`${money(metrics.savingsBalance)} saved`}
            tone={runwayTone}
          />
          <MetricTile
            icon="wallet"
            label="Disposable income"
            value={money(metrics.disposable)}
            caption="After costs and debt"
            tone={metrics.disposable >= 0 ? 'good' : 'bad'}
          />
        </View>

        {/* Trend chart */}
        <Card className="mb-6 p-5">
          <SectionTitle
            title="Income vs. costs"
            caption={`Last 6 months · synced ${timeAgo(lastSynced)}`}
          />
          <TrendChart
            data={trend}
            incomeColor={t.primary}
            expenseColor={t.inkFaint}
            ink={t.ink}
            faint={t.inkFaint}
          />
        </Card>

        {/* Sliders */}
        <Card className="mb-6 p-5">
          <SectionTitle
            title="Simulate your month"
            caption="Drag to re-run AI #1 — the score updates instantly"
            right={
              <Pressable
                onPress={resetInputs}
                accessibilityRole="button"
                accessibilityLabel="Reset simulation"
                className="h-9 w-9 items-center justify-center rounded-xl"
                style={{ backgroundColor: t.primarySoft }}
              >
                <Ionicons name="refresh" size={16} color={t.primary} />
              </Pressable>
            }
          />

          <RangeSlider
            label="Monthly earnings"
            icon="cash"
            value={inputs.monthlyIncome}
            min={INPUT_BOUNDS.monthlyIncome.min}
            max={INPUT_BOUNDS.monthlyIncome.max}
            step={INPUT_BOUNDS.monthlyIncome.step}
            onChange={(v) => setInputs({ monthlyIncome: v })}
            format={(v) => money(v)}
            caption="gross"
          />
          <RangeSlider
            label="Living expenses"
            icon="cart"
            value={inputs.monthlyExpenses}
            min={INPUT_BOUNDS.monthlyExpenses.min}
            max={INPUT_BOUNDS.monthlyExpenses.max}
            step={INPUT_BOUNDS.monthlyExpenses.step}
            onChange={(v) => setInputs({ monthlyExpenses: v })}
            format={(v) => money(v)}
          />
          <RangeSlider
            label="Cash buffer"
            icon="umbrella"
            value={inputs.savingsBalance}
            min={INPUT_BOUNDS.savingsBalance.min}
            max={INPUT_BOUNDS.savingsBalance.max}
            step={INPUT_BOUNDS.savingsBalance.step}
            onChange={(v) => setInputs({ savingsBalance: v })}
            format={(v) => money(v)}
          />
          <RangeSlider
            label="Loan repayments"
            icon="card"
            value={inputs.debtPayments}
            min={INPUT_BOUNDS.debtPayments.min}
            max={INPUT_BOUNDS.debtPayments.max}
            step={INPUT_BOUNDS.debtPayments.step}
            onChange={(v) => setInputs({ debtPayments: v })}
            format={(v) => money(v)}
            caption="per month"
          />
          <RangeSlider
            label="Earnings volatility"
            icon="pulse"
            value={inputs.incomeVolatility}
            min={INPUT_BOUNDS.incomeVolatility.min}
            max={INPUT_BOUNDS.incomeVolatility.max}
            step={INPUT_BOUNDS.incomeVolatility.step}
            onChange={(v) => setInputs({ incomeVolatility: v })}
            format={(v) => pct(v)}
            caption={metrics.incomeVolatility < 0.3 ? 'steady' : metrics.incomeVolatility < 0.6 ? 'uneven' : 'chaotic'}
          />
        </Card>

        {/* AI #3 coach CTA */}
        <View className="mb-3">
          <PrimaryButton
            label={sending ? 'Coach is thinking…' : 'Generate AI advice'}
            icon="sparkles"
            loading={sending}
            onPress={() => requestCoach()}
          />
        </View>

        {lastCoach?.text ? (
          <View className="mb-6">
            <AdviceCard
              text={lastCoach.text}
              source={lastCoach.source}
              tier={result.tier}
              onOpenCoach={() => navigation.navigate('Tabs', { screen: 'Coach' })}
              onRegenerate={() => requestCoach()}
            />
          </View>
        ) : null}

        <Text className="mb-2 text-center text-[10px] leading-4" style={{ color: t.inkFaint }}>
          {MODEL_META.name} · {MODEL_META.version} · AUC {MODEL_META.auc} on {MODEL_META.rows.toLocaleString('en-US')} labelled profiles.{'\n'}
          {topDriverSentence(result, metrics)}{'\n'}
          Prototype only — not regulated financial advice.
        </Text>
      </ScrollView>
    </View>
  );
}
