/**
 * AI가 만든 쉬운 글이 정말 '다시 쓴 글'인지 검사합니다.
 * - 원문을 거의 그대로 베꼈는지 (글자 두 개씩 묶어 겹치는 비율)
 * - 수준 기준보다 훨씬 긴 문장이 많은지 (어절 수)
 */
import type { Level } from "./levels";

/** 이 어절 수를 넘으면 '너무 긴 문장'으로 봄 (목표 길이보다 넉넉하게 잡은 한계) */
export const MAX_EOJEOL: Record<Level, number> = {
  elementary: 15,
  middle: 20,
  learner: 14,
};

/** 원문 글자쌍 중 이 비율 이상이 쉬운 글에 그대로 있으면 베낀 것으로 봄 */
export const COPY_LIMIT = 0.6;

function bigrams(text: string): Map<string, number> {
  const chars = text.replace(/[\s.,·()[\]"'「」『』!?~-]/g, "");
  const map = new Map<string, number>();
  for (let i = 0; i < chars.length - 1; i++) {
    const key = chars.slice(i, i + 2);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}

/** 원문 글자쌍이 쉬운 글에 얼마나 남아 있는지 (0~1) */
export function copyRatio(original: string, easy: string): number {
  const a = bigrams(original);
  const b = bigrams(easy);
  let total = 0;
  let shared = 0;
  for (const [key, count] of a) {
    total += count;
    shared += Math.min(count, b.get(key) ?? 0);
  }
  return total === 0 ? 0 : shared / total;
}

export function sentencesOf(text: string): string[] {
  return text
    .split(/(?<=[.!?。])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** 기준보다 긴 문장의 비율 (0~1) */
export function longSentenceShare(easy: string, level: Level): number {
  const sentences = sentencesOf(easy);
  if (sentences.length === 0) return 0;
  const long = sentences.filter((s) => s.split(/\s+/).length > MAX_EOJEOL[level]);
  return long.length / sentences.length;
}

/** 다시 써 달라고 해야 하면 그 이유를, 괜찮으면 null을 돌려줍니다. */
export function rewriteReason(original: string, easy: string, level: Level): string | null {
  const ratio = copyRatio(original, easy);
  if (ratio >= COPY_LIMIT) return `copy ${ratio.toFixed(2)}`;
  const share = longSentenceShare(easy, level);
  if (share > 1 / 3) return `long ${share.toFixed(2)}`;
  return null;
}
