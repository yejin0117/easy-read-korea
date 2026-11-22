/**
 * 국립국어원 우리말샘 오픈 API로 단어의 사전 뜻풀이를 찾습니다 (서버에서만 사용).
 * 인증 키(OPENDICT_KEY)는 배포 환경의 비밀 값에 두고 브라우저 코드에는 넣지 않습니다.
 *
 * 저작권: 우리말샘 텍스트는 CC BY-SA 2.0 KR. 뜻풀이(definition)만 쓰고,
 * 원저작자가 따로 있는 용례(예문)는 가져오지 않습니다.
 */

export const OPENDICT_URL = "https://opendict.korean.go.kr/api/search";
export const OPENDICT_CREDIT = "국립국어원 우리말샘";
export const OPENDICT_LICENSE = "CC BY-SA 2.0 KR";

/** 한 단어에서 최대 몇 개의 뜻을 후보로 쓸지 */
export const MAX_SENSES = 6;

/** 풀어읽기에 맞지 않는 말(방언, 북한어, 옛말)은 후보에서 뺌 */
const SKIP_TYPES = ["방언", "북한어", "옛말"];
const isSkipped = (type: string) => SKIP_TYPES.some((t) => type.includes(t));

export interface DictSense {
  definition: string;
  pos?: string;
}

type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;

/** 우리말샘 표제어의 띄어쓰기·형태소 표시(^, -)와 어깨번호를 지워 비교용으로 만듭니다. */
export function normalizeHeadword(word: string): string {
  return word
    .replace(/[\^\-\s]/g, "")
    .replace(/\d+$/g, "")
    .trim();
}

/** 뜻풀이에 섞인 태그와 겹공백을 지웁니다. */
export function cleanDefinition(text: string): string {
  return text
    .replace(/<[^>]+>/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

const asArray = <T>(value: T | T[] | undefined | null): T[] =>
  value == null ? [] : Array.isArray(value) ? value : [value];

/** XML 태그 하나의 글자를 꺼냅니다. CDATA와 기본 엔티티를 풉니다. */
function tagText(xml: string, tag: string): string | undefined {
  const m = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`).exec(xml);
  if (!m?.[1]) return undefined;
  return m[1]
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .trim();
}

function tagBlocks(xml: string, tag: string): string[] {
  return [...xml.matchAll(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "g"))].map((m) => m[1] ?? "");
}

/**
 * 우리말샘은 JSON을 요청해도 XML로 답할 때가 있어서, XML도 JSON과 같은 모양으로 바꿉니다.
 * 오류 응답(<error>)은 { error: { error_code, message } }로 바꿉니다.
 */
export function xmlToPayload(xml: string): unknown {
  const errorBlock = tagBlocks(xml, "error")[0];
  if (errorBlock !== undefined) {
    return {
      error: {
        error_code: tagText(errorBlock, "error_code"),
        message: tagText(errorBlock, "message"),
      },
    };
  }
  const item = tagBlocks(xml, "item").map((block) => ({
    word: tagText(block, "word"),
    sense: tagBlocks(block, "sense").map((sense) => ({
      definition: tagText(sense, "definition"),
      pos: tagText(sense, "pos"),
      type: tagText(sense, "type"),
    })),
  }));
  return { channel: { item } };
}

/** 응답 글자를 JSON으로 읽고, XML이면 XML로 읽습니다. */
export function readPayload(body: string): unknown {
  const text = body.trim();
  if (text.startsWith("<")) return xmlToPayload(text);
  return JSON.parse(text) as unknown;
}

/** 우리말샘 검색 응답에서 찾는 말과 같은 표제어의 뜻만 골라냅니다. */
export function parseOpendict(payload: unknown, query: string): DictSense[] {
  const channel = (payload as { channel?: { item?: unknown } } | null)?.channel;
  const target = normalizeHeadword(query);
  const senses: DictSense[] = [];
  const seen = new Set<string>();

  for (const raw of asArray(channel?.item as unknown[] | undefined)) {
    const item = raw as { word?: unknown; sense?: unknown };
    if (typeof item?.word !== "string" || normalizeHeadword(item.word) !== target) continue;
    for (const s of asArray(item.sense as unknown[] | undefined)) {
      const sense = s as { definition?: unknown; pos?: unknown; type?: unknown };
      if (typeof sense?.type === "string" && isSkipped(sense.type)) continue;
      const definition =
        typeof sense?.definition === "string" ? cleanDefinition(sense.definition) : "";
      if (!definition || seen.has(definition)) continue;
      seen.add(definition);
      const entry: DictSense = { definition };
      if (typeof sense.pos === "string" && sense.pos) entry.pos = sense.pos;
      senses.push(entry);
      if (senses.length >= MAX_SENSES) return senses;
    }
  }
  return senses;
}

/** 한 단어를 우리말샘에서 찾습니다. 실패하면 빈 배열(뜻풀이는 AI 결과를 그대로 씀). */
export async function lookupOpendict(
  query: string,
  apiKey: string,
  fetcher: Fetcher = fetch,
  timeoutMs = 4_000,
): Promise<DictSense[]> {
  const params = new URLSearchParams({
    key: apiKey,
    q: query,
    req_type: "json",
    num: "10",
    advanced: "y",
    method: "exact",
  });
  try {
    const res = await fetcher(`${OPENDICT_URL}?${params}`, {
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) {
      console.error(`Opendict error ${res.status} for "${query}"`);
      return [];
    }
    const body = await res.text();
    let payload: unknown;
    try {
      payload = readPayload(body);
    } catch {
      console.error(`Opendict unreadable response for "${query}": ${body.slice(0, 200)}`);
      return [];
    }
    const error = (payload as { error?: { error_code?: string; message?: string } } | null)?.error;
    if (error) {
      console.error(`Opendict error ${error.error_code ?? ""}: ${error.message ?? ""}`);
      return [];
    }
    const senses = parseOpendict(payload, query);
    if (senses.length === 0 && !body.includes("item")) {
      console.warn(`Opendict no entry for "${query}": ${body.slice(0, 200)}`);
    }
    return senses;
  } catch (error) {
    console.error(`Opendict request failed for "${query}"`, error);
    return [];
  }
}

/** 기본형으로 먼저 찾고, 없으면 원문 글자 그대로, '-하다'를 뗀 말 순서로 찾습니다. */
export function lookupQueries(word: string, base?: string): string[] {
  const list = [base, word];
  for (const w of [base, word]) {
    if (w && w.endsWith("하다") && w.length > 2) list.push(w.slice(0, -2));
  }
  return [...new Set(list.map((w) => w?.trim() ?? "").filter(Boolean))];
}

export async function findSenses(
  word: string,
  base: string | undefined,
  apiKey: string,
  fetcher?: Fetcher,
): Promise<DictSense[]> {
  for (const q of lookupQueries(word, base)) {
    const senses = await lookupOpendict(q, apiKey, fetcher);
    if (senses.length > 0) return senses;
  }
  return [];
}
