/**
 * coach.ts
 * ---------------------------------------------------------------------------
 * AI #3 - the generative layer of the pipeline.
 *
 * Sends the live dashboard features + AI #1 resilience score to Gemini
 * (Google Gen AI SDK) with a system prompt that casts the model as an
 * empathetic financial coach for gig workers.
 *
 * When no Gemini key is configured (or the network call fails/times out) the
 * same input is run through a deterministic on-device coach so the prototype
 * always produces a complete, personalised, actionable answer.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { money } from './format';
import type { Metrics, ResilienceResult } from './types';

export const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];

export const SYSTEM_PROMPT = [
  'You are an empathetic, non-judgemental financial coach for gig workers',
  '(rideshare drivers, couriers, freelancers, task workers) who earn irregular income.',
  'You optimise for one outcome: smoothing income and preventing loan default.',
  'Rules:',
  '- Ground every recommendation in the numbers you are given; quote real dollar amounts.',
  '- Never shame the user. Gig work is volatile through no fault of theirs.',
  '- Prioritise: (1) protect the loan payment first, (2) build a 1-month buffer, (3) reduce costs, (4) smooth volatile weeks.',
  '- Keep it under 220 words.',
  '- Format exactly like this:',
  '  ## The headline\n  one sentence diagnosis\n  ## Your 3 moves\n  • move 1\n  • move 2\n  • move 3\n  ## This week\n  one concrete micro-action with a dollar amount.',
  '- Plain text only, no markdown asterisks, no emoji.',
].join('\n');

export interface CoachParams {
  metrics: Metrics;
  result: ResilienceResult;
  question?: string;
  apiKey?: string;
}

export interface CoachReply {
  text: string;
  source: 'gemini' | 'on-device';
  latencyMs: number;
}

function profilePrompt({ metrics: m, result }: CoachParams): string {
  return [
    'Current gig-worker snapshot (all figures monthly, USD):',
    `- Gross earnings: ${money(m.monthlyIncome)}`,
    `- Living expenses: ${money(m.monthlyExpenses)}`,
    `- Loan / buy-now-pay-later repayments: ${money(m.debtPayments)}`,
    `- Cash savings buffer: ${money(m.savingsBalance)}`,
    `- Earnings volatility (0 = steady salary, 1 = chaotic): ${m.incomeVolatility.toFixed(2)}`,
    `- Net surplus after costs and debt: ${money(m.netSurplus)}`,
    `- Savings ratio: ${(m.savingsRatio * 100).toFixed(1)}%`,
    `- Expense-to-income ratio: ${(m.expenseRatio * 100).toFixed(1)}%`,
    `- Debt-to-income ratio: ${(m.debtRatio * 100).toFixed(1)}%`,
    `- Emergency runway: ${m.runwayMonths.toFixed(1)} months`,
    '',
    `AI #1 resilience score: ${result.score}/100 (band: ${result.tier}).`,
    `Strongest driver: ${result.positives[0]?.label ?? 'none'}; biggest drag: ${result.negatives[0]?.label ?? 'none'}.`,
  ].join('\n');
}

async function callGemini(params: CoachParams, modelName: string): Promise<string> {
  const genAI = new GoogleGenerativeAI(params.apiKey as string);
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: SYSTEM_PROMPT,
  });
  const prompt = params.question
    ? `${profilePrompt(params)}\n\nThe worker asks: "${params.question}"\nAnswer using the format rules.`
    : `${profilePrompt(params)}\n\nWrite the coaching session now, using the format rules.`;
  const response = await model.generateContent(prompt);
  const text = response.response.text();
  if (!text || text.trim().length < 40) throw new Error('Empty coach response');
  return text.trim();
}

export async function fetchCoachReply(params: CoachParams): Promise<CoachReply> {
  const started = Date.now();
  if (params.apiKey && params.apiKey.trim().length > 20) {
    for (const modelName of GEMINI_MODELS) {
      try {
        const race = await Promise.race([
          callGemini(params, modelName),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Gemini timeout')), 15000),
          ),
        ]);
        return { text: race, source: 'gemini', latencyMs: Date.now() - started };
      } catch {
        // try the next model id / fall through to on-device coach
      }
    }
  }
  const text = params.question
    ? answerQuestion(params)
    : buildCoachingSession(params);
  return { text, source: 'on-device', latencyMs: Date.now() - started };
}

/* -------------------------------------------------------------------------- */
/* On-device coach (deterministic, fully personalised from the slider values) */
/* -------------------------------------------------------------------------- */

function bufferPlan(m: Metrics): string {
  const gap = Math.max(0, m.bufferTarget - m.savingsBalance);
  if (gap <= 0) {
    return `Your ${money(m.savingsBalance)} buffer already covers ${m.runwayMonths.toFixed(1)} months. Protect it - do not spend it.`;
  }
  if (m.netSurplus <= 0) {
    const cut = Math.round(Math.min(180, Math.abs(m.netSurplus) + 60));
    return `You need ${money(gap)} more to hit a 1-month buffer, but cash flow is negative. Free up about ${money(cut)}/month first - that alone closes the gap in roughly ${Math.max(1, Math.round(gap / Math.max(1, cut)))} months.`;
  }
  const months = gap / m.netSurplus;
  const weekly = m.netSurplus / 4.33;
  return `You need ${money(gap)} more for a full 1-month buffer. Auto-sweep ${money(weekly)} every week (about ${money(weekly * 7)} per 7 days) and you land there in ${months.toFixed(1)} months.`;
}

function expenseMove(m: Metrics): string {
  const targetRatio = 0.62;
  const targetSpend = m.monthlyIncome * targetRatio;
  const cut = Math.round((m.monthlyExpenses - targetSpend) / 10) * 10;
  if (cut <= 20) {
    return `Your costs are already lean at ${(m.expenseRatio * 100).toFixed(0)}% of earnings - redirect the ${money(Math.max(25, m.netSurplus * 0.3))} you are saving each month into the buffer instead of finding new cuts.`;
  }
  const weekly = cut / 4.33;
  return `Trim ${money(cut)}/month (that is ${money(weekly)}/week) from the two categories you control most - subscriptions, food delivery and fuel top-ups. Cap discretionary spend at ${money(targetSpend)} and keep the rest moving.`;
}

function volatilityMove(m: Metrics): string {
  if (m.incomeVolatility < 0.3) {
    return `Your earnings are unusually steady (volatility ${(m.incomeVolatility * 100).toFixed(0)}%). Lock this in by moving ${money(Math.max(50, m.netSurplus * 0.25))}/month into a separate high-yield account while the cash flow is calm.`;
  }
  const skim = Math.round((m.monthlyIncome * m.incomeVolatility * 0.12) / 5) * 5;
  return `Skim ${money(skim)} from every high-earning week into a holding account and pay yourself a flat ${money(m.monthlyIncome / 4.33)}/week from it. That converts a lumpy ${money(m.monthlyIncome)} month into a salary you can actually budget around.`;
}

function debtMove(m: Metrics): string {
  const reserved = m.debtPayments * 1.08;
  if (m.debtRatio > 0.3) {
    return `Debt takes ${(m.debtRatio * 100).toFixed(0)}% of gross income - this is the top default trigger. Ring-fence ${money(reserved)} the day a payout lands (the repayment plus an 8% cushion for fees), then ask the lender for a rate review or a 1-month payment holiday before you miss anything.`;
  }
  if (m.debtPayments === 0) {
    return `You carry no debt repayments. Avoid buy-now-pay-later at checkout: at your volatility it is the fastest route back into arrears.`;
  }
  return `Debt at ${(m.debtRatio * 100).toFixed(0)}% of income is manageable. Keep ${money(reserved)} reserved before spending, and apply any surplus above 1-month of buffer to the highest-rate balance.`;
}

function tierLine(result: ResilienceResult): string {
  if (result.tier === 'stable') return `At ${result.score}/100 you are in the Stable band - the model gives you roughly a ${(100 - result.probability * 100).toFixed(0)}% implied risk of missing a payment in the next 60 days.`;
  if (result.tier === 'watch') return `At ${result.score}/100 you sit in the Needs-watch band - arrears risk is meaningful but very recoverable within one or two pay cycles.`;
  return `At ${result.score}/100 the model puts you in the High-risk band - the priority today is protecting the loan payment, not optimising.`;
}

export function buildCoachingSession(params: CoachParams): string {
  const { metrics: m, result } = params;
  const driver = result.negatives[0]?.label ?? 'balanced drivers';
  return [
    '## The headline',
    `${tierLine(result)} The model attributes most of the drag to ${driver.toLowerCase()}.`,
    '',
    '## Your 3 moves',
    `• Protect the payment: ${debtMove(m)}`,
    `• Build the buffer: ${bufferPlan(m)}`,
    `• Smooth the swing: ${volatilityMove(m)}`,
    '',
    '## This week',
    `${expenseMove(m)} Start with one transfer today - ${money(Math.max(15, Math.round((m.netSurplus > 0 ? m.netSurplus * 0.2 : 45) / 5) * 5))} into the buffer is enough to change your trajectory.`,
    '',
    `## Coach note`,
    `Gig income is volatile by design, not by failure. Every buffer dollar is a week you stay independent instead of borrowing. Re-run this score after your next payout.`,
  ].join('\n');
}

export function answerQuestion(params: CoachParams): string {
  const q = (params.question ?? '').toLowerCase();
  const { metrics: m, result } = params;

  if (/(loan|borrow|lend|bnpl|buy now|emi|credit)/.test(q)) {
    const eligible = m.debtRatio < 0.35 && result.score >= 45;
    return [
      '## The short answer',
      eligible
        ? `You can likely take on a small loan, but only up to about ${money(Math.max(0, m.monthlyIncome * 0.12 - m.debtPayments))}/month in repayments before it crowds out your living costs.`
        : `Right now a new loan is the highest-risk move available to you - your debt burden is already ${(m.debtRatio * 100).toFixed(0)}% of gross income and your score is ${result.score}/100.`,
      '',
      '## How to check before you sign',
      `• Keep total repayments under 25-30% of gross gig earnings, not including tips.`,
      `• Confirm the lender reports payment history, so on-time payments lift your score.`,
      `• Stress-test it: can you still pay it in your worst month, not your best? At volatility ${(m.incomeVolatility * 100).toFixed(0)}% that worst month is about ${money(m.monthlyIncome * (1 - m.incomeVolatility * 0.4))}.`,
      '',
      '## This week',
      `${bufferPlan(m)}`,
    ].join('\n');
  }

  if (/(buffer|emergency|saving|save|rainy|cushion)/.test(q)) {
    return [
      '## The short answer',
      bufferPlan(m),
      '',
      '## How to get there faster',
      `• Automate the sweep on payout day, not at month end - willpower is the weakest part of any gig budget.`,
      `• Keep the buffer in a separate account you cannot tap from your card.`,
      `• Target one month of essential costs first (${money(m.monthlyExpenses)}), then two.`,
      '',
      '## This week',
      `Move ${money(Math.max(15, Math.round((m.netSurplus > 0 ? m.netSurplus * 0.2 : 45) / 5) * 5))} today and set a repeating transfer for the same amount every week.`,
    ].join('\n');
  }

  if (/(week|smoothen|smooth|uneven|slow|dry|volatile|consistent|lumpy)/.test(q)) {
    return [
      '## The short answer',
      volatilityMove(m),
      '',
      '## The mechanics',
      `• Track a rolling 4-week average (${money(m.monthlyIncome / 4.33)}/week) and refuse to spend above it.`,
      `• Bank the upside weeks; the buffer covers the downside weeks.`,
      `• Stack predictable shifts (commute peaks, weekend surges) to flatten the curve before you touch your spending.`,
      '',
      '## This week',
      `Pick your two highest-earning recurring slots and commit to them for 14 days. Consistency is what the model rewards - your volatility feature alone is worth ${(Math.abs(result.contributions.find((c) => c.feature === 'income_volatility')?.value ?? 0) * 20).toFixed(0)} score points.`,
    ].join('\n');
  }

  if (/(tax|ir35|1099|write.off|deduct)/.test(q)) {
    const setAside = Math.round(m.monthlyIncome * 0.15);
    return [
      '## The short answer',
      `Move ${money(setAside)} (about 15% of gross) into a separate tax account on every payout. Mixing tax money with spending money is the single most common cause of a self-employed default.`,
      '',
      '## The habit',
      `• Percentage-based, not fixed: it scales with a good month and shrinks with a bad one.`,
      `• Log mileage, equipment and platform fees the same day - receipts you find later are receipts you never claim.`,
      `• Never use the tax pot as an emergency fund; that is how a tax bill becomes a default.`,
      '',
      '## This week',
      `Open a second account, name it "tax", and auto-route ${money(setAside)} from your next two payouts.`,
    ].join('\n');
  }

  if (/(equipment|car repair|repair|tyre|tire|maintenance|phone)/.test(q)) {
    const sinking = Math.round((m.monthlyExpenses * 0.06) / 5) * 5;
    return [
      '## The short answer',
      `Treat gear as a monthly cost, not a surprise. Set aside ${money(sinking)}/month (roughly 6% of your spending) into a sinking fund for tyres, brakes, phone screen and servicing.`,
      '',
      '## Why it matters',
      `• An unplanned ${money(400)} repair paid from your buffer drops your runway by ${(400 / Math.max(1, m.monthlyExpenses)).toFixed(1)} months.`,
      `• A funded repair means you never finance it at triple-digit APR.`,
      '',
      '## This week',
      `Start the fund with ${money(Math.max(20, sinking))} and calendar your next service date so the cost lands in a known month.`,
    ].join('\n');
  }

  return [
    '## Where you stand',
    `${tierLine(result)} ${topDriver(params)}`,
    '',
    '## Do these three things',
    `• ${debtMove(m)}`,
    `• ${bufferPlan(m)}`,
    `• ${expenseMove(m)}`,
    '',
    '## This week',
    `${volatilityMove(m)}`,
  ].join('\n');
}

function topDriver(params: CoachParams): string {
  const { result, metrics: m } = params;
  const positive = result.positives[0];
  const negative = result.negatives[0];
  const parts: string[] = [];
  if (positive) parts.push(`Working for you: ${positive.label.toLowerCase()}.`);
  if (negative) parts.push(`Working against you: ${negative.label.toLowerCase()}.`);
  if (!positive && !negative) parts.push(`Your inputs sit mid-range on every feature (surplus ${money(m.netSurplus)}).`);
  return parts.join(' ');
}
