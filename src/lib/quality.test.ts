import { describe, expect, it } from "vitest";

import { copyRatio, longSentenceShare, rewriteReason } from "./quality";

const ORIGINAL =
  "근로계약 체결 시 사용자는 근로자에게 임금, 소정근로시간, 휴일 및 연차유급휴가에 관한 사항을 서면으로 명시하여 교부하여야 하며, 이를 위반할 경우 500만 원 이하의 벌금에 처해질 수 있음. 1주간의 소정근로일을 개근한 근로자에게는 주 1회 이상의 유급휴일을 부여하여야 하고, 1년간 80% 이상 출근한 근로자에게는 15일의 연차유급휴가를 주어야 함.";

// 실제로 나왔던 나쁜 결과: 단어 몇 개만 바꿈
const COPIED =
  "근로계약 체결 시 사용자는 근로자에게 임금, 소정근로시간, 휴일 및 연차유급휴가에 관한 사항을 서면으로 명시하여 줘야 하며, 이를 위반할 경우 500만 원 이하의 벌금에 처해질 수 있음. 1주간의 소정근로일을 개근한 근로자에게는 주 1회 이상의 유급휴일을 줘야 하고, 1년간 80% 이상 출근한 근로자에게는 15일의 연차유급휴가를 줘야 함.";

const REWRITTEN =
  "회사는 사람을 고용할 때 월급, 일하기로 정한 시간, 쉬는 날, 연차를 종이에 적어서 줘야 해요. 이걸 지키지 않으면 회사는 500만 원 이하의 벌금을 낼 수 있어요. 1주일 동안 일하기로 한 날에 모두 나온 사람은 주 1회 이상 돈을 받으면서 쉬는 날을 받아요. 1년 동안 80% 이상 출근한 사람은 15일의 연차를 받아요.";

describe("쉬운 글 품질 검사", () => {
  it("원문을 거의 베낀 글은 겹침 비율이 높다", () => {
    expect(copyRatio(ORIGINAL, COPIED)).toBeGreaterThan(0.8);
    expect(copyRatio(ORIGINAL, REWRITTEN)).toBeLessThan(0.4);
  });

  it("베낀 글은 다시 쓰라고 하고, 새로 쓴 글은 통과한다", () => {
    expect(rewriteReason(ORIGINAL, COPIED, "middle")).toMatch(/^copy/);
    expect(rewriteReason(ORIGINAL, REWRITTEN, "middle")).toBeNull();
  });

  it("수준 기준보다 긴 문장이 많으면 다시 쓰라고 한다", () => {
    const long =
      "회사는 사람을 고용할 때 월급과 일하는 시간과 쉬는 날과 연차를 모두 종이에 적어서 꼭 줘야 하고 이를 어기면 벌금을 낼 수 있어요. 짧아요.";
    expect(longSentenceShare(long, "elementary")).toBe(0.5);
    expect(rewriteReason("전혀 다른 원문입니다.", long, "elementary")).toMatch(/^long/);
  });

  it("초등학생 결과에서 요약이 본문보다 길면 다시 쓰라고 한다", () => {
    const easy = "우리 아파트에서 오래된 물관을 바꾸는 공사를 해요. 공사 날에는 물이 안 나와요.";
    const summary = [
      "아파트 낡은 물관을 바꾸는 공사 때문에 2026년 12월 3일 목요일 오전 9시부터 오후 6시까지 모든 집에 물이 안 나와요.",
    ];
    expect(rewriteReason("전혀 다른 원문입니다.", easy, "elementary", summary)).toBe(
      "long summary",
    );
    expect(
      rewriteReason("전혀 다른 원문입니다.", easy, "elementary", ["물이 안 나와요."]),
    ).toBeNull();
  });
});
