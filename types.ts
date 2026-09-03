export interface FinancialInputs {
  monthlyIncome: number;
  monthlyExpenses: number;
  savingsBalance: number;
  debtPayments: number;
  /** 0 (rock steady) .. 1 (wildly unpredictable) */
  incomeVolatility: number;
}

export interface Metrics {
  monthlyIncome: number;
  monthlyExpenses: number;
  savingsBalance: number;
  debtPayments: number;
  incomeVolatility: number;
  netSurplus: number;
  savingsRatio: number;
  expenseRatio: number;
  debtRatio: number;
  runwayMonths: number;
  disposable: number;
  bufferTarget: number;
  incomeStability: number;
}

export type RiskTier = 'high' | 'watch' | 'stable';

export interface Contribution {
  feature: string;
  label: string;
  value: number;
  share: number;
}

export interface ResilienceResult {
  score: number;
  probability: number;
  margin: number;
  tier: RiskTier;
  contributions: Contribution[];
  positives: Contribution[];
  negatives: Contribution[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'coach';
  text: string;
  at: number;
  source?: 'gemini' | 'on-device';
  pending?: boolean;
}

export interface MonthPoint {
  label: string;
  income: number;
  expenses: number;
}
