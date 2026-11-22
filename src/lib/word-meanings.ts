/**
 * 어려운 단어 풀이에 우리말샘 사전 뜻을 붙입니다 (서버에서만 사용).
 * 1) 단어(여러 단어로 된 표현이면 단어마다)를 우리말샘에서 찾고
 * 2) Gemini는 원문 문장에 맞는 사전 뜻의 '번호'만 고릅니다. 뜻을 다시 쓰지 않습니다.
 * 화면에는 쉬운 말과 사전 뜻 원문을 그대로 보여 줍니다.
 * 사전에 없거나 중간에 실패하면 처음 AI가 쓴 풀이를 그대로 둡니다(source: "ai").
 */
import { findSenses, type DictSense } from "./dictionary";
import type { DictMeaning, GlossaryEntry } from "./samples";

type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;

/** 사전에서 따로 찾을 한 단어 */
export interface Part {
  /** "단어번호-부분번호" (뜻 고르기 응답과 맞출 때 씀) */
  id: string;
  /** 사전에서 찾은 기본형 */
  headword: string;
  senses: DictSense[];
}

export interface Candidate {
  entry: GlossaryEntry;
  parts: Part[];
  sentence: string;
}

export const PICK_SCHEMA = {
  type: "OBJECT",
  properties: {
    items: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: { id: { type: "STRING" }, sense: { type: "INTEGER" } },
        required: ["id", "sense"],
      },
    },
  },
  required: ["items"],
} as const;

export const PICK_PROMPT = `너는 국어사전에서 알맞은 뜻을 고르는 도우미야.
각 항목마다 원문 문장에서 그 단어가 쓰인 뜻과 맞는 사전 뜻의 번호(sense)를 하나만 골라.
뜻을 새로 쓰지 말고 번호만 답해. 맞는 뜻이 없으면 0으로 해.
예: '사유'가 "부득이한 사유가 있는 경우"에 쓰였으면 '일의 까닭'이라는 뜻을 골라.`;

/** AI가 준 기본형("부득이하다, 사유")을 단어별로 나눕니다. 없으면 원문 글자를 씁니다. */
export function splitBase(word: string, base?: string): string[] {
  const parts = (base ?? "")
    .split(/[,，、/]/)
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : [word];
}

export function buildPickInput(candidates: Candidate[]): string {
  return candidates
    .flatMap((c) =>
      c.parts
        .filter((p) => p.senses.length > 1)
        .map((p) => {
          const senses = p.senses.map((s, j) => `  ${j + 1}) ${s.definition}`).join("\n");
          return `[${p.id}] 단어: ${p.headword}\n원문 문장: ${c.sentence}\n사전 뜻:\n${senses}`;
        }),
    )
    .join("\n\n");
}

/** 뜻 고르기 응답을 { id: 번호 }로 읽습니다. */
export function parsePicks(raw: string): Map<string, number> {
  const picks = new Map<string, number>();
  try {
    const data = JSON.parse(raw.trim().replace(/^```(?:json)?\s*|\s*```$/g, "")) as {
      items?: unknown;
    };
    if (!Array.isArray(data?.items)) return picks;
    for (const it of data.items as { id?: unknown; sense?: unknown }[]) {
      if (typeof it?.id !== "string") continue;
      const n = typeof it.sense === "number" ? it.sense : Number(it.sense);
      if (Number.isFinite(n)) picks.set(it.id.trim(), Math.trunc(n));
    }
  } catch {
    // 읽지 못하면 빈 결과 → 뜻이 하나뿐인 단어만 사전 뜻을 씀
  }
  return picks;
}

async function askPicks(
  input: string,
  apiKeys: string[],
  models: string[],
  fetcher: Fetcher,
): Promise<Map<string, number>> {
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: PICK_PROMPT }] },
    contents: [{ role: "user", parts: [{ text: input }] }],
    generationConfig: {
      temperature: 0,
      responseMimeType: "application/json",
      responseSchema: PICK_SCHEMA,
    },
  });
  for (const apiKey of apiKeys) {
    for (const model of models) {
      try {
        const res = await fetcher(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
          {
            method: "POST",
            headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
            signal: AbortSignal.timeout(15_000),
            body,
          },
        );
        if (!res.ok) {
          console.error(`Gemini sense pick error ${res.status} (${model})`);
          continue;
        }
        const payload = (await res.json()) as {
          candidates?: { content?: { parts?: { text?: string }[] } }[];
        };
        const text =
          payload.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
        const picks = parsePicks(text);
        if (picks.size > 0) return picks;
      } catch (error) {
        console.error(`Gemini sense pick failed (${model})`, error);
      }
    }
  }
  return new Map();
}

/** 원문에서 단어가 들어 있는 문장을 찾습니다. */
function sentenceOf(original: string, word: string): string {
  const parts = original.split(/(?<=[.!?。])\s+|\n+/);
  return parts.find((p) => p.includes(word))?.trim() ?? word;
}

/** 한 단어의 사전 뜻을 정합니다. 뜻이 하나면 그것, 여럿이면 고른 번호. 못 정하면 null */
function resolvePart(part: Part, picks: Map<string, number>): DictMeaning | null {
  const only = part.senses.length === 1 ? part.senses[0] : undefined;
  const chosen = only ?? part.senses[(picks.get(part.id) ?? 0) - 1];
  return chosen ? { headword: part.headword, definition: chosen.definition } : null;
}

/**
 * 사전 결과와 Gemini의 선택을 합쳐 최종 단어 풀이를 만듭니다.
 * 표현을 이루는 모든 단어의 뜻을 정했을 때만 사전 뜻을 쓰고, 아니면 AI 풀이를 둡니다.
 */
export function mergeMeanings(
  candidates: Candidate[],
  picks: Map<string, number>,
): GlossaryEntry[] {
  return candidates.map(({ entry, parts }) => {
    const resolved = parts.map((p) => resolvePart(p, picks));
    if (resolved.length === 0 || resolved.some((r) => r === null)) {
      return { ...entry, source: "ai" };
    }
    const dictMeanings = resolved as DictMeaning[];
    const meaning =
      dictMeanings.length === 1
        ? (dictMeanings[0]?.definition ?? entry.meaning)
        : dictMeanings.map((d) => `${d.headword}: ${d.definition}`).join(" / ");
    return { ...entry, meaning, dictMeanings, source: "dict" };
  });
}

export async function addDictionaryMeanings(options: {
  words: GlossaryEntry[];
  original: string;
  opendictKey: string;
  /** 앞에서부터 차례로 시도할 Gemini 키 */
  geminiKeys: string[];
  models: string[];
  fetcher?: Fetcher;
}): Promise<GlossaryEntry[]> {
  const { words, original, opendictKey, geminiKeys, models, fetcher = fetch } = options;
  if (words.length === 0) return words;

  const candidates: Candidate[] = await Promise.all(
    words.map(async (entry, i) => {
      const heads = splitBase(entry.word, entry.base);
      const single = heads.length === 1;
      const parts = await Promise.all(
        heads.map(async (headword, j) => ({
          id: `${i + 1}-${j + 1}`,
          headword,
          // 한 단어일 때만 원문 글자로도 다시 찾아봄
          senses: await findSenses(single ? entry.word : headword, headword, opendictKey, fetcher),
        })),
      );
      return { entry, parts, sentence: sentenceOf(original, entry.word) };
    }),
  );

  // 뜻이 여러 개인 단어가 있을 때만 Gemini에게 번호를 고르게 함
  const input = buildPickInput(candidates);
  const picks = input ? await askPicks(input, geminiKeys, models, fetcher) : new Map();
  return mergeMeanings(candidates, picks);
}
