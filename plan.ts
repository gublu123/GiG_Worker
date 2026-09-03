import { money } from './format';
import type { Metrics, ResilienceResult } from './types';

export interface ActionItem {
  id: string;
  title: string;
  detail: string;
  impact: string;
  icon: 'wallet' | 'umbrella' | 'cut' | 'receipt' | 'calendar' | 'call';
  urgent?: boolean;
}

export function buildActionPlan(metrics: Metrics, result: ResilienceResult): ActionItem[] {
  const m = metrics;
  const items: ActionItem[] = [];

  const reserve = m.debtPayments * 1.08;
  if (m.debtPayments > 0) {
    items.push({
      id: 'ringfence-payment',
      title: `Ring-fence ${money(reserve)} on payout day`,
      detail: `Your ${money(m.debtPayments)} repayment is the first claim on every payout. The extra 8% covers platform fees and FX drift so the payment never lands short.`,
      impact: 'Blocks the #1 default trigger',
      icon: 'wallet',
      urgent: m.debtRatio > 0.25 || result.tier === 'high',
    });
  }

  const gap = Math.max(0, m.bufferTarget - m.savingsBalance);
  if (gap > 0) {
    const weekly = m.netSurplus > 0 ? m.netSurplus / 4.33 : 45;
    items.push({
      id: 'auto-sweep',
      title: `Auto-sweep ${money(weekly)} per week`,
      detail: `${money(gap)} more closes a 1-month buffer (${money(m.bufferTarget)}). Automation on payout day beats willpower at month end.`,
      impact: `Buffer: ${m.runwayMonths.toFixed(1)} → ${((m.savingsBalance + weekly * 4.33) / Math.max(1, m.monthlyExpenses)).toFixed(1)} months`,
      icon: 'umbrella',
    });
  } else {
    items.push({
      id: 'protect-buffer',
      title: 'Freeze the buffer',
      detail: `${money(m.savingsBalance)} covers ${m.runwayMonths.toFixed(1)} months. Move it to an account with no card access so a good month does not quietly eat it.`,
      impact: 'Keeps you in the Stable band',
      icon: 'umbrella',
    });
  }

  const targetSpend = m.monthlyIncome * 0.62;
  const cut = Math.round((m.monthlyExpenses - targetSpend) / 10) * 10;
  if (cut > 20) {
    items.push({
      id: 'trim-costs',
      title: `Trim ${money(cut)} of discretionary spend`,
      detail: `Costs absorb ${(m.expenseRatio * 100).toFixed(0)}% of earnings. Two levers cover this: delivery food and fuel top-ups. Cap essentials at ${money(targetSpend)}.`,
      impact: `Savings ratio → ${(((m.monthlyIncome - targetSpend - m.debtPayments) / m.monthlyIncome) * 100).toFixed(0)}%`,
      icon: 'cut',
    });
  }

  items.push({
    id: 'tax-pot',
    title: `Route ${money(Math.round(m.monthlyIncome * 0.15))} to a tax pot`,
    detail: '15% of gross into a separate account on every payout. A tax bill paid from your buffer is the most common way a gig worker slides into arrears.',
    impact: 'Removes a surprise liability',
    icon: 'receipt',
  });

  if (m.incomeVolatility > 0.35) {
    const skim = Math.round((m.monthlyIncome * m.incomeVolatility * 0.12) / 5) * 5;
    items.push({
      id: 'smooth-weeks',
      title: `Skim ${money(skim)} from every high week`,
      detail: `Volatility is ${(m.incomeVolatility * 100).toFixed(0)}% - the model's second-heaviest feature. Pay yourself a flat ${money(m.monthlyIncome / 4.33)}/week from a holding account and budget to that number.`,
      impact: 'Lowers the volatility feature',
      icon: 'calendar',
    });
  }

  if (result.tier === 'high' && m.debtPayments > 0) {
    items.push({
      id: 'lender-call',
      title: 'Call the lender before day 5',
      detail: 'Restructuring or a one-month forbearance arranged before a missed payment almost always survives on file. Missed first, called second is the order that hurts.',
      impact: 'Protects your credit record',
      icon: 'call',
      urgent: true,
    });
  }

  return items;
}

export interface LoanShield {
  amount: number;
  dueInDays: number;
  reserved: number;
  short: number;
}

export function loanShield(metrics: Metrics): LoanShield {
  const amount = metrics.debtPayments;
  const reserved = metrics.savingsBalance > 0 ? Math.min(amount, metrics.savingsBalance) : 0;
  return {
    amount,
    dueInDays: 5,
    reserved,
    short: Math.max(0, amount - reserved),
  };
}
