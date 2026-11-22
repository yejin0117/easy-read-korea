/**
 * Gemini API로 쉬운 글을 만드는 서버 함수.
 * API 키(GEMINI_API_KEY)는 배포 환경의 비밀 값(Vercel 환경 변수, Lovable Secrets)에 두고,
 * 서버(handler 안)에서만 읽습니다. 브라우저 코드에는 키가 절대 들어가지 않습니다.
 * 우리말샘 키(OPENDICT_KEY)도 같은 방식으로 두며, 있으면 단어 뜻풀이를 사전에서 가져옵니다.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { modelOrder, requestEasyText } from "./gemini-client";
import { addDictionaryMeanings } from "./word-meanings";

export type { AiConvertResponse } from "./gemini-client";

export const AI_MAX_LENGTH = 5000;

const inputSchema = z.object({
  text: z.string().trim().min(10).max(AI_MAX_LENGTH),
  level: z.enum(["elementary", "middle", "learner"]),
});

export const convertWithAI = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env["GEMINI_API_KEY"];
    if (!apiKey) return { ok: false as const, reason: "no-key" as const };
    const models = modelOrder(process.env["GEMINI_MODEL"]);
    const result = await requestEasyText({ apiKey, models, text: data.text, level: data.level });

    // 우리말샘 키가 있으면 단어 풀이를 사전 뜻으로 채움. 실패해도 변환 결과는 그대로 돌려줌
    const opendictKey = process.env["OPENDICT_KEY"];
    if (!result.ok || !opendictKey) return result;
    try {
      const words = await addDictionaryMeanings({
        words: result.output.words,
        original: data.text,
        level: data.level,
        opendictKey,
        geminiKey: apiKey,
        models: [result.model, ...models.filter((m) => m !== result.model)],
      });
      return { ...result, output: { ...result.output, words } };
    } catch (error) {
      console.error("Dictionary meanings failed", error);
      return result;
    }
  });
