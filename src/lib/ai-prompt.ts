/**
 * Gemini로 쉬운 글을 만들 때 쓰는 지시문과 응답 정리 함수.
 * 서버와 테스트에서 함께 쓰도록 브라우저·서버 어디서나 돌아가는 순수 함수만 둡니다.
 *
 * 수준별 기준 근거
 * - 문장 길이: 국어 교과서의 문장당 평균 단어 수
 *   (Choi 외, 2024, 교육과정평가연구 27(1): 초등 중학년급 8.65, 중학교급 12.98)
 *   초등학생은 중학년 평균을 넘지 않게(8어절 이하), 중학생은 중학교급 평균을 넘지 않게(12어절 안팎)
 * - 한국어 입문자 어휘: 국립국어원 한국어 학습용 어휘 초급(A등급)
 * - 한 문장에 한 가지 내용: 미국 정부 Plain Language 지침
 */
import type { GlossaryEntry } from "./samples";
import type { Level } from "./levels";

const COMMON_RULES = `너는 어려운 한국어 글(공문, 계약서, 약 설명서 등)을 읽는 사람의 수준에 맞게 쉬운 글로 다시 쓰는 도우미야.

[가장 중요한 원칙]
- 단어만 바꿔 끼우지 마. 원문의 뜻을 먼저 이해한 뒤, 문장을 처음부터 새로 써.
- 원문의 문장 구조와 순서를 따라가지 않아도 돼. 읽는 사람이 이해하기 쉬운 순서로 써.
- 원문의 공문서 말투(~함, ~하여야 함, ~에 처함, ~할 것)를 남기지 마. 모든 문장은 해요체로 써.
- 긴 문장은 여러 문장으로 나눠. 한 문장에는 한 가지 내용만 넣어.
- 쉬운 글에는 원문에 있는 내용만 써. 어려운 말은 쉬운 말로 바꾸기만 하고, 뜻을 설명하는 문장이나 괄호 설명은 쓰지 마. 어려운 말의 뜻은 words에서만 설명해.

[반드시 지킬 것]
- 숫자, 금액, 날짜, 기간, 비율, 횟수는 원문과 똑같이 써. 단위를 바꾸거나 계산하지 마. 숫자를 글자로 바꾸지도 마. (예: '14일'을 '2주'로, '1회'를 '한 번'으로 바꾸지 않기)
- 기관 이름, 법 이름, 제품 이름, 웹 주소는 그대로 써.
- '이상, 이하, 까지, 할 수 있다, 해야 한다, 하면 안 된다'의 뜻이 바뀌지 않게 해.
  예: "벌금에 처해질 수 있음"을 "벌금을 내요"로 바꾸면 안 돼. "벌금을 낼 수 있어요"로 써.
- 원문에 없는 사실, 숫자, 조언, 예시, 인사말을 지어내지 마. (예: '공용 공간'을 '계단이나 복도처럼 함께 쓰는 곳'으로 쓰지 않기)
- 법이나 제도에서 뜻이 정해진 말은 뜻이 다른 말로 바꾸지 마. 원문 말보다 뜻이 좁거나 넓은 말로도 바꾸지 마. 딱 맞는 쉬운 말이 없으면 원래 말을 그대로 두고 words에서 설명해. (예: 과태료 → 벌금 X, 공동주택 → 아파트 X)
- 원문 문장의 종류를 바꾸지 마. 설명은 설명으로, 질문은 질문으로, 부탁이나 지시는 부탁·지시로 써. 원문에 없는 질문이나 말 걸기("~했어요?", "~해 볼까요?")를 새로 만들지 마.
- 조건(~한 경우, ~하지 않은 경우, ~하면)을 나눠 쓸 때 조건이 사라지지 않게 해. 예: "신고하지 아니한 경우 과태료가 부과될 수 있음" → "신고하지 않으면 과태료를 낼 수 있어요" O, "신고하지 않을 수 있어요" X / "흡연하다 적발될 경우" → "담배를 피우다 걸리면" O, "담배를 피우다 걸릴 수 있어요" X
- 원문의 내용을 하나도 빠뜨리지 마.
- 누가 하는지(주체)를 바꾸지 마. 원문에서 서로 다른 사람·기관이면 쉬운 글에서도 구분해. (예: '관리사무소'와 '관리주체'를 하나로 합치지 않기)
- '예정, 할 수 있다, 해야 한다, 하지 않는다' 같은 말은 빼지 마. (예: "시행될 예정임" → "할 예정이에요")
- 부탁과 의무를 구분해. "~하시기 바람, ~주시기 바랍니다"는 부탁이니 "~해 주세요"로, "~하여야 함"은 의무이니 "~해야 해요"로 써.
- 입주자, 근로자처럼 사람을 가리키는 말은 지금 그런 사람이라는 뜻을 지켜. (예: 입주자 → 사는 사람 O, 살 사람 X)
- 1,200처럼 쉼표가 있는 숫자는 쉼표까지 원문 표기 그대로 써.

[답하기 전에 스스로 확인할 것]
1. 원문의 숫자가 모두 들어 있는가?
2. 원문 문장을 거의 그대로 옮긴 곳이 있는가? 있으면 다시 써.
3. 아래 수준별 문장 길이와 어휘 규칙을 지켰는가?
4. 쉬운 글에 원문에 없는 내용(설명 문장, 질문, 예시)이 들어가 있는가? 있으면 지워.
5. 조건이 있던 문장이 조건 없이 끝나지 않았는가?`;

/** 수준별 예시에 쓰는 가상의 원문 (실제로 바꿀 글과 겹치지 않게 다른 주제) */
const EXAMPLE_ORIGINAL =
  "본 도서관 자료의 대출 기간은 14일이며, 반납 예정일을 경과한 경우 연체 일수만큼 대출이 정지됨. 자료 훼손 또는 분실 시에는 동일 자료로 변상하여야 함.";

const LEVEL_RULES: Record<Level, { rules: string; example: string }> = {
  elementary: {
    rules: `[읽는 사람: 초등학생 (3~4학년)]
- 한 문장은 8어절 이하로 써. 그보다 길면 꼭 두 문장으로 나눠. 요약 문장도 똑같아.
- 초등학생이 집이나 학교에서 쓰는 말만 써. 한자어와 법률 용어는 모두 쉬운 우리말로 바꿔.
  예: 보호자 → 부모님 같은 어른, 제출하다 → 내다, 책임지지 않다 → 물어 주지 않다, 거주자 → 사는 사람
- 이내, 관할, 과태료, 기한처럼 초등학생이 모를 만한 말도 쉬운 말로 바꿔. 쉬운 말로 바꿀 수 없는 이름(기관 이름 등)은 그대로 둬.
- 누가 하는지(회사, 학생, 부모님 등) 늘 밝혀.`,
    example:
      "도서관 책은 14일 동안 빌릴 수 있어요. 돌려주기로 한 날이 지나면, 늦은 날만큼 책을 빌릴 수 없어요. 책을 망가뜨리거나 잃어버리면, 똑같은 책으로 갚아야 해요.",
  },
  middle: {
    rules: `[읽는 사람: 중학생]
- 한 문장은 12어절 안팎으로 써. 그보다 길면 나눠.
- 교과서에 나올 만한 말은 써도 돼. 법률 용어와 어려운 한자어는 쉬운 말로 바꿔.
- 앞으로도 알아 두면 좋은 용어는 바꾸지 않고 그대로 남겨. 뜻 설명은 쓰지 마(words에서 설명돼).
- '~고', '~면' 정도의 연결은 괜찮아.`,
    example:
      "이 도서관에서는 책을 14일 동안 빌릴 수 있어요. 반납일이 지나면 늦은 날 수만큼 대출이 정지돼요. 책을 망가뜨리거나 잃어버리면 같은 책으로 갚아야 해요.",
  },
  learner: {
    rules: `[읽는 사람: 한국어를 배우기 시작한 어른]
- 내용을 어린이처럼 줄이지 마. 어른에게 필요한 정보는 모두 전해.
- 기초 어휘(국립국어원 한국어 학습용 어휘 초급 수준)로 써.
- 한 문장에 한 가지 내용만 넣고 짧게(6~8어절) 써.
- 주어를 생략하지 마. 조사를 정확히 써.
- '~며', '~는데', '~되다(피동)', 관용 표현, 줄임말, 비유를 쓰지 마.
- 생활에서 계속 보게 될 용어는 없애지 말고 그대로 남겨. 뜻 설명은 쓰지 마(words에서 설명돼).`,
    example:
      "이 도서관에서 책을 빌릴 수 있어요. 빌리는 기간은 14일이에요. 책을 늦게 돌려주면, 늦은 날만큼 대출 정지가 돼요. 책이 망가지거나 책을 잃어버리면, 같은 책을 사서 줘야 해요.",
  },
};

const OUTPUT_RULES = `[답변 형식] 아래 JSON 하나만 출력해.
- summary: 핵심 내용을 해요체 문장 3개로 써. 문장 길이는 쉬운 글과 같은 수준 기준을 지키고, 쉬운 글보다 어렵게 쓰지 마. 원문의 어려운 낱말을 요약에 그대로 쓰지 마. 마침표로 끝내고, 번호·기호·괄호 표시는 넣지 마.
- easy_text: 쉬운 글 전체. 문단은 빈 줄로 나눠. 중괄호 { } 와 세로선 | 은 쓰지 마.
- changes: 원문의 어려운 낱말이 쉬운 글에서 무엇으로 바뀌었는지 최대 10개.
  original은 원문에 나온 1~3어절의 짧은 표현, easy는 easy_text에 나온 짧은 표현을 글자 그대로 써.
  문장이나 절 전체를 넣지 마. 글자가 같거나 조사·어미만 달라진 것은 넣지 마.
- words: 원문에 실제로 있는 어려운 단어 최대 8개. 쉬운 글에서 다른 말로 바꾼 원문 단어는 가능한 한 모두 넣고, 쉬운 글에 남겨 둔 용어와 기관 이름도 넣어.
  base는 그 단어를 국어사전에서 찾을 때 쓰는 기본형이야. (예: 적발될 → 적발, 부과될 → 부과, 자제하여 → 자제하다)
  easy에도 위의 규칙을 지켜. 법이나 제도의 말을 뜻이 다른 말로 바꾸지 마. (예: 과태료의 easy를 '벌금'으로 쓰지 않기) word는 원문 글자 그대로,
  easy는 쉬운 말, meaning은 읽는 사람 수준에 맞는 한 문장 뜻풀이.`;

export function buildSystemPrompt(level: Level): string {
  const { rules, example } = LEVEL_RULES[level];
  return [
    COMMON_RULES,
    "",
    rules,
    "",
    "[예시] 아래는 다른 글로 만든 예시야. 말투와 문장 길이만 참고하고, 내용은 따라 하지 마.",
    `원문: ${EXAMPLE_ORIGINAL}`,
    `쉬운 글: ${example}`,
    "",
    OUTPUT_RULES,
  ].join("\n");
}

/** 처음 결과가 원문을 너무 많이 베꼈거나 문장이 길 때 덧붙이는 지시 */
export const REWRITE_HINT =
  "\n\n[다시 쓰기] 방금 결과는 원문 문장을 거의 그대로 옮겼거나, 쉬운 글이나 요약의 문장이 너무 길었어. 원문 문장을 따라 쓰지 말고, 뜻만 가져와서 수준 기준에 맞는 짧은 문장으로 처음부터 새로 써. 요약도 짧게 써. 숫자는 그대로 둬.";

/** Gemini의 JSON 응답 모양 (responseSchema) */
export const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    summary: { type: "ARRAY", items: { type: "STRING" } },
    easy_text: { type: "STRING" },
    changes: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: { original: { type: "STRING" }, easy: { type: "STRING" } },
        required: ["original", "easy"],
      },
    },
    words: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          word: { type: "STRING" },
          base: { type: "STRING" },
          easy: { type: "STRING" },
          meaning: { type: "STRING" },
        },
        required: ["word", "easy", "meaning"],
      },
    },
  },
  required: ["summary", "easy_text", "changes", "words"],
} as const;

export interface AiOutput {
  summary: string[];
  /** "{쉬운 말|원래 말}" 표시가 들어간 쉬운 글 (화면 형광펜용) */
  easyMarkup: string;
  words: GlossaryEntry[];
}

/** 형광펜이 문장 절반을 덮지 않게, 짧은 표현만 표시 */
export const MAX_CHANGE_EOJEOL = { original: 3, easy: 4 } as const;

const eojeols = (text: string) => text.split(/\s+/).filter(Boolean).length;

export interface Change {
  original: string;
  easy: string;
}

const CHANGED = /\{([^|{}]+)\|([^{}]+)\}/g;

/** {쉬운|원래} 표시는 쉬운 말만 남기고, 남은 중괄호·세로선은 지웁니다. */
export function toPlain(text: string): string {
  return text
    .replace(CHANGED, (_m, easy: string) => easy.trim())
    .replace(/[{}|]/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

/** 요약 문장 앞의 "1.", "1)", "①", "-" 같은 번호·기호를 지웁니다. */
export function cleanSummaryLine(line: string): string {
  const text = toPlain(line)
    .replace(/^\s*(?:\d+\s*[.)．:]|[①-⑩]|[-*•·])\s*/, "")
    .trim();
  return text && !/[.!?。]$/.test(text) ? `${text}.` : text;
}

/**
 * 쉬운 글 안에서 바뀐 말을 찾아 {쉬운|원래} 표시를 붙입니다.
 * 원문에 없는 말, 쉬운 글에 없는 말, 같은 말끼리의 짝은 버립니다.
 */
export function applyChanges(easyText: string, changes: Change[], original: string): string {
  const usable = changes
    .map((c) => ({ original: toPlain(c.original), easy: toPlain(c.easy) }))
    .filter(
      (c) =>
        c.original.length > 0 &&
        c.easy.length > 0 &&
        c.original !== c.easy &&
        eojeols(c.original) <= MAX_CHANGE_EOJEOL.original &&
        eojeols(c.easy) <= MAX_CHANGE_EOJEOL.easy &&
        !c.easy.includes(c.original) &&
        original.includes(c.original),
    )
    // 긴 말부터 찾아야 짧은 말이 긴 말 안에서 잘못 잡히지 않음
    .sort((a, b) => b.easy.length - a.easy.length);

  const marks: { start: number; end: number; original: string }[] = [];
  const overlaps = (s: number, e: number) => marks.some((m) => s < m.end && e > m.start);

  for (const c of usable) {
    let from = 0;
    while (from <= easyText.length) {
      const start = easyText.indexOf(c.easy, from);
      if (start < 0) break;
      const end = start + c.easy.length;
      if (!overlaps(start, end)) {
        marks.push({ start, end, original: c.original });
        break; // 같은 말은 처음 나온 한 곳에만 표시
      }
      from = start + 1;
    }
  }

  marks.sort((a, b) => a.start - b.start);
  let out = "";
  let last = 0;
  for (const m of marks) {
    out += easyText.slice(last, m.start);
    out += `{${easyText.slice(m.start, m.end)}|${m.original}}`;
    last = m.end;
  }
  return out + easyText.slice(last);
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

  // 예전 형식(easy_markup)으로 와도 읽을 수 있게 함
  const easyText = toPlain(asText(obj["easy_text"]) || asText(obj["easy_markup"]));
  if (easyText.length === 0) return null;

  const changes = (Array.isArray(obj["changes"]) ? obj["changes"] : [])
    .map((c): Change | null => {
      if (!c || typeof c !== "object") return null;
      const item = c as Record<string, unknown>;
      return { original: asText(item["original"]), easy: asText(item["easy"]) };
    })
    .filter((c): c is Change => c !== null)
    .slice(0, 10);

  const summary = (Array.isArray(obj["summary"]) ? obj["summary"] : [])
    .map((s) => cleanSummaryLine(asText(s)))
    .filter(Boolean)
    .slice(0, 3);

  const seen = new Set<string>();
  const words = (Array.isArray(obj["words"]) ? obj["words"] : [])
    .map((w): GlossaryEntry | null => {
      if (!w || typeof w !== "object") return null;
      const item = w as Record<string, unknown>;
      const entry: GlossaryEntry = {
        word: toPlain(asText(item["word"])),
        easy: toPlain(asText(item["easy"])),
        meaning: toPlain(asText(item["meaning"])),
      };
      const base = toPlain(asText(item["base"]));
      if (base) entry.base = base;
      return entry.word && entry.easy && entry.meaning ? entry : null;
    })
    .filter((w): w is GlossaryEntry => w !== null)
    // 원문에 실제로 없는 단어는 버림 (AI가 지어낸 단어 막기)
    .filter((w) => original.includes(w.word))
    .filter((w) => (seen.has(w.word) ? false : (seen.add(w.word), true)))
    .slice(0, 8);

  return { summary, easyMarkup: applyChanges(easyText, changes, original), words };
}
