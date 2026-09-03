import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import type { ChatMessage, FinancialInputs } from './types';

const KEYS = {
  inputs: '@gwr/inputs/v1',
  messages: '@gwr/messages/v1',
  checklist: '@gwr/checklist/v1',
  apiKey: 'gwr.gemini.key.v1',
};

export async function loadInputs(): Promise<FinancialInputs | null> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.inputs);
    return raw ? (JSON.parse(raw) as FinancialInputs) : null;
  } catch {
    return null;
  }
}

export async function saveInputs(inputs: FinancialInputs): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.inputs, JSON.stringify(inputs));
  } catch {
    // best-effort persistence
  }
}

export async function loadMessages(): Promise<ChatMessage[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.messages);
    return raw ? (JSON.parse(raw) as ChatMessage[]) : [];
  } catch {
    return [];
  }
}

export async function saveMessages(messages: ChatMessage[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.messages, JSON.stringify(messages.slice(-40)));
  } catch {
    // best-effort persistence
  }
}

export async function loadChecklist(): Promise<Record<string, boolean>> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.checklist);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

export async function saveChecklist(map: Record<string, boolean>): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.checklist, JSON.stringify(map));
  } catch {
    // best-effort persistence
  }
}

/** SecureStore is unavailable on web, so fall back to localStorage there. */
export async function loadApiKey(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      return typeof localStorage !== 'undefined' ? localStorage.getItem(KEYS.apiKey) : null;
    }
    return await SecureStore.getItemAsync(KEYS.apiKey);
  } catch {
    return null;
  }
}

export async function saveApiKey(key: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        if (key) localStorage.setItem(KEYS.apiKey, key);
        else localStorage.removeItem(KEYS.apiKey);
      }
      return;
    }
    if (key) await SecureStore.setItemAsync(KEYS.apiKey, key);
    else await SecureStore.deleteItemAsync(KEYS.apiKey);
  } catch {
    // best-effort persistence
  }
}
