import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Card } from '../components/Card';
import { Chip } from '../components/Chip';
import { PrimaryButton } from '../components/PrimaryButton';
import { ProgressBar } from '../components/ProgressBar';
import { SectionTitle } from '../components/SectionTitle';
import { useApp } from '../context/AppContext';
import { MODEL_META } from '../lib/resilienceModel';
import { money } from '../lib/format';
import { useTheme } from '../lib/theme';

const GIG_TYPES = ['Rideshare', 'Courier', 'Freelance', 'Task work'];

export function ProfileScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { apiKey, saveKey, resetInputs, clearChat, result, metrics } = useApp();
  const [draftKey, setDraftKey] = useState(apiKey);
  const [saved, setSaved] = useState(false);

  const persistKey = async () => {
    await saveKey(draftKey.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  };

  const confirmReset = () => {
    Alert.alert(
      'Reset prototype data',
      'This restores the demo simulation values and clears your coach conversation.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            resetInputs();
            clearChat();
          },
        },
      ],
    );
  };

  const maxImportance = Math.max(0.01, ...result.contributions.map((c) => Math.abs(c.share)));

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
      keyboardShouldPersistTaps="handled"
    >
      <Text className="text-[11px] font-bold uppercase" style={{ color: t.inkFaint, letterSpacing: 0.8 }}>
        Worker profile
      </Text>
      <Text className="mt-0.5 mb-5 text-2xl font-extrabold" style={{ color: t.ink }}>
        Alex Rivera
      </Text>

      <Card className="mb-5 p-5">
        <View className="flex-row items-center" style={{ gap: 14 }}>
          <View
            className="h-16 w-16 items-center justify-center rounded-2xl"
            style={{ backgroundColor: t.primarySoft }}
          >
            <Text className="text-xl font-extrabold" style={{ color: t.primary }}>
              AR
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-[15px] font-extrabold" style={{ color: t.ink }}>
              Full-time gig worker
            </Text>
            <Text className="mt-0.5 text-[12px]" style={{ color: t.inkSoft }}>
              Austin, TX · 4 years on platforms · 2 active apps
            </Text>
          </View>
        </View>
        <View className="mt-4 flex-row flex-wrap" style={{ gap: 8 }}>
          {GIG_TYPES.map((type, index) => (
            <Chip
              key={type}
              small
              label={type}
              color={index < 2 ? t.primary : t.inkSoft}
              background={index < 2 ? t.primarySoft : t.surfaceAlt}
            />
          ))}
        </View>
        <View className="mt-4 flex-row rounded-2xl" style={{ backgroundColor: t.surfaceAlt }}>
          {[
            { label: 'Gross / month', value: money(metrics.monthlyIncome) },
            { label: 'Score', value: `${result.score}` },
            { label: 'Runway', value: `${metrics.runwayMonths.toFixed(1)} mo` },
          ].map((cell, index) => (
            <View
              key={cell.label}
              className="flex-1 items-center py-3"
              style={
                index > 0 ? { borderLeftWidth: 1, borderLeftColor: t.border } : undefined
              }
            >
              <Text className="text-[15px] font-extrabold" style={{ color: t.ink }}>
                {cell.value}
              </Text>
              <Text className="mt-0.5 text-[10px] font-semibold" style={{ color: t.inkFaint }}>
                {cell.label}
              </Text>
            </View>
          ))}
        </View>
      </Card>

      <Card className="mb-5 p-5">
        <SectionTitle
          title="AI #1 · XGBoost model"
          caption={`${MODEL_META.version} · trained ${MODEL_META.trainedAt}`}
          right={
            <Chip small label={`AUC ${MODEL_META.auc}`} color={t.stable} background={t.stableSoft} />
          }
        />
        <Text className="mb-4 text-[12px] leading-5" style={{ color: t.inkSoft }}>
          Feature attribution for your current profile. The bars show how much each input
          pushes your {result.score}-point score up or down.
        </Text>
        {result.contributions.map((c) => (
          <View key={c.feature} className="mb-3">
            <View className="mb-1.5 flex-row items-center justify-between">
              <Text className="text-[12px] font-semibold" style={{ color: t.ink }}>
                {c.label}
              </Text>
              <Text
                className="text-[11px] font-extrabold tabular-nums"
                style={{ color: c.value >= 0 ? t.stable : t.risk }}
              >
                {c.value >= 0 ? '+' : ''}
                {c.value.toFixed(2)}
              </Text>
            </View>
            <ProgressBar
              progress={Math.abs(c.value) / maxImportance}
              color={c.value >= 0 ? t.stable : t.risk}
              track={t.border}
              height={7}
            />
          </View>
        ))}
        <Text className="mt-1 text-[10px] leading-4" style={{ color: t.inkFaint }}>
          Trained on {MODEL_META.rows.toLocaleString('en-US')} labelled gig-worker profiles.
          Inference is mirrored on-device so the dashboard stays interactive offline.
        </Text>
      </Card>

      <Card className="mb-5 p-5">
        <SectionTitle
          title="AI #3 · Gemini coach"
          caption="Google Gen AI SDK · empathetic coaching persona"
          right={
            <Chip
              small
              label={apiKey ? 'Connected' : 'On-device'}
              icon={apiKey ? 'cloud-done' : 'phone-portrait'}
              color={apiKey ? t.stable : t.watch}
              background={apiKey ? t.stableSoft : t.watchSoft}
            />
          }
        />
        <Text className="mb-3 text-[12px] leading-5" style={{ color: t.inkSoft }}>
          Paste a Gemini API key to route coaching through the cloud model. Without one, the
          same prompts are answered by the deterministic on-device coach so nothing ever
          breaks in a demo.
        </Text>
        <View
          className="flex-row items-center rounded-2xl px-4"
          style={{ backgroundColor: t.surfaceAlt, borderWidth: 1, borderColor: t.border }}
        >
          <Ionicons name="key" size={16} color={t.inkFaint} />
          <TextInput
            value={draftKey}
            onChangeText={setDraftKey}
            placeholder="AIza…"
            placeholderTextColor={t.inkFaint}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            style={{
              flex: 1,
              paddingVertical: 12,
              paddingLeft: 10,
              color: t.ink,
              fontSize: 14,
            }}
          />
        </View>
        <View className="mt-3">
          <PrimaryButton
            label={saved ? 'Key saved securely' : 'Save key'}
            icon={saved ? 'checkmark-circle' : 'lock-closed'}
            variant="tonal"
            onPress={persistKey}
          />
        </View>
      </Card>

      <Card className="mb-5 p-5">
        <SectionTitle title="Prototype data" caption="Everything lives on this device" />
        <PrimaryButton label="Reset simulation" icon="refresh" variant="ghost" onPress={confirmReset} />
        <Text className="mt-3 text-[10px] leading-4" style={{ color: t.inkFaint }}>
          Gig Worker Financial Resilience · prototype build. Scores and coaching are
          illustrative and are not regulated financial advice.
        </Text>
      </Card>
    </ScrollView>
  );
}
