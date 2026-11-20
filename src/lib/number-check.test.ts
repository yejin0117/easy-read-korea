import { describe, expect, it } from "vitest";

import { checkNumbers, extractNumbers } from "./number-check";

describe("변환 오류 확인 (숫자·날짜)", () => {
  it("쉼표가 있는 금액과 날짜 숫자를 같은 숫자로 읽는다", () => {
    expect(extractNumbers("보증금 50,000,000원, 2026년 3월 31일")).toEqual([
      "50000000",
      "2026",
      "3",
      "31",
    ]);
  });

  it("원문의 숫자가 쉬운 글에서 빠지면 빠진 숫자로 알려 준다", () => {
    const result = checkNumbers("14일 이내에 신고, 제40조에 따라 5만 원", "14일 안에 신고, 5만 원");
    expect(result.missing).toEqual(["40"]);
    expect(result.ok).toBe(false);
  });

  it("원문에 없는 숫자가 쉬운 글에 생기면 새로 생긴 숫자로 알려 준다", () => {
    const result = checkNumbers("1일 3회 복용", "하루 3번, 1알씩, 4시간마다");
    expect(result.added).toEqual(["4"]);
  });

  it("요약에 새로 생긴 숫자도 찾아낸다", () => {
    const result = checkNumbers("1일 3회", "1일 3번", ["하루 5번 먹어요"]);
    expect(result.added).toEqual(["5"]);
  });

  it("숫자가 모두 같으면 문제없음으로 본다", () => {
    expect(checkNumbers("2026. 3. 31.까지", "2026년 3월 31일까지").ok).toBe(true);
  });
});
