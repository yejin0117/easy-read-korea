/**
 * Gemini API로 쉬운 글을 만드는 서버 함수.
 * API 키(GEMINI_API_KEY)는 Lovable Secrets에 두고, 서버(handler 안)에서만 읽습니다.
 * 브라우저 코드에는 키가 절대 들어가지 않습니다.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { buildSystemPrompt, parseAiOutput, RESPONSE_SCHEMA, type AiOutput } from "./ai-prompt";

export const AI_MAX_LENGTH = 5000;

export type AiConvertResponse =
  | { ok: true; output: AiOutput; model: string }
  | { ok: false; reason: "no-key" | "too-many" | "failed" };

const DEFAULT_MODEL = "gemini-flash-latest";

const inputSchema = z.object({
  text: z.string().trim().min(10).max(AI_MAX_LENGTH),
  level: z.enum(["elementary", "middle", "learner"]),
});

async function callGemini(
  apiKey: string,
  model: string,
  system: string,
  text: string,
): Promise<Response> {
  return fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
      signal: AbortSignal.timeout(30_000),
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: `아래 글을 쉬운 글로 바꿔 줘.\n\n${text}` }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
        },
      }),
    },
  );
}

function textOf(payload: unknown): string {
  const candidates = (payload as { candidates?: { content?: { parts?: { text?: string }[] } }[] })
    ?.candidates;
  return candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
}

export const convertWithAI = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<AiConvertResponse> => {
    const apiKey = process.env["GEMINI_API_KEY"];
    if (!apiKey) return { ok: false, reason: "no-key" };
    const model = process.env["GEMINI_MODEL"] || DEFAULT_MODEL;
    const system = buildSystemPrompt(data.level);

    // JSON 모양이 틀리면 한 번만 다시 요청
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await callGemini(apiKey, model, system, data.text);
        if (res.status === 429) return { ok: false, reason: "too-many" };
        if (!res.ok) {
          console.error(`Gemini error ${res.status}: ${(await res.text()).slice(0, 300)}`);
          return { ok: false, reason: "failed" };
        }
        const output = parseAiOutput(textOf(await res.json()), data.text);
        if (output) return { ok: true, output, model };
      } catch (error) {
        console.error("Gemini request failed", error);
        if (attempt === 1) return { ok: false, reason: "failed" };
      }
    }
    return { ok: false, reason: "failed" };
  });
