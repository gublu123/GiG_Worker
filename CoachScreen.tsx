import React, { useMemo, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Card } from '../components/Card';
import { CoachBlocks } from '../components/CoachBlocks';
import { PrimaryButton } from '../components/PrimaryButton';
import { useApp } from '../context/AppContext';
import { timeAgo } from '../lib/format';
import { tierMeta, useTheme } from '../lib/theme';
import type { ChatMessage } from '../lib/types';

const QUICK_PROMPTS = [
  'Should I take a small loan?',
  'How do I build a buffer fast?',
  'How do I smooth a slow month?',
  'How much should I set aside for tax?',
  'My tyres need replacing — what now?',
];

export function CoachScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { messages, requestCoach, sending, clearChat, result, hydrated } = useApp();
  const [draft, setDraft] = useState('');
  const meta = tierMeta(result.tier, t);

  const ordered = useMemo(() => [...messages].reverse(), [messages]);

  const send = (text?: string) => {
    const question = (text ?? draft).trim();
    if (!question || sending) return;
    setDraft('');
    requestCoach(question);
  };

  const renderItem = ({ item }: { item: ChatMessage }) => {
    if (item.role === 'user') {
      return (
        <View className="mb-4 flex-row justify-end">
          <View
            className="max-w-[85%] rounded-3xl rounded-br-lg px-4 py-3"
            style={{ backgroundColor: t.primary }}
          >
            <Text className="text-[14px] leading-5" style={{ color: '#FFFFFF' }}>
              {item.text}
            </Text>
          </View>
        </View>
      );
    }

    if (item.pending) {
      return (
        <View className="mb-4 flex-row items-center rounded-3xl px-4 py-4" style={{ backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, gap: 6 }}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: t.primary, opacity: 0.35 + i * 0.25 }}
            />
          ))}
          <Text className="ml-2 text-[12px]" style={{ color: t.inkSoft }}>
            Reading your cash flow…
          </Text>
        </View>
      );
    }

    return (
      <View
        className="mb-4 rounded-3xl px-4 py-4"
        style={{
          backgroundColor: t.surface,
          borderWidth: 1,
          borderColor: t.border,
          shadowColor: t.shadow,
          shadowOpacity: t.name === 'dark' ? 0.35 : 0.07,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
          elevation: 2,
        }}
      >
        <View className="mb-1 flex-row items-center justify-between">
          <View className="flex-row items-center" style={{ gap: 6 }}>
            <Ionicons name="sparkles" size={13} color={meta.color} />
            <Text className="text-[11px] font-extrabold uppercase" style={{ color: t.inkFaint, letterSpacing: 0.6 }}>
              Coach
            </Text>
          </View>
          <Text className="text-[10px]" style={{ color: t.inkFaint }}>
            {item.source === 'gemini' ? 'Gemini' : 'On-device'} · {timeAgo(item.at)}
          </Text>
        </View>
        <CoachBlocks text={item.text} />
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      className="flex-1"
      style={{ backgroundColor: t.canvas }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View
        className="flex-row items-center justify-between px-4 pb-3"
        style={{ paddingTop: insets.top + 12 }}
      >
        <View className="flex-1">
          <Text className="text-[11px] font-bold uppercase" style={{ color: t.inkFaint, letterSpacing: 0.8 }}>
            AI #3 · Generative layer
          </Text>
          <Text className="mt-0.5 text-2xl font-extrabold" style={{ color: t.ink }}>
            Financial coach
          </Text>
        </View>
        {messages.length > 0 ? (
          <Pressable
            onPress={clearChat}
            accessibilityRole="button"
            accessibilityLabel="Clear conversation"
            className="h-11 w-11 items-center justify-center rounded-2xl"
            style={{ backgroundColor: t.surface, borderWidth: 1, borderColor: t.border }}
          >
            <Ionicons name="trash-outline" size={18} color={t.inkSoft} />
          </Pressable>
        ) : null}
      </View>

      <FlatList
        data={ordered}
        inverted
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}
        keyboardDismissMode="interactive"
        ListFooterComponent={
          hydrated && messages.length === 0 ? (
            <Card className="mb-4 p-5">
              <View
                className="mb-4 h-12 w-12 items-center justify-center rounded-2xl"
                style={{ backgroundColor: meta.soft }}
              >
                <Ionicons name="chatbubble-ellipses" size={22} color={meta.color} />
              </View>
              <Text className="text-lg font-extrabold" style={{ color: t.ink }}>
                Your coach already knows your numbers
              </Text>
              <Text className="mt-2 text-[13px] leading-5" style={{ color: t.inkSoft }}>
                Every session is grounded in your live resilience score ({result.score}/100)
                and the exact dollar figures on your dashboard. Ask anything — or start with a
                suggestion below.
              </Text>
              <View className="mt-4">
                <PrimaryButton
                  label="Start my first session"
                  icon="sparkles"
                  loading={sending}
                  onPress={() => requestCoach()}
                />
              </View>
            </Card>
          ) : null
        }
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 10 }}
      >
        {QUICK_PROMPTS.map((prompt) => (
          <Pressable
            key={prompt}
            onPress={() => send(prompt)}
            disabled={sending}
            className="rounded-full px-3.5 py-2"
            style={{
              backgroundColor: t.surface,
              borderWidth: 1,
              borderColor: t.border,
              opacity: sending ? 0.5 : 1,
            }}
          >
            <Text className="text-[12px] font-semibold" style={{ color: t.inkSoft }}>
              {prompt}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <View
        className="flex-row items-end gap-2 border-t px-4 pb-5 pt-3"
        style={{ backgroundColor: t.surface, borderColor: t.border }}
      >
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Ask your coach anything…"
          placeholderTextColor={t.inkFaint}
          multiline
          returnKeyType="send"
          onSubmitEditing={() => send()}
          blurOnSubmit
          style={{
            flex: 1,
            maxHeight: 110,
            minHeight: 44,
            color: t.ink,
            backgroundColor: t.surfaceAlt,
            borderRadius: 18,
            paddingHorizontal: 16,
            paddingVertical: Platform.OS === 'ios' ? 12 : 8,
            fontSize: 14,
            borderWidth: 1,
            borderColor: t.border,
          }}
        />
        <Pressable
          onPress={() => send()}
          disabled={sending || !draft.trim()}
          accessibilityRole="button"
          accessibilityLabel="Send message"
          className="h-11 w-11 items-center justify-center rounded-full"
          style={{
            backgroundColor: draft.trim() && !sending ? t.primary : t.border,
          }}
        >
          <Ionicons
            name={sending ? 'hourglass' : 'arrow-up'}
            size={20}
            color={draft.trim() && !sending ? '#FFFFFF' : t.inkFaint}
          />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
