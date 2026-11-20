import type { AiOutput } from "./ai-prompt";
import { hasBatchim } from "./easy-markup";
import type { Level } from "./levels";
import { EXTRA_WORDS, SAMPLES, findSample, type GlossaryEntry } from "./samples";

export interface GlossaryItem extends GlossaryEntry {
  /** 원문에서 이 단어가 나온 문장 */
  sentence: string;
}

export interface ConversionResult {
  id: string;
  createdAt: string;
  title: string;
  level: Level;
  original: string;
  summary: string[];
  /** "{쉬운 말|원래 말}" 표기가 들어간 쉬운 글 */
  easyMarkup: string;
  glossary: GlossaryItem[];
  /**
   * sample: 미리 만들어 둔 예시 결과
   * ai: Gemini가 만든 결과
   * custom: AI 연결에 실패해서 사전 단어만 바꾼 결과
   */
  kind: "sample" | "ai" | "custom";
  /** custom일 때 AI를 쓰지 못한 이유 */
  fallbackReason?: "no-key" | "too-many" | "failed";
}

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?。])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function findSentence(original: string, word: string): string {
  const sentence = splitSentences(original).find((s) => s.includes(word)) ?? "";
  return sentence.length > 140 ? `${sentence.slice(0, 137)}…` : sentence;
}

function titleFrom(text: string): string {
  const first =
    text
      .trim()
      .split("\n")
      .map((l) => l.trim())
      .find(Boolean) ?? "제목 없는 글";
  const clean = first.replace(/^[[【(]+|[\]】)]+$/g, "").trim() || "제목 없는 글";
  return clean.length > 30 ? `${clean.slice(0, 30)}…` : clean;
}

function glossaryFor(original: string, entries: GlossaryEntry[]): GlossaryItem[] {
  return entries
    .filter((e) => original.includes(e.word))
    .map((e) => ({ ...e, sentence: findSentence(original, e.word) }))
    .sort((a, b) => original.indexOf(a.word) - original.indexOf(b.word));
}

const PARTICLES: Record<string, [string, string]> = {
  은: ["은", "는"],
  는: ["은", "는"],
  을: ["을", "를"],
  를: ["을", "를"],
  과: ["과", "와"],
  와: ["과", "와"],
};

/** 아무 글이나 넣었을 때: 사전에 있는 어려운 단어만 쉬운 말로 바꾼 가짜 결과 */
function convertCustom(text: string): { easyMarkup: string; glossary: GlossaryItem[] } {
  const dictionary = [...SAMPLES.flatMap((s) => s.glossary), ...EXTRA_WORDS]
    .filter((e, i, all) => all.findIndex((x) => x.word === e.word) === i)
    .sort((a, b) => b.word.length - a.word.length);

  const used = dictionary.filter((e) => text.includes(e.word));
  if (used.length === 0) return { easyMarkup: text.trim(), glossary: [] };

  const escaped = used.map((e) => e.word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(`(${escaped.join("|")})(은|는|을|를|과|와)?`, "g");

  const easyMarkup = text.trim().replace(pattern, (_m, word: string, particle?: string) => {
    const entry = used.find((e) => e.word === word);
    if (!entry) return _m;
    const easy = entry.easy.split(",")[0]?.trim() ?? entry.easy;
    let fixed = "";
    if (particle) {
      const pair = PARTICLES[particle];
      fixed = pair ? (hasBatchim(easy) ? pair[0] : pair[1]) : particle;
    }
    return `{${easy}|${word}}${fixed}`;
  });

  return { easyMarkup, glossary: glossaryFor(text, used) };
}

export function convertText(text: string, level: Level): ConversionResult {
  const base = { id: makeId(), createdAt: new Date().toISOString(), level, original: text.trim() };
  const sample = findSample(text);

  if (sample) {
    const version = sample.levels[level];
    return {
      ...base,
      title: sample.title,
      summary: [...version.summary],
      easyMarkup: version.easy,
      glossary: glossaryFor(sample.original, sample.glossary),
      kind: "sample",
    };
  }

  const { easyMarkup, glossary } = convertCustom(text);
  const summary = splitSentences(text)
    .filter((s) => s.length > 4)
    .slice(0, 3)
    .map((s) => (s.length > 70 ? `${s.slice(0, 68)}…` : s));

  return {
    ...base,
    title: titleFrom(text),
    summary,
    easyMarkup,
    glossary,
    kind: "custom",
  };
}

/** 예시 글이면 미리 만든 결과를 돌려주고, 아니면 null (AI로 바꿔야 함) */
export function convertSample(text: string, level: Level): ConversionResult | null {
  return findSample(text) ? convertText(text, level) : null;
}

/** Gemini 결과를 화면에 쓰는 모양으로 바꿉니다. */
export function buildAiResult(text: string, level: Level, ai: AiOutput): ConversionResult {
  const original = text.trim();
  return {
    id: makeId(),
    createdAt: new Date().toISOString(),
    level,
    original,
    title: titleFrom(text),
    summary: ai.summary,
    easyMarkup: ai.easyMarkup,
    glossary: glossaryFor(original, ai.words),
    kind: "ai",
  };
}

/** AI를 쓰지 못했을 때: 사전 단어만 바꾼 결과 */
export function convertFallback(
  text: string,
  level: Level,
  reason: NonNullable<ConversionResult["fallbackReason"]>,
): ConversionResult {
  return { ...convertText(text, level), fallbackReason: reason };
}

export function glossaryMeaningsFor(original: string, glossary: GlossaryItem[]): GlossaryItem[] {
  return glossary.filter((g) => original.includes(g.word));
}
