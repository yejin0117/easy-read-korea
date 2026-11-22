import { describe, expect, it } from "vitest";

import {
  applyChanges,
  buildSystemPrompt,
  cleanSummaryLine,
  parseAiOutput,
  toPlain,
} from "./ai-prompt";
import { buildAiResult, convertSample } from "./convert";
import { SAMPLES } from "./samples";

const ORIGINAL =
  "전입신고는 전입일로부터 14일 이내에 하여야 하며, 기한 경과 시 과태료가 부과될 수 있음.";

describe("Gemini 응답 정리", () => {
  it("쉬운 글·바뀐 말·요약·단어를 화면용으로 정리한다", () => {
    const raw = JSON.stringify({
      summary: [
        "1. 14일 안에 신고해야 해요.",
        "2) 늦으면 {과태료|과태료}를 낼 수 있어요.",
        "주민센터에서 해요.",
        "넷째 줄",
      ],
      easy_text: "이사한 날부터 14일 안에 신고해야 해요. 기한이 지나면 돈을 낼 수 있어요.",
      changes: [
        { original: "경과 시", easy: "지나면" },
        { original: "과태료", easy: "과태료" }, // 같은 말 → 버림
        { original: "없는말", easy: "신고해야" }, // 원문에 없음 → 버림
      ],
      words: [
        { word: "경과", easy: "지남", meaning: "시간이 지나감" },
        { word: "없는단어", easy: "x", meaning: "y" },
        { word: "경과", easy: "중복", meaning: "중복" },
      ],
    });
    const out = parseAiOutput(raw, ORIGINAL);
    expect(out).not.toBeNull();
    expect(out!.summary).toEqual([
      "14일 안에 신고해야 해요.",
      "늦으면 과태료를 낼 수 있어요.",
      "주민센터에서 해요.",
    ]);
    expect(out!.words.map((w) => w.word)).toEqual(["경과"]);
    expect(out!.easyMarkup).toBe(
      "이사한 날부터 14일 안에 신고해야 해요. 기한이 {지나면|경과 시} 돈을 낼 수 있어요.",
    );
  });

  it("JSON이 아니거나 쉬운 글이 비면 null", () => {
    expect(parseAiOutput("안녕하세요", ORIGINAL)).toBeNull();
    expect(
      parseAiOutput(
        JSON.stringify({ summary: [], easy_text: "", changes: [], words: [] }),
        ORIGINAL,
      ),
    ).toBeNull();
  });

  it("코드 블록으로 감싼 JSON도 읽는다", () => {
    const raw =
      "```json\n" +
      JSON.stringify({ summary: ["a"], easy_text: "쉬운 글", changes: [], words: [] }) +
      "\n```";
    expect(parseAiOutput(raw, ORIGINAL)?.easyMarkup).toBe("쉬운 글");
  });

  it("쉬운 글에 섞인 표시 기호는 지운다", () => {
    expect(toPlain("{쉬운|어려운} 말 { 이상한 | 표시")).toBe("쉬운 말 이상한 표시");
  });

  it("요약 앞의 번호와 기호를 지운다", () => {
    expect(cleanSummaryLine("1. 회사는 줘야 해요.")).toBe("회사는 줘야 해요.");
    expect(cleanSummaryLine("② 쉬어요.")).toBe("쉬어요.");
    expect(cleanSummaryLine("- {줘야|교부하여야} 해요.")).toBe("줘야 해요.");
    expect(cleanSummaryLine("15일을 받아요.")).toBe("15일을 받아요.");
    expect(cleanSummaryLine("공사비는 모아 둔 돈에서 나와요")).toBe(
      "공사비는 모아 둔 돈에서 나와요.",
    );
  });

  it("바뀐 말은 처음 나온 한 곳에만, 겹치지 않게 표시한다", () => {
    const easy = "회사는 종이에 적어서 줘야 해요. 쉬는 날도 줘야 해요.";
    const out = applyChanges(
      easy,
      [
        { original: "교부하여야", easy: "줘야" },
        { original: "서면으로 명시하여", easy: "종이에 적어서" },
      ],
      "서면으로 명시하여 교부하여야 함.",
    );
    expect(out).toBe(
      "회사는 {종이에 적어서|서면으로 명시하여} {줘야|교부하여야} 해요. 쉬는 날도 줘야 해요.",
    );
  });

  it("문장 절반을 덮는 긴 바뀐 말은 표시하지 않는다", () => {
    const easy = "입주민은 물이 끊기기 전날까지 쓸 물을 미리 받아 두어야 해요.";
    const out = applyChanges(
      easy,
      [
        {
          original: "생활용수를 사전에 확보하여 주시기 바라며",
          easy: "물이 끊기기 전날까지 쓸 물을 미리 받아 두어야 해요",
        },
        { original: "사전에", easy: "미리" },
      ],
      "필요한 생활용수를 사전에 확보하여 주시기 바라며",
    );
    expect(out).toBe("입주민은 물이 끊기기 전날까지 쓸 물을 {미리|사전에} 받아 두어야 해요.");
  });

  it("수준마다 지시문과 예시가 다르다", () => {
    const elementary = buildSystemPrompt("elementary");
    const middle = buildSystemPrompt("middle");
    const learner = buildSystemPrompt("learner");
    expect(elementary).toContain("[읽는 사람: 초등학생 (3~4학년)]");
    expect(elementary).toContain("8어절 이하");
    expect(middle).toContain("[읽는 사람: 중학생]");
    expect(learner).toContain("[읽는 사람: 한국어를 배우기 시작한 어른]");
    expect(learner).toContain("대출 정지가 돼요");
    expect(elementary).not.toContain("[읽는 사람: 중학생]");
    for (const p of [elementary, middle, learner]) {
      expect(p).toContain("단어만 바꿔 끼우지 마");
      expect(p).toContain("누가 하는지(주체)를 바꾸지 마");
      expect(p).toContain("부탁과 의무를 구분해");
      expect(p).toContain("살 사람 X");
      expect(p).toContain("쉼표까지 원문 표기 그대로");
      expect(p).toContain("원문의 어려운 낱말을 요약에 그대로 쓰지 마");
      expect(p).toContain("원문 문장의 종류를 바꾸지 마");
      expect(p).toContain("조건이 사라지지 않게 해");
      expect(p).toContain("뜻을 설명하는 문장이나 괄호 설명은 쓰지 마");
      expect(p).not.toContain("뜻을 설명하는 말은 덧붙여도 돼");
    }
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
