/**
 * Gemini REST API 호출과 재시도 로직 (서버에서만 사용).
 * 모델이 붐비면(503) 잠깐 기다렸다 다시 시도하고, 그래도 안 되면 다음 모델로 넘어갑니다.
 */
import { buildSystemPrompt, parseAiOutput, RESPONSE_SCHEMA, type AiOutput } from "./ai-prompt";
import type { Level } from "./levels";

export type AiFailReason = "no-key" | "too-many" | "failed";

export type AiConvertResponse =
  { ok: true; output: AiOutput; model: string } | { ok: false; reason: AiFailReason };

/** 앞에서부터 차례로 시도할 모델. GEMINI_MODEL이 있으면 그 모델을 맨 앞에 둠 */
export const DEFAULT_MODELS = [
  "gemini-flash-latest",
  "gemini-flash-lite-latest",
  "gemini-2.5-flash",
];

/** 같은 모델에 다시 시도할 때 기다리는 시간(ms) */
const RETRY_DELAYS = [800, 1600];

export function modelOrder(preferred?: string): string[] {
  const list = preferred ? [preferred, ...DEFAULT_MODELS] : DEFAULT_MODELS;
  return [...new Set(list.map((m) => m.trim()).filter(Boolean))];
}

type Fetcher = (url: string, init: RequestInit) => Promise<Response>;

interface Options {
  apiKey: string;
  models: string[];
  text: string;
  level: Level;
  fetcher?: Fetcher;
  sleep?: (ms: number) => Promise<void>;
  timeoutMs?: number;
}

function textOf(payload: unknown): string {
  const candidates = (payload as { candidates?: { content?: { parts?: { text?: string }[] } }[] })
    ?.candidates;
  return candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
}

/** 잠시 뒤 다시 하면 될 수 있는 오류(붐빔·일시 장애) */
const isBusy = (status: number) => status === 503 || status === 500 || status === 502;

export async function requestEasyText({
  apiKey,
  models,
  text,
  level,
  fetcher = fetch,
  sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
  timeoutMs = 25_000,
}: Options): Promise<AiConvertResponse> {
  const system = buildSystemPrompt(level);
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts: [{ text: `아래 글을 쉬운 글로 바꿔 줘.\n\n${text}` }] }],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    },
  });

  let sawBusyOrQuota = false;

  for (const model of models) {
    // 한 모델에 최대 3번: 처음 + 붐빔/형식 오류일 때 2번 더
    for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
      let res: Response;
      try {
        res = await fetcher(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
          {
            method: "POST",
            headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
            signal: AbortSignal.timeout(timeoutMs),
            body,
          },
        );
      } catch (error) {
        console.error(`Gemini request failed (${model})`, error);
        break; // 시간 초과·네트워크 오류 → 다음 모델
      }

      if (res.ok) {
        const output = parseAiOutput(textOf(await res.json()), text);
        if (output) return { ok: true, output, model };
        console.error(`Gemini returned unusable JSON (${model})`);
      } else {
        console.error(`Gemini error ${res.status} (${model}): ${(await res.text()).slice(0, 300)}`);
        if (res.status === 429) {
          sawBusyOrQuota = true;
          break; // 이 모델의 사용량 한도 → 다음 모델
        }
        if (!isBusy(res.status)) break; // 404(모델 없음)·400 등 → 다음 모델
        sawBusyOrQuota = true;
      }

      const delay = RETRY_DELAYS.at(attempt);
      if (delay === undefined) break;
      await sleep(delay);
    }
  }

  return { ok: false, reason: sawBusyOrQuota ? "too-many" : "failed" };
}
