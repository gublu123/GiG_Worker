export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/** Currency formatter that does not depend on Intl (safe under Hermes). */
export function money(value: number, decimals = 0): string {
  const negative = value < 0;
  const fixed = Math.abs(value).toFixed(decimals);
  const [whole, frac] = fixed.split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const sign = negative ? '-\u0024' : '\u0024';
  return frac ? `${sign}${grouped}.${frac}` : `${sign}${grouped}`;
}

export function pct(ratio: number, decimals = 0): string {
  const value = ratio * 100;
  const sign = value > 0 ? '' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}

export function signedPct(ratio: number, decimals = 0): string {
  const value = ratio * 100;
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function lastSixMonthLabels(now: Date = new Date()): string[] {
  const labels: string[] = [];
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    labels.push(MONTHS[d.getMonth()]);
  }
  return labels;
}

/** Deterministic pseudo-random generator (mulberry32) so charts never flicker. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function timeAgo(ts: number): string {
  const seconds = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
