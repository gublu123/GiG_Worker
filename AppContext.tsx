import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { fetchCoachReply, type CoachReply } from '../lib/coach';
import { DEFAULT_INPUTS, buildTrend, computeMetrics } from '../lib/metrics';
import { evaluateResilience } from '../lib/resilienceModel';
import {
  loadApiKey,
  loadChecklist,
  loadInputs,
  loadMessages,
  saveApiKey,
  saveChecklist,
  saveInputs,
  saveMessages,
} from '../lib/storage';
import type {
  ChatMessage,
  FinancialInputs,
  Metrics,
  MonthPoint,
  ResilienceResult,
} from '../lib/types';

interface AppState {
  hydrated: boolean;
  inputs: FinancialInputs;
  setInputs: (patch: Partial<FinancialInputs>) => void;
  resetInputs: () => void;
  metrics: Metrics;
  result: ResilienceResult;
  trend: MonthPoint[];
  baselineScore: number;
  messages: ChatMessage[];
  sending: boolean;
  lastReply: CoachReply | null;
  requestCoach: (question?: string) => Promise<void>;
  clearChat: () => void;
  checklist: Record<string, boolean>;
  toggleCheck: (id: string) => void;
  apiKey: string;
  saveKey: (key: string) => Promise<void>;
  refreshing: boolean;
  refresh: () => Promise<void>;
  lastSynced: number;
}

const AppContext = createContext<AppState | null>(null);

let idCounter = 0;
const nextId = () => `${Date.now().toString(36)}-${(idCounter += 1)}`;

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [inputs, setInputsState] = useState<FinancialInputs>(DEFAULT_INPUTS);
  const [baselineScore, setBaselineScore] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [lastReply, setLastReply] = useState<CoachReply | null>(null);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [apiKey, setApiKey] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [nonce, setNonce] = useState(0);
  const [lastSynced, setLastSynced] = useState(Date.now());
  const hydratedOnce = useRef(false);

  useEffect(() => {
    if (hydratedOnce.current) return;
    hydratedOnce.current = true;
    let cancelled = false;
    (async () => {
      const [storedInputs, storedMessages, storedChecklist, storedKey] = await Promise.all([
        loadInputs(),
        loadMessages(),
        loadChecklist(),
        loadApiKey(),
      ]);
      if (cancelled) return;
      const next = storedInputs ?? DEFAULT_INPUTS;
      setInputsState(next);
      setBaselineScore(evaluateResilience(computeMetrics(next)).score);
      setMessages(storedMessages);
      setChecklist(storedChecklist);
      setApiKey(storedKey ?? '');
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setInputs = useCallback((patch: Partial<FinancialInputs>) => {
    setInputsState((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetInputs = useCallback(() => {
    setInputsState(DEFAULT_INPUTS);
    setBaselineScore(evaluateResilience(computeMetrics(DEFAULT_INPUTS)).score);
    setLastSynced(Date.now());
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveInputs(inputs);
  }, [inputs, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    saveMessages(messages);
  }, [messages, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    saveChecklist(checklist);
  }, [checklist, hydrated]);

  const metrics = useMemo(() => computeMetrics(inputs), [inputs]);
  const result = useMemo(() => evaluateResilience(metrics), [metrics]);
  const trend = useMemo(() => buildTrend(inputs, nonce), [inputs, nonce]);

  const requestCoach = useCallback(
    async (question?: string) => {
      if (sending) return;
      setSending(true);
      const stamp = Date.now();
      const pendingId = nextId();
      if (question) {
        setMessages((prev) => [
          ...prev,
          { id: nextId(), role: 'user', text: question, at: stamp },
        ]);
      }
      setMessages((prev) => [
        ...prev,
        { id: pendingId, role: 'coach', text: '', at: stamp, pending: true },
      ]);
      try {
        const reply = await fetchCoachReply({ metrics, result, question, apiKey });
        setLastReply(reply);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === pendingId
              ? {
                  id: pendingId,
                  role: 'coach' as const,
                  text: reply.text,
                  at: Date.now(),
                  source: reply.source,
                }
              : m,
          ),
        );
      } catch {
        setMessages((prev) => prev.filter((m) => m.id !== pendingId));
      } finally {
        setSending(false);
      }
    },
    [apiKey, metrics, result, sending],
  );

  const clearChat = useCallback(() => setMessages([]), []);

  const toggleCheck = useCallback((id: string) => {
    setChecklist((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const saveKey = useCallback(async (key: string) => {
    setApiKey(key);
    await saveApiKey(key);
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 900));
    setNonce((n) => n + 1);
    setLastSynced(Date.now());
    setRefreshing(false);
  }, []);

  const value = useMemo<AppState>(
    () => ({
      hydrated,
      inputs,
      setInputs,
      resetInputs,
      metrics,
      result,
      trend,
      baselineScore,
      messages,
      sending,
      lastReply,
      requestCoach,
      clearChat,
      checklist,
      toggleCheck,
      apiKey,
      saveKey,
      refreshing,
      refresh,
      lastSynced,
    }),
    [
      hydrated,
      inputs,
      setInputs,
      resetInputs,
      metrics,
      result,
      trend,
      baselineScore,
      messages,
      sending,
      lastReply,
      requestCoach,
      clearChat,
      checklist,
      toggleCheck,
      apiKey,
      saveKey,
      refreshing,
      refresh,
      lastSynced,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}
