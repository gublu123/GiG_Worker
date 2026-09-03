import { clamp } from './format';
import type { FinancialInputs, Metrics, MonthPoint } from './types';
import { lastSixMonthLabels, seededRandom } from './format';

export const DEFAULT_INPUTS: FinancialInputs = {
  monthlyIncome: 2600,
  monthlyExpenses: 1850,
  savingsBalance: 1500,
  debtPayments: 320,
  incomeVolatility: 0.45,
};

export const INPUT_BOUNDS = {
  monthlyIncome: { min: 400, max: 8000, step: 50 },
  monthlyExpenses: { min: 200, max: 7000, step: 50 },
  savingsBalance: { min: 0, max: 20000, step: 100 },
  debtPayments: { min: 0, max: 2500, step: 10 },
  incomeVolatility: { min: 0, max: 1, step: 0.01 },
};

export function computeMetrics(inputs: FinancialInputs): Metrics {
  const monthlyIncome = Math.max(1, inputs.monthlyIncome);
  const monthlyExpenses = Math.max(0, inputs.monthlyExpenses);
  const debtPayments = Math.max(0, inputs.debtPayments);
  const savingsBalance = Math.max(0, inputs.savingsBalance);
  const incomeVolatility = clamp(inputs.incomeVolatility, 0, 1);

  const netSurplus = monthlyIncome - monthlyExpenses - debtPayments;
  const savingsRatio = clamp(netSurplus / monthlyIncome, -1, 1);
  const expenseRatio = clamp(monthlyExpenses / monthlyIncome, 0, 3);
  const debtRatio = clamp(debtPayments / monthlyIncome, 0, 1);
  const runwayMonths = monthlyExpenses > 0 ? savingsBalance / monthlyExpenses : 24;
  const bufferTarget = monthlyExpenses * 1;
  const incomeStability = 1 - incomeVolatility;

  return {
    monthlyIncome,
    monthlyExpenses,
    savingsBalance,
    debtPayments,
    incomeVolatility,
    netSurplus,
    savingsRatio,
    expenseRatio,
    debtRatio,
    runwayMonths,
    disposable: netSurplus,
    bufferTarget,
    incomeStability,
  };
}

/** Six-month history of income vs. expenses, derived from the current simulation. */
export function buildTrend(inputs: FinancialInputs, nonce = 0): MonthPoint[] {
  const labels = lastSixMonthLabels();
  const rand = seededRandom(20260903 + nonce * 977);
  return labels.map((label, index) => {
    const drift = 1 + (index - 5) * 0.012;
    const noise = 1 + (rand() - 0.5) * inputs.incomeVolatility * 0.7;
    const income = Math.max(0, inputs.monthlyIncome * drift * noise);
    const expenseNoise = 1 + (rand() - 0.5) * 0.12;
    const expenses = Math.max(0, (inputs.monthlyExpenses + inputs.debtPayments * 0.4) * expenseNoise);
    return { label, income, expenses };
  });
}
