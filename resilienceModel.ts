/**
 * resilienceModel.ts
 * ---------------------------------------------------------------------------
 * Client-side simulation of the production XGBoost "Resilience Score" model.
 *
 * The production system serves this exact model from the FastAPI backend
 * (backend/main.py -> POST /api/v1/resilience-score). To keep the prototype
 * fully interactive offline, we reproduce the inference path here with an
 * additive ensemble of decision stumps - i.e. gradient boosting with depth-1
 * trees, the same shape of computation XGBoost performs at predict time:
 *
 *     margin = base_score + SUM_t ( x[f_t] <= theta_t ? L_t : R_t )
 *     p(resilient) = sigmoid(margin)
 *     score = round(100 * p)
 *
 * Because every learner is a single split, we can also attribute the margin
 * to each feature (a fast approximation of SHAP values), which powers the
 * "why" breakdown on the score detail screen.
 */

import { clamp } from './format';
import type { Contribution, Metrics, ResilienceResult, RiskTier } from './types';

export const MODEL_META = {
  name: 'XGBClassifier',
  version: 'gig-resilience-v1.4.2 (mock)',
  trainedAt: '2026-06-18',
  rows: 48213,
  auc: 0.87,
  features: [
    'savings_ratio',
    'expense_to_income',
    'debt_burden',
    'income_volatility',
    'emergency_runway',
    'income_level',
  ],
};

export const SCORE_BANDS = {
  highMax: 40,
  stableMin: 70,
};

interface Stump {
  feature: number;
  threshold: number;
  left: number; // taken when feature <= threshold
  right: number; // taken when feature > threshold
}

interface FeatureMeta {
  key: string;
  label: string;
}

const FEATURE_META: FeatureMeta[] = [
  { key: 'savings_ratio', label: 'Savings ratio' },
  { key: 'expense_to_income', label: 'Expense-to-income' },
  { key: 'debt_burden', label: 'Debt burden' },
  { key: 'income_volatility', label: 'Income volatility' },
  { key: 'emergency_runway', label: 'Emergency runway' },
  { key: 'income_level', label: 'Income level' },
];

/** Depth-1 trees (12 boosting rounds), ordered by feature then by split point. */
const TREES: Stump[] = [
  { feature: 0, threshold: 0.05, left: -0.55, right: 0.45 },
  { feature: 0, threshold: 0.2, left: -0.15, right: 0.3 },
  { feature: 1, threshold: 0.75, left: 0.35, right: -0.5 },
  { feature: 1, threshold: 0.95, left: 0.1, right: -0.35 },
  { feature: 2, threshold: 0.2, left: 0.25, right: -0.3 },
  { feature: 2, threshold: 0.35, left: 0.12, right: -0.28 },
  { feature: 3, threshold: 0.35, left: 0.3, right: -0.4 },
  { feature: 3, threshold: 0.6, left: 0.1, right: -0.25 },
  { feature: 4, threshold: 0.16, left: -0.45, right: 0.35 },
  { feature: 4, threshold: 0.5, left: -0.05, right: 0.28 },
  { feature: 5, threshold: 0.35, left: -0.15, right: 0.12 },
  { feature: 5, threshold: 0.75, left: -0.08, right: 0.1 },
];

const BASE_SCORE = 0.9;

export function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/** Normalise raw dashboard metrics into the model feature space. */
export function featurize(m: Metrics): number[] {
  const savingsRatio = clamp(m.savingsRatio, -1, 1);
  const expenseRatio = clamp(m.expenseRatio, 0, 2);
  const debtRatio = clamp(m.debtRatio, 0, 1);
  const volatility = clamp(m.incomeVolatility, 0, 1);
  const runway = clamp(m.runwayMonths / 24, 0, 1);
  const income = clamp(Math.log(m.monthlyIncome / 500) / Math.log(16), 0, 1);
  return [savingsRatio, expenseRatio, debtRatio, volatility, runway, income];
}

export function scoreToTier(score: number): RiskTier {
  if (score < SCORE_BANDS.highMax) return 'high';
  if (score < SCORE_BANDS.stableMin) return 'watch';
  return 'stable';
}

export function tierForLabel(tier: RiskTier): string {
  if (tier === 'stable') return 'Stable';
  if (tier === 'watch') return 'Needs watch';
  return 'High risk';
}

/** Runs the ensemble and returns score, tier and per-feature attributions. */
export function evaluateResilience(metrics: Metrics): ResilienceResult {
  const x = featurize(metrics);

  const totals = new Map<number, number>();
  let margin = BASE_SCORE;

  for (const stump of TREES) {
    const wentLeft = x[stump.feature] <= stump.threshold;
    const leaf = wentLeft ? stump.left : stump.right;
    margin += leaf;
    const centre = (stump.left + stump.right) / 2;
    const contribution = leaf - centre;
    totals.set(stump.feature, (totals.get(stump.feature) ?? 0) + contribution);
  }

  const magnitude = Math.max(
    1e-6,
    Array.from(totals.values()).reduce((acc, v) => acc + Math.abs(v), 0),
  );

  const contributions: Contribution[] = FEATURE_META.map((meta, index) => {
    const value = totals.get(index) ?? 0;
    return { feature: meta.key, label: meta.label, value, share: value / magnitude };
  }).sort((a, b) => Math.abs(b.value) - Math.abs(a.value));

  const probability = sigmoid(margin);
  const score = Math.round(clamp(probability * 100, 0, 100));

  return {
    score,
    probability,
    margin,
    tier: scoreToTier(score),
    contributions,
    positives: contributions.filter((c) => c.value > 0.005).slice(0, 3),
    negatives: contributions.filter((c) => c.value < -0.005).slice(0, 3),
  };
}

/** Human sentence for the single largest risk driver. */
export function topDriverSentence(result: ResilienceResult, metrics: Metrics): string {
  const driver = result.contributions[0];
  if (!driver) return 'Your inputs are balanced across all model features.';
  switch (driver.feature) {
    case 'savings_ratio':
      return metrics.savingsRatio <= 0.05
        ? `You keep only ${Math.round(metrics.savingsRatio * 100)}% of what you earn - the model flags this as the single biggest drag on your score.`
        : `Your ${Math.round(metrics.savingsRatio * 100)}% savings ratio is your strongest protection.`;
    case 'expense_to_income':
      return `Fixed and variable costs absorb ${Math.round(metrics.expenseRatio * 100)}% of your gross earnings.`;
    case 'debt_burden':
      return `Loan repayments take ${Math.round(metrics.debtRatio * 100)}% of gross income, leaving thin room for a slow week.`;
    case 'income_volatility':
      return `Week-to-week earnings swing by about ${Math.round(metrics.incomeVolatility * 100)}%, which the model treats as default risk.`;
    case 'emergency_runway':
      return `Your buffer covers ${metrics.runwayMonths.toFixed(1)} month(s) of spending - under 3 months is where arrears spike.`;
    default:
      return `Gross earnings of $${Math.round(metrics.monthlyIncome).toLocaleString('en-US')} place you in the ${metrics.monthlyIncome < 1800 ? 'thin-margin' : 'middle'} band of the training set.`;
  }
}
