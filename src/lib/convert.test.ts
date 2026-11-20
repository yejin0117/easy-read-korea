import { describe, expect, it } from "vitest";

import { convertText } from "./convert";
import { plainEasy } from "./easy-markup";
import { LEVELS } from "./levels";
import { checkNumbers } from "./number-check";
import { SAMPLES } from "./samples";

describe("예시 글 변환", () => {
  it("예시 글은 핵심 요약을 정확히 3줄 보여 준다", () => {
    for (const sample of SAMPLES) {
      for (const level of LEVELS) {
        expect(convertText(sample.original, level.id).summary).toHaveLength(3);
      }
    }
  });

  it("임대차 계약서와 약 설명서 예시는 모든 수준에서 숫자가 원문과 같다", () => {
    for (const sample of SAMPLES.filter((s) => s.id !== "move-in")) {
      for (const level of LEVELS) {
        const r = convertText(sample.original, level.id);
        expect(checkNumbers(r.original, plainEasy(r.easyMarkup), r.summary).ok).toBe(true);
      }
    }
  });

  it("아무 글이나 넣으면 사전에 있는 어려운 단어를 바꾸고 조사를 맞춘다", () => {
    const r = convertText("임차인은 잔금을 지급한다.", "middle");
    expect(r.kind).toBe("custom");
    expect(plainEasy(r.easyMarkup)).toBe("세입자는 남은 돈을 지급한다.");
  });
});
