import React from 'react';
import { Text, View } from 'react-native';
import type { MonthPoint } from '../lib/types';
import { money } from '../lib/format';

interface Props {
  data: MonthPoint[];
  incomeColor: string;
  expenseColor: string;
  ink: string;
  faint: string;
}

const CHART_HEIGHT = 108;

export function TrendChart({ data, incomeColor, expenseColor, ink, faint }: Props) {
  const max = Math.max(1, ...data.map((d) => Math.max(d.income, d.expenses)));

  return (
    <View>
      <View className="mb-4 flex-row items-center" style={{ gap: 16 }}>
        <View className="flex-row items-center" style={{ gap: 6 }}>
          <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: incomeColor }} />
          <Text className="text-[11px] font-semibold" style={{ color: ink }}>
            Earnings
          </Text>
        </View>
        <View className="flex-row items-center" style={{ gap: 6 }}>
          <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: expenseColor }} />
          <Text className="text-[11px] font-semibold" style={{ color: ink }}>
            Costs + debt
          </Text>
        </View>
      </View>

      <View className="flex-row items-end" style={{ height: CHART_HEIGHT, gap: 10 }}>
        {data.map((point) => (
          <View key={point.label} className="flex-1 flex-row items-end justify-center" style={{ gap: 4 }}>
            <View
              className="w-3 rounded-t-md"
              style={{
                height: Math.max(4, (point.income / max) * CHART_HEIGHT),
                backgroundColor: incomeColor,
              }}
            />
            <View
              className="w-3 rounded-t-md"
              style={{
                height: Math.max(4, (point.expenses / max) * CHART_HEIGHT),
                backgroundColor: expenseColor,
              }}
            />
          </View>
        ))}
      </View>

      <View className="mt-2 flex-row" style={{ gap: 10 }}>
        {data.map((point) => (
          <View key={point.label} className="flex-1 items-center">
            <Text className="text-[10px] font-semibold" style={{ color: faint }}>
              {point.label}
            </Text>
          </View>
        ))}
      </View>

      <View className="mt-3 flex-row justify-between rounded-2xl px-3 py-2" style={{ backgroundColor: 'rgba(127,146,178,0.10)' }}>
        <Text className="text-[11px] font-semibold" style={{ color: ink }}>
          Latest month
        </Text>
        <Text className="text-[11px] font-extrabold tabular-nums" style={{ color: ink }}>
          {money(data[data.length - 1]?.income ?? 0)} vs {money(data[data[data.length - 1] ? data.length - 1 : 0]?.expenses ?? 0)}
        </Text>
      </View>
    </View>
  );
}
