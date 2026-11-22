/**
 * Gemini API로 쉬운 글을 만드는 서버 함수.
 * API 키(GEMINI_API_KEY)는 배포 환경의 비밀 값(Vercel 환경 변수, Lovable Secrets)에 두고,
 * 서버(handler 안)에서만 읽습니다. 브라우저 코드에는 키가 절대 들어가지 않습니다.
 * 우리말샘 키(OPENDICT_KEY)도 같은 방식으로 두며, 있으면 단어 뜻풀이를 사전에서 가져옵니다.
 * GEMINI_API_KEY_2(선택)는 첫 번째 키의 사용량이 다 찼을 때 쓰는 예비 키입니다.
 * Gemini 사용량은 키가 아니라 Google Cloud 프로젝트 단위라서, 다른 프로젝트에서 만든 키여야 효과가 있습니다.
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
    const mainKey = process.env["GEMINI_API_KEY"];
    const backupKey = process.env["GEMINI_API_KEY_2"];
    const keys = [...new Set([mainKey, backupKey])].filter((k): k is string => Boolean(k));
    const firstKey = keys[0];
    if (!firstKey) return { ok: false as const, reason: "no-key" as const };
    const models = modelOrder(process.env["GEMINI_MODEL"]);

    // 첫 번째 키의 사용량이 다 찼으면(too-many) 두 번째 키로 한 번 더 시도
    let result = await requestEasyText({
      apiKey: firstKey,
      models,
      text: data.text,
      level: data.level,
    });
    const secondKey = keys[1];
    if (!result.ok && result.reason === "too-many" && secondKey) {
      console.warn("Gemini quota reached on GEMINI_API_KEY, trying GEMINI_API_KEY_2");
      result = await requestEasyText({
        apiKey: secondKey,
        models,
        text: data.text,
        level: data.level,
      });
    }

    // 우리말샘 키가 있으면 단어 풀이를 사전 뜻으로 채움. 실패해도 변환 결과는 그대로 돌려줌
    const opendictKey = process.env["OPENDICT_KEY"];
    if (!result.ok || !opendictKey) return result;
    try {
      const words = await addDictionaryMeanings({
        words: result.output.words,
        original: data.text,
        level: data.level,
        opendictKey,
        // 뜻 고르기는 두 번째 키를 먼저 써서 사용량을 나눔
        geminiKeys: [...keys].reverse(),
        models: [result.model, ...models.filter((m) => m !== result.model)],
      });
      return { ...result, output: { ...result.output, words } };
    } catch (error) {
      console.error("Dictionary meanings failed", error);
      return result;
    }
  });
