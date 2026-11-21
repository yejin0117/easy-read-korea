import { describe, expect, it } from "vitest";

import { buildQuiz, canMakeQuiz, type QuizWord } from "./quiz";

const words: QuizWord[] = [
  { word: "경과", easy: "지나감", meaning: "시간이 지나감", sentence: "기한 경과 시" },
  { word: "과태료", easy: "벌금 같은 돈", meaning: "규칙을 어기면 내는 돈", sentence: "" },
  { word: "지참", easy: "챙겨 감", meaning: "챙겨서 가지고 감", sentence: "" },
  { word: "익일", easy: "다음 날", meaning: "그다음 날", sentence: "" },
  { word: "기재", easy: "적기", meaning: "써넣음", sentence: "" },
  { word: "상기", easy: "위의", meaning: "앞에서 말한", sentence: "" },
];

function seeded(seed: number) {
  let s = seed;
  return () => (s = (s * 9301 + 49297) % 233280) / 233280;
}

describe("단어 퀴즈", () => {
  it("단어가 2개 이상이어야 퀴즈를 만든다", () => {
    expect(canMakeQuiz(words.slice(0, 1))).toBe(false);
    expect(canMakeQuiz(words.slice(0, 2))).toBe(true);
    expect(buildQuiz(words.slice(0, 1))).toEqual([]);
  });

  it("최대 5문제, 보기는 최대 4개이고 정답이 보기 안에 있다", () => {
    const qs = buildQuiz(words, seeded(7));
    expect(qs).toHaveLength(5);
    for (const q of qs) {
      expect(q.choices.length).toBeLessThanOrEqual(4);
      expect(q.choices.at(q.answerIndex)).toBe(q.item.easy);
      expect(new Set(q.choices).size).toBe(q.choices.length);
    }
    expect(new Set(qs.map((q) => q.item.word)).size).toBe(5);
  });

  it("단어가 2개면 보기도 2개다", () => {
    const qs = buildQuiz(words.slice(0, 2), seeded(3));
    expect(qs).toHaveLength(2);
    expect(qs.every((q) => q.choices.length === 2)).toBe(true);
  });

  it("쉬운 말이 겹치는 단어는 하나만 쓴다", () => {
    const dup = [
      ...words.slice(0, 2),
      { word: "경과함", easy: "지나감", meaning: "", sentence: "" },
    ];
    const qs = buildQuiz(dup, seeded(1));
    expect(qs).toHaveLength(2);
  });
});
