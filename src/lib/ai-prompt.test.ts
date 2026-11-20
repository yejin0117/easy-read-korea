import { describe, expect, it } from "vitest";

import { buildSystemPrompt, cleanMarkup, parseAiOutput } from "./ai-prompt";
import { buildAiResult, convertSample } from "./convert";
import { SAMPLES } from "./samples";

const ORIGINAL =
  "전입신고는 전입일로부터 14일 이내에 하여야 하며, 기한 경과 시 과태료가 부과될 수 있음.";

describe("Gemini 응답 정리", () => {
  it("올바른 JSON을 요약·쉬운 글·단어로 나눈다", () => {
    const raw = JSON.stringify({
      summary: [
        "14일 안에 신고해야 해요.",
        "늦으면 과태료를 낼 수 있어요.",
        "주민센터에서 해요.",
        "넷째 줄",
      ],
      easy_markup:
        "이사한 날부터 14일 안에 {신고해야|하여야} 해요. 기한이 {지나면|경과 시} 돈을 낼 수 있어요.",
      words: [
        { word: "경과", easy: "지남", meaning: "시간이 지나감" },
        { word: "없는단어", easy: "x", meaning: "y" },
        { word: "경과", easy: "중복", meaning: "중복" },
      ],
    });
    const out = parseAiOutput(raw, ORIGINAL);
    expect(out).not.toBeNull();
    expect(out!.summary).toHaveLength(3);
    expect(out!.words.map((w) => w.word)).toEqual(["경과"]);
    expect(out!.easyMarkup).toContain("{신고해야|하여야}");
  });

  it("JSON이 아니거나 쉬운 글이 비면 null", () => {
    expect(parseAiOutput("안녕하세요", ORIGINAL)).toBeNull();
    expect(
      parseAiOutput(JSON.stringify({ summary: [], easy_markup: "", words: [] }), ORIGINAL),
    ).toBeNull();
  });

  it("코드 블록으로 감싼 JSON도 읽는다", () => {
    const raw =
      "```json\n" + JSON.stringify({ summary: ["a"], easy_markup: "쉬운 글", words: [] }) + "\n```";
    expect(parseAiOutput(raw, ORIGINAL)?.easyMarkup).toBe("쉬운 글");
  });

  it("짝이 맞지 않는 중괄호와 세로선은 지운다", () => {
    expect(cleanMarkup("{쉬운|어려운} 말 { 이상한 | 표시")).toBe("{쉬운|어려운} 말  이상한  표시");
  });

  it("수준마다 지시문이 다르다", () => {
    expect(buildSystemPrompt("elementary")).toContain("[초등학생]");
    expect(buildSystemPrompt("learner")).toContain("[한국어 학습자]");
  });

  it("AI 결과는 kind가 ai이고 단어 풀이에 나온 문장이 붙는다", () => {
    const r = buildAiResult(ORIGINAL, "middle", {
      summary: ["a", "b", "c"],
      easyMarkup: "쉬운 글",
      words: [{ word: "과태료", easy: "벌금 같은 돈", meaning: "규칙을 어기면 내는 돈" }],
    });
    expect(r.kind).toBe("ai");
    expect(r.glossary[0]?.sentence).toContain("과태료");
  });

  it("예시 글은 AI 없이 바로 결과가 나온다", () => {
    expect(convertSample(SAMPLES[0]!.original, "middle")?.kind).toBe("sample");
    expect(convertSample("예시가 아닌 아무 글입니다.", "middle")).toBeNull();
  });
});
