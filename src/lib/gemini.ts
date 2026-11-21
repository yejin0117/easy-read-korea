/**
 * Gemini API로 쉬운 글을 만드는 서버 함수.
 * API 키(GEMINI_API_KEY)는 배포 환경의 비밀 값(Vercel 환경 변수, Lovable Secrets)에 두고,
 * 서버(handler 안)에서만 읽습니다. 브라우저 코드에는 키가 절대 들어가지 않습니다.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { modelOrder, requestEasyText } from "./gemini-client";

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
    return requestEasyText({
      apiKey,
      models: modelOrder(process.env["GEMINI_MODEL"]),
      text: data.text,
      level: data.level,
    });
  });
