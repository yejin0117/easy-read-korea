/**
 * 어려운 단어 풀이를 우리말샘 사전 뜻으로 채웁니다 (서버에서만 사용).
 * 1) 단어마다 우리말샘에서 뜻 후보를 찾고
 * 2) Gemini는 원문 문장에 맞는 뜻 '번호'를 고르고, 그 뜻을 수준에 맞게 쉬운 말로만 다시 씁니다.
 * 사전에 없거나 중간에 실패하면 처음 AI가 쓴 풀이를 그대로 둡니다(source: "ai").
 */
import { findSenses, type DictSense } from "./dictionary";
import { levelLabel, type Level } from "./levels";
import type { GlossaryEntry } from "./samples";

type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;

interface Candidate {
  entry: GlossaryEntry;
  senses: DictSense[];
  sentence: string;
}

export const PICK_SCHEMA = {
  type: "OBJECT",
  properties: {
    items: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          word: { type: "STRING" },
          sense: { type: "INTEGER" },
          meaning: { type: "STRING" },
        },
        required: ["word", "sense", "meaning"],
      },
    },
  },
  required: ["items"],
} as const;

export function buildPickPrompt(level: Level): string {
  return `너는 국어사전 뜻풀이를 고르고 쉬운 말로 다듬는 도우미야.
읽는 사람: ${levelLabel(level)}

각 단어마다:
1. 원문 문장에서 쓰인 뜻과 맞는 사전 뜻의 번호(sense)를 하나 골라. 맞는 뜻이 없으면 0으로 해.
2. 고른 뜻을 읽는 사람 수준에 맞는 쉬운 해요체 한 문장(meaning)으로 다시 써.
   - 고른 사전 뜻에 없는 내용, 예시, 조언을 덧붙이지 마.
   - 뜻이 달라지지 않게 해. 법이나 제도의 말은 다른 제도의 말로 바꾸지 마. (예: 과태료를 '벌금'이라고 하지 않기)
   - sense가 0이면 meaning은 빈 글자로 둬.`;
}

export function buildPickInput(candidates: Candidate[]): string {
  return candidates
    .map((c, i) => {
      const senses = c.senses.map((s, j) => `  ${j + 1}) ${s.definition}`).join("\n");
      return `[${i + 1}] 단어: ${c.entry.word}\n원문 문장: ${c.sentence}\n사전 뜻:\n${senses}`;
    })
    .join("\n\n");
}

interface Pick {
  word: string;
  sense: number;
  meaning: string;
}

export function parsePicks(raw: string): Pick[] {
  try {
    const data = JSON.parse(raw.trim().replace(/^```(?:json)?\s*|\s*```$/g, "")) as {
      items?: unknown;
    };
    if (!Array.isArray(data?.items)) return [];
    return data.items
      .map((it) => it as { word?: unknown; sense?: unknown; meaning?: unknown })
      .filter((it) => typeof it.word === "string")
      .map((it) => ({
        word: (it.word as string).trim(),
        sense: typeof it.sense === "number" ? Math.trunc(it.sense) : Number(it.sense) || 0,
        meaning: typeof it.meaning === "string" ? it.meaning.trim() : "",
      }));
  } catch {
    return [];
  }
}

async function askPicks(
  candidates: Candidate[],
  level: Level,
  apiKey: string,
  models: string[],
  fetcher: Fetcher,
): Promise<Pick[] | null> {
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: buildPickPrompt(level) }] },
    contents: [{ role: "user", parts: [{ text: buildPickInput(candidates) }] }],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: "application/json",
      responseSchema: PICK_SCHEMA,
    },
  });
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
      const text = payload.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
      const picks = parsePicks(text);
      if (picks.length > 0) return picks;
    } catch (error) {
      console.error(`Gemini sense pick failed (${model})`, error);
    }
  }
  return null;
}

/** 원문에서 단어가 들어 있는 문장을 찾습니다. */
function sentenceOf(original: string, word: string): string {
  const parts = original.split(/(?<=[.!?。])\s+|\n+/);
  return parts.find((p) => p.includes(word))?.trim() ?? word;
}

/** 사전 결과와 Gemini의 선택을 합쳐 최종 단어 풀이를 만듭니다. */
export function mergeMeanings(candidates: Candidate[], picks: Pick[] | null): GlossaryEntry[] {
  return candidates.map(({ entry, senses }) => {
    const ai: GlossaryEntry = { ...entry, source: "ai" };
    if (senses.length === 0) return ai;

    const pick = picks?.find((p) => p.word === entry.word);
    if (pick) {
      const chosen = senses[pick.sense - 1];
      if (!chosen) return ai; // 0이거나 없는 번호 → 사전에 맞는 뜻이 없음
      return {
        ...entry,
        meaning: pick.meaning || chosen.definition,
        dictDefinition: chosen.definition,
        source: "dict",
      };
    }
    // 고르기 단계가 실패했어도 뜻이 하나뿐이면 그 뜻을 그대로 씀
    const only = senses.length === 1 ? senses[0] : undefined;
    if (only) {
      return {
        ...entry,
        meaning: only.definition,
        dictDefinition: only.definition,
        source: "dict",
      };
    }
    return ai;
  });
}

export async function addDictionaryMeanings(options: {
  words: GlossaryEntry[];
  original: string;
  level: Level;
  opendictKey: string;
  geminiKey: string;
  models: string[];
  fetcher?: Fetcher;
}): Promise<GlossaryEntry[]> {
  const { words, original, level, opendictKey, geminiKey, models, fetcher = fetch } = options;
  if (words.length === 0) return words;

  const candidates: Candidate[] = await Promise.all(
    words.map(async (entry) => ({
      entry,
      senses: await findSenses(entry.word, entry.base, opendictKey, fetcher),
      sentence: sentenceOf(original, entry.word),
    })),
  );

  const found = candidates.filter((c) => c.senses.length > 0);
  const picks = found.length > 0 ? await askPicks(found, level, geminiKey, models, fetcher) : null;
  return mergeMeanings(candidates, picks);
}
