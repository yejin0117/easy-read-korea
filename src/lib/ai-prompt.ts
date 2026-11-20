/**
 * Gemini로 쉬운 글을 만들 때 쓰는 지시문과 응답 정리 함수.
 * 서버와 테스트에서 함께 쓰도록 브라우저·서버 어디서나 돌아가는 순수 함수만 둡니다.
 */
import type { GlossaryEntry } from "./samples";
import type { Level } from "./levels";

const LEVEL_RULES: Record<Level, string> = {
  elementary:
    "[초등학생] 한 문장은 20자 안팎으로 짧게 써. 한자어와 법률 용어는 초등학생이 아는 쉬운 우리말로 바꿔. 필요하면 짧은 예를 하나 들어도 돼.",
  middle:
    "[중학생] 한 문장은 40자 안팎으로 써. 꼭 알아야 하는 전문 용어는 남기고 바로 뒤 괄호 안에 쉬운 설명을 붙여.",
  learner:
    "[한국어 학습자] 한국어를 배우는 외국인이 읽는다고 생각해. 기초 어휘만 쓰고, 문장 끝은 모두 '-요'체로 통일해. 한 문장에는 한 가지 내용만 쓰고, 관용 표현과 줄임말은 쓰지 마.",
};

export function buildSystemPrompt(level: Level): string {
  return [
    "너는 어려운 한국어 글(공문, 계약서, 약 설명서 등)을 읽는 사람 수준에 맞는 쉬운 글로 바꾸는 전문가야.",
    "",
    "[반드시 지킬 규칙]",
    "- 숫자, 날짜, 기간, 금액, 횟수, 퍼센트, 법 조항 번호, 고유명사, 웹 주소는 원문 표기 그대로 써. 숫자를 한글로 풀어 쓰거나 단위를 바꾸지 마. (예: '14일'을 '2주'로 바꾸지 않기)",
    "- 원문에 없는 내용은 덧붙이지 마. 원문의 중요한 내용은 빠뜨리지 마.",
    "- 뜻이 바뀌지 않게 해. 의무(~해야 해요), 금지(~하면 안 돼요), 가능(~할 수 있어요)을 정확히 구분해.",
    "",
    "[읽는 사람 수준]",
    LEVEL_RULES[level],
    "",
    "[출력 형식] 아래 JSON 하나만 출력해.",
    "- summary: 꼭 알아야 할 내용을 쉬운 말로 정확히 3문장.",
    "- easy_markup: 쉬운 말로 다시 쓴 전체 글. 어려운 말을 쉬운 말로 바꾼 곳은 {쉬운 말|원래 말} 형식으로 표시해. 예: '이사한 날부터 14일 안에 {신고해야|신고하여야} 해요.' 이 표시 말고는 중괄호 { } 와 세로선 | 을 쓰지 마. 문단 사이는 빈 줄로 나눠.",
    "- words: 원문에 실제로 나오는 어려운 단어 목록(최대 12개). word는 원문에 나온 그대로, easy는 바꾼 쉬운 말, meaning은 읽는 사람 수준에 맞는 한 문장 뜻풀이.",
  ].join("\n");
}

/** Gemini의 JSON 응답 모양 (responseSchema) */
export const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    summary: { type: "ARRAY", items: { type: "STRING" } },
    easy_markup: { type: "STRING" },
    words: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          word: { type: "STRING" },
          easy: { type: "STRING" },
          meaning: { type: "STRING" },
        },
        required: ["word", "easy", "meaning"],
      },
    },
  },
  required: ["summary", "easy_markup", "words"],
} as const;

export interface AiOutput {
  summary: string[];
  easyMarkup: string;
  words: GlossaryEntry[];
}

const CHANGED = /\{([^|{}]+)\|([^{}]+)\}/g;

/** {쉬운|원래} 표시는 남기고, 짝이 맞지 않는 중괄호·세로선은 지웁니다. */
export function cleanMarkup(markup: string): string {
  const kept: string[] = [];
  const masked = markup.replace(CHANGED, (_m, easy: string, original: string) => {
    kept.push(`{${easy.trim()}|${original.trim()}}`);
    return `\uE000${kept.length - 1}\uE000`;
  });
  const cleaned = masked.replace(/[{}|]/g, "");
  return cleaned.replace(/\uE000(\d+)\uE000/g, (_m, i: string) => kept[Number(i)] ?? "").trim();
}

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Gemini가 돌려준 JSON 글자를 검사해 정리합니다.
 * 모양이 틀리면 null을 돌려줘서 다시 요청하게 합니다.
 */
export function parseAiOutput(raw: string, original: string): AiOutput | null {
  let data: unknown;
  try {
    const trimmed = raw.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
    data = JSON.parse(trimmed);
  } catch {
    return null;
  }
  if (!data || typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;

  const easyMarkup = cleanMarkup(asText(obj["easy_markup"]));
  if (easyMarkup.length === 0) return null;

  const summary = (Array.isArray(obj["summary"]) ? obj["summary"] : [])
    .map(asText)
    .filter(Boolean)
    .slice(0, 3);

  const seen = new Set<string>();
  const words = (Array.isArray(obj["words"]) ? obj["words"] : [])
    .map((w): GlossaryEntry | null => {
      if (!w || typeof w !== "object") return null;
      const item = w as Record<string, unknown>;
      const entry = {
        word: asText(item["word"]),
        easy: asText(item["easy"]),
        meaning: asText(item["meaning"]),
      };
      return entry.word && entry.easy && entry.meaning ? entry : null;
    })
    .filter((w): w is GlossaryEntry => w !== null)
    // 원문에 실제로 없는 단어는 버림 (AI가 지어낸 단어 막기)
    .filter((w) => original.includes(w.word))
    .filter((w) => (seen.has(w.word) ? false : (seen.add(w.word), true)))
    .slice(0, 12);

  return { summary, easyMarkup, words };
}
